// Local-only helper: sets an adminReply on the test member's latest support
// message so the unread-reply badge can be verified in the browser.
import mysql from "mysql2/promise";

const pool = mysql.createPool({ host: "127.0.0.1", port: 3306, user: "root", database: "aasw" });
const [members] = await pool.query("SELECT id FROM members WHERE membershipNo = ?", ["AASW-2026-0001"]);
if (!members.length) { console.error("test member not found"); process.exit(1); }
const memberId = members[0].id;
const [rows] = await pool.query(
  "SELECT id FROM member_support_messages WHERE memberId = ? AND adminReply IS NULL ORDER BY id DESC LIMIT 1",
  [memberId],
);
if (!rows.length) { console.log("NO_PENDING_MESSAGE"); process.exit(0); }
await pool.query(
  "UPDATE member_support_messages SET adminReply = ?, repliedAt = NOW(), status = 'responded' WHERE id = ?",
  ["This is a test reply from the Foundation team to verify the unread badge.", rows[0].id],
);
console.log("REPLIED_TO_ID", rows[0].id);
await pool.end();
