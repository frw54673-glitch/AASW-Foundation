// Local-only demo seed: fills the Foundation Admin workspace and MIS
// dashboards with sample records so local previews show live-looking data.
// Safe to re-run: every insert is idempotent on its unique reference code.
import mysql from "mysql2/promise";
import "dotenv/config";

const conn = await mysql.createConnection({ host: "127.0.0.1", port: 3306, user: "root", database: "aasw" });
const ADMIN = "local-dev-admin";
const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const daysFromNow = (n) => iso(new Date(today.getTime() + n * 86400000));

// ── Projects (MIS) ───────────────────────────────────────────────────────────
const projects = [
  ["Digital Skills for Rural Youth", "AASW-DSK-001", "Digital Skills", "Betul, Madhya Pradesh", "active", "2026-01-15", "2026-12-15", "Ravi Sharma"],
  ["Green Entrepreneurship Incubator", "AASW-GEN-002", "Green Entrepreneurship", "Chhindwara, Madhya Pradesh", "active", "2026-03-01", "2027-02-28", "Meena Patel"],
  ["Mentorship & Community Circles", "AASW-MCC-003", "Mentorship & Community", "Nagpur, Maharashtra", "planned", "2026-11-01", "2027-10-31", "Arjun Verma"],
  ["Village Learning Centres", "AASW-VLC-004", "Digital Skills", "Seoni, Madhya Pradesh", "on_hold", "2025-11-10", "2026-11-09", "Pooja Nair"],
  ["Clean Energy Livelihoods Pilot", "AASW-CEL-005", "Green Entrepreneurship", "Amravati, Maharashtra", "completed", "2025-06-01", "2026-05-31", "Ravi Sharma"],
];
for (const [name, code, theme, loc, status, start, end, lead] of projects) {
  await conn.query(
    "INSERT INTO projects (projectName, projectCode, projectTheme, projectLocation, startDate, endDate, projectStatus, projectLead, createdByOpenId) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE projectStatus=VALUES(projectStatus), projectLead=VALUES(projectLead)",
    [name, code, theme, loc, start, end, status, lead, ADMIN],
  );
}
const [projRows] = await conn.query("SELECT id, projectCode FROM projects");
const byCode = Object.fromEntries(projRows.map((r) => [r.projectCode, r.id]));

// ── Beneficiaries ────────────────────────────────────────────────────────────
const beneficiaries = [
  ["BEN-0001", "Anjali Kumbhare", "Bamhani", "female", 24, "Digital Skills Learner", "AASW-DSK-001"],
  ["BEN-0002", "Rahul Dhurve", "Chicholi", "male", 19, "Digital Skills Learner", "AASW-DSK-001"],
  ["BEN-0003", "Sunita Markam", "Betul Bazar", "female", 31, "Entrepreneur Cohort", "AASW-GEN-002"],
  ["BEN-0004", "Mahesh Uikey", "Sarni", "male", 27, "Entrepreneur Cohort", "AASW-GEN-002"],
  ["BEN-0005", "Kavita Bhoyar", "Ghorawadi", "female", 22, "Digital Skills Learner", "AASW-DSK-001"],
  ["BEN-0006", "Dinesh Tekam", "Saikheda", "male", 35, "Entrepreneur Cohort", "AASW-GEN-002"],
];
for (const [code, name, village, gender, age, category, projectCode] of beneficiaries) {
  await conn.query(
    "INSERT INTO beneficiaries (beneficiaryId, name, village, gender, age, phoneNumber, beneficiaryCategory, projectId, registrationDate, status, createdByOpenId) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)",
    [code, name, village, gender, age, "9" + String(700000000 + hash(code)), category, byCode[projectCode], "2026-04-10", "active", ADMIN],
  );
}
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 99999999; return h; }

