// Local dev seed: creates an approved membership application + active member
// with a known password so member login can be tested end-to-end.
import "dotenv/config";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { membershipApplications, members } from "../drizzle/schema.ts";

const PASSWORD = process.env.SEED_PASSWORD || "AaswTest#2026";
const EMAIL = "demo.member@aaswfoundation.test";
const APP_REF = "AASW-MEM-SEED-0001";

const pool = mysql.createPool(process.env.DATABASE_URL);
const db = drizzle(pool);

// PAN "encryption" here is only deterministic filler for the NOT NULL column.
// Real flows encrypt via AES-256-GCM; for local login testing the value is
// never decrypted, so a clearly-marked placeholder is sufficient.
const panEncrypted = "local-seed-placeholder-not-real-pan";

const existing = await db.select().from(members).limit(1);
if (existing.length) {
  console.log("Member rows already exist — nothing to seed.");
  await pool.end();
  process.exit(0);
}

await db.insert(membershipApplications).values({
  applicationRef: APP_REF,
  fullName: "Demo Member",
  email: EMAIL,
  phone: "9000000000",
  city: "Lucknow",
  district: "Lucknow",
  state: "Uttar Pradesh",
  membershipType: "lifetime",
  status: "approved",
  panEncrypted,
  panLastFour: "1234",
  idProofType: "other",
  idProofStorageKey: "local-seed/id-proof-placeholder.pdf",
  idProofOriginalName: "placeholder.pdf",
  idProofMimeType: "application/pdf",
});

const hash = await bcrypt.hash(PASSWORD, 12);

await db.insert(members).values({
  applicationRef: APP_REF,
  membershipNo: "AASW-2026-0001",
  fullName: "Demo Member",
  email: EMAIL,
  phone: "9000000000",
  passwordHash: hash,
  mustChangePassword: false,
  role: "member",
  memberType: "lifetime",
  status: "active",
  accountStatus: "active",
  city: "Lucknow",
  state: "Uttar Pradesh",
  district: "Lucknow",
  joiningDate: new Date().toISOString().slice(0, 10),
});

console.log("Seeded member:");
console.log("  email/ID:", EMAIL);
console.log("  password :", PASSWORD);
await pool.end();
