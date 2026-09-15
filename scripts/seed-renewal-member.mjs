// STEP 1: Seed an annual member whose term ended long ago (joining 550 days back)
// Replicates the app's PAN crypto exactly: panEncrypted = AES-256-GCM(sha256(PII key)),
// panHash = HMAC-SHA256(same key, PAN.toUpperCase())
import { q, one, pool } from "./db-helpers.mjs";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";

const EMAIL = "renewal.e2e@aaswfoundation.test";
const PAN = "ABCDE1234F";
const PASSWORD = "AaswTest#2026";

// clean leftovers (member first, then app rows)
await q("DELETE FROM member_membership_cycles WHERE memberId IN (SELECT id FROM (SELECT id FROM members WHERE email = ?) t)", [EMAIL]).catch(() => {});
await q("DELETE FROM members WHERE email = ?", [EMAIL]).catch(() => {});
await q("DELETE FROM membership_applications WHERE email = ?", [EMAIL]).catch(() => {});

// app's PAN crypto
const envText = fs.readFileSync(".env", "utf8");
const piiKey = envText.match(/PII_ENCRYPTION_KEY=(.*)/)?.[1]?.trim();
const key = crypto.createHash("sha256").update(piiKey).digest();
const panHash = crypto.createHmac("sha256", key).update(PAN.trim().toUpperCase(), "utf8").digest("hex");
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
const enc = Buffer.concat([cipher.update(PAN, "utf8"), cipher.final(), cipher.getAuthTag()]);
const panEncrypted = `v1.${iv.toString("base64url")}.${enc.toString("base64url")}`;

const joining = new Date(Date.now() - 550 * 86400000);
const jStr = joining.toISOString().slice(0, 10);
const expStr = new Date(joining.getTime() + 364 * 86400000).toISOString().slice(0, 10);

// application row first (FK target), then member, then cycle
await q("INSERT INTO membership_applications (applicationRef, fullName, email, phone, city, state, district, membershipType, panEncrypted, panHash, panLastFour, idProofType, idProofStorageKey, idProofOriginalName, idProofMimeType, status, notificationStatus) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'approved', 'pending')", [
  "AASW-MEM-RENEW-E2E", "Renewal E2E Member", EMAIL, "9876543211", "Lucknow", "Uttar Pradesh", "Lucknow", "annual", panEncrypted, panHash, PAN.slice(-4), "aadhaar", "membership-applications/AASW-MEM-RENEW-E2E/id-proof.png", "proof.png", "image/png",
]);
await q("INSERT INTO members (applicationRef, membershipNo, fullName, email, phone, memberType, city, state, district, joiningDate, status, accountStatus, passwordHash, mustChangePassword) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0)", [
  "AASW-MEM-RENEW-E2E", "AASW-2026-9001", "Renewal E2E Member", EMAIL, "9876543211", "annual", "Lucknow", "Uttar Pradesh", "Lucknow", jStr, "active", "active", bcrypt.hashSync(PASSWORD, 12),
]);
const m = await one("SELECT id, membershipNo FROM members WHERE email = ?", [EMAIL]);
await q("INSERT INTO member_membership_cycles (memberId, applicationRef, cycleNumber, membershipType, startsOn, expiresOn, status) VALUES (?,?,1,'annual',?,?,'active')", [m.id, "AASW-MEM-RENEW-E2E", jStr, expStr]);
console.log("SEEDED: member id=" + m.id + " membershipNo=" + m.membershipNo);
console.log("  joining=" + jStr + " cycle1 expires=" + expStr + " (~6 months ago - grace long over)");
console.log("  status=active accountStatus=active password set, PAN encrypted+hashed");
await pool.end();
