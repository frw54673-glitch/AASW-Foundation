// DEEP AUTOMATION VERIFICATION (phase 2) — drives the app's own cron handler
// code + db functions via tsx with a local mock OAuth server, fully isolated
// from the user's live dev server (different port). Seeds e2e-auto-* rows only,
// cleans up at the end. Run with:
//   DATABASE_URL="mysql://root@localhost:3306/aasw_foundation" \
//   PII_ENCRYPTION_KEY=... JWT_SECRET=... npx tsx scripts/verify-automations-phase2.ts
import "dotenv/config";
import { createServer } from "node:http";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { and, eq, like } from "drizzle-orm";
import { getDb, expireDueMemberships, claimSevenDayExpiryReminderCandidates, claimPostGraceRenewalFollowUpCandidates, markMembershipExpiryReminder, recordMembershipExpiryAutomationRun, recordMembershipReminderAutomationRun, createMembershipApplicationWithActivation } from "../server/db";
import { handleMembershipExpirySchedule } from "../server/scheduled/membershipExpiry";
import { handleMembershipReminderSchedule as reminderHandler } from "../server/scheduled/membershipReminder";
import { encryptSensitiveValue, hashSensitiveMatchValue } from "../server/security/sensitive";
import { membershipExpiryAutomation, membershipReminderAutomation, members, memberMembershipCycles, membershipApplications, memberExpiryReminders, foundationAdminAlerts, accountSetupTokens } from "../drizzle/schema";

const hasDb = await getDb();
if (!hasDb) { console.error("FAIL no local DB"); process.exit(1); }
const db = hasDb;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET required");
const key = new TextEncoder().encode(JWT_SECRET);

// ---------- 1. MOCK OAUTH SERVER (what the deployment platform provides) ----
// Must listen on the port baked into OAUTH_SERVER_URL *before the app modules
// were imported* (the sdk's axios client captures baseURL at import time), so
// the harness is launched with OAUTH_SERVER_URL=http://127.0.0.1:3999.
const seen: { path: string; body: any }[] = [];
const mockOAuth = createServer((req, res) => {
  let raw = "";
  req.on("data", c => raw += c);
  req.on("end", async () => {
    seen.push({ path: req.url, body: raw });
    res.setHeader("content-type", "application/json");
    if (req.url?.includes("GetUserInfoWithJwt")) {
      // Answer exactly like the platform: echo the caller identity + the
      // taskUid registered for that scheduled task. Unknown openIds map to an
      // unregistered taskUid (orphan-skip path).
      let openId = "cron_local_e2e", name = "Manus Scheduled Task";
      let taskUid: string = "task-e2e-unknown-uid";
      try {
        const payload = JSON.parse(raw || "{}");
        const { payload: claims } = await jwtVerify(payload.jwtToken, key, { algorithms: ["HS256"] });
        openId = String(claims.openId); name = String(claims.name ?? name);
        if (openId.endsWith("reminder")) taskUid = "task-e2e-reminder";
        else if (openId.endsWith("expiry")) taskUid = "task-e2e-expiry";
      } catch { /* fall back to defaults above */ }
      res.end(JSON.stringify({ openId, projectId: "local-e2e", name, taskUid }));
      return;
    }
    res.statusCode = 404;
    res.end("{}");
  });
});
await new Promise<void>(resolve => mockOAuth.listen(3999, "127.0.0.1", resolve));
console.log(`mock OAuth platform server on http://127.0.0.1:3999 (OAUTH_SERVER_URL=${process.env.OAUTH_SERVER_URL})`);
if (process.env.OAUTH_SERVER_URL !== "http://127.0.0.1:3999") {
  console.error("FAIL: launch with OAUTH_SERVER_URL=http://127.0.0.1:3999 so the sdk axios client binds to the mock");
  process.exit(1);
}

