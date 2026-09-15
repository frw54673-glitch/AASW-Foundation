import { chromium } from "playwright";
const fs = await import("node:fs");
const envText = fs.readFileSync(".env", "utf8");
const secret = envText.match(/^JWT_SECRET=(.+)$/m)?.[1].trim();
const { SignJWT } = await import("jose");
const key = new TextEncoder().encode(secret);
const token = await new SignJWT({ openId: "admin-local-audit", appId: "local-audit", name: "Foundation Admin" }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt().setExpirationTime(Math.floor((Date.now() + 8 * 36e5) / 1000)).sign(key);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
await ctx.addCookies([{ name: "app_session_id", value: token, url: "http://localhost:3000" }]);
const p = await ctx.newPage();
await p.goto("http://localhost:3000/foundation-admin", { waitUntil: "domcontentloaded" }).catch(() => {});
await p.waitForSelector(".foundation-admin-workspace", { timeout: 20000 }).catch(() => {});
await p.waitForTimeout(1000);
// slow, deliberate scroll through the end of the page
await p.evaluate(async () => {
  const h = document.body.scrollHeight;
  for (let y = 0; y <= h; y += 300) { scrollTo(0, y); await new Promise(r => setTimeout(r, 260)); }
});
await p.waitForTimeout(2800);
const info = await p.evaluate(() => {
  const left = [...document.querySelectorAll("[data-reveal]")];
  return {
    count: left.length,
    info: left.map(el => {
      const b = el.getBoundingClientRect();
      return { cls: String(el.className).slice(0, 70), top: Math.round(b.top + scrollY), height: Math.round(b.height), opacity: getComputedStyle(el).opacity, revealed: el.getAttribute("data-revealed"), sectionText: (el.querySelector("h2")?.textContent || el.textContent || "").slice(0, 40) };
    }),
    scrollH: document.body.scrollHeight,
  };
});
console.log(JSON.stringify(info, null, 1));
await b.close();
