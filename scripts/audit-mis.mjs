import { chromium } from "playwright";
const fs = await import("node:fs");
const envText = fs.readFileSync(".env", "utf8");
const secret = envText.match(/^JWT_SECRET=(.+)$/m)?.[1].trim();
const { SignJWT } = await import("jose");
const key = new TextEncoder().encode(secret);
const token = await new SignJWT({ openId: "admin-local-audit", appId: "local-audit", name: "Foundation Admin" }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt().setExpirationTime(Math.floor((Date.now() + 8 * 36e5) / 1000)).sign(key);

const routes = ["/foundation-admin", "/foundation-admin/members", "/foundation-admin/service-requests", "/foundation-admin/support-inbox", "/mis/dashboard", "/mis/projects", "/mis/delivery", "/mis/operations", "/mis/governance"];
const sizes = [{ w: 1366, h: 900 }, { w: 820, h: 1180 }, { w: 375, h: 812 }];
let fails = 0, total = 0;
for (const { w, h } of sizes) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.addCookies([{ name: "app_session_id", value: token, url: "http://localhost:3000" }]);
  const p = await ctx.newPage();
  for (const route of routes) {
    await p.goto(`http://localhost:3000${route}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await p.waitForSelector("main", { timeout: 12000 }).catch(() => {});
    // Use-case-aware wait: workspace renders only after auth resolves; also give
    // Vite lazy chunks + queries a beat, then re-check if main appeared late.
    await p.waitForTimeout(900);
    if (!(await p.evaluate(() => Boolean(document.querySelector("main"))))) {
      await p.waitForSelector("main", { timeout: 10000 }).catch(() => {});
      await p.waitForTimeout(600);
    }
    const r = await p.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return { ok: false, reason: "no-main" };
      const doc = document.documentElement;
      const overX = doc.scrollWidth - doc.clientWidth;
      // horizontal overflow check per element
      const off = [];
      document.querySelectorAll("main *").forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.width > 1 && (b.right > doc.clientWidth + 1 || b.left < -1)) off.push(el.tagName + "." + String(el.className).split(" ")[0] + " r=" + Math.round(b.right));
      });
      return { ok: overX <= 1 && off.length === 0, overX, off: off.slice(0, 3), hasWorkspace: main.className.includes("foundation-admin-workspace") };
    });
    total++;
    const tag = `${w} ${route} ${r.hasWorkspace ? "[ws]" : "[plain]"}`;
    if (!r.ok) { fails++; console.log(`FAIL ${tag} overX=${r.overX} off=${JSON.stringify(r.off)}`); }
    else console.log(`PASS ${tag}`);
  }
  await b.close();
}
console.log(`\n${total - fails}/${total} admin-page checks passed`);
process.exit(fails ? 1 : 0);
