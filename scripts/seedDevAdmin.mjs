// Local-only helper: seeds a dev admin user and prints a URL that signs the
// browser into that admin session via a one-shot cookie-set route. Used only
// for local previews of the Foundation Admin and MIS dashboards; the OAuth
// platform login stays untouched and production never enables this.
import { SignJWT } from "jose";
import mysql from "mysql2/promise";
import "dotenv/config";

const openId = "local-dev-admin";
const name = "Local Dev Admin";
const jwtSecret = process.env.JWT_SECRET ?? "";
if (!jwtSecret) {
  console.error("JWT_SECRET missing in .env");
  process.exit(1);
}

// 1. Seed the admin user (same shape the OAuth callback creates), with the
//    admin role so role-gated tRPC procedures accept it.
const conn = await mysql.createConnection({ host: "127.0.0.1", port: 3306, user: "root", database: "aasw" });
await conn.query(
  "INSERT INTO users (openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, 'admin', NOW(), NOW(), NOW()) ON DUPLICATE KEY UPDATE role='admin', lastSignedIn=NOW()",
  [openId, name, "local-admin@aasw.local", "local-dev"]
);
await conn.end();
console.log("ADMIN_USER_SEEDED openId=" + openId);

// 2. Sign a session token exactly like sdk.createSessionToken does (same
//    payload fields the verifier requires: openId, appId, name).
const appId = process.env.VITE_APP_ID ?? "local-dev";
const token = await new SignJWT({ openId, appId, name })
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setExpirationTime(Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000))
  .sign(new TextEncoder().encode(jwtSecret));
console.log("SESSION_TOKEN=" + token);
