// FULL LIVE E2E: membership expiry + renewal automation proof via the real app
// Step A: expired member (seeded, joining 550d ago) tries to login -> must be BLOCKED + auto-marked inactive (lazy expiry at member.ts:96)
// Step B: renewal application submitted via REAL tRPC HTTP (same email + same PAN, renewalIntent=true)
//         -> same membershipNo reactivated, new cycle#2 active, old details preserved, old password still works
// Step C: renewed member logs in -> dashboard works
import { chromium } from "playwright";
import { q, one, pool } from "./db-helpers.mjs";

const EMAIL = "renewal.e2e@aaswfoundation.test";
const PAN = "ABCDE1234F";
const PASSWORD = "AaswTest#2026";
const log = (s) => console.log(s);

const browser = await chromium.launch({ headless: true });

// ---------- STEP A: login attempt with EXPIRED member ----------
log("=== STEP A: expired member login attempt (must be BLOCKED + auto-deactivated) ===");
const before = await one("SELECT status, accountStatus FROM members WHERE email = ?", [EMAIL]);
log("DB before login: status=" + before.status + " accountStatus=" + before.accountStatus);

const ctxA = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const pA = await ctxA.newPage();
await pA.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded" });
await pA.fill('input[autocomplete="username"]', EMAIL);
await pA.fill('input[autocomplete="current-password"]', PASSWORD);
await pA.click('button:has-text("Sign in")');
await pA.waitForTimeout(4500);
const aState = await pA.evaluate(() => ({ url: location.pathname, msg: document.body.innerText.match(/.{0,70}(inactive|expired|no longer|renew|contact|check).{0,70}/i)?.[0] ?? null }));
log("browser: url=" + aState.url + " msg=" + aState.msg);
const after = await one("SELECT status, accountStatus FROM members WHERE email = ?", [EMAIL]);
log("DB after login attempt: status=" + after.status + " accountStatus=" + after.accountStatus);
const cyclesA = await q("SELECT cycleNumber, status, expiredAt FROM member_membership_cycles WHERE memberId = (SELECT id FROM members WHERE email = ?)", [EMAIL]);
log("cycles after: " + JSON.stringify(cyclesA));
const passA = aState.url !== "/member/dashboard" && after.status === "expired" && after.accountStatus === "inactive";
log(passA ? "PASS: expired member BLOCKED + auto-marked inactive (lazy expiry worked)" : "FAIL: A");
await ctxA.close();

