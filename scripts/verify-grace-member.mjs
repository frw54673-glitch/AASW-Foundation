// Seed a member whose term JUST ended (1 day ago = within 3-day grace), login must WORK with grace banner + Renew Membership CTA
import { chromium } from "playwright";
import { q, one, pool } from "./db-helpers.mjs";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";

const EMAIL = "grace.e2e@aaswfoundation.test";
const PAN = "ZZZZZ9999Y";
const PASSWORD = "AaswTest#2026";
// clean
await q("DELETE FROM member_membership_cycles WHERE memberId IN (SELECT id FROM (SELECT id FROM members WHERE email = ?) t)", [EMAIL]).catch(() => {});
await q("DELETE FROM members WHERE email = ?", [EMAIL]).catch(() => {});
await q("DELETE FROM membership_applications WHERE email = ?", [EMAIL]).catch(() => {});

const envText = fs.readFileSync(".env", "utf8");
const piiKey = envText.match(/PII_ENCRYPTION_KEY=(.*)/)?.[1]?.trim();
const key = crypto.createHash("sha256").update(piiKey).digest();
const panHash = crypto.createHmac("sha256", key).update(PAN.trim().toUpperCase(), "utf8").digest("hex");
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
const enc = Buffer.concat([cipher.update(PAN, "utf8"), cipher.final(), cipher.getAuthTag()]);
const panEncrypted = `v1.${iv.toString("base64url")}.${enc.toString("base64url")}`;

const joining = new Date(Date.now() - 366 * 86400000); // term ended ~2 days ago - inside 3-day grace
const jStr = joining.toISOString().slice(0, 10);
const expStr = new Date(joining.getTime() + 364 * 86400000).toISOString().slice(0, 10);
console.log("joining=" + jStr + " expires=" + expStr + " (grace = expires+3 days)");

await q("INSERT INTO membership_applications (applicationRef, fullName, email, phone, city, state, district, membershipType, panEncrypted, panHash, panLastFour, idProofType, idProofStorageKey, idProofOriginalName, idProofMimeType, status, notificationStatus) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'approved', 'sent')", [
  "AASW-MEM-GRACE-E2E", "Grace E2E Member", EMAIL, "9876543213", "Lucknow", "Uttar Pradesh", "Lucknow", "annual", panEncrypted, panHash, PAN.slice(-4), "aadhaar", "membership-applications/AASW-MEM-GRACE-E2E/id-proof.png", "proof.png", "image/png",
]);
await q("INSERT INTO members (applicationRef, membershipNo, fullName, email, phone, memberType, city, state, district, joiningDate, status, accountStatus, passwordHash, mustChangePassword) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0)", [
  "AASW-MEM-GRACE-E2E", "AASW-2026-9003", "Grace E2E Member", EMAIL, "9876543213", "annual", "Lucknow", "Uttar Pradesh", "Lucknow", jStr, "active", "active", bcrypt.hashSync(PASSWORD, 12),
]);
const m = await one("SELECT id FROM members WHERE email = ?", [EMAIL]);
await q("INSERT INTO member_membership_cycles (memberId, applicationRef, cycleNumber, membershipType, startsOn, expiresOn, status) VALUES (?,?,1,'annual',?,?,'active')", [m.id, "AASW-MEM-GRACE-E2E", jStr, expStr]);

// login - must SUCCEED (grace period portal access)
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await page.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded" });
await page.fill('input[autocomplete="username"]', EMAIL);
await page.fill('input[autocomplete="current-password"]', PASSWORD);
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/member/dashboard**", { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(4000);
const url = page.url();
let dash = "";
try { dash = await page.evaluate(() => document.body.innerText); } catch {}
const graceOk = url.includes("/member/dashboard");
console.log("GRACE LOGIN: " + (graceOk ? "SUCCESS (portal access during grace)" : "BLOCKED -> " + url));
if (graceOk) {
  const renewCta = dash.match(/.{0,50}Renew Membership.{0,50}/)?.[0] ?? null;
  const graceBanner = dash.match(/.{0,60}grace.{0,60}/i)?.[0] ?? null;
  const daysRenew = dash.match(/\d+ day?s? (?:of|to|remaining)[^\n]{0,30}/i)?.[0] ?? null;
  console.log("grace banner: " + graceBanner);
  console.log("renew CTA: " + renewCta);
  console.log("days text: " + daysRenew);
  // click through to membership section
  const memBtn = await page.$$(".member-sidebar nav button").then(b => b[2]);
  if (memBtn) { await memBtn.click(); await page.waitForTimeout(1500); const t = await page.evaluate(() => document.body.innerText.slice(0, 2500)); console.log("membership section: " + (t.match(/.{0,50}(grace|renew|expired).{0,50}/i)?.[0] ?? "none")); }
}
// cleanup
await q("DELETE FROM member_membership_cycles WHERE memberId = ?", [m.id]);
await q("DELETE FROM members WHERE email = ?", [EMAIL]);
await q("DELETE FROM membership_applications WHERE email = ?", [EMAIL]);
console.log("cleanup done");
await browser.close();
await pool.end();
