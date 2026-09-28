import { and, asc, count, desc, eq, gt, inArray, isNull, like, max, or, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { accountSetupTokens, foundationAdminAlerts, InsertContactInquiry, InsertDonationIntent, InsertGalleryMedia, InsertMembershipApplication, InsertNewsletterSubscriber, InsertPaymentTransaction, InsertProject, InsertUser, InsertVolunteerApplication, beneficiaries, contactInquiries, donationIntents, fieldEvents, fundersPartners, galleryDriveSync, galleryMedia, impactEvidence, memberCertificateEmailTokens, memberExpiryReminders, memberMembershipCycles, memberPasswordResetTokens, newsletterSubscribers, memberProjectAssignments, memberServiceCompletionProofs, memberServiceCompletions, memberServiceRequests, memberSupportMessages, members, membershipApplications, membershipExpiryAutomation, membershipReminderAutomation, misAuditLogs, monitoringIndicators, paymentRefunds, paymentTransactions, paymentWebhookEvents, projectActivities, projectBudgetAllocations, projectClosures, projectDocuments, projectFinanceRecords, projectObjectives, projectOutcomes, projectOutputs, projectReports, projectRisks, projectTargetGroups, projectTeamAssignments, projects, targetsAchievement, users, volunteerApplications } from "./drizzle/schema";
import { ENV } from './_core/env';
import { decideGalleryDriveImport } from "@shared/galleryDrive";
import { getMembershipValidity } from "@shared/memberMembership";
import { decryptSensitiveValue, hashSensitiveMatchValue } from "./security/sensitive";

let _db: ReturnType<typeof drizzle> | null = null;

// Pin every DB session to UTC. MariaDB/MySQL defaults the session time zone to
// the server's system zone (IST on local dev boxes), which makes NOW() write
// local wall-clock values while mysql2 parses reads back as UTC — every
// server-generated timestamp would silently drift by the zone offset. The
// app treats Date objects as UTC instants everywhere, so sessions must agree.
function utcConnectionString(url: string): string {
  const [base, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.set("timezone", "Z");
  return `${base}?${params.toString()}`;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(utcConnectionString(process.env.DATABASE_URL));
      // timezone=Z only pins CLIENT-side parsing; NOW() and TIMESTAMP column
      // conversion follow the SESSION zone, so pin that on every pooled
      // connection too. mysql2 creates connections lazily, so registering here
      // cannot race the first query — commands on a connection stay ordered.
      (_db.$client as unknown as { on: (event: "connection", listener: (connection: { query: (sql: string) => void }) => void) => void })
        .on("connection", connection => connection.query("SET time_zone = '+00:00'"));
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createPaymentTransaction(transaction: InsertPaymentTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for payment transaction creation.");
  await db.insert(paymentTransactions).values(transaction);
}

export async function createMembershipApplication(application: InsertMembershipApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership application submission.");
  await db.insert(membershipApplications).values(application);
}

export type MembershipActivationInput = {
  application: InsertMembershipApplication;
  setupTokenHash: string;
  setupTokenExpiresAt: Date;
  renewalIntent?: boolean;
};

function membershipCycleDates(memberType: string, joiningDate: Date) {
  const validity = getMembershipValidity(memberType, joiningDate, joiningDate);
  return { startsOn: joiningDate, expiresOn: validity.expiresOn };
}

function nextMembershipNumber(lastMembershipNo: string | null, year: number) {
  const lastSequence = lastMembershipNo ? Number(lastMembershipNo.split("-").at(-1)) : 0;
  return `AASW-${year}-${String(lastSequence + 1).padStart(4, "0")}`;
}

function isDuplicateKeyError(error: unknown) {
  return error instanceof Error && /duplicate|unique/i.test(error.message);
}

/**
 * Persists the public application and its active credential account together.
 * A setup-token hash is stored in the same transaction so an account never
 * exists without a secure first-password path.
 */
export async function createMembershipApplicationWithActivation(input: MembershipActivationInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership activation.");
  const year = new Date().getUTCFullYear();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.transaction(async tx => {
        await tx.insert(membershipApplications).values(input.application);
        const [existing] = await tx.select({ member: members, applicationId: membershipApplications.id, panHash: membershipApplications.panHash, panEncrypted: membershipApplications.panEncrypted }).from(members).innerJoin(membershipApplications, eq(members.applicationRef, membershipApplications.applicationRef)).where(eq(members.email, input.application.email)).limit(1);
        const now = new Date();

        if (existing) {
          const verifiedPanHash = existing.panHash || hashSensitiveMatchValue(decryptSensitiveValue(existing.panEncrypted));
          if (verifiedPanHash !== input.application.panHash) throw new Error("Membership renewal identity did not match.");
          if (!existing.panHash) await tx.update(membershipApplications).set({ panHash: verifiedPanHash, updatedAt: now }).where(eq(membershipApplications.id, existing.applicationId));
          const validity = getMembershipValidity(existing.member.memberType, existing.member.joiningDate, now);
          if (existing.member.status === "active" && existing.member.accountStatus === "active" && validity.membershipStatus === "active") throw new Error("An active membership already exists for this email.");

          const [latestCycle] = await tx.select({ cycleNumber: memberMembershipCycles.cycleNumber }).from(memberMembershipCycles).where(eq(memberMembershipCycles.memberId, existing.member.id)).orderBy(desc(memberMembershipCycles.cycleNumber)).limit(1);
          if (!latestCycle) {
            const historical = membershipCycleDates(existing.member.memberType, new Date(existing.member.joiningDate));
            await tx.insert(memberMembershipCycles).values({ memberId: existing.member.id, applicationRef: existing.member.applicationRef, cycleNumber: 1, membershipType: existing.member.memberType === "lifetime" ? "lifetime" : "annual", ...historical, status: "expired", expiredAt: now });
          } else {
            await tx.update(memberMembershipCycles).set({ status: "expired", expiredAt: now, updatedAt: now }).where(and(eq(memberMembershipCycles.memberId, existing.member.id), eq(memberMembershipCycles.status, "active")));
          }
          const cycleDates = membershipCycleDates(input.application.membershipType, now);
          const nextCycleNumber = (latestCycle?.cycleNumber ?? 1) + 1;
          await tx.update(members).set({ applicationRef: input.application.applicationRef, fullName: input.application.fullName, phone: input.application.phone, memberType: input.application.membershipType, city: input.application.city, state: input.application.state, district: input.application.district, joiningDate: now, status: "active", accountStatus: "active", loginAttempts: 0, lockedUntil: null, updatedAt: now }).where(eq(members.id, existing.member.id));
          await tx.insert(memberMembershipCycles).values({ memberId: existing.member.id, applicationRef: input.application.applicationRef, cycleNumber: nextCycleNumber, membershipType: input.application.membershipType, ...cycleDates, status: "active" });
          await tx.insert(foundationAdminAlerts).values({ alertType: "member_auto_approved", applicationRef: input.application.applicationRef, memberId: existing.member.id, title: "Membership renewed", message: `${input.application.fullName} · ${existing.member.membershipNo} has started a renewed membership cycle.` });
          return { memberId: existing.member.id, membershipNo: existing.member.membershipNo, isRenewal: true };
        }

        if (input.renewalIntent) throw new Error("No existing membership found for this renewal email.");

        const current = await tx.select({ membershipNo: members.membershipNo }).from(members).where(like(members.membershipNo, `AASW-${year}-%`)).orderBy(desc(members.membershipNo)).limit(1);
        const membershipNo = nextMembershipNumber(current[0]?.membershipNo ?? null, year);
        const created = await tx.insert(members).values({
          applicationRef: input.application.applicationRef,
          membershipNo,
          fullName: input.application.fullName,
          email: input.application.email,
          phone: input.application.phone,
          memberType: input.application.membershipType,
          city: input.application.city,
          state: input.application.state,
          district: input.application.district,
          joiningDate: new Date(),
        });
        const memberId = Number(created[0].insertId);
        const cycleDates = membershipCycleDates(input.application.membershipType, now);
        await tx.insert(memberMembershipCycles).values({ memberId, applicationRef: input.application.applicationRef, cycleNumber: 1, membershipType: input.application.membershipType, ...cycleDates, status: "active" });
        await tx.insert(accountSetupTokens).values({ memberId, tokenHash: input.setupTokenHash, expiresAt: input.setupTokenExpiresAt });
        await tx.insert(foundationAdminAlerts).values({ alertType: "member_auto_approved", applicationRef: input.application.applicationRef, memberId, title: "New member auto-approved", message: `${input.application.fullName} · ${membershipNo} is ready to set a member password.` });
        return { memberId, membershipNo, isRenewal: false };
      });
    } catch (error) {
      if (attempt < 2 && isDuplicateKeyError(error)) continue;
      throw error;
    }
  }

  throw new Error("Membership number allocation could not be completed.");
}

export async function getMemberByIdentifier(identifier: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member access.");
  const rows = await db.select().from(members).where(or(eq(members.email, identifier.toLowerCase()), eq(members.membershipNo, identifier.toUpperCase()))).limit(1);
  return rows[0];
}

export async function getMemberById(memberId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member access.");
  const rows = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  return rows[0];
}

export async function expireMemberIfDue(member: { id: number; applicationRef: string; memberType: string; joiningDate: Date | string; status: string; accountStatus: string }, now = new Date()) {
  const validity = getMembershipValidity(member.memberType, member.joiningDate, now);
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership expiry.");
  const [currentCycle] = await db.select({ id: memberMembershipCycles.id }).from(memberMembershipCycles).where(and(eq(memberMembershipCycles.memberId, member.id), eq(memberMembershipCycles.status, "active"))).limit(1);
  if (!currentCycle && member.status === "active") {
    const cycleDates = membershipCycleDates(member.memberType, new Date(member.joiningDate));
    await db.insert(memberMembershipCycles).values({ memberId: member.id, applicationRef: member.applicationRef, cycleNumber: 1, membershipType: member.memberType === "lifetime" ? "lifetime" : "annual", ...cycleDates, status: validity.portalAccessStatus === "expired" ? "expired" : "active", expiredAt: validity.portalAccessStatus === "expired" ? now : null });
  }
  if (validity.portalAccessStatus !== "expired" || member.status === "expired") return false;
  await db.transaction(async tx => {
    await tx.update(members).set({ status: "expired", accountStatus: "inactive", updatedAt: now }).where(and(eq(members.id, member.id), eq(members.status, "active")));
    await tx.update(memberMembershipCycles).set({ status: "expired", expiredAt: now, updatedAt: now }).where(and(eq(memberMembershipCycles.memberId, member.id), eq(memberMembershipCycles.status, "active")));
  });
  return true;
}

export async function expireDueMemberships(now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership expiry.");
  const candidates = await db.select().from(members).where(and(eq(members.status, "active"), eq(members.accountStatus, "active")));
  let expiredCount = 0;
  for (const member of candidates) if (await expireMemberIfDue(member, now)) expiredCount += 1;
  return expiredCount;
}

export async function listMemberMembershipCycles(memberId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member membership history.");
  return db.select({ cycleNumber: memberMembershipCycles.cycleNumber, membershipType: memberMembershipCycles.membershipType, startsOn: memberMembershipCycles.startsOn, expiresOn: memberMembershipCycles.expiresOn, status: memberMembershipCycles.status, expiredAt: memberMembershipCycles.expiredAt, createdAt: memberMembershipCycles.createdAt }).from(memberMembershipCycles).where(eq(memberMembershipCycles.memberId, memberId)).orderBy(desc(memberMembershipCycles.cycleNumber));
}

export async function getMembershipExpiryAutomationByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership expiry automation.");
  const [config] = await db.select().from(membershipExpiryAutomation).where(eq(membershipExpiryAutomation.scheduleCronTaskUid, taskUid)).limit(1);
  return config;
}

