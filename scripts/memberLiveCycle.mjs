// Self-contained dev helper: logs in as the test member, joins a fresh service
// request and submits a completion report with a payout destination, so the
// admin verify/markPaid flow (and its new member emails) can be exercised live.
// The admin JWT is minted in memory from .env — nothing is written to disk.
import { readFileSync } from "node:fs";

const BASE = "http://127.0.0.1:3000";
const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const envValue = (key) => {
  const direct = env.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim();
  return direct || process.env[key] || "";
};

const MEMBER_ID = process.argv[2] || "AASW-2026-0001";
const MEMBER_PASSWORD = process.argv[3] || "Member@2026";
const SERVICE_TYPE = process.argv[4] || "workshops_seminars";

async function api(path, init) {
  const response = await fetch(`${BASE}${path}`, init);
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, body, cookie: response.headers.get("set-cookie") };
}

let sessionCookie = "";

async function trpcMutationPublic(procedure, input) {
  const response = await fetch(`${BASE}/api/trpc/${procedure}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) sessionCookie = setCookie.split(";")[0];
  const data = await response.json();
  if (!response.ok) throw new Error(`${procedure} failed ${response.status}: ${JSON.stringify(data).slice(0, 400)}`);
  return data.result?.data?.json;
}

// tRPC batch: GET queries need superjson-wrapped input on the query string.
async function trpcGet(procedures) {
  const input = { 0: { json: null } };
  const url = `${BASE}/api/trpc/${procedures.join(",")}?input=${encodeURIComponent(JSON.stringify(input))}`;
  const response = await fetch(url, { headers: { cookie: sessionCookie } });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(`query failed: ${JSON.stringify(data).slice(0, 300)}`);
  // A single procedure returns one envelope; a batch returns an array of them.
  const entries = Array.isArray(data) ? data : [data];
  return entries.map((entry) => entry.result?.data?.json);
}

async function trpcMutation(procedure, input) {
  const response = await fetch(`${BASE}/api/trpc/${procedure}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({ json: input }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${procedure} failed ${response.status}: ${JSON.stringify(data).slice(0, 400)}`);
  return data.result?.data?.json;
}

const login = await trpcMutationPublic("member.login", { identifier: MEMBER_ID, password: MEMBER_PASSWORD });
console.log("member login: ok");

const [requests] = await trpcGet(["member.myServiceRequests"]);
const requested = requests.find((entry) => entry.serviceType === SERVICE_TYPE && entry.status === "accepted");
let request = requested;
if (!request) {
  // No accepted request yet: submit one; the admin accepts it in the next step.
  const joined = await trpcMutation("member.joinService", { serviceType: SERVICE_TYPE, message: "Live email-dispatch cycle for R20 verification." });
  request = joined.request;
  console.log("joinService:", JSON.stringify({ requestRef: request.requestRef, status: request.status, created: joined.created }));
} else {
  console.log("accepted request already present:", request.requestRef);
}
if (!request) { console.error("No request for", SERVICE_TYPE); process.exit(1); }
if (request.status !== "accepted") { console.log("request status:", request.status, "— admin accept needed before completion submit"); process.exit(2); }

// One tiny valid PNG proof keeps the "at least one proof" rule happy.
const pngProof = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const upload = await trpcMutation("member.uploadCompletionProof", {
  requestRef: request.requestRef,
  originalName: "r20-live-attendance.png",
  mimeType: "image/png",
  dataBase64: pngProof.toString("base64"),
});
console.log("proof uploaded:", upload.storageKey);

const completion = await trpcMutation("member.submitCompletion", {
  requestRef: request.requestRef,
  details: "R20 live cycle: delivered two community workshops with attendance proof; payout destination shared for settlement.",
  driveLink: "https://drive.google.com/drive/folders/r20-live-cycle",
  payoutDetails: { upiId: "testmember@okaxis" },
  proofs: [{ storageKey: upload.storageKey, originalName: upload.fileName, mimeType: upload.mimeType, fileSize: upload.fileSize }],
});
console.log("submitCompletion:", JSON.stringify(completion).slice(0, 260));
console.log("DONE — completion submitted; now run admin verify + mark-paid via scripts/adminCompletionFlow.mjs");
