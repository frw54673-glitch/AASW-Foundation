import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const BASE = "http://localhost:3000";
const env = readFileSync(".env", "utf8");
const secret = env.match(/^JWT_SECRET=(.+)$/m)?.[1].trim();
const { SignJWT } = await import("jose");
const token = await new SignJWT({ openId: "admin-local-audit", appId: "local-audit", name: "Foundation Admin" })
  .setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt()
  .setExpirationTime(Math.floor((Date.now() + 3600000) / 1000))
  .sign(new TextEncoder().encode(secret));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 820, height: 900 } });
await ctx.addCookies([{ name: "app_session_id", value: token, url: BASE, httpOnly: true }]);
const page = await ctx.newPage();
await page.goto(BASE + "/foundation-admin", { waitUntil: "networkidle" });
await page.waitForTimeout(1600);
const out = await page.evaluate(() => {
  const w = window.innerWidth;
  const bad = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (r.right > w + 2 || r.left < -2) {
      let clipped = false, par = el.parentElement;
      while (par) { const pcs = getComputedStyle(par); if (/(hidden|clip)/.test(pcs.overflow + pcs.overflowX + pcs.overflowY)) { clipped = true; break; } par = par.parentElement; }
      if (!clipped) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} L=${Math.round(r.left)} R=${Math.round(r.right)} W=${Math.round(r.width)}`);
    }
  }
  return { docW: document.documentElement.scrollWidth, w, bad: bad.slice(0, 8) };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
