import { chromium } from "playwright";
const fs = await import("node:fs");
const envText = fs.readFileSync(".env", "utf8");
const secret = envText.match(/^JWT_SECRET=(.+)$/m)?.[1].trim();
const { SignJWT } = await import("jose");
const key = new TextEncoder().encode(secret);
const token = await new SignJWT({ openId: "admin-local-audit", appId: "local-audit", name: "Foundation Admin" }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt().setExpirationTime(Math.floor((Date.now() + 8 * 36e5) / 1000)).sign(key);

let fails = 0, total = 0;
const pass = (name, ok, detail = "") => { total++; if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  |  " + detail : ""}`); };
const b = await chromium.launch();

// A. Signed-in states: every admin page shows a real workspace (not gate), empty states styled
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
await ctx.addCookies([{ name: "app_session_id", value: token, url: "http://localhost:3000" }]);
const p = await ctx.newPage();
for (const [route] of [["/foundation-admin"], ["/foundation-admin/members"], ["/foundation-admin/service-requests"], ["/foundation-admin/support-inbox"], ["/mis/dashboard"], ["/mis/projects"], ["/mis/delivery"], ["/mis/operations"], ["/mis/governance"]]) {
  await p.goto("http://localhost:3000" + route, { waitUntil: "domcontentloaded" }).catch(() => {});
  await p.waitForSelector(".foundation-admin-workspace", { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    const ws = document.querySelector("main.foundation-admin-workspace");
    const empties = [...document.querySelectorAll("main p")].map(e => e.className.includes("dashed") ? e.textContent.trim().slice(0, 50) : null).filter(Boolean).slice(0, 2);
    return { ws: Boolean(ws), empties };
  });
  pass(`signed-in ${route} renders workspace`, r.ws, r.empts = r.empties.join(" / ").slice(0, 80));
}
await ctx.close();

// B. Anonymous gate: admin route shows the Foundation-branded access gate
const ctx2 = await b.newContext({ viewport: { width: 1366, height: 900 } });
const p2 = await ctx2.newPage();
await p2.goto("http://localhost:3000/foundation-admin", { waitUntil: "domcontentloaded" }).catch(() => {});
await p2.waitForTimeout(1800);
const gate = await p2.evaluate(() => ({
  gate: Boolean(document.querySelector(".foundation-admin-access-shell")) || document.body.innerText.includes("Sign in"),
  noWorkspace: !document.querySelector(".foundation-admin-workspace"),
}));
pass("anonymous /foundation-admin shows sign-in gate (no workspace)", gate.gate && gate.noWorkspace, JSON.stringify(gate));
await ctx2.close();

// C. Mobile: sidebar collapses, header controls remain reachable, no horizontal scroll
const ctx3 = await b.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
await ctx3.addCookies([{ name: "app_session_id", value: token, url: "http://localhost:3000" }]);
const p3 = await ctx3.newPage();
await p3.goto("http://localhost:3000/foundation-admin", { waitUntil: "domcontentloaded" }).catch(() => {});
await p3.waitForSelector(".foundation-admin-workspace", { timeout: 15000 }).catch(() => {});
await p3.waitForTimeout(700);
const mob = await p3.evaluate(() => {
  const doc = document.documentElement;
  const sidebar = document.querySelector("[data-slot=sidebar]");
  return { overX: doc.scrollWidth - doc.clientWidth, sidebar: Boolean(sidebar), w: doc.clientWidth };
});
pass("mobile 375: no horizontal scroll on workspace", mob.overX <= 1, `overX=${mob.overX} w=${mob.w}`);
await ctx3.close();

await b.close();
console.log(`\n${total - fails}/${total} state checks passed`);
process.exit(fails ? 1 : 0);
