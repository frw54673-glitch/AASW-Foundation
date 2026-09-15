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
const ctx = await browser.newContext({ viewport: { width: 375, height: 780 } });
await ctx.addCookies([{ name: "app_session_id", value: token, url: BASE, httpOnly: true }]);
const page = await ctx.newPage();
await page.goto(BASE + "/foundation-admin", { waitUntil: "networkidle" });
// wait longer — queries may legitimately take a moment
await page.waitForTimeout(5000);
const r = await page.evaluate(() => {
  const ws = document.querySelector(".foundation-admin-workspace");
  const gate = document.querySelector(".foundation-admin-access-shell");
  const body = document.body.innerText.slice(0, 200);
  return { hasWorkspace: !!ws, hasGate: !!gate, bodyPreview: body.replace(/\n+/g, " | ") };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
