// Consistency check: every table defined in schema.ts must exist in the DB.
import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
const schema = readFileSync("backend/drizzle/schema.ts", "utf8");
const defined = [...schema.matchAll(/mysqlTable\("([a-z_]+)"/g)].map(m => m[1]);
const conn = await mysql.createConnection({ host: "127.0.0.1", port: 3306, user: "root", database: "aasw" });
const [rows] = await conn.query("SELECT table_name FROM information_schema.tables WHERE table_schema='aasw'");
const existing = new Set(rows.map(r => Object.values(r)[0]));
const missing = defined.filter(t => !existing.has(t));
console.log("tables defined in schema:", defined.length);
console.log("tables in database:", existing.size - 1, "(excluding __drizzle_migrations)");
if (missing.length) { console.log("MISSING TABLES:", missing.join(", ")); process.exitCode = 1; }
else console.log("ALL SCHEMA TABLES EXIST ✓");
// column-level spot check for the newest additions
for (const [table, column] of [["member_service_requests","projectId"],["member_service_completions","payoutIfsc"],["foundation_admin_alerts","alertType"]]) {
  const [col] = await conn.query("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema='aasw' AND table_name=? AND column_name=?", [table, column]);
  console.log(`${table}.${column}:`, col.length ? "OK" : "MISSING!");
  if (!col.length) process.exitCode = 1;
}
await conn.end();