// ---------- 2. CLEAN SLATE ----------
const PREFIX = "e2e-auto-";
const existingMembers = await db.select({ id: members.id }).from(members).where(like(members.email, `${PREFIX}%`));
for (const m of existingMembers) {
  await db.delete(memberExpiryReminders).where(eq(memberExpiryReminders.memberId, m.id));
  await db.delete(accountSetupTokens).where(eq(accountSetupTokens.memberId, m.id));
  await db.delete(memberMembershipCycles).where(eq(memberMembershipCycles.memberId, m.id));
}
await db.delete(members).where(like(members.email, `${PREFIX}%`));
await db.delete(foundationAdminAlerts).where(like(foundationAdminAlerts.applicationRef, "E2E-AUTO-%"));
await db.delete(membershipApplications).where(like(membershipApplications.applicationRef, "E2E-AUTO-%"));
await db.delete(membershipExpiryAutomation).where(like(membershipExpiryAutomation.scheduleCronTaskUid, "task-e2e-%"));
await db.delete(membershipReminderAutomation).where(like(membershipReminderAutomation.scheduleCronTaskUid, "task-e2e-%"));

const today = new Date();
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const thisY = today.getUTCFullYear(), thisM = today.getUTCMonth() + 1, thisD = today.getUTCDate();

function appRef(tag: string) { return `E2E-AUTO-${tag}`; }
async function seedApplication(tag: string, email: string, membershipType: "annual" | "lifetime") {
  await db.insert(membershipApplications).values({
    applicationRef: appRef(tag), fullName: `E2E Automation ${tag}`, email, phone: "9000000000",
    city: "Lucknow", state: "Uttar Pradesh", district: "Lucknow", membershipType,
    panEncrypted: encryptSensitiveValue("AAAAA0000Z"), panHash: hashSensitiveMatchValue("AAAAA0000Z"), panLastFour: "000Z",
    idProofType: "aadhaar", idProofStorageKey: `membership-applications/${appRef(tag)}/id-proof.png`,
    idProofOriginalName: "proof.png", idProofMimeType: "image/png", status: "approved", notificationStatus: "sent",
  });
}
async function seedMember(tag: string, email: string, joiningDate: Date, cycleStartsOn: Date, cycleExpiresOn: Date | null, cycleStatus: "active" | "expired") {
  await db.insert(members).values({
    applicationRef: appRef(tag), membershipNo: `E2E-AUTO-${tag}`, fullName: `E2E Automation ${tag}`, email,
    phone: "9000000000", memberType: "annual", city: "Lucknow", state: "Uttar Pradesh", district: "Lucknow",
    joiningDate, status: "active", accountStatus: "active",
    passwordHash: bcrypt.hashSync("AaswTest#2026", 10), mustChangePassword: false,
  });
  const [memberRow] = await db.select().from(members).where(eq(members.email, email)).limit(1);
  await db.insert(memberMembershipCycles).values({
    memberId: memberRow.id, applicationRef: appRef(tag), cycleNumber: 1, membershipType: "annual",
    startsOn: cycleStartsOn, expiresOn: cycleExpiresOn, status: cycleStatus,
  });
  return memberRow.id;
}

