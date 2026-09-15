import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
const page = await ctx.newPage();
await page.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded" });
await page.fill('input[autocomplete="username"]', "demo.member@aaswfoundation.test");
await page.fill('input[autocomplete="current-password"]', "AaswTest#2026");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/member/dashboard**", { timeout: 25000 });
// sample the sidebar position every 200ms through the whole intro+reveal window
let flashes = 0, samples = [];
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(200);
  const s = await page.evaluate(() => {
    const el = document.querySelector(".member-sidebar");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), cls: el.className.includes("mobile-open"), reveal: document.querySelector(".member-sidebar-page")?.className.includes("reveal") };
  });
  if (s && s.left > -10) { flashes++; samples.push({ t: (i + 1) * 200, ...s }); }
}
console.log("FLASH-SAMPLES (left > -10):", flashes, JSON.stringify(samples.slice(0, 5)));
// drawer trigger still functional
await page.waitForTimeout(2500);
await page.click(".member-mobile-menu-trigger");
await page.waitForTimeout(500);
const open = await page.evaluate(() => { const r = document.querySelector(".member-sidebar").getBoundingClientRect(); return { left: Math.round(r.left), open: true }; });
console.log("TRIGGER-OPEN:", JSON.stringify(open));
await browser.close();
