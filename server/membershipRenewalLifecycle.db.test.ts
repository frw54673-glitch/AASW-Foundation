// LIVE RENEWAL DB TEST (runs against the local MariaDB, like the app does in production)
// Proves: expired member + same email + same PAN -> SAME membershipNo reactivated,
// new cycle #2 active, cycle #1 expired, old details preserved.
// Skips automatically when no local DB is reachable (CI/production-safe).
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb, createMembershipApplicationWithActivation, expireDueMemberships } from "./db";
import { members, memberMembershipCycles, membershipApplications } from "../drizzle/schema";
import { encryptSensitiveValue, hashSensitiveMatchValue } from "./security/sensitive";

const EMAIL = "renewal.dbtest@aaswfoundation.test";
const PAN = "AAAAA0000Z";
const hasDb = await getDb();

describe.skipIf(!hasDb)("membership renewal automation (live database)", () => {
  beforeAll(async () => {
    const db = hasDb;
    await db.delete(memberMembershipCycles).where(eq(memberMembershipCycles.memberId, hasDb.select({ id: members.id }).from(members).where(eq(members.email, EMAIL)).limit(1)));
    await db.delete(members).where(eq(members.email, EMAIL));
    await db.delete(membershipApplications).where(eq(membershipApplications.email, EMAIL));
  });

  it("expires an overdue annual member, then reactivates the SAME member on renewal with same email+PAN", async () => {
    const db = hasDb;
    const joining = new Date(Date.now() - 550 * 86400000); // term ended ~6 months ago

    // 1) historical application + member + cycle, exactly like the original signup left them
    await db.insert(membershipApplications).values({
      applicationRef: "AASW-MEM-RENEW-DBTEST", fullName: "Renewal DB Test", email: EMAIL, phone: "9876543211",
      city: "Lucknow", state: "Uttar Pradesh", district: "Lucknow", membershipType: "annual",
      panEncrypted: encryptSensitiveValue(PAN), panHash: hashSensitiveMatchValue(PAN), panLastFour: PAN.slice(-4),
      idProofType: "aadhaar", idProofStorageKey: "membership-applications/AASW-MEM-RENEW-DBTEST/id-proof.png",
      idProofOriginalName: "proof.png", idProofMimeType: "image/png", status: "approved", notificationStatus: "sent",
    });
    const [seeded] = await db.insert(members).values({
      applicationRef: "AASW-MEM-RENEW-DBTEST", membershipNo: "AASW-2026-9002", fullName: "Renewal DB Test",
      email: EMAIL, phone: "9876543211", memberType: "annual", city: "Lucknow", state: "Uttar Pradesh",
      district: "Lucknow", joiningDate: joining, status: "active", accountStatus: "active",
      passwordHash: bcrypt.hashSync("AaswTest#2026", 12), mustChangePassword: false,
    }).$returningId();
    const [memberRow] = await db.select().from(members).where(eq(members.email, EMAIL)).limit(1);
    await db.insert(memberMembershipCycles).values({
      memberId: memberRow.id, applicationRef: "AASW-MEM-RENEW-DBTEST", cycleNumber: 1, membershipType: "annual",
      startsOn: joining, expiresOn: new Date(joining.getTime() + 364 * 86400000), status: "active",
    });

    // 2) daily cron function: expire overdue memberships
    const expiredCount = await expireDueMemberships(new Date());
    expect(expiredCount).toBeGreaterThanOrEqual(1);
    const [expired] = await db.select().from(members).where(eq(members.email, EMAIL)).limit(1);
    expect(expired.status).toBe("expired");
    expect(expired.accountStatus).toBe("inactive");

    // 3) renewal application (same email, same PAN) through the app's activation function
    const activation = await createMembershipApplicationWithActivation({
      application: {
        applicationRef: "AASW-MEM-RENEW-DBTEST-2", fullName: "Renewal DB Test", email: EMAIL, phone: "9876543212",
        city: "Kanpur", state: "Uttar Pradesh", district: "Kanpur Nagar", membershipType: "annual",
        panEncrypted: encryptSensitiveValue(PAN), panHash: hashSensitiveMatchValue(PAN), panLastFour: PAN.slice(-4),
        idProofType: "aadhaar", idProofStorageKey: "membership-applications/AASW-MEM-RENEW-DBTEST-2/id-proof.png",
        idProofOriginalName: "proof.png", idProofMimeType: "image/png", status: "approved", notificationStatus: "pending",
      },
      setupTokenHash: "a".repeat(64), setupTokenExpiresAt: new Date(Date.now() + 3600_000),
      renewalIntent: true,
    });
    expect(activation.isRenewal).toBe(true);
    expect(activation.membershipNo).toBe("AASW-2026-9002"); // SAME member ID, not a new one

    const [renewed] = await db.select().from(members).where(eq(members.email, EMAIL)).limit(1);
    expect(renewed.status).toBe("active");
    expect(renewed.accountStatus).toBe("active");
    expect(renewed.id).toBe(memberRow.id);
    expect(renewed.membershipNo).toBe("AASW-2026-9002");
    // updated details from the renewal application take over
    expect(renewed.city).toBe("Kanpur");
    expect(renewed.phone).toBe("9876543212");
    // old password hash preserved (login with same password)
    expect(bcrypt.compareSync("AaswTest#2026", renewed.passwordHash)).toBe(true);
    expect(renewed.loginAttempts).toBe(0);
    expect(renewed.lockedUntil).toBeNull();

    // cycles: #1 expired + #2 active with a fresh 1-year term
    const cycles = await db.select().from(memberMembershipCycles).where(eq(memberMembershipCycles.memberId, memberRow.id));
    expect(cycles).toHaveLength(2);
    const c1 = cycles.find(c => c.cycleNumber === 1);
    const c2 = cycles.find(c => c.cycleNumber === 2);
    expect(c1?.status).toBe("expired");
    expect(c2?.status).toBe("active");
    expect(c2?.membershipType).toBe("annual");
    // annual term = valid through the day before the next anniversary (364/365 days depending on year)
    const c2Days = (c2!.expiresOn!.getTime() - c2!.startsOn!.getTime()) / 86400000;
    expect(Math.round(c2Days)).toBeGreaterThanOrEqual(363);
    expect(Math.round(c2Days)).toBeLessThanOrEqual(365);

    // 4) negative: same email but WRONG PAN must be rejected
    await expect(createMembershipApplicationWithActivation({
      application: {
        applicationRef: "AASW-MEM-RENEW-DBTEST-3", fullName: "Renewal DB Test", email: EMAIL, phone: "9876543211",
        city: "Lucknow", state: "Uttar Pradesh", district: "Lucknow", membershipType: "annual",
        panEncrypted: encryptSensitiveValue("BBBBB1111C"), panHash: hashSensitiveMatchValue("BBBBB1111C"), panLastFour: "111C",
        idProofType: "aadhaar", idProofStorageKey: "membership-applications/AASW-MEM-RENEW-DBTEST-3/id-proof.png",
        idProofOriginalName: "proof.png", idProofMimeType: "image/png", status: "approved", notificationStatus: "pending",
      },
      setupTokenHash: "b".repeat(64), setupTokenExpiresAt: new Date(Date.now() + 3600_000),
      renewalIntent: true,
    })).rejects.toThrow("Membership renewal identity did not match.");
  });

  afterAll(async () => {
    const db = hasDb;
    if (!db) return;
    const [row] = await db.select({ id: members.id }).from(members).where(eq(members.email, EMAIL)).limit(1);
    if (row) await db.delete(memberMembershipCycles).where(eq(memberMembershipCycles.memberId, row.id));
    await db.delete(members).where(eq(members.email, EMAIL));
    await db.delete(membershipApplications).where(eq(membershipApplications.email, EMAIL));
  });
});
