// LIVE E2E: full membership lifecycle automation proof
// 1. Seed ANNUAL member with joiningDate 1.5 years ago (membership long expired + grace over)
// 2. Run expireDueMemberships() - the exact function the daily cron runs
// 3. Verify member is now INACTIVE (login should be blocked)
// 4. Submit a renewal application via HTTP API with SAME email + SAME PAN
// 5. Verify SAME membershipNo reactivated, new cycle created, old details preserved
// 6. Verify login works again with old password
import { chromium } from "playwright";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { members, memberMembershipCycles, membershipApplications } from "../drizzle/schema.ts";
import bcrypt from "bcryptjs";
import { expireDueMemberships } from "../server/db.ts";
import { encryptSensitiveValue, hashSensitiveMatchValue } from "../server/security/sensitive.ts";

const TEST_EMAIL = "renewal.e2e@aaswfoundation.test";
const TEST_PAN = "RENEWPAN1234A"; // 12 chars for PAN pattern? PAN is 10 - use exact 10
const PAN = "ABCDE1234F";
const PASSWORD = "AaswTest#2026";
const db = drizzle(process.env.DATABASE_URL);
const log = (s) => console.log(s);

// ---------- STEP 1: seed annual member, joining 1.5 years ago ----------
log("\n=== STEP 1: Seed annual member (joined 1.5y ago, expired ~6mo ago) ===");
await db.delete(members).where(eq(members.email, TEST_EMAIL));
const joiningDate = new Date(Date.now() - 550 * 86400000); // ~1.5 years ago
const [member] = await db.insert(members).values({
  applicationRef: "AASW-MEM-RENEW-E2E",
  membershipNo: "AASW-2026-9001",
  fullName: "Renewal E2E Member",
  email: TEST_EMAIL,
  phone: "9876543211",
  memberType: "annual",
  city: "Lucknow",
  state: "Uttar Pradesh",
  district: "Lucknow",
  joiningDate,
  status: "active",
  accountStatus: "active",
  passwordHash: bcrypt.hashSync(PASSWORD, 12),
  mustChangePassword: false,
}).$returningId ? [null] : [null]; // placeholder - mysql2 insert returns insertId differently

// re-fetch inserted member
const [seeded] = await db.select().from(members).where(eq(members.email, TEST_EMAIL)).limit(1);
if (!seeded) throw new Error("seed failed");
log("seeded member id=" + seeded.id + " membershipNo=" + seeded.membershipNo + " joining=" + joiningDate.toISOString().slice(0, 10));
// seed cycle + application rows that the expiry job expects
await db.insert(memberMembershipCycles).values({ memberId: seeded.id, applicationRef: seeded.applicationRef, cycleNumber: 1, membershipType: "annual", startsOn: joiningDate, expiresOn: new Date(joiningDate.getTime() + 365 * 86400000), status: "active" });
await db.insert(membershipApplications).values({ applicationRef: seeded.applicationRef, fullName: seeded.fullName, email: TEST_EMAIL, phone: seeded.phone, city: seeded.city, state: seeded.state, district: seeded.district, membershipType: "annual", panEncrypted: encryptSensitiveValue(PAN), panHash: hashSensitiveMatchValue(PAN), panLastFour: PAN.slice(-4), idProofType: "aadhaar", idProofStorageKey: "membership-applications/test/proof.png", idProofOriginalName: "proof.png", idProofMimeType: "image/png", status: "approved", notificationStatus: "pending" });

// ---------- STEP 2: run the EXACT cron function ----------
log("\n=== STEP 2: Run expireDueMemberships() (daily cron's function) ===");
const expiredCount = await expireDueMemberships(new Date());
const [afterExpire] = await db.select().from(members).where(eq(members.email, TEST_EMAIL)).limit(1);
log("expiredCount=" + expiredCount + " member.status=" + afterExpire.status + " accountStatus=" + afterExpire.accountStatus);
const pass2 = afterExpire.status === "expired" && afterExpire.accountStatus === "inactive";
log(pass2 ? "PASS: membership khatam -> member ID INACTIVE ho gaya" : "FAIL: expiry automation did not deactivate");

// ---------- STEP 3: login must be BLOCKED now ----------
log("\n=== STEP 3: Browser login with expired member (must be blocked) ===");
const browser = await chromium.launch({ headless: true });
const ctx1 = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const p1 = await ctx1.newPage();
await p1.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded" });
await p1.fill('input[autocomplete="username"]', TEST_EMAIL);
await p1.fill('input[autocomplete="current-password"]', PASSWORD);
await p1.click('button:has-text("Sign in")');
await p1.waitForTimeout(4000);
const blockedState = await p1.evaluate(() => ({ url: location.pathname, err: document.body.innerText.match(/.{0,80}(inactive|expired|no longer|contact).{0,80}/i)?.[0] ?? null }));
log(JSON.stringify(blockedState));
const pass3 = blockedState.url !== "/member/dashboard";
log(pass3 ? "PASS: expired member login BLOCKED (" + blockedState.url + ")" : "FAIL: expired member could log in!");
await ctx1.close();

