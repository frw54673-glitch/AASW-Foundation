import { Client } from 'pg';

async function test() {
  const c = new Client({ connectionString: 'postgresql://postgres:359e75159760f656999a8046d0602466@3q8p3w2r.ap-southeast.database.insforge.app:5432/insforge?sslmode=require' });
  await c.connect();
  const res = await c.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  console.log(`InsForge PostgreSQL has ${res.rows.length} tables in schema 'public':\n`);
  for (const r of res.rows) {
    const countRes = await c.query(`SELECT count(*) as count FROM public."${r.tablename}"`);
    console.log(`• ${r.tablename.padEnd(35)} : ${countRes.rows[0].count} rows`);
  }
  await c.end();
}

test().catch(console.error);

