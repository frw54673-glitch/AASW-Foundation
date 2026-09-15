// Local-only helper: admin API calls for completion flow verification.
// Mints its own short-lived admin session from .env (JWT_SECRET + OWNER_OPEN_ID)
// so no token file has to sit on disk. Dev use only — never run in production.
import { readFileSync } from "node:fs";
import { SignJWT } from "jose";

const env = readFileSync(".env", "utf8");
const secret = env.match(/^JWT_SECRET=(.+)$/m)?.[1].trim();
const owner = env.match(/^OWNER_OPEN_ID=(\S+)$/m)?.[1] || "local-dev-admin";
if (!secret) {
  console.error("JWT_SECRET missing from .env");
  process.exit(1);
}
const key = new TextEncoder().encode(secret);
const token = await new SignJWT({ openId: owner, appId: "local-audit", name: "Foundation Admin" })
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setIssuedAt()
  .setExpirationTime(Math.floor((Date.now() + 2 * 3600 * 1000) / 1000))
  .sign(key);
const cookie = `app_session_id=${token}`;

async function trpc(path, input, method = "POST") {
  if (method === "GET") {
    const url = `http://localhost:3000/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: input } }))}`;
    const res = await fetch(url, { headers: { cookie } });
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed[0]?.error) { console.error("TRPC_ERROR", JSON.stringify(parsed[0].error).slice(0, 300)); process.exit(1); }
      return parsed[0]?.result?.data?.json;
    } catch {
      console.error("RAW", res.status, text.slice(0, 300));
      process.exit(1);
    }
  }
  const res = await fetch(`http://localhost:3000/api/trpc/${path}?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ "0": { json: input } }),
  });
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    if (parsed[0]?.error) { console.error("TRPC_ERROR", JSON.stringify(parsed[0].error).slice(0, 300)); process.exit(1); }
    return parsed[0]?.result?.data?.json;
  } catch {
    console.error("RAW", res.status, text.slice(0, 300));
    process.exit(1);
  }
}

const command = process.argv[2];
if (command === "list-requests") {
  const list = await trpc("management.serviceRequests.list", { limit: 10 }, "GET");
  for (const item of list) console.log(item.requestRef, "|", item.serviceType, "|", item.status, "|", item.fullName);
} else if (command === "accept") {
  const ref = process.argv[3];
  const result = await trpc("management.serviceRequests.updateStatus", { requestRef: ref, status: "accepted", adminNote: "Your programme place is confirmed. Complete the work and submit a completion report with proof from the portal." });
  console.log("ACCEPTED:", JSON.stringify(result));
} else if (command === "list-completions") {
  const list = await trpc("management.completions.list", { limit: 10 }, "GET");
  console.log("count:", list.length);
  for (const item of list) console.log(item.completionRef, "|", item.requestRef, "|", item.status, "|", item.fullName, "| proofs:", item.proofs.length, "| payout:", item.payoutAmount);
} else if (command === "stats") {
  const stats = await trpc("management.completions.stats", undefined, "GET");
  console.log("STATS:", JSON.stringify(stats));
} else if (command === "verify") {
  const [ref, amountRupees, method] = [process.argv[3], Number(process.argv[4]), process.argv[5]];
  const result = await trpc("management.completions.verify", { completionRef: ref, payoutAmount: amountRupees * 100, payoutMethod: method, payoutNote: "Payout will reach your registered account within 3 working days." });
  console.log("VERIFIED:", JSON.stringify(result));
} else if (command === "reject") {
  const [ref, ...reasonParts] = process.argv.slice(3);
  const reason = reasonParts.join(" ") || "The proof does not clearly show the completed work. Please attach clearer documentation.";
  const result = await trpc("management.completions.reject", { completionRef: ref, rejectionReason: reason });
  console.log("REJECTED:", JSON.stringify(result));
} else if (command === "mark-paid") {
  const [ref, reference] = [process.argv[3], process.argv[4]];
  const result = await trpc("management.completions.markPaid", { completionRef: ref, payoutReference: reference });
  console.log("PAID:", JSON.stringify(result));
} else {
  console.log("Usage: node scripts/adminCompletionFlow.mjs <list-requests|accept <ref>|list-completions|verify <ref> <rupees> <upi|bank_transfer|other>|reject <ref> <reason...>|mark-paid <ref> <reference>>");
}
