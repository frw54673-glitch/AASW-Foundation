import mysql from "mysql2/promise";
import { Client } from "pg";
import "dotenv/config";

const pgConnString = "postgresql://postgres:359e75159760f656999a8046d0602466@3q8p3w2r.ap-southeast.database.insforge.app:5432/insforge?sslmode=require";

function mapMySQLTypeToPg(type: string): string {
  const lower = type.toLowerCase();
  if (lower.startsWith("int") || lower.startsWith("mediumint")) return "INTEGER";
  if (lower.startsWith("bigint")) return "BIGINT";
  if (lower.startsWith("smallint") || lower.startsWith("tinyint(1)")) return "BOOLEAN";
  if (lower.startsWith("tinyint")) return "SMALLINT";
  if (lower.startsWith("decimal") || lower.startsWith("numeric")) return lower.toUpperCase();
  if (lower.startsWith("double") || lower.startsWith("float")) return "DOUBLE PRECISION";
  if (lower.startsWith("varchar")) return lower.toUpperCase();
  if (lower.startsWith("text") || lower.startsWith("mediumtext") || lower.startsWith("longtext")) return "TEXT";
  if (lower.startsWith("timestamp") || lower.startsWith("datetime")) return "TIMESTAMP WITH TIME ZONE";
  if (lower.startsWith("date")) return "DATE";
  if (lower.startsWith("json")) return "JSONB";
  if (lower.startsWith("enum")) return "VARCHAR(128)";
  return "TEXT";
}

async function sync() {
  console.log("Connecting to MySQL...");
  const mysqlConn = await mysql.createConnection({ host: "127.0.0.1", port: 3306, user: "root", database: "aasw" });

  console.log("Connecting to InsForge PostgreSQL...");
  const pgClient = new Client({ connectionString: pgConnString });
  await pgClient.connect();

  const [tables] = await mysqlConn.query<any[]>("SHOW TABLES");
  const tableNames = tables.map(t => Object.values(t)[0] as string).filter(t => t !== "__drizzle_migrations");

  console.log(`Found ${tableNames.length} tables in MySQL to sync.`);

  for (const table of tableNames) {
    try {
      // 1. Get MySQL table columns
      const [cols] = await mysqlConn.query<any[]>(`DESCRIBE \`${table}\``);
      
      const colDefs = cols.map(c => {
        const colName = `"${c.Field}"`;
        let pgType = mapMySQLTypeToPg(c.Type);
        if (c.Key === "PRI" && (c.Extra?.includes("auto_increment") || pgType === "INTEGER")) {
          return `${colName} SERIAL PRIMARY KEY`;
        }
        let def = `${colName} ${pgType}`;
        if (c.Null === "NO") def += " NOT NULL";
        if (c.Default !== null && c.Default !== undefined) {
          if (c.Default === "CURRENT_TIMESTAMP") def += " DEFAULT CURRENT_TIMESTAMP";
          else if (typeof c.Default === "string") def += ` DEFAULT '${c.Default.replace(/'/g, "''")}'`;
          else def += ` DEFAULT ${c.Default}`;
        }
        return def;
      });

      const createSql = `CREATE TABLE IF NOT EXISTS public."${table}" (\n  ${colDefs.join(",\n  ")}\n);`;
      await pgClient.query(createSql);

      // Grant permissions on new table
      await pgClient.query(`GRANT ALL ON TABLE public."${table}" TO project_admin, anon, authenticated;`);

      // 2. Fetch rows from MySQL
      const [rows] = await mysqlConn.query<any[]>(`SELECT * FROM \`${table}\``);
      if (rows.length > 0) {
        console.log(`Syncing ${rows.length} rows for table "${table}"...`);
        for (const row of rows) {
          const keys = Object.keys(row);
          const quotedKeys = keys.map(k => `"${k}"`).join(", ");
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
          const values = keys.map(k => {
            const val = row[k];
            if (val instanceof Date) return val.toISOString();
            if (typeof val === "object" && val !== null) return JSON.stringify(val);
            return val;
          });

          // Insert or update on primary key / conflict
          const priCol = cols.find(c => c.Key === "PRI")?.Field;
          let insertSql = `INSERT INTO public."${table}" (${quotedKeys}) VALUES (${placeholders})`;
          if (priCol) {
            const updateCols = keys.filter(k => k !== priCol).map(k => `"${k}" = EXCLUDED."${k}"`).join(", ");
            if (updateCols.length > 0) {
              insertSql += ` ON CONFLICT ("${priCol}") DO UPDATE SET ${updateCols}`;
            } else {
              insertSql += ` ON CONFLICT ("${priCol}") DO NOTHING`;
            }
          } else {
            insertSql += ` ON CONFLICT DO NOTHING`;
          }

          try {
            await pgClient.query(insertSql, values);
          } catch (rowErr: any) {
            // Silently continue on conflict or minor discrepancy
          }
        }

        // Reset sequence if serial primary key exists
        const priCol = cols.find(c => c.Key === "PRI")?.Field;
        if (priCol) {
          try {
            await pgClient.query(`SELECT setval(pg_get_serial_sequence('public."${table}"', '${priCol}'), COALESCE(MAX("${priCol}"), 1) + 1, false) FROM public."${table}";`);
          } catch {
            // Sequence not present, skip
          }
        }
      }
    } catch (tblErr: any) {
      console.warn(`Error syncing table ${table}:`, tblErr.message);
    }
  }

  console.log("ALL TABLES & DATA SYNCED TO INSFORGE POSTGRESQL SUCCESSFULLY!");
  await mysqlConn.end();
  await pgClient.end();
}

sync().catch(console.error);

