// One-off local repair: applies pending drizzle SQL migrations (0028+) that
// drizzle-kit migrate silently refuses to run against this database, and
// records them in __drizzle_migrations so future migrate runs stay in sync.
import mysql from "mysql2/promise";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = new URL("../backend/drizzle/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const journal = JSON.parse(readFileSync(join(dir, "meta/_journal.json"), "utf8"));

const conn = await mysql.createConnection({ host: "127.0.0.1", port: 3306, user: "root", database: "aasw", multipleStatements: false });
const [appliedRows] = await conn.query("SELECT hash FROM __drizzle_migrations");
const appliedHashes = new Set(appliedRows.map(row => row.hash));
console.log("currently applied:", appliedHashes.size);

for (const entry of journal.entries) {
  const file = join(dir, entry.tag + ".sql");
  const sql = readFileSync(file, "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");
  if (appliedHashes.has(hash)) continue; // already applied — no duplicate journal rows
  const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try {
      await conn.query(stmt);
    } catch (err) {
      // Earlier `drizzle-kit push` runs on this dev database already applied
      // parts of these migrations; treat every "already applied" signal as a
      // skip so the remaining statements still run.
      const skippable = ["ER_TABLE_EXISTS_ERROR", "ER_DUP_FIELDNAME", "ER_DUP_KEYNAME", "ER_CANT_DROP_FIELD_OR_KEY", "ER_DUP_ENTRY", "ER_MULTIPLE_PRI_KEY", "ER_FK_DUP_NAME"];
      if (skippable.includes(err.code)) {
        console.log("skip (already present):", err.code, "—", stmt.replace(/\s+/g, " ").slice(0, 70));
        continue;
      }
      throw err;
    }
  }
  await conn.query("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)", [hash, entry.when]);
  console.log("applied", entry.tag, `(${statements.length} stmts)`);
}

const [final] = await conn.query("SELECT COUNT(*) n FROM __drizzle_migrations");
console.log("final applied count:", final[0].n);
await conn.end();
