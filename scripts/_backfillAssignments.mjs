// One-time backfill: assign every existing project to every active member
// (same effect as the new auto-share automation in projectRouter.create).
import mysql from "mysql2/promise";
const conn = await mysql.createConnection({ host: "127.0.0.1", port: 3306, user: "root", database: "aasw" });
const [projects] = await conn.query("SELECT id, projectCode FROM projects");
const [members] = await conn.query("SELECT id, membershipNo FROM members WHERE status='active' AND accountStatus='active'");
let created = 0;
for (const p of projects) {
  for (const m of members) {
    const [existing] = await conn.query("SELECT id FROM member_project_assignments WHERE projectId=? AND memberId=?", [p.id, m.id]);
    if (existing.length) continue;
    await conn.query(
      "INSERT INTO member_project_assignments (memberId, projectId, projectRole, assignmentStatus, assignedByOpenId) VALUES (?,?, 'Member', 'active', 'local-dev-admin')",
      [m.id, p.id],
    );
    created++;
    console.log("assigned", p.projectCode, "→", m.membershipNo);
  }
}
console.log("total new assignments:", created);
await conn.end();
