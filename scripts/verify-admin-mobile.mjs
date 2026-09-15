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
let fails = 0;
for (const path of ["/foundation-admin", "/foundation-admin/members", "/foundation-admin/service-requests", "/foundation-admin/support-inbox"]) {
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  // Wait for the workspace to mount — 10 parallel tRPC queries can take a beat on cold load
  await page.waitForSelector(".foundation-admin-workspace, .foundation-admin-access-shell", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const w = window.innerWidth;
    const docW = document.documentElement.scrollWidth;
    const hasWorkspace = !!document.querySelector(".foundation-admin-workspace");
    return { overflow: docW > w + 1 ? `${docW}>${w}` : null, hasWorkspace };
  });
  const ok = !r.overflow && r.hasWorkspace;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"} ${path} @375 overflow=${r.overflow ?? "none"} workspaceRendered=${r.hasWorkspace}`);
  await page.close();
}
// screenshots (desktop polished look)
const shot = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await shot.addCookies([{ name: "app_session_id", value: token, url: BASE, httpOnly: true }]);
const sp = await shot.newPage();
await sp.goto(BASE + "/foundation-admin", { waitUntil: "networkidle" });
await sp.waitForTimeout(1800);
await sp.screenshot({ path: "gui-test-screenshots/admin_workspace_after.png" });
await sp.evaluate(() => window.scrollTo(0, 1000));
await sp.waitForTimeout(400);
await sp.screenshot({ path: "gui-test-screenshots/admin_workspace_sections.png" });
await sp.goto(BASE + "/foundation-admin/service-requests", { waitUntil: "networkidle" });
await sp.waitForTimeout(1200);
await sp.screenshot({ path: "gui-test-screenshots/admin_service_requests.png" });
await sp.goto(BASE + "/foundation-admin/support-inbox", { waitUntil: "networkidle" });
await sp.waitForTimeout(1200);
await sp.screenshot({ path: "gui-test-screenshots/admin_support_inbox.png" });
await browser.close();
console.log(fails === 0 ? "ALL MOBILE CHECKS PASSED (+ 4 screenshots)" : `${fails} FAILED`);
