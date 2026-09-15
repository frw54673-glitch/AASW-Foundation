// Local-only helper: submits a test membership application through the real
// tRPC endpoint so a genuine member account (with setup token) is created.
// Dev mode mocks the activation email, so the setup link is only in logs.
const base = "http://localhost:3000";

async function trpc(path, body) {
  const res = await fetch(`${base}/api/trpc/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  if (!res.ok || parsed?.error) {
    console.error("TRPC_ERROR", res.status, JSON.stringify(parsed).slice(0, 500));
    process.exit(1);
  }
  return parsed.result?.data?.json ?? parsed.result?.data;
}

// 1x1 transparent PNG as minimal valid ID proof.
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const email = "aasw.test.member1788807254411@example.com";
const result = await trpc("membership.submit", {
  json: {
    fullName: "Test Member",
    email,
    phone: "+91 98765 43210",
    city: "Kanpur",
    state: "Uttar Pradesh",
    district: "Kanpur Dehat",
    membershipType: "annual",
    panNumber: "ABCDE1234F",
    idProof: { type: "aadhaar", originalName: "id-proof.png", mimeType: "image/png", dataBase64: PNG },
    message: "Local dashboard preview test member",
    privacyConsent: true,
  },
});

console.log("SUBMIT_OK", JSON.stringify(result));
