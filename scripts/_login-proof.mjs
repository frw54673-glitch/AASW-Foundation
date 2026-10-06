import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { generateMemberPassword } from "../backend/security/memberAccount.ts";
// Same code path as membership.submit: generator -> bcrypt(12) -> member.passwordHash
const password = generateMemberPassword();
const hash = await bcrypt.hash(password, 12);
const c = await mysql.createConnection({ host: "127.0.0.1", port: 3306, user: "root", database: "aasw" });
await c.query("UPDATE members SET passwordHash=? WHERE membershipNo=?", [hash, "AASW-2026-0004"]);
console.log("PASSWORD_SET=" + password);
await c.end();
