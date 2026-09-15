import { chromium } from "playwright";
const fs = await import("node:fs");
const envText = fs.readFileSync(".env", "utf8");
const secret = envText.match(/^JWT_SECRET=(.+)$/m)?.[1].trim();
const { SignJWT } = await import("jose");
const key = new TextEncoder().encode(secret);
const token = await new SignJWT({ openId: "admin-local-audit", appId: "local-audit", name: "Foundation Admin" }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt().setExpirationTime(Math.floor((Date.now() + 8 * 36e5) / 1000)).sign(key);
const b = await chromium.launch();
for (const [route, w, name] of [["/foundation-admin", 1366, "admin-hero"], ["/mis/dashboard", 1366, "mis-dash"], ["/foundation-admin/members", 375, "members-375"], ["/mis/governance", 375, "mis-gov-375"]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w === 375 ? 812 : 900 } });
  await ctx.addCookies([{ name: "app_session_id", value: token, url: "http://localhost:3000" }]);
  const p = await ctx.newPage();
  await p.goto("http://localhost:3000" + route, { waitUntil: "networkidle" }).catch(() => {});
  await p.waitForTimeout(1400);
  await p.screenshot({ path: `scripts/shot-${name}.png`, fullPage: false });
  await ctx.close();
}
await b.close();
console.log("shots done");
