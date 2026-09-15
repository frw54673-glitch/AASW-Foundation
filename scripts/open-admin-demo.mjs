// Opens a real (headed) browser window on the desktop with a valid admin
// session, showing the Foundation admin workspace live. The window stays
// open until the user closes it.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const env = readFileSync(".env", "utf8");
const secret = env.match(/^JWT_SECRET=(.+)$/m)?.[1].trim();
const { SignJWT } = await import("jose");

// 24-hour admin session so the user can explore every admin page
const token = await new SignJWT({ openId: "admin-local-audit", appId: "local-audit", name: "Foundation Admin" })
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setIssuedAt()
  .setExpirationTime(Math.floor((Date.now() + 24 * 3600 * 1000) / 1000))
  .sign(new TextEncoder().encode(secret));

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "app_session_id", value: token, url: BASE, httpOnly: true }]);
const page = await ctx.newPage();
await page.goto(BASE + "/foundation-admin", { waitUntil: "networkidle" });
console.log("ADMIN PANEL OPEN — browser window desktop par khul gaya hai. Sidebar se members / service requests / support inbox bhi ghum sakta hai.");

// keep the process alive while the window is open
await new Promise((resolve) => browser.on("disconnected", resolve));
console.log("Demo window closed.");