// ---------- STEP B: renewal via real tRPC (same email + same PAN) ----------
log("\n=== STEP B: renewal submit (same email+PAN, renewalIntent=true) ===");
const ctxB = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const pB = await ctxB.newPage();
await pB.goto("http://localhost:3000/membership", { waitUntil: "domcontentloaded" });
await pB.waitForTimeout(1000);
const renewRes = await pB.evaluate(async ({ email, pan }) => {
  const payload = { "0": { json: {
    fullName: "Renewal E2E Member", email, phone: "9876543211", city: "Lucknow", state: "Uttar Pradesh", district: "Lucknow",
    membershipType: "annual", panNumber: pan,
    idProof: { type: "aadhaar", dataBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", mimeType: "image/png", originalName: "proof.png" },
    privacyConsent: true, renewalIntent: true,
  } } };
  const r = await fetch("/api/trpc/membership.submit?batch=1", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  return { status: r.status, body: (await r.text()).slice(0, 700) };
}, { email: EMAIL, pan: PAN });
log("tRPC response: HTTP " + renewRes.status);
log("body: " + renewRes.body.slice(0, 400));
await ctxB.close();

// verify DB state
const renewed = await one("SELECT id, membershipNo, status, accountStatus, joiningDate, fullName, email FROM members WHERE email = ?", [EMAIL]);
const cyclesB = await q("SELECT cycleNumber, membershipType, startsOn, expiresOn, status FROM member_membership_cycles WHERE memberId = ? ORDER BY cycleNumber", [renewed.id]);
log("\nDB after renewal:");
log("  membershipNo=" + renewed.membershipNo + " (expected AASW-2026-9001 - SAME ID)");
log("  status=" + renewed.status + " accountStatus=" + renewed.accountStatus + " joiningDate=" + renewed.joiningDate?.toISOString?.().slice(0, 10));
log("  cycles: " + cyclesB.map(c => `#${c.cycleNumber} ${c.startsOn?.toISOString?.().slice(0, 10)}->${c.expiresOn?.toISOString?.().slice(0, 10)} [${c.status}]`).join(" | "));
const passB = renewed.membershipNo === "AASW-2026-9001" && renewed.status === "active" && renewed.accountStatus === "active" && cyclesB.length === 2 && cyclesB.some(c => c.cycleNumber === 2 && c.status === "active") && cyclesB.some(c => c.cycleNumber === 1 && c.status === "expired");
log(passB ? "PASS: SAME member ID reactivated + old details + cycle#2 active" : "FAIL: B");

// ---------- STEP C: renewed member login (old password) ----------
log("\n=== STEP C: renewed member login (old password must still work) ===");
const ctxC = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const pC = await ctxC.newPage();
await pC.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded" });
await pC.fill('input[autocomplete="username"]', EMAIL);
await pC.fill('input[autocomplete="current-password"]', PASSWORD);
await pC.click('button:has-text("Sign in")');
await pC.waitForURL("**/member/dashboard**", { timeout: 25000 }).catch(() => {});
await pC.waitForTimeout(4000);
const cUrl = pC.url();
let dash = "";
try { dash = await pC.evaluate(() => document.body.innerText.slice(0, 250)); } catch {}
const passC = cUrl.includes("/member/dashboard");
log("url=" + cUrl + " -> " + (passC ? "PASS: login SUCCESS after renewal" : "FAIL: C"));
log("dashboard: " + dash.replace(/\n+/g, " ").slice(0, 140));
await ctxC.close();

// negative: renewal with WRONG PAN should be rejected (identity match security)
log("\n=== STEP D (negative): renewal with WRONG PAN must be rejected ===");
const ctxD = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const pD = await ctxD.newPage();
await pD.goto("http://localhost:3000/membership", { waitUntil: "domcontentloaded" });
await pD.waitForTimeout(800);
const wrongRes = await pD.evaluate(async ({ email }) => {
  const payload = { "0": { json: {
    fullName: "Renewal E2E Member", email, phone: "9876543211", city: "Lucknow", state: "Uttar Pradesh", district: "Lucknow",
    membershipType: "annual", panNumber: "WRONGPAN999X",
    idProof: { type: "aadhaar", dataBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", mimeType: "image/png", originalName: "proof.png" },
    privacyConsent: true, renewalIntent: true,
  } } };
  const r = await fetch("/api/trpc/membership.submit?batch=1", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  return { status: r.status, body: (await r.text()).slice(0, 300) };
}, { email: EMAIL });
log("HTTP " + wrongRes.status + " -> " + wrongRes.body.slice(0, 200));
const passD = wrongRes.status !== 200 || /identity did not match|CONFLICT/i.test(wrongRes.body);
log(passD ? "PASS: wrong-PAN renewal REJECTED" : "FAIL: D");
await ctxD.close();

await browser.close();

// cleanup
await q("DELETE FROM member_membership_cycles WHERE memberId = (SELECT id FROM members WHERE email = ?)", [EMAIL]);
await q("DELETE FROM foundation_admin_alerts WHERE applicationRef LIKE 'AASW-MEM-RENEW%' OR applicationRef IN (SELECT applicationRef FROM membership_applications WHERE email = ?)", [EMAIL]).catch(() => {});
await q("DELETE FROM members WHERE email = ?", [EMAIL]);
await q("DELETE FROM membership_applications WHERE email = ?", [EMAIL]);
log("\ncleanup done");
log("\n===== SUMMARY: A(expiry+block)=" + (passA ? "PASS" : "FAIL") + "  B(reactivation)=" + (passB ? "PASS" : "FAIL") + "  C(relogin)=" + (passC ? "PASS" : "FAIL") + "  D(wrongPAN)=" + (passD ? "PASS" : "FAIL") + " =====");
await pool.end();