// ---------- 3. SEED 5 MEMBER STATES ----------
// applications first: members.applicationRef has an FK to membership_applications
const seedEmails: [string, string][] = [["M1", "m1"], ["M2", "m2"], ["M3", "m3"], ["M4", "m4"], ["M5", "m5"]];
for (const [tag, suffix] of seedEmails) {
  await seedApplication(tag, `${PREFIX}${suffix}@x.test`, "annual");
}
// M1: membership already expired long ago (expiry dues: flip to expired+inactive)
// joining 400 days ago: term (365d) ended 35 days ago, well past the 3-day grace
const m1Join = new Date(thisY, thisM - 1, thisD - 400);
const m1 = await seedMember("M1", `${PREFIX}m1@x.test`, m1Join, m1Join, new Date(thisY, thisM - 1, thisD - 400 + 365), "active");
// M2: annual term ended 1 day ago (in grace: must NOT be expired yet, no post_grace)
const m2Join = new Date(thisY, thisM - 1, thisD - 365);
const m2 = await seedMember("M2", `${PREFIX}m2@x.test`, m2Join, m2Join, new Date(thisY, thisM - 1, thisD - 1), "active");
// M3: annual term ended 5 days ago, already expired (post-grace follow-up due)
const m3Join = new Date(thisY, thisM - 1, thisD - 370);
const m3 = await seedMember("M3", `${PREFIX}m3@x.test`, m3Join, m3Join, new Date(thisY, thisM - 1, thisD - 5), "expired");
await db.update(members).set({ status: "expired", accountStatus: "inactive" }).where(eq(members.id, m3));
// M4: expires in 3 days (seven_day reminder due)
const m4Join = new Date(thisY, thisM - 1, thisD - 362);
const m4 = await seedMember("M4", `${PREFIX}m4@x.test`, m4Join, m4Join, new Date(thisY, thisM - 1, thisD + 3), "active");
// M5: expires in 3 days, reminder already SENT earlier (idempotency: no re-send)
const m5Join = new Date(thisY, thisM - 1, thisD - 362);
const m5 = await seedMember("M5", `${PREFIX}m5@x.test`, m5Join, m5Join, new Date(thisY, thisM - 1, thisD + 3), "active");
const [m5cycle] = await db.select().from(memberMembershipCycles).where(eq(memberMembershipCycles.memberId, m5)).limit(1);
const m5BaselineSentAt = new Date();
await db.insert(memberExpiryReminders).values({ memberId: m5, membershipCycleId: m5cycle.id, reminderType: "seven_day", deliveryStatus: "sent", attempts: 1, sentAt: m5BaselineSentAt });
const m5SentAtBaseline = m5BaselineSentAt.getTime();
console.log("seeded M1(overdue active) M2(in-grace) M3(post-grace expired) M4(due-soon) M5(due-soon already-sent)");

// config rows for both automations
await db.insert(membershipExpiryAutomation).values({ scheduleCronTaskUid: "task-e2e-expiry" });
await db.insert(membershipReminderAutomation).values({ scheduleCronTaskUid: "task-e2e-reminder" });
console.log("seeded automation config rows (task-e2e-expiry, task-e2e-reminder)");

// ---------- 4. DRIVE THE ACTUAL HANDLERS (cron-authenticated) ----------
const mkReq = (cookie: string) => ({ headers: { cookie, host: "localhost:3000" }, get: () => "localhost:3000", protocol: "http" }) as any;
const mkRes = () => { let r: any = { statusCode: 200, status(s: number) { r.statusCode = s; return r; }, json(b: any) { r.body = b; return r; } }; return r; };

async function mintCron(openId: string) {
  return new SignJWT({ openId, appId: "local-e2e", name: "Manus Scheduled Task" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + 3600_000) / 1000)).sign(key);
}
const expiryCronToken = await mintCron("cron_local_e2e_expiry");
const reminderCronToken = await mintCron("cron_local_e2e_reminder");

