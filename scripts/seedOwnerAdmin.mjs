// Creates or updates the single Foundation owner account used to sign in to
// Foundation Admin and MIS. Set DATABASE_URL to target a production database.
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import "dotenv/config";

const email = (process.env.OWNER_EMAIL || "aaswfoundation06@gmail.com").trim().toLowerCase();
const password = process.env.OWNER_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

if (!password || password.length < 12) {
  throw new Error("Set OWNER_PASSWORD to a unique password of at least 12 characters before seeding the owner account.");
}

const connection = await mysql.createConnection(
  databaseUrl || { host: "127.0.0.1", port: 3306, user: "root", database: "aasw" },
);

try {
  const passwordHash = await bcrypt.hash(password, 12);
  await connection.query(
    "INSERT INTO users (openId, name, email, loginMethod, role, passwordHash) VALUES ('foundation-owner', 'AASW Foundation', ?, 'owner-login', 'admin', ?) " +
      "ON DUPLICATE KEY UPDATE email=VALUES(email), name=VALUES(name), role='admin', passwordHash=VALUES(passwordHash), loginMethod='owner-login'",
    [email, passwordHash],
  );
  const [rows] = await connection.query(
    "SELECT openId, email, role, loginMethod FROM users WHERE email=?",
    [email],
  );
  console.log("OWNER LOGIN READY:", JSON.stringify(rows[0]));
} finally {
  await connection.end();
}
