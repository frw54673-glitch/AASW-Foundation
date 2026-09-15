import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
const page = await ctx.newPage();
await page.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded" });
await page.fill('input[autocomplete="username"]', "demo.member@aaswfoundation.test");
await page.fill('input[autocomplete="current-password"]', "AaswTest#2026");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/member/dashboard**", { timeout: 25000 });
await page.waitForTimeout(3000);
const before = await page.evaluate(() => {
  const s = document.querySelector(".member-sidebar");
  return { left: Math.round(s.getBoundingClientRect().left), transform: getComputedStyle(s).transform !== "none", trigger: !!document.querySelector(".member-mobile-menu-trigger") };
});
await page.click(".member-mobile-menu-trigger");
await page.waitForTimeout(600);
const after = await page.evaluate(() => {
  const s = document.querySelector(".member-sidebar");
  const r = s.getBoundingClientRect();
  const overlay = document.querySelector(".member-sidebar-overlay");
  return { left: Math.round(r.left), right: Math.round(r.right), open: s.className.includes("mobile-open"), overlayVisible: overlay ? getComputedStyle(overlay).display !== "none" : null, docW: document.documentElement.scrollWidth, vw: window.innerWidth };
});
// close via overlay
await page.click(".member-sidebar-overlay", { position: { x: 370, y: 400 } }).catch(()=>{});
await page.waitForTimeout(500);
const closed = await page.evaluate(() => {
  const s = document.querySelector(".member-sidebar");
  return { left: Math.round(s.getBoundingClientRect().left), open: s.className.includes("mobile-open") };
});
// click a nav button in drawer while open
await page.click(".member-mobile-menu-trigger");
await page.waitForTimeout(500);
const btn = await page.$(".member-sidebar nav button:nth-child(2)");
const btnText = await btn.textContent();
await btn.click();
await page.waitForTimeout(1200);
const afterNav = await page.evaluate(() => ({ left: Math.round(document.querySelector(".member-sidebar").getBoundingClientRect().left), open: document.querySelector(".member-sidebar").className.includes("mobile-open") }));
console.log(JSON.stringify({ before, after, closed, clicked: btnText.trim(), afterNav }, null, 1));
await browser.close();
