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
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
await ctx.addCookies([{ name: "app_session_id", value: token, url: "http://localhost:3000" }]);
const p = await ctx.newPage();
const errs = [];
p.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 150)); });
p.on("pageerror", e => errs.push(String(e).slice(0, 150)));

// A. Foundation workspace: brand rail + counters + reveals (early snapshot + scroll-through)
await p.goto("http://localhost:3000/foundation-admin", { waitUntil: "domcontentloaded" }).catch(() => {});
await p.waitForSelector(".foundation-admin-workspace", { timeout: 20000 }).catch(() => {});
await p.waitForTimeout(800); // early window: data-revealed set, attr cleanup at ~1500ms
const early = await p.evaluate(() => {
  const shown = [...document.querySelectorAll("[data-revealed='true']")];
  const pending = [...document.querySelectorAll("[data-reveal]:not([data-revealed])")];
  const inView = pending.filter(el => { const b = el.getBoundingClientRect(); return b.top < innerHeight && b.bottom > 0; });
  return { shown: shown.length, pendingTotal: pending.length, pendingInView: inView.length };
});
pass("in-view sections reveal immediately (early window)", early.shown >= 3 && early.pendingInView === 0, `shown=${early.shown} pendingInView=${early.pendingInView} pendingBelowFold=${early.pendingTotal - early.pendingInView}`);

// scroll through the whole workspace: every reveal must fire, none stuck
await p.evaluate(async () => { const h = document.body.scrollHeight; for (let y = 0; y <= h; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 140)); } }); // end AT the bottom: everything must have entered the viewport
await p.waitForTimeout(2400);
const after = await p.evaluate(() => {
  const left = [...document.querySelectorAll("[data-reveal]")];
  const anyHidden = left.filter(el => { const s = getComputedStyle(el); return s.opacity === "0"; });
  const rail = document.querySelector('.dashboard-shell-brand [data-slot="sidebar-inner"]');
  const mark = document.querySelector('[data-slot="sidebar-header"] span[aria-hidden]');
  const active = document.querySelector('[data-slot="sidebar-menu-button"][data-active="true"]');
  const counters = [...document.querySelectorAll(".foundation-admin-summary-card")].map(c => c.querySelector("p")?.textContent?.trim());
  return { left: left.length, anyHidden: anyHidden.length, railBg: rail ? getComputedStyle(rail).backgroundColor : "none", markBg: mark ? getComputedStyle(mark).backgroundColor : "none", activeBg: active ? getComputedStyle(active).backgroundColor : "none", counters };
});
pass("full-scroll reveal: every element revealed, none stuck invisible", after.left === 0 && after.anyHidden === 0, `left=${after.left} hidden=${after.anyHidden}`);
pass("sidebar rail dark green + ochre monogram + active highlight", after.railBg === "rgb(23, 76, 60)" && after.markBg === "rgb(234, 192, 110)" && after.activeBg === "rgb(36, 92, 71)", `rail=${after.railBg} mark=${after.markBg} active=${after.activeBg}`);
pass("summary counters rendered final values", after.counters.length === 6 && after.counters.every(c => /^\d+$/.test(c ?? "")), `values=${after.counters.join(",")}`);

// B. MIS dashboard: branded rail + reveal flow
await p.goto("http://localhost:3000/mis/dashboard", { waitUntil: "domcontentloaded" }).catch(() => {});
await p.waitForSelector(".foundation-admin-workspace", { timeout: 20000 }).catch(() => {});
await p.waitForTimeout(800);
const misEarly = await p.evaluate(() => {
  const shown = document.querySelectorAll("[data-revealed='true']").length;
  const pending = [...document.querySelectorAll("[data-reveal]:not([data-revealed])")];
  const inView = pending.filter(el => { const b = el.getBoundingClientRect(); return b.top < innerHeight && b.bottom > 0; });
  const rail = document.querySelector('.dashboard-shell-brand [data-slot="sidebar-inner"]');
  return { shown, pendingInView: inView.length, railBg: rail ? getComputedStyle(rail).backgroundColor : "none" };
});
await p.evaluate(async () => { const h = document.body.scrollHeight; for (let y = 0; y <= h; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 140)); } }); // end AT the bottom: everything must have entered the viewport
await p.waitForTimeout(2400);
const misAfter = await p.evaluate(() => {
  const left = [...document.querySelectorAll("[data-reveal]")];
  const stat = document.querySelector('[data-mis-panels] article strong');
  return { left: left.length, stat: stat?.textContent?.trim() ?? "none" };
});
pass("MIS dashboard branded rail", misEarly.railBg === "rgb(23, 76, 60)", `rail=${misEarly.railBg}`);
pass("MIS reveals fire in view and complete after scroll", misEarly.shown >= 1 && misEarly.pendingInView === 0 && misAfter.left === 0, `shown=${misEarly.shown} leftAfterScroll=${misAfter.left}`);
pass("MIS stat value renders", /\d/.test(misAfter.stat), `stat="${misAfter.stat}"`);

// C. Skeleton loading: delay ONLY the service-requests data query (auth resolves normally)
const p2 = await ctx.newPage();
await p2.route("**/api/trpc/management.serviceRequests*", route => new Promise(res => setTimeout(() => { route.continue(); res(); }, 3200)));
await p2.goto("http://localhost:3000/foundation-admin/service-requests", { waitUntil: "domcontentloaded" }).catch(() => {});
await p2.waitForTimeout(1600);
const sk = await p2.evaluate(() => ({
  hero: Boolean(document.querySelector(".foundation-admin-skeleton-hero")),
  cards: document.querySelectorAll(".foundation-admin-skeleton-record").length,
  gate: document.body.innerText.includes("Sign in to continue"),
}));
pass("service-requests shows workspace-shaped skeleton while data loads", sk.hero && sk.cards >= 2 && !sk.gate, `hero=${sk.hero} cards=${sk.cards} gate=${sk.gate}`);
await p2.unroute("**/api/trpc/management.serviceRequests*");

// D. console/page errors across all visits
pass("zero console or page errors on admin screens", errs.length === 0, errs.slice(0, 3).join(" | ") || "clean");

await b.close();
console.log(`\n${total - fails}/${total} visual checks passed`);
process.exit(fails ? 1 : 0);
