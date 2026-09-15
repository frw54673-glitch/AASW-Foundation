// Local-only helper: completes the member password setup with the token from
// the mocked activation email, then verifies the credentials log in cleanly.
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
  return { status: res.status, data: parsed };
}

const token = "LSCBDIjSewC2s6pLEPi3Yx8s_cO-y7FCYhxuGtC_r4I";
const password = "Member@2026";

const setup = await trpc("member.setupPassword", { json: { token, password } });
console.log("SETUP_STATUS", setup.status, JSON.stringify(setup.data).slice(0, 300));
if (setup.status !== 200) process.exit(1);

const login = await trpc("member.login", { json: { identifier: "AASW-2026-0001", password } });
console.log("LOGIN_STATUS", login.status, JSON.stringify(login.data).slice(0, 300));
process.exit(login.status === 200 ? 0 : 1);