export async function recordMembershipExpiryAutomationRun(taskUid: string, input: { expiredCount: number; error?: string }, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership expiry automation.");
  await db.update(membershipExpiryAutomation).set({ lastRanAt: now, lastExpiredCount: input.expiredCount, lastError: input.error?.slice(0, 500) ?? null, updatedAt: now }).where(eq(membershipExpiryAutomation.scheduleCronTaskUid, taskUid));
}

function utcDaysUntil(date: Date | string, now: Date) {
  const target = new Date(date);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const normalizedTarget = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()));
  return Math.round((normalizedTarget.getTime() - today.getTime()) / 86_400_000);
}

export async function claimSevenDayExpiryReminderCandidates(now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership reminders.");
  const cycles = await db.select({ cycleId: memberMembershipCycles.id, memberId: members.id, fullName: members.fullName, email: members.email, membershipNo: members.membershipNo, expiresOn: memberMembershipCycles.expiresOn }).from(memberMembershipCycles).innerJoin(members, eq(memberMembershipCycles.memberId, members.id)).where(and(eq(memberMembershipCycles.status, "active"), eq(members.status, "active"), eq(members.accountStatus, "active")));
  const claimed: { reminderId: number; reminderType: "seven_day"; fullName: string; email: string; membershipNo: string; expiresOn: Date }[] = [];
  for (const cycle of cycles) {
    const daysRemaining = cycle.expiresOn ? utcDaysUntil(cycle.expiresOn, now) : -1;
    if (!cycle.expiresOn || daysRemaining < 0 || daysRemaining > 7) continue;
    const [existing] = await db.select({ id: memberExpiryReminders.id, deliveryStatus: memberExpiryReminders.deliveryStatus, attempts: memberExpiryReminders.attempts }).from(memberExpiryReminders).where(and(eq(memberExpiryReminders.membershipCycleId, cycle.cycleId), eq(memberExpiryReminders.reminderType, "seven_day"))).limit(1);
    if (existing) {
      if (existing.deliveryStatus === "sent" || existing.attempts >= 3) continue;
      await db.update(memberExpiryReminders).set({ deliveryStatus: "pending", attempts: existing.attempts + 1, lastError: null, updatedAt: now }).where(eq(memberExpiryReminders.id, existing.id));
      claimed.push({ reminderId: existing.id, reminderType: "seven_day", fullName: cycle.fullName, email: cycle.email, membershipNo: cycle.membershipNo, expiresOn: new Date(cycle.expiresOn) });
      continue;
    }
    try {
      const created = await db.insert(memberExpiryReminders).values({ memberId: cycle.memberId, membershipCycleId: cycle.cycleId, reminderType: "seven_day", deliveryStatus: "pending", attempts: 1 });
      claimed.push({ reminderId: Number(created[0].insertId), reminderType: "seven_day", fullName: cycle.fullName, email: cycle.email, membershipNo: cycle.membershipNo, expiresOn: new Date(cycle.expiresOn) });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
  return claimed;
}

/** Claims one audited follow-up per annual cycle once its three-day renewal grace period has elapsed. */
export async function claimPostGraceRenewalFollowUpCandidates(now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for post-grace membership follow-up.");
  const cycles = await db.select({ cycleId: memberMembershipCycles.id, memberId: members.id, fullName: members.fullName, email: members.email, membershipNo: members.membershipNo, expiresOn: memberMembershipCycles.expiresOn }).from(memberMembershipCycles).innerJoin(members, eq(memberMembershipCycles.memberId, members.id)).where(and(eq(memberMembershipCycles.status, "expired"), eq(memberMembershipCycles.membershipType, "annual")));
  const claimed: { reminderId: number; reminderType: "post_grace"; fullName: string; email: string; membershipNo: string; expiresOn: Date }[] = [];
  for (const cycle of cycles) {
    const daysSinceExpiry = cycle.expiresOn ? -utcDaysUntil(cycle.expiresOn, now) : -1;
    if (!cycle.expiresOn || daysSinceExpiry < 3) continue;
    const [existing] = await db.select({ id: memberExpiryReminders.id, deliveryStatus: memberExpiryReminders.deliveryStatus, attempts: memberExpiryReminders.attempts }).from(memberExpiryReminders).where(and(eq(memberExpiryReminders.membershipCycleId, cycle.cycleId), eq(memberExpiryReminders.reminderType, "post_grace"))).limit(1);
    if (existing) {
      if (existing.deliveryStatus === "sent" || existing.attempts >= 3) continue;
      await db.update(memberExpiryReminders).set({ deliveryStatus: "pending", attempts: existing.attempts + 1, lastError: null, updatedAt: now }).where(eq(memberExpiryReminders.id, existing.id));
      claimed.push({ reminderId: existing.id, reminderType: "post_grace", fullName: cycle.fullName, email: cycle.email, membershipNo: cycle.membershipNo, expiresOn: new Date(cycle.expiresOn) });
      continue;
    }
    try {
      const created = await db.insert(memberExpiryReminders).values({ memberId: cycle.memberId, membershipCycleId: cycle.cycleId, reminderType: "post_grace", deliveryStatus: "pending", attempts: 1 });
      claimed.push({ reminderId: Number(created[0].insertId), reminderType: "post_grace", fullName: cycle.fullName, email: cycle.email, membershipNo: cycle.membershipNo, expiresOn: new Date(cycle.expiresOn) });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
  return claimed;
}

export async function markMembershipExpiryReminder(reminderId: number, input: { status: "sent" | "failed"; error?: string }, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership reminders.");
  await db.update(memberExpiryReminders).set({ deliveryStatus: input.status, sentAt: input.status === "sent" ? now : null, lastError: input.status === "failed" ? input.error?.slice(0, 500) ?? "Unknown email delivery error." : null, updatedAt: now }).where(eq(memberExpiryReminders.id, reminderId));
}

export async function markSevenDayExpiryReminder(reminderId: number, input: { status: "sent" | "failed"; error?: string }, now = new Date()) {
  return markMembershipExpiryReminder(reminderId, input, now);
}

export async function getMembershipReminderAutomationByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership reminders.");
  const [config] = await db.select().from(membershipReminderAutomation).where(eq(membershipReminderAutomation.scheduleCronTaskUid, taskUid)).limit(1);
  return config;
}

export async function recordMembershipReminderAutomationRun(taskUid: string, input: { eligibleCount: number; error?: string }, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership reminders.");
  await db.update(membershipReminderAutomation).set({ lastRanAt: now, lastEligibleCount: input.eligibleCount, lastError: input.error?.slice(0, 500) ?? null, updatedAt: now }).where(eq(membershipReminderAutomation.scheduleCronTaskUid, taskUid));
}

export async function getActiveMemberSetupToken(tokenHash: string, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member account setup.");
  const rows = await db.select({ tokenId: accountSetupTokens.id, memberId: members.id, membershipNo: members.membershipNo, fullName: members.fullName, email: members.email }).from(accountSetupTokens).innerJoin(members, eq(accountSetupTokens.memberId, members.id)).where(and(eq(accountSetupTokens.tokenHash, tokenHash), isNull(accountSetupTokens.usedAt), gt(accountSetupTokens.expiresAt, now))).limit(1);
  return rows[0];
}

export async function setMemberPasswordFromSetupToken(input: { tokenHash: string; passwordHash: string; now?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member account setup.");
  const now = input.now ?? new Date();
  return db.transaction(async tx => {
    const rows = await tx.select({ tokenId: accountSetupTokens.id, memberId: accountSetupTokens.memberId }).from(accountSetupTokens).where(and(eq(accountSetupTokens.tokenHash, input.tokenHash), isNull(accountSetupTokens.usedAt), gt(accountSetupTokens.expiresAt, now))).limit(1);
    const token = rows[0];
    if (!token) return false;
    await tx.update(members).set({ passwordHash: input.passwordHash, mustChangePassword: false, accountStatus: "active", loginAttempts: 0, lockedUntil: null, updatedAt: now }).where(eq(members.id, token.memberId));
    await tx.update(accountSetupTokens).set({ usedAt: now }).where(and(eq(accountSetupTokens.id, token.tokenId), isNull(accountSetupTokens.usedAt)));
    return true;
  });
}

export async function recordMemberLoginSuccess(memberId: number, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member authentication.");
  await db.update(members).set({ loginAttempts: 0, lockedUntil: null, lastLogin: now, updatedAt: now }).where(eq(members.id, memberId));
}

export async function recordMemberLoginFailure(memberId: number, currentAttempts: number, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member authentication.");
  const attempts = currentAttempts + 1;
  const lockedUntil = attempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000) : null;
  await db.update(members).set({ loginAttempts: attempts, lockedUntil, accountStatus: lockedUntil ? "locked" : "active", updatedAt: now }).where(eq(members.id, memberId));
  return lockedUntil;
}

export async function changeMemberPassword(memberId: number, passwordHash: string, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member authentication.");
  await db.update(members).set({ passwordHash, mustChangePassword: false, loginAttempts: 0, lockedUntil: null, accountStatus: "active", updatedAt: now }).where(eq(members.id, memberId));
}

export async function updateMemberProfilePhoto(memberId: number, photo: { key: string; url: string }, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member profile updates.");
  await db.update(members).set({ profilePhotoKey: photo.key, profilePhotoUrl: photo.url, profilePhotoUpdatedAt: now, updatedAt: now }).where(eq(members.id, memberId));
}

export async function updateMemberProfileSettings(memberId: number, settings: { phone: string; city: string; district: string; state: string; address: string; foundationUpdatesOptIn: boolean }, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member profile updates.");
  await db.update(members).set({ ...settings, updatedAt: now }).where(eq(members.id, memberId));
}

export async function createMemberPasswordResetToken(memberId: number, tokenHash: string, expiresAt: Date, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for password reset.");
  await db.transaction(async tx => {
    await tx.update(memberPasswordResetTokens).set({ usedAt: now }).where(and(eq(memberPasswordResetTokens.memberId, memberId), isNull(memberPasswordResetTokens.usedAt)));
    await tx.insert(memberPasswordResetTokens).values({ memberId, tokenHash, expiresAt });
  });
}

export async function getActiveMemberPasswordResetToken(tokenHash: string, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for password reset.");
  const rows = await db.select({ tokenId: memberPasswordResetTokens.id, memberId: members.id, membershipNo: members.membershipNo, fullName: members.fullName, email: members.email }).from(memberPasswordResetTokens).innerJoin(members, eq(memberPasswordResetTokens.memberId, members.id)).where(and(eq(memberPasswordResetTokens.tokenHash, tokenHash), isNull(memberPasswordResetTokens.usedAt), gt(memberPasswordResetTokens.expiresAt, now))).limit(1);
  return rows[0];
}

export async function createMemberCertificateEmailToken(memberId: number, tokenHash: string, expiresAt: Date, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for certificate email access.");
  await db.transaction(async tx => {
    await tx.update(memberCertificateEmailTokens).set({ usedAt: now }).where(and(eq(memberCertificateEmailTokens.memberId, memberId), isNull(memberCertificateEmailTokens.usedAt)));
    await tx.insert(memberCertificateEmailTokens).values({ memberId, tokenHash, expiresAt });
  });
}

export async function getActiveMemberCertificateEmailToken(tokenHash: string, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for certificate email access.");
  const rows = await db.select({ memberId: members.id, membershipNo: members.membershipNo, fullName: members.fullName, email: members.email, memberType: members.memberType, joiningDate: members.joiningDate, status: members.status, accountStatus: members.accountStatus }).from(memberCertificateEmailTokens).innerJoin(members, eq(memberCertificateEmailTokens.memberId, members.id)).where(and(eq(memberCertificateEmailTokens.tokenHash, tokenHash), isNull(memberCertificateEmailTokens.usedAt), gt(memberCertificateEmailTokens.expiresAt, now))).limit(1);
  return rows[0];
}

export async function resetMemberPasswordFromToken(input: { tokenHash: string; passwordHash: string; now?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for password reset.");
  const now = input.now ?? new Date();
  return db.transaction(async tx => {
    const rows = await tx.select({ tokenId: memberPasswordResetTokens.id, memberId: memberPasswordResetTokens.memberId }).from(memberPasswordResetTokens).where(and(eq(memberPasswordResetTokens.tokenHash, input.tokenHash), isNull(memberPasswordResetTokens.usedAt), gt(memberPasswordResetTokens.expiresAt, now))).limit(1);
    const token = rows[0];
    if (!token) return false;
    await tx.update(members).set({ passwordHash: input.passwordHash, mustChangePassword: false, loginAttempts: 0, lockedUntil: null, accountStatus: "active", updatedAt: now }).where(eq(members.id, token.memberId));
    await tx.update(memberPasswordResetTokens).set({ usedAt: now }).where(and(eq(memberPasswordResetTokens.id, token.tokenId), isNull(memberPasswordResetTokens.usedAt)));
    return true;
  });
}

export async function listMemberProjectAssignments(memberId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member projects.");
  return db.select({ assignmentId: memberProjectAssignments.id, projectRole: memberProjectAssignments.projectRole, assignedAt: memberProjectAssignments.assignedAt, projectId: projects.id, projectCode: projects.projectCode, projectName: projects.projectName, projectTheme: projects.projectTheme, projectLocation: projects.projectLocation, projectStatus: projects.projectStatus, startDate: projects.startDate, endDate: projects.endDate }).from(memberProjectAssignments).innerJoin(projects, eq(memberProjectAssignments.projectId, projects.id)).where(and(eq(memberProjectAssignments.memberId, memberId), eq(memberProjectAssignments.assignmentStatus, "active"))).orderBy(desc(memberProjectAssignments.assignedAt));
}

export type MemberServiceType = "digital_skill_development" | "green_entrepreneurship" | "mentorship_business_support" | "workshops_seminars" | "building_community";
export type MemberServiceRequestStatus = "submitted" | "reviewing" | "accepted" | "not_available" | "completed" | "closed";

export async function createMemberServiceRequest(input: { requestRef: string; memberId: number; serviceType: MemberServiceType; message?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member service requests.");
  // Only an in-flight request (not yet completed/closed) blocks a new one for
  // the same programme area — members may re-join a programme after their
  // previous request was settled or declined.
  const [existing] = await db.select().from(memberServiceRequests).where(and(eq(memberServiceRequests.memberId, input.memberId), eq(memberServiceRequests.serviceType, input.serviceType), inArray(memberServiceRequests.status, ["submitted", "reviewing", "accepted"]))).limit(1);
  if (existing) return { request: existing, created: false };
  try {
    const result = await db.insert(memberServiceRequests).values({ ...input, message: input.message || null });
    const [request] = await db.select().from(memberServiceRequests).where(eq(memberServiceRequests.id, Number(result[0].insertId))).limit(1);
    if (!request) throw new Error("Member service request could not be saved.");
    return { request, created: true };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const [request] = await db.select().from(memberServiceRequests).where(and(eq(memberServiceRequests.memberId, input.memberId), eq(memberServiceRequests.serviceType, input.serviceType), inArray(memberServiceRequests.status, ["submitted", "reviewing", "accepted"]))).limit(1);
    if (!request) throw error;
    return { request, created: false };
  }
}

export async function listMemberServiceRequests(memberId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member service requests.");
  return db.select({ requestRef: memberServiceRequests.requestRef, serviceType: memberServiceRequests.serviceType, message: memberServiceRequests.message, status: memberServiceRequests.status, adminNote: memberServiceRequests.adminNote, reviewedAt: memberServiceRequests.reviewedAt, createdAt: memberServiceRequests.createdAt, updatedAt: memberServiceRequests.updatedAt }).from(memberServiceRequests).where(eq(memberServiceRequests.memberId, memberId)).orderBy(desc(memberServiceRequests.createdAt));
}

export async function listFoundationMemberServiceRequests(limit: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service requests.");
  return db.select({ requestRef: memberServiceRequests.requestRef, serviceType: memberServiceRequests.serviceType, message: memberServiceRequests.message, status: memberServiceRequests.status, adminNote: memberServiceRequests.adminNote, reviewedAt: memberServiceRequests.reviewedAt, createdAt: memberServiceRequests.createdAt, fullName: members.fullName, membershipNo: members.membershipNo, email: members.email }).from(memberServiceRequests).innerJoin(members, eq(memberServiceRequests.memberId, members.id)).orderBy(desc(memberServiceRequests.createdAt)).limit(limit);
}

export async function updateMemberServiceRequestStatus(input: { requestRef: string; status: MemberServiceRequestStatus; adminNote?: string; reviewedByOpenId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service requests.");
  await db.update(memberServiceRequests).set({ status: input.status, adminNote: input.adminNote || null, reviewedByOpenId: input.reviewedByOpenId, reviewedAt: new Date(), updatedAt: new Date() }).where(eq(memberServiceRequests.requestRef, input.requestRef));
}

export type MemberServiceCompletionStatus = "submitted" | "verified" | "rejected" | "paid";

/** Ownership-scoped request lookup: a member can only act on their own request. */
export async function getMemberServiceRequestByRefAndMember(requestRef: string, memberId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member service requests.");
  const [request] = await db.select().from(memberServiceRequests).where(and(eq(memberServiceRequests.requestRef, requestRef), eq(memberServiceRequests.memberId, memberId))).limit(1);
  return request ?? null;
}

export async function getMemberServiceCompletionByRequest(requestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for service completions.");
  const [completion] = await db.select().from(memberServiceCompletions).where(eq(memberServiceCompletions.requestId, requestId)).limit(1);
  return completion ?? null;
}

/** Admin verification queue: completions joined with member + request context. */
/** Live queue counts per completion status plus the money at stake: payouts
 *  approved but not yet settled, and payouts already settled to members.
 *  Per-programme totals show the admin where the payout budget is going. */
export async function countMemberServiceCompletionsByStatus() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service completions.");
  const [rows, programmeRows] = await Promise.all([
    db.select({ status: memberServiceCompletions.status, total: count(), payoutTotal: sum(memberServiceCompletions.payoutAmount) }).from(memberServiceCompletions).groupBy(memberServiceCompletions.status),
    db.select({ serviceType: memberServiceRequests.serviceType, settled: count(), settledPaise: sum(memberServiceCompletions.payoutAmount) }).from(memberServiceCompletions).innerJoin(memberServiceRequests, eq(memberServiceCompletions.requestId, memberServiceRequests.id)).where(eq(memberServiceCompletions.status, "paid")).groupBy(memberServiceRequests.serviceType),
  ]);
  const counts: Record<MemberServiceCompletionStatus, number> & { verifiedPayoutPaise: number; paidPayoutPaise: number; settledByProgramme: { serviceType: string; payouts: number; settledPaise: number }[] } = { submitted: 0, verified: 0, rejected: 0, paid: 0, verifiedPayoutPaise: 0, paidPayoutPaise: 0, settledByProgramme: [] };
  for (const row of rows) {
    counts[row.status] = Number(row.total);
    if (row.status === "verified") counts.verifiedPayoutPaise = Number(row.payoutTotal ?? 0);
    if (row.status === "paid") counts.paidPayoutPaise = Number(row.payoutTotal ?? 0);
  }
  for (const row of programmeRows) counts.settledByProgramme.push({ serviceType: row.serviceType, payouts: Number(row.settled), settledPaise: Number(row.settledPaise ?? 0) });
  return counts;
}

/** Verification + settlement timeline for the admin activity feed. Payout
 *  destinations are never included — only refs, amounts and methods. */
export async function listMemberCompletionActivity(limit = 12) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service completions.");
  const rows = await db.select({ completionRef: memberServiceCompletions.completionRef, serviceType: memberServiceRequests.serviceType, fullName: members.fullName, membershipNo: members.membershipNo, payoutAmount: memberServiceCompletions.payoutAmount, payoutMethod: memberServiceCompletions.payoutMethod, payoutReference: memberServiceCompletions.payoutReference, verifiedAt: memberServiceCompletions.verifiedAt, paidAt: memberServiceCompletions.paidAt, updatedAt: memberServiceCompletions.updatedAt, createdAt: memberServiceCompletions.createdAt }).from(memberServiceCompletions).innerJoin(memberServiceRequests, eq(memberServiceCompletions.requestId, memberServiceRequests.id)).innerJoin(members, eq(memberServiceCompletions.memberId, members.id)).orderBy(desc(memberServiceCompletions.updatedAt)).limit(limit);
  return rows;
}

export async function listFoundationMemberServiceCompletions(limit: number, status?: MemberServiceCompletionStatus) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service completions.");
  const rows = status
    ? await db.select({ id: memberServiceCompletions.id, completionRef: memberServiceCompletions.completionRef, requestRef: memberServiceRequests.requestRef, serviceType: memberServiceRequests.serviceType, memberId: memberServiceCompletions.memberId, details: memberServiceCompletions.details, driveLink: memberServiceCompletions.driveLink, status: memberServiceCompletions.status, rejectionReason: memberServiceCompletions.rejectionReason, payoutUpiId: memberServiceCompletions.payoutUpiId, payoutAccountName: memberServiceCompletions.payoutAccountName, payoutAccountNumber: memberServiceCompletions.payoutAccountNumber, payoutIfsc: memberServiceCompletions.payoutIfsc, payoutAmount: memberServiceCompletions.payoutAmount, payoutMethod: memberServiceCompletions.payoutMethod, payoutReference: memberServiceCompletions.payoutReference, payoutNote: memberServiceCompletions.payoutNote, verifiedAt: memberServiceCompletions.verifiedAt, paidAt: memberServiceCompletions.paidAt, createdAt: memberServiceCompletions.createdAt, updatedAt: memberServiceCompletions.updatedAt, fullName: members.fullName, membershipNo: members.membershipNo, email: members.email }).from(memberServiceCompletions).innerJoin(memberServiceRequests, eq(memberServiceCompletions.requestId, memberServiceRequests.id)).innerJoin(members, eq(memberServiceCompletions.memberId, members.id)).where(eq(memberServiceCompletions.status, status)).orderBy(desc(memberServiceCompletions.updatedAt)).limit(limit)
    : await db.select({ id: memberServiceCompletions.id, completionRef: memberServiceCompletions.completionRef, requestRef: memberServiceRequests.requestRef, serviceType: memberServiceRequests.serviceType, memberId: memberServiceCompletions.memberId, details: memberServiceCompletions.details, driveLink: memberServiceCompletions.driveLink, status: memberServiceCompletions.status, rejectionReason: memberServiceCompletions.rejectionReason, payoutUpiId: memberServiceCompletions.payoutUpiId, payoutAccountName: memberServiceCompletions.payoutAccountName, payoutAccountNumber: memberServiceCompletions.payoutAccountNumber, payoutIfsc: memberServiceCompletions.payoutIfsc, payoutAmount: memberServiceCompletions.payoutAmount, payoutMethod: memberServiceCompletions.payoutMethod, payoutReference: memberServiceCompletions.payoutReference, payoutNote: memberServiceCompletions.payoutNote, verifiedAt: memberServiceCompletions.verifiedAt, paidAt: memberServiceCompletions.paidAt, createdAt: memberServiceCompletions.createdAt, updatedAt: memberServiceCompletions.updatedAt, fullName: members.fullName, membershipNo: members.membershipNo, email: members.email }).from(memberServiceCompletions).innerJoin(memberServiceRequests, eq(memberServiceCompletions.requestId, memberServiceRequests.id)).innerJoin(members, eq(memberServiceCompletions.memberId, members.id)).orderBy(desc(memberServiceCompletions.updatedAt)).limit(limit);
  if (!rows.length) return [];
  const proofRows = await db.select({ completionId: memberServiceCompletionProofs.completionId, storageKey: memberServiceCompletionProofs.storageKey, originalName: memberServiceCompletionProofs.originalName, mimeType: memberServiceCompletionProofs.mimeType, fileSize: memberServiceCompletionProofs.fileSize }).from(memberServiceCompletionProofs).where(inArray(memberServiceCompletionProofs.completionId, rows.map(row => row.id)));
  return rows.map(row => ({ ...row, proofs: proofRows.filter(proof => proof.completionId === row.id) }));
}

export async function getFoundationMemberServiceCompletion(completionRef: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service completions.");
  const [completion] = await db.select().from(memberServiceCompletions).where(eq(memberServiceCompletions.completionRef, completionRef)).limit(1);
  return completion ?? null;
}

/**
 * Verified completions publish the payout terms to the member. Returns null
 * when the report was already processed elsewhere; the memberId powers the
 * member notification without a second race-prone lookup.
 */
export async function verifyMemberServiceCompletion(input: { completionRef: string; payoutAmount: number; payoutMethod: "upi" | "bank_transfer" | "other"; payoutNote?: string; verifiedByOpenId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service completions.");
  return db.transaction(async tx => {
    const [completion] = await tx.select().from(memberServiceCompletions).where(and(eq(memberServiceCompletions.completionRef, input.completionRef), eq(memberServiceCompletions.status, "submitted"))).limit(1).for("update");
    if (!completion) return null;
    await tx.update(memberServiceCompletions).set({ status: "verified", payoutAmount: input.payoutAmount, payoutMethod: input.payoutMethod, payoutNote: input.payoutNote || null, rejectionReason: null, verifiedByOpenId: input.verifiedByOpenId, verifiedAt: new Date(), updatedAt: new Date() }).where(eq(memberServiceCompletions.id, completion.id));
    return { completionRef: completion.completionRef, memberId: completion.memberId, payoutAmount: input.payoutAmount, payoutMethod: input.payoutMethod, payoutNote: input.payoutNote || null };
  });
}

export async function rejectMemberServiceCompletion(input: { completionRef: string; rejectionReason: string; verifiedByOpenId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service completions.");
  const result = await db.update(memberServiceCompletions).set({ status: "rejected", rejectionReason: input.rejectionReason, verifiedByOpenId: input.verifiedByOpenId, verifiedAt: new Date(), payoutAmount: null, payoutMethod: null, payoutNote: null, updatedAt: new Date() }).where(and(eq(memberServiceCompletions.completionRef, input.completionRef), eq(memberServiceCompletions.status, "submitted")));
  return Number(result[0].affectedRows) > 0;
}

/**
 * Settling a verified completion records the payment reference, marks the
 * service request completed for the member's timeline and returns the payout
 * details that back the member's receipt.
 */
export async function payMemberServiceCompletion(input: { completionRef: string; payoutReference: string; paidByOpenId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service completions.");
  return db.transaction(async tx => {
    const [completion] = await tx.select().from(memberServiceCompletions).where(and(eq(memberServiceCompletions.completionRef, input.completionRef), eq(memberServiceCompletions.status, "verified"))).limit(1).for("update");
    if (!completion) return null;
    const paidAt = new Date();
    await tx.update(memberServiceCompletions).set({ status: "paid", payoutReference: input.payoutReference, paidByOpenId: input.paidByOpenId, paidAt, updatedAt: paidAt }).where(eq(memberServiceCompletions.id, completion.id));
    await tx.update(memberServiceRequests).set({ status: "completed", updatedAt: paidAt }).where(eq(memberServiceRequests.id, completion.requestId));
    return { completionRef: completion.completionRef, requestId: completion.requestId, memberId: completion.memberId, payoutAmount: completion.payoutAmount, payoutMethod: completion.payoutMethod, payoutNote: completion.payoutNote, payoutReference: input.payoutReference, paidAt };
  });
}

/** Signed-URL lookup for one proof file, ownership-checked against the member. */
export async function getMemberCompletionProof(memberId: number, storageKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for service completions.");
  const [proof] = await db.select({ id: memberServiceCompletionProofs.id, storageKey: memberServiceCompletionProofs.storageKey, originalName: memberServiceCompletionProofs.originalName, mimeType: memberServiceCompletionProofs.mimeType }).from(memberServiceCompletionProofs).innerJoin(memberServiceCompletions, eq(memberServiceCompletionProofs.completionId, memberServiceCompletions.id)).where(and(eq(memberServiceCompletionProofs.storageKey, storageKey), eq(memberServiceCompletions.memberId, memberId))).limit(1);
  return proof ?? null;
}

/** Creates or replaces the member's completion report for one service request. */
export async function upsertMemberServiceCompletion(input: { completionRef: string; requestId: number; memberId: number; details: string; driveLink?: string; payoutUpiId?: string; payoutAccountName?: string; payoutAccountNumber?: string; payoutIfsc?: string; proofs: { storageKey: string; originalName: string; mimeType: string; fileSize: number }[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for service completions.");
  const [existing] = await db.select().from(memberServiceCompletions).where(eq(memberServiceCompletions.requestId, input.requestId)).limit(1);
  if (existing && (existing.status === "submitted" || existing.status === "verified" || existing.status === "paid")) return { completion: existing, created: false };
  const proofRows = input.proofs.map(proof => ({ storageKey: proof.storageKey, originalName: proof.originalName, mimeType: proof.mimeType, fileSize: proof.fileSize }));
  if (existing) {
    // Rejected reports are resubmitted in place; old proof rows are replaced by
    // the new upload set so storage and the record never drift apart.
    await db.transaction(async tx => {
      await tx.delete(memberServiceCompletionProofs).where(eq(memberServiceCompletionProofs.completionId, existing.id));
      await tx.update(memberServiceCompletions).set({ details: input.details, driveLink: input.driveLink || null, payoutUpiId: input.payoutUpiId || null, payoutAccountName: input.payoutAccountName || null, payoutAccountNumber: input.payoutAccountNumber || null, payoutIfsc: input.payoutIfsc || null, status: "submitted", rejectionReason: null, verifiedByOpenId: null, verifiedAt: null, updatedAt: new Date() }).where(eq(memberServiceCompletions.id, existing.id));
      if (proofRows.length) await tx.insert(memberServiceCompletionProofs).values(proofRows.map(row => ({ ...row, completionId: existing.id })));
    });
    const [updated] = await db.select().from(memberServiceCompletions).where(eq(memberServiceCompletions.id, existing.id)).limit(1);
    return { completion: updated, created: false };
  }
  const result = await db.transaction(async tx => {
    const inserted = await tx.insert(memberServiceCompletions).values({ completionRef: input.completionRef, requestId: input.requestId, memberId: input.memberId, details: input.details, driveLink: input.driveLink || null, payoutUpiId: input.payoutUpiId || null, payoutAccountName: input.payoutAccountName || null, payoutAccountNumber: input.payoutAccountNumber || null, payoutIfsc: input.payoutIfsc || null, status: "submitted" });
    const completionId = Number(inserted[0].insertId);
    if (proofRows.length) await tx.insert(memberServiceCompletionProofs).values(proofRows.map(row => ({ ...row, completionId })));
    return completionId;
  });
  const [completion] = await db.select().from(memberServiceCompletions).where(eq(memberServiceCompletions.id, result)).limit(1);
  return { completion, created: true };
}

/**
 * Raises an admin alert for a freshly submitted (or resubmitted) completion
 * report so the verification queue never goes unnoticed. applicationRef is
 * the completion ref — the alerts table keys on it for de-dup, and the
 * message deliberately carries no payout destination (UPI/bank stay private).
 */
export async function createCompletionSubmittedAdminAlert(input: { completionRef: string; memberId: number; fullName: string; membershipNo: string; serviceType: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation alerts.");
  // applicationRef (the completion ref) is unique: a resubmitted report
  // re-raises its unread alert instead of stacking duplicates.
  await db.insert(foundationAdminAlerts).values({ alertType: "completion_submitted", applicationRef: input.completionRef, memberId: input.memberId, title: "Completion report ready to verify", message: `${input.fullName} · ${input.membershipNo} submitted a report for ${input.serviceType.replaceAll("_", " ")}.` }).onDuplicateKeyUpdate({ set: { title: "Completion report ready to verify", message: `${input.fullName} · ${input.membershipNo} submitted a report for ${input.serviceType.replaceAll("_", " ")}.`, readAt: null, createdAt: new Date() } });
}

/** Member-facing view: the member's own completions with proof metadata only (signed URLs are minted by the router). */export async function listMemberServiceCompletions(memberId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for service completions.");
  const rows = await db.select({ id: memberServiceCompletions.id, completionRef: memberServiceCompletions.completionRef, requestId: memberServiceCompletions.requestId, requestRef: memberServiceRequests.requestRef, serviceType: memberServiceRequests.serviceType, details: memberServiceCompletions.details, driveLink: memberServiceCompletions.driveLink, status: memberServiceCompletions.status, rejectionReason: memberServiceCompletions.rejectionReason, payoutUpiId: memberServiceCompletions.payoutUpiId, payoutAccountName: memberServiceCompletions.payoutAccountName, payoutAccountNumber: memberServiceCompletions.payoutAccountNumber, payoutIfsc: memberServiceCompletions.payoutIfsc, payoutAmount: memberServiceCompletions.payoutAmount, payoutMethod: memberServiceCompletions.payoutMethod, payoutReference: memberServiceCompletions.payoutReference, payoutNote: memberServiceCompletions.payoutNote, verifiedAt: memberServiceCompletions.verifiedAt, paidAt: memberServiceCompletions.paidAt, createdAt: memberServiceCompletions.createdAt, updatedAt: memberServiceCompletions.updatedAt }).from(memberServiceCompletions).innerJoin(memberServiceRequests, eq(memberServiceCompletions.requestId, memberServiceRequests.id)).where(eq(memberServiceCompletions.memberId, memberId)).orderBy(desc(memberServiceCompletions.updatedAt));
  if (!rows.length) return [];
  const proofRows = await db.select({ completionId: memberServiceCompletionProofs.completionId, originalName: memberServiceCompletionProofs.originalName, mimeType: memberServiceCompletionProofs.mimeType, fileSize: memberServiceCompletionProofs.fileSize, storageKey: memberServiceCompletionProofs.storageKey }).from(memberServiceCompletionProofs).innerJoin(memberServiceCompletions, eq(memberServiceCompletionProofs.completionId, memberServiceCompletions.id)).where(inArray(memberServiceCompletions.id, rows.map(row => row.id)));
  return rows.map(row => ({ ...row, proofs: proofRows.filter(proof => proof.completionId === row.id).map(proof => ({ originalName: proof.originalName, mimeType: proof.mimeType, fileSize: proof.fileSize, storageKey: proof.storageKey })) }));
}

export type MemberSupportStatus = "submitted" | "reviewing" | "responded" | "closed";

export async function createMemberSupportMessage(input: { messageRef: string; memberId: number; message: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member support messages.");
  const result = await db.insert(memberSupportMessages).values(input);
  const [message] = await db.select().from(memberSupportMessages).where(eq(memberSupportMessages.id, Number(result[0].insertId))).limit(1);
  if (!message) throw new Error("Member support message could not be saved.");
  return message;
}

export async function listMemberSupportMessages(memberId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member support messages.");
  return db.select({ messageRef: memberSupportMessages.messageRef, message: memberSupportMessages.message, status: memberSupportMessages.status, adminReply: memberSupportMessages.adminReply, repliedAt: memberSupportMessages.repliedAt, createdAt: memberSupportMessages.createdAt, updatedAt: memberSupportMessages.updatedAt }).from(memberSupportMessages).where(eq(memberSupportMessages.memberId, memberId)).orderBy(asc(memberSupportMessages.createdAt));
}

export async function listFoundationMemberSupportMessages(limit: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation support messages.");
  return db.select({ messageRef: memberSupportMessages.messageRef, message: memberSupportMessages.message, status: memberSupportMessages.status, adminReply: memberSupportMessages.adminReply, repliedAt: memberSupportMessages.repliedAt, createdAt: memberSupportMessages.createdAt, fullName: members.fullName, membershipNo: members.membershipNo, email: members.email }).from(memberSupportMessages).innerJoin(members, eq(memberSupportMessages.memberId, members.id)).orderBy(desc(memberSupportMessages.updatedAt)).limit(limit);
}

export async function respondToMemberSupportMessage(input: { messageRef: string; status: MemberSupportStatus; adminReply?: string; repliedByOpenId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation support messages.");
  const hasReply = Boolean(input.adminReply?.trim());
  await db.update(memberSupportMessages).set({ status: input.status, adminReply: hasReply ? input.adminReply!.trim() : null, repliedByOpenId: hasReply ? input.repliedByOpenId : null, repliedAt: hasReply ? new Date() : null, updatedAt: new Date() }).where(eq(memberSupportMessages.messageRef, input.messageRef));
}

export async function listMembersForAdmin(limit = 200) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member administration.");
  return db.select({ id: members.id, membershipNo: members.membershipNo, fullName: members.fullName, email: members.email, memberType: members.memberType, role: members.role, status: members.status, accountStatus: members.accountStatus, joiningDate: members.joiningDate, lastLogin: members.lastLogin }).from(members).orderBy(desc(members.createdAt)).limit(limit);
}

/**
 * Admin 360° member view: the core member record plus each member's programme
 * activity (request count, completion counts per status, money settled to
 * them, last activity time). Payout destinations are never included.
 */
export async function listMembersWithProgrammeProfile(limit = 200) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member administration.");
  const memberRows = await db.select({ id: members.id, membershipNo: members.membershipNo, fullName: members.fullName, email: members.email, memberType: members.memberType, role: members.role, status: members.status, accountStatus: members.accountStatus, joiningDate: members.joiningDate, lastLogin: members.lastLogin }).from(members).orderBy(desc(members.createdAt)).limit(limit);
  if (!memberRows.length) return [];
  const ids = memberRows.map(row => row.id);
  const [requestRows, completionRows] = await Promise.all([
    db.select({ memberId: memberServiceRequests.memberId, total: count() }).from(memberServiceRequests).where(inArray(memberServiceRequests.memberId, ids)).groupBy(memberServiceRequests.memberId),
    db.select({ memberId: memberServiceCompletions.memberId, status: memberServiceCompletions.status, total: count(), payoutTotal: sum(memberServiceCompletions.payoutAmount), lastTouched: max(memberServiceCompletions.updatedAt) }).from(memberServiceCompletions).where(inArray(memberServiceCompletions.memberId, ids)).groupBy(memberServiceCompletions.memberId, memberServiceCompletions.status),
  ]);
  return memberRows.map(member => {
    const requestCount = Number(requestRows.find(row => row.memberId === member.id)?.total ?? 0);
    const rows = completionRows.filter(row => row.memberId === member.id);
    const completions = { submitted: 0, verified: 0, rejected: 0, paid: 0 };
    let settledPaise = 0;
    let lastProgrammeActivityAt: Date | null = null;
    for (const row of rows) {
      completions[row.status] = Number(row.total);
      if (row.status === "paid") settledPaise = Number(row.payoutTotal ?? 0);
      const touched = row.lastTouched ? new Date(row.lastTouched) : null;
      if (touched && (!lastProgrammeActivityAt || touched > lastProgrammeActivityAt)) lastProgrammeActivityAt = touched;
    }
    return { ...member, programmeRequests: requestCount, completions, settledPaise, lastProgrammeActivityAt };
  });
}

export async function assignMemberToProject(input: { memberId: number; projectId: number; projectRole: string; assignedByOpenId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member project assignment.");
  const existing = await db.select({ id: memberProjectAssignments.id }).from(memberProjectAssignments).where(and(eq(memberProjectAssignments.memberId, input.memberId), eq(memberProjectAssignments.projectId, input.projectId))).limit(1);
  if (existing[0]) {
    await db.update(memberProjectAssignments).set({ projectRole: input.projectRole, assignmentStatus: "active", assignedByOpenId: input.assignedByOpenId, updatedAt: new Date() }).where(eq(memberProjectAssignments.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(memberProjectAssignments).values({ ...input, assignmentStatus: "active" });
  return Number(result[0].insertId);
}

/** Idempotent newsletter subscribe: re-subscribing a known email only restores its status. */
export async function subscribeNewsletterEmail(input: InsertNewsletterSubscriber) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for newsletter subscription.");
  try {
    await db.insert(newsletterSubscribers).values(input);
    return { created: true as const };
  } catch (error) {
    // Drizzle wraps driver errors ("Failed query: ..."); the duplicate signal lives on the cause chain.
    const duplicateSignals: unknown[] = [error, error instanceof Error ? error.cause : null];
    const isDuplicate = duplicateSignals.some(candidate => {
      if (!candidate) return false;
      const record = candidate as { message?: string; errno?: number; code?: string };
      return (typeof record.message === "string" && /duplicate|unique/i.test(record.message)) || record.errno === 1062 || record.code === "ER_DUP_ENTRY";
    });
    if (!isDuplicate) throw error;
    await db.update(newsletterSubscribers).set({ status: "subscribed", source: input.source ?? "footer", updatedAt: new Date() }).where(eq(newsletterSubscribers.email, input.email));
    return { created: false as const };
  }
}

export async function createContactInquiry(inquiry: InsertContactInquiry) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for inquiry submission.");
  await db.insert(contactInquiries).values(inquiry);
}

export async function createDonationIntent(intent: InsertDonationIntent) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for donation detail submission.");
  await db.insert(donationIntents).values(intent);
}

export async function markDonationIntentNotification(donationRef: string, status: "sent" | "failed", error?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for donation notification tracking.");
  await db.update(donationIntents).set({ notificationStatus: status, notificationSentAt: status === "sent" ? new Date() : null, notificationError: status === "failed" ? error?.slice(0, 500) ?? "Unknown notification error." : null, updatedAt: new Date() }).where(eq(donationIntents.donationRef, donationRef));
}

export async function markContactInquiryNotification(inquiryRef: string, status: "sent" | "failed", error?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for inquiry notification tracking.");
  await db.update(contactInquiries).set({
    notificationStatus: status,
    notificationSentAt: status === "sent" ? new Date() : null,
    notificationError: status === "failed" ? error?.slice(0, 500) ?? "Unknown notification error." : null,
    updatedAt: new Date(),
  }).where(eq(contactInquiries.inquiryRef, inquiryRef));
}

export async function markMembershipApplicationNotification(applicationRef: string, status: "sent" | "failed", error?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership notification tracking.");
  await db.update(membershipApplications).set({
    notificationStatus: status,
    notificationSentAt: status === "sent" ? new Date() : null,
    notificationError: status === "failed" ? error?.slice(0, 500) ?? "Unknown notification error." : null,
    updatedAt: new Date(),
  }).where(eq(membershipApplications.applicationRef, applicationRef));
}

export async function getPaymentTransactionByGatewayOrderId(gatewayOrderId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for payment lookup.");
  const rows = await db.select().from(paymentTransactions).where(eq(paymentTransactions.gatewayOrderId, gatewayOrderId)).limit(1);
  return rows[0];
}

export async function getPaymentTransactionByGatewayPaymentId(gatewayPaymentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for payment lookup.");
  const rows = await db.select().from(paymentTransactions).where(eq(paymentTransactions.gatewayPaymentId, gatewayPaymentId)).limit(1);
  return rows[0];
}

/**
 * Fallback for refunds created directly in the Razorpay dashboard: no local
 * payment_refunds row exists, so the transaction itself is flipped to refunded
 * and an audit entry records the externally initiated refund.
 */
export async function markPaymentTransactionRefundedByPaymentId(gatewayPaymentId: string, gatewayRefundId: string, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for payment status update.");
  return db.transaction(async tx => {
    const [result] = await tx.update(paymentTransactions).set({ status: "refunded", updatedAt: now }).where(and(eq(paymentTransactions.gatewayPaymentId, gatewayPaymentId), inArray(paymentTransactions.status, ["verified", "captured"])));
    if (result.affectedRows === 0) return { matched: false as const };
    await tx.insert(misAuditLogs).values({ actorOpenId: "razorpay-webhook", action: "PAYMENT_REFUNDED_EXTERNALLY", entityType: "payment_transaction", entityId: gatewayPaymentId, details: { gatewayRefundId } });
    return { matched: true as const };
  });
}

export async function getPaymentTransactionByReceipt(receipt: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for payment lookup.");
  const rows = await db.select().from(paymentTransactions).where(eq(paymentTransactions.receipt, receipt)).limit(1);
  return rows[0];
}

export async function markPaymentTransactionStatus(gatewayOrderId: string, status: "verified" | "captured" | "failed", gatewayPaymentId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for payment status update.");
  await db.update(paymentTransactions).set({ status, gatewayPaymentId, updatedAt: new Date() }).where(eq(paymentTransactions.gatewayOrderId, gatewayOrderId));
}

export async function claimPaymentReceiptDelivery(receipt: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for receipt delivery.");
  const [result] = await db.update(paymentTransactions).set({ receiptDeliveryStatus: "sending", receiptError: null, updatedAt: new Date() }).where(and(
    eq(paymentTransactions.receipt, receipt),
    eq(paymentTransactions.receiptDeliveryStatus, "pending"),
    inArray(paymentTransactions.status, ["verified", "captured"]),
  ));
  return result.affectedRows === 1;
}

export async function markPaymentReceiptSent(receipt: string, messageId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for receipt delivery.");
  await db.update(paymentTransactions).set({ receiptDeliveryStatus: "sent", receiptSentAt: new Date(), receiptMessageId: messageId, receiptError: null, updatedAt: new Date() }).where(and(eq(paymentTransactions.receipt, receipt), eq(paymentTransactions.receiptDeliveryStatus, "sending")));
}

export async function markPaymentReceiptFailed(receipt: string, message: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for receipt delivery.");
  await db.update(paymentTransactions).set({ receiptDeliveryStatus: "failed", receiptError: message.slice(0, 500), updatedAt: new Date() }).where(and(eq(paymentTransactions.receipt, receipt), eq(paymentTransactions.receiptDeliveryStatus, "sending")));
}

export async function getPaymentWebhookEvent(gatewayEventId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for webhook lookup.");
  const rows = await db.select().from(paymentWebhookEvents).where(eq(paymentWebhookEvents.gatewayEventId, gatewayEventId)).limit(1);
  return rows[0];
}

export async function createPaymentWebhookEvent(input: { gatewayEventId: string; eventType: string; gatewayOrderId?: string; gatewayPaymentId?: string; payloadHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for webhook creation.");
  await db.insert(paymentWebhookEvents).values(input);
}

export async function markPaymentWebhookEventProcessed(gatewayEventId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for webhook update.");
  await db.update(paymentWebhookEvents).set({ status: "processed", processedAt: new Date() }).where(eq(paymentWebhookEvents.gatewayEventId, gatewayEventId));
}

// ─── Refund persistence ────────────────────────────────────────────────────
// Gateway refunds are recorded with a DB transaction so a refund never exists
// without its audit trail. Idempotency is enforced by the unique gateway refund id.

export async function recordPaymentRefundInitiated(input: { refundRef: string; receipt: string; gatewayPaymentId: string; gatewayRefundId: string; amount: number; reason?: string; initiatedByOpenId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for refund recording.");
  const now = new Date();
  return db.transaction(async tx => {
    await tx.insert(paymentRefunds).values({ refundRef: input.refundRef, receipt: input.receipt, gatewayPaymentId: input.gatewayPaymentId, gatewayRefundId: input.gatewayRefundId, amount: input.amount, reason: input.reason || null, initiatedByOpenId: input.initiatedByOpenId, status: "initiated" });
    // The transaction stays in its captured/verified state until the gateway confirms
    // the refund, so a failed refund never corrupts the payment record.
    await tx.update(paymentTransactions).set({ updatedAt: now }).where(eq(paymentTransactions.receipt, input.receipt));
    await tx.insert(misAuditLogs).values({ actorOpenId: input.initiatedByOpenId, action: "PAYMENT_REFUND_CREATED", entityType: "payment_refund", entityId: input.refundRef, details: { receipt: input.receipt, gatewayRefundId: input.gatewayRefundId, amount: input.amount } });
    return { refundRef: input.refundRef } as const;
  });
}

export async function markPaymentRefundProcessed(gatewayRefundId: string, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for refund update.");
  return db.transaction(async tx => {
    const [refund] = await tx.select().from(paymentRefunds).where(eq(paymentRefunds.gatewayRefundId, gatewayRefundId)).limit(1);
    if (!refund) return { matched: false as const };
    if (refund.status === "processed") return { matched: true as const, alreadyProcessed: true as const, refund };
    await tx.update(paymentRefunds).set({ status: "processed", processedAt: now, updatedAt: now }).where(eq(paymentRefunds.id, refund.id));
    await tx.update(paymentTransactions).set({ status: "refunded", updatedAt: now }).where(eq(paymentTransactions.receipt, refund.receipt));
    await tx.insert(misAuditLogs).values({ actorOpenId: "razorpay-webhook", action: "PAYMENT_REFUND_PROCESSED", entityType: "payment_refund", entityId: refund.refundRef, details: { gatewayRefundId, receipt: refund.receipt } });
    return { matched: true as const, alreadyProcessed: false as const, refund };
  });
}

export async function getPaymentRefundByGatewayRefundId(gatewayRefundId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for refund lookup.");
  const rows = await db.select().from(paymentRefunds).where(eq(paymentRefunds.gatewayRefundId, gatewayRefundId)).limit(1);
  return rows[0];
}

/** Any non-failed refund already attached to a receipt; used to block duplicate gateway refund creation. */
export async function getPaymentRefundsByReceipt(receipt: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for refund lookup.");
  return db.select({ refundRef: paymentRefunds.refundRef, status: paymentRefunds.status, amount: paymentRefunds.amount, gatewayRefundId: paymentRefunds.gatewayRefundId }).from(paymentRefunds).where(and(eq(paymentRefunds.receipt, receipt), inArray(paymentRefunds.status, ["initiated", "processed"])));
}

export async function markPaymentRefundFailed(gatewayRefundId: string, error: string, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for refund update.");
  await db.update(paymentRefunds).set({ status: "failed", reason: error.slice(0, 500), updatedAt: now }).where(and(eq(paymentRefunds.gatewayRefundId, gatewayRefundId), eq(paymentRefunds.status, "initiated")));
}

export async function markPaymentRefundNotified(refundRef: string, status: "sent" | "failed", error?: string, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for refund notification tracking.");
  await db.update(paymentRefunds).set({ notificationStatus: status, notificationError: status === "failed" ? error?.slice(0, 500) ?? "Unknown refund notification error." : null, updatedAt: now }).where(eq(paymentRefunds.refundRef, refundRef));
}

export async function listPaymentRefunds(limit: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for refund listing.");
  return db.select({ refundRef: paymentRefunds.refundRef, receipt: paymentRefunds.receipt, amount: paymentRefunds.amount, status: paymentRefunds.status, reason: paymentRefunds.reason, notificationStatus: paymentRefunds.notificationStatus, processedAt: paymentRefunds.processedAt, createdAt: paymentRefunds.createdAt, supporterName: paymentTransactions.supporterName, supporterEmail: paymentTransactions.supporterEmail }).from(paymentRefunds).innerJoin(paymentTransactions, eq(paymentRefunds.receipt, paymentTransactions.receipt)).orderBy(desc(paymentRefunds.createdAt)).limit(limit);
}

// ─── Volunteer application persistence ─────────────────────────────────────

export async function createVolunteerApplication(application: InsertVolunteerApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for volunteer application submission.");
  await db.insert(volunteerApplications).values(application);
}

export async function markVolunteerApplicationNotification(applicationRef: string, status: "sent" | "failed", error?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for volunteer notification tracking.");
  await db.update(volunteerApplications).set({ notificationStatus: status, notificationSentAt: status === "sent" ? new Date() : null, notificationError: status === "failed" ? error?.slice(0, 500) ?? "Unknown volunteer notification error." : null, updatedAt: new Date() }).where(eq(volunteerApplications.applicationRef, applicationRef));
}

export async function markVolunteerDecisionNotification(applicationRef: string, status: "sent" | "failed", error?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for volunteer notification tracking.");
  await db.update(volunteerApplications).set({ decisionNotificationStatus: status, notificationError: status === "failed" ? error?.slice(0, 500) ?? "Unknown volunteer decision notification error." : null, updatedAt: new Date() }).where(eq(volunteerApplications.applicationRef, applicationRef));
}

export async function listVolunteerApplications(limit: number, status?: "submitted" | "reviewing" | "approved" | "rejected" | "inactive") {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for volunteer review.");
  const selection = { applicationRef: volunteerApplications.applicationRef, fullName: volunteerApplications.fullName, email: volunteerApplications.email, phone: volunteerApplications.phone, city: volunteerApplications.city, state: volunteerApplications.state, skills: volunteerApplications.skills, availability: volunteerApplications.availability, interests: volunteerApplications.interests, message: volunteerApplications.message, status: volunteerApplications.status, reviewNotes: volunteerApplications.reviewNotes, notificationStatus: volunteerApplications.notificationStatus, decisionNotificationStatus: volunteerApplications.decisionNotificationStatus, reviewedAt: volunteerApplications.reviewedAt, createdAt: volunteerApplications.createdAt };
  const query = db.select(selection).from(volunteerApplications);
  if (status) return query.where(eq(volunteerApplications.status, status)).orderBy(desc(volunteerApplications.createdAt)).limit(limit);
  return query.orderBy(desc(volunteerApplications.createdAt)).limit(limit);
}

export async function updateVolunteerApplicationStatus(input: { applicationRef: string; status: "submitted" | "reviewing" | "approved" | "rejected" | "inactive"; reviewNotes?: string; reviewerOpenId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for volunteer review.");
  const now = new Date();
  await db.transaction(async tx => {
    await tx.update(volunteerApplications).set({ status: input.status, reviewNotes: input.reviewNotes || null, reviewerOpenId: input.reviewerOpenId, reviewedAt: now, updatedAt: now }).where(eq(volunteerApplications.applicationRef, input.applicationRef));
    await tx.insert(misAuditLogs).values({ actorOpenId: input.reviewerOpenId, action: `VOLUNTEER_APPLICATION_${input.status.toUpperCase()}`, entityType: "volunteer_application", entityId: input.applicationRef, details: { notes: input.reviewNotes?.slice(0, 200) ?? null } });
  });
}

export async function getVolunteerApplicationByRef(applicationRef: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for volunteer review.");
  const rows = await db.select().from(volunteerApplications).where(eq(volunteerApplications.applicationRef, applicationRef)).limit(1);
  return rows[0];
}

// ─── Member payment receipts (ownership-scoped) ─────────────────────────────

export type MemberPaymentReceipt = { receipt: string; kind: "donation" | "membership" | "payout"; amount: number; currency: string; status: string; gatewayPaymentId: string | null; payoutMethod?: "upi" | "bank_transfer" | "other" | null; payoutDestination?: string | null; programme?: string | null; createdAt: Date };

export async function listMemberPaymentReceipts(email: string, limit = 25): Promise<MemberPaymentReceipt[]> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member receipts.");
  const payments = await db.select({ receipt: paymentTransactions.receipt, kind: paymentTransactions.kind, amount: paymentTransactions.amount, currency: paymentTransactions.currency, status: paymentTransactions.status, gatewayPaymentId: paymentTransactions.gatewayPaymentId, createdAt: paymentTransactions.createdAt }).from(paymentTransactions).where(eq(paymentTransactions.supporterEmail, email.toLowerCase())).orderBy(desc(paymentTransactions.createdAt)).limit(limit);
  return payments.map(row => ({ ...row, kind: row.kind as "donation" | "membership" }));
}

/**
 * Receipts unified with settled programme payouts: gateway-verified payments
 * keep their own kind, while paid completions surface as "payout" receipts
 * keyed to the member's own account id.
 */
export async function listMemberPaymentReceiptsWithPayouts(email: string, memberId: number, limit = 25): Promise<MemberPaymentReceipt[]> {
  const [payments, payouts] = await Promise.all([
    listMemberPaymentReceipts(email, limit),
    (async () => {
      const db = await getDb();
      if (!db) throw new Error("Database is unavailable for member receipts.");
      return db.select({ receipt: memberServiceCompletions.completionRef, amount: memberServiceCompletions.payoutAmount, reference: memberServiceCompletions.payoutReference, method: memberServiceCompletions.payoutMethod, upiId: memberServiceCompletions.payoutUpiId, accountNumber: memberServiceCompletions.payoutAccountNumber, paidAt: memberServiceCompletions.paidAt, programmeType: memberServiceRequests.serviceType }).from(memberServiceCompletions).innerJoin(memberServiceRequests, eq(memberServiceCompletions.requestId, memberServiceRequests.id)).where(and(eq(memberServiceCompletions.memberId, memberId), eq(memberServiceCompletions.status, "paid"))).orderBy(desc(memberServiceCompletions.paidAt)).limit(limit);
    })(),
  ]);
  return [...payments, ...payouts.map(payout => ({ receipt: payout.receipt, kind: "payout" as const, amount: payout.amount ?? 0, currency: "INR", status: "paid", gatewayPaymentId: payout.reference, payoutMethod: payout.method, payoutDestination: payout.upiId ? `UPI · ${payout.upiId}` : payout.accountNumber ? `Bank · ${payout.accountNumber.replace(/.(?=.{4})/g, "•")}` : null, programme: payout.programmeType ? payout.programmeType.replaceAll("_", " ") : null, createdAt: payout.paidAt ?? new Date(0) }))].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, limit);
}

export async function getMemberPaymentReceipt(receipt: string, email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member receipts.");
  const rows = await db.select({ receipt: paymentTransactions.receipt, kind: paymentTransactions.kind, amount: paymentTransactions.amount, currency: paymentTransactions.currency, status: paymentTransactions.status, gatewayPaymentId: paymentTransactions.gatewayPaymentId, supporterName: paymentTransactions.supporterName, supporterEmail: paymentTransactions.supporterEmail, createdAt: paymentTransactions.createdAt }).from(paymentTransactions).where(and(eq(paymentTransactions.receipt, receipt), eq(paymentTransactions.supporterEmail, email.toLowerCase()))).limit(1);
  return rows[0];
}

export async function getFoundationManagementSummary() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  const [[membership], [inquiry], [donation], [payment], [media], [unreadAlert], [volunteer], [pendingRequests], payoutStats] = await Promise.all([
    db.select({ total: count() }).from(membershipApplications),
    db.select({ total: count() }).from(contactInquiries),
    db.select({ total: count() }).from(donationIntents),
    db.select({ total: count() }).from(paymentTransactions),
    db.select({ total: count() }).from(galleryMedia).where(eq(galleryMedia.status, "published")),
    db.select({ total: count() }).from(foundationAdminAlerts).where(isNull(foundationAdminAlerts.readAt)),
    db.select({ total: count() }).from(volunteerApplications),
    // New programme requests that still need an accept/decline decision.
    db.select({ total: count() }).from(memberServiceRequests).where(eq(memberServiceRequests.status, "submitted")),
    countMemberServiceCompletionsByStatus(),
  ]);
  return { memberships: membership?.total ?? 0, inquiries: inquiry?.total ?? 0, donations: donation?.total ?? 0, payments: payment?.total ?? 0, publishedMedia: media?.total ?? 0, unreadAdminAlerts: unreadAlert?.total ?? 0, volunteers: volunteer?.total ?? 0, programmeRequests: pendingRequests?.total ?? 0, payoutQueue: payoutStats.verified, payoutQueuePaise: payoutStats.verifiedPayoutPaise, settledPayouts: payoutStats.paid, settledPayoutPaise: payoutStats.paidPayoutPaise };
}

export async function listFoundationAdminAlerts(limit: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation alerts.");
  return db.select({ id: foundationAdminAlerts.id, alertType: foundationAdminAlerts.alertType, applicationRef: foundationAdminAlerts.applicationRef, title: foundationAdminAlerts.title, message: foundationAdminAlerts.message, readAt: foundationAdminAlerts.readAt, createdAt: foundationAdminAlerts.createdAt }).from(foundationAdminAlerts).orderBy(desc(foundationAdminAlerts.createdAt)).limit(limit);
}

export async function markFoundationAdminAlertRead(alertId: number, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation alerts.");
  await db.update(foundationAdminAlerts).set({ readAt: now }).where(and(eq(foundationAdminAlerts.id, alertId), isNull(foundationAdminAlerts.readAt)));
}

export async function listMembershipApplications(limit: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  return db.select({ applicationRef: membershipApplications.applicationRef, fullName: membershipApplications.fullName, email: membershipApplications.email, phone: membershipApplications.phone, district: membershipApplications.district, state: membershipApplications.state, membershipType: membershipApplications.membershipType, status: membershipApplications.status, notificationStatus: membershipApplications.notificationStatus, idProofType: membershipApplications.idProofType, idProofOriginalName: membershipApplications.idProofOriginalName, createdAt: membershipApplications.createdAt, updatedAt: membershipApplications.updatedAt }).from(membershipApplications).orderBy(desc(membershipApplications.createdAt)).limit(limit);
}

export async function updateMembershipApplicationStatus(applicationRef: string, status: "submitted" | "reviewing" | "approved" | "declined") {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  await db.update(membershipApplications).set({ status, updatedAt: new Date() }).where(eq(membershipApplications.applicationRef, applicationRef));
}

export async function getMembershipApplicationProofKey(applicationRef: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  const rows = await db.select({ idProofStorageKey: membershipApplications.idProofStorageKey }).from(membershipApplications).where(eq(membershipApplications.applicationRef, applicationRef)).limit(1);
  return rows[0]?.idProofStorageKey;
}

export async function listContactInquiries(limit: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  return db.select().from(contactInquiries).orderBy(desc(contactInquiries.createdAt)).limit(limit);
}

export async function updateContactInquiryStatus(inquiryRef: string, status: "submitted" | "reviewing" | "responded" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  await db.update(contactInquiries).set({ status, updatedAt: new Date() }).where(eq(contactInquiries.inquiryRef, inquiryRef));
}

export async function listDonationIntents(limit: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  return db.select({ donationRef: donationIntents.donationRef, fullName: donationIntents.fullName, email: donationIntents.email, phone: donationIntents.phone, state: donationIntents.state, city: donationIntents.city, amount: donationIntents.amount, status: donationIntents.status, notificationStatus: donationIntents.notificationStatus, paymentReceipt: donationIntents.paymentReceipt, createdAt: donationIntents.createdAt, updatedAt: donationIntents.updatedAt }).from(donationIntents).orderBy(desc(donationIntents.createdAt)).limit(limit);
}

export async function updateDonationIntentStatus(donationRef: string, status: "details_submitted" | "checkout_created" | "verified" | "captured" | "failed" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  await db.update(donationIntents).set({ status, updatedAt: new Date() }).where(eq(donationIntents.donationRef, donationRef));
}

export async function listPaymentTransactions(limit: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  return db.select().from(paymentTransactions).orderBy(desc(paymentTransactions.createdAt)).limit(limit);
}

export async function createGalleryMedia(media: InsertGalleryMedia) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation media management.");
  await db.insert(galleryMedia).values(media);
}

export async function listGalleryMedia(limit: number, publishedOnly = false) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation media management.");
  if (publishedOnly) return db.select().from(galleryMedia).where(eq(galleryMedia.status, "published")).orderBy(asc(galleryMedia.displayOrder), desc(galleryMedia.createdAt)).limit(limit);
  return db.select().from(galleryMedia).orderBy(asc(galleryMedia.displayOrder), desc(galleryMedia.createdAt)).limit(limit);
}

export async function isPublishedGalleryStorageKey(storageKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation media management.");
  const [media] = await db.select({ id: galleryMedia.id }).from(galleryMedia).where(and(eq(galleryMedia.storageKey, storageKey), eq(galleryMedia.status, "published"))).limit(1);
  return Boolean(media);
}

export async function updateGalleryMedia(mediaRef: string, input: { title?: string; description?: string; altText?: string; quarter?: string; displayOrder?: number; status?: "draft" | "published" | "archived" }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation media management.");
  await db.update(galleryMedia).set({ ...input, publishedAt: input.status === "published" ? new Date() : undefined, updatedAt: new Date() }).where(eq(galleryMedia.mediaRef, mediaRef));
}

export async function findGalleryMediaBySourceFileId(sourceFileId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation media management.");
  const [media] = await db.select().from(galleryMedia).where(eq(galleryMedia.sourceFileId, sourceFileId)).limit(1);
  return media;
}

export type GoogleDriveGalleryMediaInput = { mediaRef: string; title: string; description: string; altText: string; quarter: string; displayOrder: number; storageKey: string; imageUrl: string; originalName: string; mimeType: string; fileSize: number; sourceFileId: string; uploadedByOpenId: string };

export async function persistGoogleDriveGalleryMedia(db: any, existing: any, input: GoogleDriveGalleryMediaInput) {
  const decision = decideGalleryDriveImport(existing);
  if (decision === "create_draft") {
    await db.insert(galleryMedia).values({ ...input, source: "google_drive", status: "draft", publishedAt: null });
  } else if (decision === "update_existing" && existing) {
    await db.update(galleryMedia).set({ title: input.title, description: input.description, altText: input.altText, quarter: input.quarter, displayOrder: input.displayOrder, storageKey: input.storageKey, imageUrl: input.imageUrl, originalName: input.originalName, mimeType: input.mimeType, fileSize: input.fileSize, updatedAt: new Date() }).where(eq(galleryMedia.id, existing.id));
  }
  return { decision, mediaRef: existing?.mediaRef ?? input.mediaRef };
}

export async function ingestGoogleDriveGalleryMedia(input: GoogleDriveGalleryMediaInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation media management.");
  const existing = await findGalleryMediaBySourceFileId(input.sourceFileId);
  return persistGoogleDriveGalleryMedia(db, existing, input);
}

export async function getGalleryDriveSyncConfig() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation Drive configuration.");
  const [config] = await db.select().from(galleryDriveSync).orderBy(desc(galleryDriveSync.updatedAt)).limit(1);
  return config;
}

export async function saveGalleryDriveSyncConfig(input: { folderUrl: string; folderId: string; syncIntervalHours: number; updatedByOpenId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation Drive configuration.");
  const existing = await getGalleryDriveSyncConfig();
  const values = { folderUrl: input.folderUrl, folderId: input.folderId, syncIntervalHours: input.syncIntervalHours, syncStatus: "needs_access" as const, scheduleCronTaskUid: null, lastSyncedAt: null, lastSyncError: "Awaiting authorised Drive access before sync can be enabled.", updatedByOpenId: input.updatedByOpenId, updatedAt: new Date() };
  if (existing) { await db.update(galleryDriveSync).set(values).where(eq(galleryDriveSync.id, existing.id)); return existing.id; }
  const result = await db.insert(galleryDriveSync).values(values);
  return Number(result[0].insertId);
}

export async function listMisProjects(limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  return db.select().from(projects).orderBy(desc(projects.createdAt)).limit(limit);
}

export async function getMisProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return undefined;
  const [partners, objectives, targetGroups, activities] = await Promise.all([
    db.select().from(fundersPartners).where(eq(fundersPartners.projectId, projectId)).orderBy(desc(fundersPartners.createdAt)),
    db.select().from(projectObjectives).where(eq(projectObjectives.projectId, projectId)).orderBy(desc(projectObjectives.createdAt)),
    db.select().from(projectTargetGroups).where(eq(projectTargetGroups.projectId, projectId)).orderBy(desc(projectTargetGroups.createdAt)),
    db.select().from(projectActivities).where(eq(projectActivities.projectId, projectId)).orderBy(desc(projectActivities.createdAt)),
  ]);
  return { project, partners, objectives, targetGroups, activities };
}

export async function getNextProjectSequence() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const [result] = await db.select({ total: count() }).from(projects);
  return Number(result?.total ?? 0) + 1;
}

export async function createMisProject(input: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projects).values(input);
  return Number(result[0].insertId);
}

export async function createMisFunderPartner(input: typeof fundersPartners.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(fundersPartners).values(input);
  return Number(result[0].insertId);
}

export async function createMisObjective(input: typeof projectObjectives.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projectObjectives).values(input);
  return Number(result[0].insertId);
}

export async function createMisTargetGroup(input: typeof projectTargetGroups.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projectTargetGroups).values(input);
  return Number(result[0].insertId);
}

export async function createMisActivity(input: typeof projectActivities.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projectActivities).values(input);
  return Number(result[0].insertId);
}

export async function getNextBeneficiarySequence() { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const [result] = await db.select({ total: count() }).from(beneficiaries); return Number(result?.total ?? 0) + 1; }
export async function getNextFieldEventSequence() { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const [result] = await db.select({ total: count() }).from(fieldEvents); return Number(result?.total ?? 0) + 1; }
export async function findDuplicateBeneficiary(input: { name: string; phoneNumber: string; village: string }) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); return db.select({ id: beneficiaries.id, beneficiaryId: beneficiaries.beneficiaryId, projectId: beneficiaries.projectId }).from(beneficiaries).where(and(eq(beneficiaries.name, input.name), eq(beneficiaries.phoneNumber, input.phoneNumber), eq(beneficiaries.village, input.village))).limit(5); }
export async function createMisBeneficiary(input: typeof beneficiaries.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const result = await db.insert(beneficiaries).values(input); return Number(result[0].insertId); }
export async function listMisBeneficiaries(projectId?: number, limit = 100) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const query = db.select().from(beneficiaries); return projectId ? query.where(eq(beneficiaries.projectId, projectId)).orderBy(desc(beneficiaries.createdAt)).limit(limit) : query.orderBy(desc(beneficiaries.createdAt)).limit(limit); }
export async function createMisFieldEvent(input: typeof fieldEvents.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const result = await db.insert(fieldEvents).values(input); return Number(result[0].insertId); }
export async function createMisTargetAchievement(input: typeof targetsAchievement.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const result = await db.insert(targetsAchievement).values(input); return Number(result[0].insertId); }
export async function createMisOutput(input: typeof projectOutputs.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const result = await db.insert(projectOutputs).values(input); return Number(result[0].insertId); }
export async function createMisOutcome(input: typeof projectOutcomes.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const result = await db.insert(projectOutcomes).values(input); return Number(result[0].insertId); }
export async function getMisDeliverySummary(projectId: number) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const [beneficiaryTotal, eventTotal, targetTotal, outputTotal, outcomeTotal] = await Promise.all([db.select({ total: count() }).from(beneficiaries).where(eq(beneficiaries.projectId, projectId)), db.select({ total: count() }).from(fieldEvents).where(eq(fieldEvents.projectId, projectId)), db.select({ total: count() }).from(targetsAchievement).where(eq(targetsAchievement.projectId, projectId)), db.select({ total: count() }).from(projectOutputs).where(eq(projectOutputs.projectId, projectId)), db.select({ total: count() }).from(projectOutcomes).where(eq(projectOutcomes.projectId, projectId))]); return { beneficiaries: Number(beneficiaryTotal[0]?.total ?? 0), fieldEvents: Number(eventTotal[0]?.total ?? 0), targetRecords: Number(targetTotal[0]?.total ?? 0), outputs: Number(outputTotal[0]?.total ?? 0), outcomes: Number(outcomeTotal[0]?.total ?? 0) }; }
export async function createMisTeamAssignment(input: typeof projectTeamAssignments.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const result = await db.insert(projectTeamAssignments).values(input); return Number(result[0].insertId); }
export async function createMisBudgetAllocation(input: typeof projectBudgetAllocations.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const result = await db.insert(projectBudgetAllocations).values(input); return Number(result[0].insertId); }
export async function createMisFinanceRecord(input: typeof projectFinanceRecords.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const result = await db.insert(projectFinanceRecords).values(input); return Number(result[0].insertId); }
export async function updateMisFinanceApproval(id: number, approvalStatus: "pending" | "approved" | "rejected", approvedByOpenId?: string) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); await db.update(projectFinanceRecords).set({ approvalStatus, approvedByOpenId: approvedByOpenId ?? null, updatedAt: new Date() }).where(eq(projectFinanceRecords.id, id)); }
export async function createMisDocument(input: typeof projectDocuments.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const result = await db.insert(projectDocuments).values(input); return Number(result[0].insertId); }
export async function createMisMonitoringIndicator(input: typeof monitoringIndicators.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const result = await db.insert(monitoringIndicators).values(input); return Number(result[0].insertId); }
export async function createMisRisk(input: typeof projectRisks.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const result = await db.insert(projectRisks).values(input); return Number(result[0].insertId); }
export async function createMisReport(input: typeof projectReports.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const result = await db.insert(projectReports).values(input); return Number(result[0].insertId); }
export async function listMisReports(limit = 100) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); return db.select().from(projectReports).orderBy(desc(projectReports.dueDate)).limit(limit); }
export async function listMisRisks(limit = 100) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); return db.select().from(projectRisks).orderBy(desc(projectRisks.updatedAt)).limit(limit); }
export async function createMisImpactEvidence(input: typeof impactEvidence.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); const result = await db.insert(impactEvidence).values(input); return Number(result[0].insertId); }
export async function upsertMisClosure(input: typeof projectClosures.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); await db.insert(projectClosures).values(input).onDuplicateKeyUpdate({ set: { closureDate: input.closureDate, finalReportApproved: input.finalReportApproved, financeApproved: input.financeApproved, impactEvidenceAttached: input.impactEvidenceAttached, lessonsLearned: input.lessonsLearned, closureStatus: input.closureStatus, approvedByOpenId: input.approvedByOpenId, updatedAt: new Date() } }); }
export async function writeMisAuditLog(input: typeof misAuditLogs.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); await db.insert(misAuditLogs).values(input); }
export async function listMisAuditLogs(limit = 100) { const db = await getDb(); if (!db) throw new Error("Database is unavailable for Project MIS."); return db.select().from(misAuditLogs).orderBy(desc(misAuditLogs.createdAt)).limit(limit); }

