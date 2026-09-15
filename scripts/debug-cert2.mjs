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
await page.waitForTimeout(4000);
const r = await page.evaluate(() => {
  const main = document.querySelector("main");
  return {
    mainCls: main?.className,
    hasSidebar: !!document.querySelector(".member-sidebar"),
    bodyClasses: document.body.className,
    rootHTML: document.getElementById("root")?.children.length,
    text: (main?.textContent || "").slice(0, 150)
  };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
