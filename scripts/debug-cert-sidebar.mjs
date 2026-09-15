import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded" });
await page.fill('input[autocomplete="username"]', "demo.member@aaswfoundation.test");
await page.fill('input[autocomplete="current-password"]', "AaswTest#2026");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/member/dashboard**", { timeout: 20000 });
await page.goto("http://localhost:3000/member/certificate", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000); // let any reveal animation fully finish
const r = await page.evaluate(() => {
  const el = document.querySelector(".member-sidebar");
  if (!el) return { found: false, bodyFirst: document.body.firstElementChild?.className };
  const b = el.getBoundingClientRect();
  return { found: true, left: Math.round(b.left), transform: getComputedStyle(el).transform, cls: document.querySelector(".member-sidebar-page")?.className };
});
console.log("CERT-SETTLED:", JSON.stringify(r));
await browser.close();
