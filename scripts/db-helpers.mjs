// Raw mysql2 helpers (no project imports, so plain node runs it)
import mysql from "mysql2/promise";
export const pool = mysql.createPool(process.env.DATABASE_URL || "mysql://root@localhost:3306/aasw_foundation");
export const q = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};
export const one = async (sql, params = []) => (await q(sql, params))[0] ?? null;
