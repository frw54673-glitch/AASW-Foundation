// Local/production seed: creates (or updates) the single Foundation owner
// account that can sign in to the Foundation Admin and MIS workspaces with an
// email + password. Only this one row carries a password hash; all other
// platform accounts would still come from the OAuth flow.
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import "dotenv/config";

const EMAIL = (process.env.OWNER_EMAIL || "aaswfoundation06@gmail.com").toLowerCase();
const PASSWORD = process.env.OWNER_PASSWORD || "AaswOwner#2026";

const conn = await mysql.createConnection({ host: "127.0.0.1", port: 3306, user: "root", database: "aasw" });
const hash = await bcrypt.hash(PASSWORD, 12);
await conn.query(
  "INSERT INTO users (openId, name, email, loginMethod, role, passwordHash) VALUES ('foundation-owner', 'AASW Foundation', ?, 'owner-login', 'admin', ?) " +
  "ON DUPLICATE KEY UPDATE email=VALUES(email), name=VALUES(name), role='admin', passwordHash=VALUES(passwordHash), loginMethod='owner-login'",
  [EMAIL, hash],
);
const [rows] = await conn.query("SELECT openId, email, role, loginMethod FROM users WHERE email=?", [EMAIL]);
console.log("OWNER LOGIN READY:", JSON.stringify(rows[0]));
console.log("email:", EMAIL);
console.log("password:", PASSWORD);
await conn.end();