// ---------- STEP 4: renewal application via real HTTP (same email + same PAN) ----------
log("\n=== STEP 4: Renewal submit via /membership page flow (same email+PAN) ===");
const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const p2 = await ctx2.newPage();
// call the tRPC mutation directly with correct shape (same as frontend does)
const renewalRes = await p2.evaluate(async () => {
  const payload = {
    "0": {
      json: {
        fullName: "Renewal E2E Member",
        email: "renewal.e2e@aaswfoundation.test",
        phone: "9876543211",
        city: "Lucknow",
        state: "Uttar Pradesh",
        district: "Lucknow",
        membershipType: "annual",
        panNumber: "ABCDE1234F",
        idProof: { type: "aadhaar", dataBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", mimeType: "image/png", originalName: "proof.png" },
        privacyConsent: true,
        renewalIntent: true
      }
    }
  };
  const r = await fetch("/api/trpc/membership.submit?batch=1", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const t = await r.text();
  return { status: r.status, body: t.slice(0, 600) };
});
log("HTTP " + renewalRes.status + " -> " + renewalRes.body.slice(0, 300));
await ctx2.close();
await browser.close();

// ---------- STEP 5: verify SAME membershipNo reactivated + new cycle + old details ----------
log("\n=== STEP 5: Verify renewal reactivated the OLD member ID with OLD details ===");
const [renewed] = await db.select().from(members).where(eq(members.email, TEST_EMAIL)).limit(1);
const cycles = await db.select().from(memberMembershipCycles).where(eq(memberMembershipCycles.memberId, renewed.id));
log("member.membershipNo=" + renewed.membershipNo + " (original: AASW-2026-9001)");
log("member.status=" + renewed.status + " accountStatus=" + renewed.accountStatus + " joiningDate=" + renewed.joiningDate?.toISOString?.().slice(0, 10));
log("cycles: " + cycles.map(c => `#${c.cycleNumber} ${c.membershipType} ${c.startsOn?.toISOString?.().slice(0, 10)}->${c.expiresOn?.toISOString?.().slice(0, 10)} ${c.status}`).join(" | "));
const pass5 = renewed.membershipNo === "AASW-2026-9001" && renewed.status === "active" && renewed.accountStatus === "active" && cycles.length === 2 && cycles.some(c => c.cycleNumber === 2 && c.status === "active") && cycles.some(c => c.cycleNumber === 1 && c.status === "expired");
log(pass5 ? "PASS: SAME member ID reactivate hua, old details + new active cycle bana" : "FAIL: renewal state wrong");

// ---------- STEP 6: login works again with OLD password ----------
log("\n=== STEP 6: Renewed member login (must SUCCEED now) ===");
const browser2 = await chromium.launch({ headless: true });
const ctx3 = await browser2.newContext({ viewport: { width: 1366, height: 900 } });
const p3 = await ctx3.newPage();
await p3.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded" });
await p3.fill('input[autocomplete="username"]', TEST_EMAIL);
await p3.fill('input[autocomplete="current-password"]', PASSWORD);
await p3.click('button:has-text("Sign in")');
await p3.waitForURL("**/member/dashboard**", { timeout: 25000 }).catch(() => {});
const finalUrl = p3.url();
let dashText = "";
try { await p3.waitForTimeout(3500); dashText = await p3.evaluate(() => document.body.innerText.slice(0, 300)); } catch {}
const pass6 = finalUrl.includes("/member/dashboard");
log("url=" + finalUrl);
log(pass6 ? "PASS: renewed member login SUCCESS -> dashboard" : "FAIL: renewed member login failed");
log("dashboard text: " + dashText.replace(/\n/g, " ").slice(0, 150));
await ctx3.close();
await browser2.close();

// cleanup
await db.delete(memberMembershipCycles).where(eq(memberMembershipCycles.memberId, renewed.id));
await db.delete(membershipApplications).where(eq(membershipApplications.email, TEST_EMAIL));
await db.delete(members).where(eq(members.email, TEST_EMAIL));
log("\n=== cleanup done ===");
log("\nSUMMARY: expire=" + (pass2 ? "PASS" : "FAIL") + " blockedLogin=" + (pass3 ? "PASS" : "FAIL") + " renewal=" + (pass5 ? "PASS" : "FAIL") + " relogin=" + (pass6 ? "PASS" : "FAIL"));
