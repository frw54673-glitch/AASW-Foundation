// Opens a real (headed) browser window with the member portal live, logged in
// as the local demo member, showing the "aur tagda" upgrades.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE + "/member/login", { waitUntil: "networkidle" });
await page.fill('input[autocomplete="username"]', "demo.member@aaswfoundation.test");
await page.fill('input[autocomplete="current-password"]', "AaswTest#2026");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/member/dashboard", { timeout: 15000 });
console.log("MEMBER PORTAL OPEN — dashboard live hai. Sidebar se My membership / My services / Membership history ghum sakta hai. /member/projects pe apna assigned project dekho!");
await new Promise(resolve => browser.on("disconnected", resolve));
console.log("Demo window closed.");