// ── Field events ─────────────────────────────────────────────────────────────
const fieldEvents = [
  ["EVT-0001", "Digital literacy workshop — batch 3", "AASW-DSK-001", daysFromNow(-12), 42],
  ["EVT-0002", "Entrepreneurship bootcamp — ideation day", "AASW-GEN-002", daysFromNow(-5), 28],
  ["EVT-0003", "Community mentor circle — monthly meet", "AASW-DSK-001", daysFromNow(9), 60],
];
for (const [code, obs, projectCode, date, participants] of fieldEvents) {
  await conn.query(
    "INSERT INTO field_events (eventId, projectId, eventDate, village, locationDetails, numParticipants, staffNames, volunteerNames, observations, attachmentPaths, createdByOpenId) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE observations=VALUES(observations)",
    [code, byCode[projectCode], date, "Betul", "Community hall, main road", participants,
     JSON.stringify(["Field Coordinator"]), JSON.stringify(["Volunteer 1"]), obs, JSON.stringify([]), ADMIN],
  );
}

// ── Risks ────────────────────────────────────────────────────────────────────
const risks = [
  ["AASW-DSK-001", "Trainer attrition in remote centres", "Two trainers may relocate; backup trainer pool is thin.", "HR", 4, 3, "Cross-train two community coordinators as backup trainers.", daysFromNow(14), "open"],
  ["AASW-GEN-002", "Monsoon disrupts field visits", "Road access to 3 villages becomes unreliable during peak monsoon weeks.", "Operational", 3, 4, "Prepone visits and keep remote mentoring fallback.", daysFromNow(4), "mitigating"],
  ["AASW-VLC-004", "Centre lease renewal pending", "Landlord decision on lease renewal is pending; learning centre continuity at risk.", "Administrative", 3, 2, "Follow up with landlord; identify alternate site.", daysFromNow(-6), "open"],
];
for (const [projectCode, title, desc, cat, sev, like_, plan, due, status] of risks) {
  const [existing] = await conn.query("SELECT id FROM project_risks WHERE projectId=? AND riskTitle=?", [byCode[projectCode], title]);
  if (!existing.length) {
    await conn.query(
      "INSERT INTO project_risks (projectId, riskTitle, riskDescription, riskCategory, severity, likelihood, mitigationPlan, dueDate, status, createdByOpenId) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [byCode[projectCode], title, desc, cat, sev, like_, plan, due, status, ADMIN],
    );
  }
}

// ── Reports ──────────────────────────────────────────────────────────────────
const reports = [
  ["AASW-DSK-001", "monthly", "August 2026", daysFromNow(-3), "overdue", "Monthly progress narrative pending funder-format conversion."],
  ["AASW-GEN-002", "quarterly", "Q2 FY2026-27", daysFromNow(5), "draft", "Quarterly report drafting in progress."],
  ["AASW-CEL-005", "annual", "FY 2025-26", daysFromNow(-40), "submitted", "Annual impact report submitted to donor."],
  ["AASW-DSK-001", "quarterly", "Q3 FY2026-27", daysFromNow(45), "pending", "Next quarterly commitment."],
];
for (const [projectCode, type, period, due, status, narrative] of reports) {
  const [existing] = await conn.query("SELECT id FROM project_reports WHERE projectId=? AND reportingPeriod=? AND reportType=?", [byCode[projectCode], period, type]);
  if (!existing.length) {
    await conn.query(
      "INSERT INTO project_reports (projectId, reportType, reportingPeriod, dueDate, status, narrative, createdByOpenId) VALUES (?,?,?,?,?,?,?)",
      [byCode[projectCode], type, period, due, status, narrative, ADMIN],
    );
  }
}