function dateKey(value: Date | string | null | undefined) {
  if (!value) return "";
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

export async function getMisDashboardSummary() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const [allProjects, beneficiaryCount, allRisks, allReports, recentActivity] = await Promise.all([
    db.select().from(projects).orderBy(desc(projects.updatedAt)).limit(100),
    db.select({ total: count() }).from(beneficiaries),
    db.select().from(projectRisks).orderBy(desc(projectRisks.updatedAt)).limit(100),
    db.select().from(projectReports).orderBy(desc(projectReports.dueDate)).limit(100),
    db.select().from(misAuditLogs).orderBy(desc(misAuditLogs.createdAt)).limit(5),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const dueSoonEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const reportsDueSoon = allReports.filter((report) => {
    const dueDate = dateKey(report.dueDate);
    return dueDate >= today && dueDate <= dueSoonEnd && !["submitted", "approved"].includes(report.status);
  });
  const overdueReports = allReports.filter((report) => dateKey(report.dueDate) < today && !["submitted", "approved"].includes(report.status));
  const statusCounts = allProjects.reduce<Record<string, number>>((summary, project) => { summary[project.projectStatus] = (summary[project.projectStatus] ?? 0) + 1; return summary; }, {});
  return {
    totalProjects: allProjects.length,
    projectStatusCounts: statusCounts,
    totalBeneficiaries: Number(beneficiaryCount[0]?.total ?? 0),
    openRisks: allRisks.filter((risk) => risk.status !== "closed").length,
    overdueReports: overdueReports.length,
    reportsDueSoon,
    recentActivity,
    projects: allProjects,
  };
}

export async function getMisProjectCommandCenter(projectId: number) {
  const [detail, delivery, risks, reports] = await Promise.all([
    getMisProject(projectId),
    getMisDeliverySummary(projectId),
    listMisRisks(200),
    listMisReports(200),
  ]);
  if (!detail) return undefined;
  return { ...detail, delivery, risks: risks.filter((risk) => risk.projectId === projectId), reports: reports.filter((report) => report.projectId === projectId) };
}