const results: { name: string; ok: boolean; detail: string }[] = [];
const pass = (name: string, ok: boolean, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  |  " + detail : ""}`); };

// ---- 4a. EXPIRY RUN ----
let res = mkRes();
await handleMembershipExpirySchedule(mkReq(`app_session_id=${expiryCronToken}`), res);
let body = res.body as any;
pass("expiry cron run succeeds over full auth chain (mock OAuth -> cron user -> config match)", res.statusCode === 200 && body?.ok === true, `status=${res.statusCode} body=${JSON.stringify(body)}`);

const [m1After] = await db.select().from(members).where(eq(members.id, m1));
const [m1cAfter] = await db.select().from(memberMembershipCycles).where(eq(memberMembershipCycles.memberId, m1));
pass("M1 overdue member flipped to status=expired + accountStatus=inactive", m1After.status === "expired" && m1After.accountStatus === "inactive", `status=${m1After.status}/${m1After.accountStatus}`);
pass("M1 cycle #1 marked expired with expiredAt timestamp", m1cAfter.status === "expired" && !!m1cAfter.expiredAt, `cycle=${m1cAfter.status}`);

const [m2After] = await db.select().from(members).where(eq(members.id, m2));
pass("M2 in-grace member NOT expired (3-day grace protects portal access)", m2After.status === "active" && m2After.accountStatus === "active", `status=${m2After.status}/${m2After.accountStatus}`);

const [expiryCfg] = await db.select().from(membershipExpiryAutomation).where(eq(membershipExpiryAutomation.scheduleCronTaskUid, "task-e2e-expiry"));
pass("expiry audit row updated (lastRanAt set, lastExpiredCount>=1, no lastError)", !!expiryCfg?.lastRanAt && (expiryCfg.lastExpiredCount ?? 0) >= 1 && !expiryCfg.lastError, `lastExpiredCount=${expiryCfg?.lastExpiredCount} lastError=${expiryCfg?.lastError}`);

// ---- 4b. REMINDER RUN ----
res = mkRes();
await reminderHandler(mkReq(`app_session_id=${reminderCronToken}`), res);
body = res.body as any;
pass("reminder cron run succeeds over full auth chain", res.statusCode === 200 && body?.ok === true, `status=${res.statusCode} body=${JSON.stringify(body)}`);
pass("reminder run reports 1 seven-day + 2 post-grace candidates (M4 due-soon, M1 just-expired, M3 long-expired)", body?.sevenDayEligibleCount === 1 && body?.postGraceEligibleCount === 2 && body?.sentCount === 3, `sevenDay=${body?.sevenDayEligibleCount} postGrace=${body?.postGraceEligibleCount} sent=${body?.sentCount}`);

const [m4Reminder] = await db.select().from(memberExpiryReminders).where(and(eq(memberExpiryReminders.memberId, m4), eq(memberExpiryReminders.reminderType, "seven_day")));
pass("M4 seven-day reminder row created and marked SENT (dev email = mocked)", m4Reminder?.deliveryStatus === "sent" && !!m4Reminder?.sentAt, `status=${m4Reminder?.deliveryStatus} attempts=${m4Reminder?.attempts}`);

const [m3Reminder] = await db.select().from(memberExpiryReminders).where(and(eq(memberExpiryReminders.memberId, m3), eq(memberExpiryReminders.reminderType, "post_grace")));
pass("M3 post-grace follow-up row created and marked SENT", m3Reminder?.deliveryStatus === "sent" && !!m3Reminder?.sentAt, `status=${m3Reminder?.deliveryStatus} attempts=${m3Reminder?.attempts}`);

const [m5Reminder] = await db.select().from(memberExpiryReminders).where(and(eq(memberExpiryReminders.memberId, m5), eq(memberExpiryReminders.reminderType, "seven_day")));
pass("M5 already-sent reminder NOT re-claimed (idempotent: attempts stay 1)", m5Reminder?.deliveryStatus === "sent" && m5Reminder?.attempts === 1, `attempts=${m5Reminder?.attempts} status=${m5Reminder?.deliveryStatus}`);

const [m2ReminderCheck] = await db.select().from(memberExpiryReminders).where(eq(memberExpiryReminders.memberId, m2));
pass("M2 in-grace member got NO reminder yet (cycle still active, post_grace waits)", !m2ReminderCheck, `rows=${m2ReminderCheck ? "found" : "none"}`);

const [m1PostGraceReminder] = await db.select().from(memberExpiryReminders).where(and(eq(memberExpiryReminders.memberId, m1), eq(memberExpiryReminders.reminderType, "post_grace")));
pass("M1 also receives its post-grace follow-up after the expiry run (expired 35 days)", m1PostGraceReminder?.deliveryStatus === "sent" && !!m1PostGraceReminder?.sentAt, `status=${m1PostGraceReminder?.deliveryStatus}`);

const [reminderCfg] = await db.select().from(membershipReminderAutomation).where(eq(membershipReminderAutomation.scheduleCronTaskUid, "task-e2e-reminder"));
pass("reminder audit row updated (lastRanAt set, lastEligibleCount=3, no lastError)", !!reminderCfg?.lastRanAt && reminderCfg.lastEligibleCount === 3 && !reminderCfg.lastError, `lastEligibleCount=${reminderCfg?.lastEligibleCount}`);

// ---- 4c. SECOND RUN: IDEMPOTENCY ----
res = mkRes();
await handleMembershipExpirySchedule(mkReq(`app_session_id=${expiryCronToken}`), res);
body = res.body as any;
pass("second expiry run is idempotent (0 new expiries)", res.statusCode === 200 && body?.expiredCount === 0, `expiredCount=${body?.expiredCount}`);

res = mkRes();
await reminderHandler(mkReq(`app_session_id=${reminderCronToken}`), res);
body = res.body as any;
pass("second reminder run re-claims nothing (0 candidates)", res.statusCode === 200 && body?.eligibleCount === 0, `eligible=${body?.eligibleCount} sevenDay=${body?.sevenDayEligibleCount} postGrace=${body?.postGraceEligibleCount} sent=${body?.sentCount}`);

// ---- 4d. ORPHAN TASK UID ----
const orphanToken = await mintCron("cron_local_e2e_orphan");
res = mkRes();
await handleMembershipExpirySchedule(mkReq(`app_session_id=${orphanToken}`), res);
pass("orphan taskUid is skipped gracefully (ok:true skipped:orphan)", res.statusCode === 200 && res.body?.skipped === "orphan", `body=${JSON.stringify(res.body)}`);

// ---- 4e. NON-CRON REJECTED ----
const userToken = await new SignJWT({ openId: "admin-local-audit", appId: "local-audit", name: "Foundation Admin" })
  .setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt()
  .setExpirationTime(Math.floor((Date.now() + 3600_000) / 1000)).sign(key);
res = mkRes();
await handleMembershipExpirySchedule(mkReq(`app_session_id=${userToken}`), res);
pass("non-cron session rejected with 403 cron-only (direct handler + new catch keeps status)", res.statusCode === 403 && res.body?.error === "cron-only", `status=${res.statusCode} body=${JSON.stringify(res.body)}`);

// ---- 4f. LAZY LOGIN EXPIRY ----
// M2 (in grace) still active. Create M6 overdue with password to prove lazy expiry.
const m6Join = new Date(thisY - 1, thisM - 1, thisD - 10);
await seedApplication("M6", `${PREFIX}m6@x.test`, "annual");
const [m6] = await db.insert(members).values({
  applicationRef: appRef("M6"), membershipNo: "E2E-AUTO-M6", fullName: "E2E Automation M6", email: `${PREFIX}m6@x.test`,
  phone: "9000000000", memberType: "annual", city: "Lucknow", state: "Uttar Pradesh", district: "Lucknow",
  joiningDate: m6Join, status: "active", accountStatus: "active",
  passwordHash: bcrypt.hashSync("AaswTest#2026", 10), mustChangePassword: false,
});
const [m6row] = await db.select().from(members).where(eq(members.email, `${PREFIX}m6@x.test`)).limit(1);
await db.insert(memberMembershipCycles).values({ memberId: m6row.id, applicationRef: appRef("M6"), cycleNumber: 1, membershipType: "annual", startsOn: m6Join, expiresOn: new Date(thisY - 1, thisM - 1, thisD + 365 - 10), status: "active" });
const { expireMemberIfDue, getMemberById } = await import("../server/db");
const lazy = await expireMemberIfDue(await getMemberById(m6row.id));
const [m6After] = await db.select().from(members).where(eq(members.id, m6row.id));
pass("lazy expiry on member session/login (expireMemberIfDue) flips overdue member", lazy === true && m6After.status === "expired" && m6After.accountStatus === "inactive", `lazy=${lazy} status=${m6After.status}/${m6After.accountStatus}`);

// ---- 4g. AUTO-APPROVAL + ALERT ----
const activation = await createMembershipApplicationWithActivation({
  application: {
    applicationRef: appRef("M7"), fullName: "E2E Automation M7", email: `${PREFIX}m7@x.test`, phone: "9000000000",
    city: "Lucknow", state: "Uttar Pradesh", district: "Lucknow", membershipType: "annual",
    panEncrypted: encryptSensitiveValue("AAAAA0000Z"), panHash: hashSensitiveMatchValue("AAAAA0000Z"), panLastFour: "000Z",
    idProofType: "aadhaar", idProofStorageKey: `membership-applications/${appRef("M7")}/id-proof.png`,
    idProofOriginalName: "proof.png", idProofMimeType: "image/png", status: "approved", notificationStatus: "pending",
  },
  setupTokenHash: "a".repeat(64), setupTokenExpiresAt: new Date(Date.now() + 3600_000),
});
const [m7alert] = await db.select().from(foundationAdminAlerts).where(eq(foundationAdminAlerts.applicationRef, appRef("M7")));
pass("auto-approval allocates member + writes admin alert (member_auto_approved)", activation.membershipNo.startsWith("AASW-") && !!m7alert && m7alert.alertType === "member_auto_approved", `membershipNo=${activation.membershipNo} alert=${m7alert?.alertType}`);

// RENEWAL identity: wrong PAN rejected
let renewalRejected = false;
try {
  await createMembershipApplicationWithActivation({
    application: { applicationRef: appRef("M8"), fullName: "E2E Automation M7", email: `${PREFIX}m7@x.test`, phone: "9000000000", city: "Lucknow", state: "Uttar Pradesh", district: "Lucknow", membershipType: "annual", panEncrypted: encryptSensitiveValue("BBBBB1111C"), panHash: hashSensitiveMatchValue("BBBBB1111C"), panLastFour: "111C", idProofType: "aadhaar", idProofStorageKey: `membership-applications/${appRef("M8")}/id-proof.png`, idProofOriginalName: "proof.png", idProofMimeType: "image/png", status: "approved", notificationStatus: "pending" },
    setupTokenHash: "b".repeat(64), setupTokenExpiresAt: new Date(Date.now() + 3600_000), renewalIntent: true,
  });
} catch (e) { renewalRejected = String((e as Error).message).includes("identity did not match"); }
pass("renewal with WRONG PAN rejected (identity check enforced)", renewalRejected);

// ---------- 5. CLEANUP ----------
const seeded = await db.select({ id: members.id }).from(members).where(like(members.email, `${PREFIX}%`));
for (const m of seeded) {
  await db.delete(memberExpiryReminders).where(eq(memberExpiryReminders.memberId, m.id));
  await db.delete(accountSetupTokens).where(eq(accountSetupTokens.memberId, m.id));
  await db.delete(memberMembershipCycles).where(eq(memberMembershipCycles.memberId, m.id));
}
await db.delete(members).where(like(members.email, `${PREFIX}%`));
await db.delete(foundationAdminAlerts).where(like(foundationAdminAlerts.applicationRef, "E2E-AUTO-%"));
await db.delete(membershipApplications).where(like(membershipApplications.applicationRef, "E2E-AUTO-%"));
await db.delete(membershipExpiryAutomation).where(like(membershipExpiryAutomation.scheduleCronTaskUid, "task-e2e-%"));
await db.delete(membershipReminderAutomation).where(like(membershipReminderAutomation.scheduleCronTaskUid, "task-e2e-%"));
console.log(`cleanup done (${seeded.length} members removed)`);

// verify nothing left behind
const leftovers = await db.select().from(members).where(like(members.email, `${PREFIX}%`));
pass("no e2e rows remain after cleanup", leftovers.length === 0, `left=${leftovers.length}`);

mockOAuth.close();

const failed = results.filter(x => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} deep automation checks passed`);
process.exit(failed.length ? 1 : 0);