// ── Foundation Admin workspace records ───────────────────────────────────────
const applications = [
  ["APP-2026-0141", "Rohit Chaudhary", "rohit.chaudhary@example.com", "9822011111", "Khandwa", "Madhya Pradesh", "Khandwa", "annual", "aadhaar", "submitted", "1041"],
  ["APP-2026-0142", "Priya Solanki", "priya.solanki@example.com", "9822022222", "Indore", "Madhya Pradesh", "Indore", "lifetime", "voter_id", "reviewing", "1042"],
  ["APP-2026-0143", "Imran Qureshi", "imran.q@example.com", "9822033333", "Bhusawal", "Maharashtra", "Jalgaon", "annual", "driving_licence", "approved", "1043"],
];
for (const [ref, name, email, phone, city, state, district, mtype, proof, status, last4] of applications) {
  await conn.query(
    "INSERT INTO membership_applications (applicationRef, fullName, email, phone, city, state, district, membershipType, message, panEncrypted, panLastFour, idProofType, idProofStorageKey, idProofOriginalName, idProofMimeType, status, consentAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status)",
    [ref, name, email, phone, city, state, district, mtype, "I want to support AASW Foundation's rural programmes.", "demo-encrypted-pan", last4, proof, "demo-storage/proof-" + ref + ".pdf", "id-proof.pdf", "application/pdf", status, new Date()],
  );
}

const inquiries = [
  ["INQ-2026-0087", "Sneha Joshi", "sneha.joshi@example.com", "9822044444", "partnership", "We run a skill-training NGO in Pune and would like to partner on the digital skills curriculum.", "submitted"],
  ["INQ-2026-0088", "Vikas Deshmukh", "vikas.d@example.com", "9822055555", "donation", "Can we sponsor a village learning centre for a year? Please share the details.", "reviewing"],
  ["INQ-2026-0089", "Aarti Sable", "aarti.sable@example.com", "9822066666", "media", "Journalist from Lokmat wants to cover the green entrepreneurship cohort.", "responded"],
];
for (const [ref, name, email, phone, topic, message, status] of inquiries) {
  await conn.query(
    "INSERT INTO contact_inquiries (inquiryRef, fullName, email, phone, topic, message, status, consentAt) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status)",
    [ref, name, email, phone, topic, message, status, new Date()],
  );
}

const donations = [
  ["DON-2026-0051", "Ananya Rao", "ananya.rao@example.com", "Bengaluru", "Karnataka", 500000, "verified"],
  ["DON-2026-0052", "Sameer Khan", "sameer.khan@example.com", "Mumbai", "Maharashtra", 250000, "checkout_created"],
  ["DON-2026-0053", "Nikhil Menon", "nikhil.menon@example.com", "Pune", "Maharashtra", 100000, "details_submitted"],
];
for (const [ref, name, email, city, state, amount, status] of donations) {
  await conn.query(
    "INSERT INTO donation_intents (donationRef, fullName, email, phone, dob, panEncrypted, panLastFour, country, state, city, address, pincode, amount, status, consentAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status)",
    [ref, name, email, "98220" + (70000 + Number(ref.slice(-3))), "1992-05-14", "demo-encrypted-pan",
     String(1000 + Number(ref.slice(-3))).slice(-4), "India", state, city, "12, Shivaji Nagar, Main Road", "440" + ref.slice(-3), amount, status, new Date()],
  );
}

const volunteers = [
  ["VOL-2026-0019", "Divya Iyer", "divya.iyer@example.com", "Chennai", "Tamil Nadu", "Teaching, Tamil-English translation", "Weekends", "Digital literacy"],
  ["VOL-2026-0020", "Harshad Pawar", "harshad.p@example.com", "Nashik", "Maharashtra", "Photography, social media", "Flexible", "Field gallery and outreach"],
];
for (const [ref, name, email, city, state, skills, availability, interests] of volunteers) {
  await conn.query(
    "INSERT INTO volunteer_applications (applicationRef, fullName, email, phone, city, state, skills, availability, interests, message, status, consentAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status)",
    [ref, name, email, "9822077" + ref.slice(-2), city, state, skills, availability, interests, "I would love to contribute on weekends.", "submitted", new Date()],
  );
}

console.log("DEMO_SEED_DONE");
await conn.end();
