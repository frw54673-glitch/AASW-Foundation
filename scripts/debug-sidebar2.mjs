import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
// Fresh context: login sets sessionStorage flag -> full welcome intro + reveal animation
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded" });
await page.fill('input[autocomplete="username"]', "demo.member@aaswfoundation.test");
await page.fill('input[autocomplete="current-password"]', "AaswTest#2026");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/member/dashboard**", { timeout: 20000 });
// Wait until reveal class fully removed (intro 1950ms + reveal 900ms + buffer)
await page.waitForFunction(() => !document.querySelector(".member-sidebar-page")?.className.includes("member-login-dashboard-reveal"), { timeout: 15000 }).catch(e => console.log("timeout waiting reveal-clear:", e.message.split("\n")[0]));
await page.waitForTimeout(400);
const after = await page.evaluate(() => {
  const el = document.querySelector(".member-sidebar");
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return { found: true, left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), transform: cs.transform, cls: document.querySelector(".member-sidebar-page").className };
});
console.log("AFTER-ANIMATION:", JSON.stringify(after));

// Also reload WITHOUT login flag (sessionStorage flag removed) - direct dashboard visit
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".member-sidebar", { timeout: 15000 });
await page.waitForTimeout(600);
const reload = await page.evaluate(() => {
  const el = document.querySelector(".member-sidebar");
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return { left: Math.round(r.left), right: Math.round(r.right), transform: cs.transform, cls: document.querySelector(".member-sidebar-page").className };
});
console.log("RELOAD-NO-FLAG:", JSON.stringify(reload));
await ctx.close();

// And a direct cookie-only visit (like audit scripts did)
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p2 = await ctx2.newPage();
await p2.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded" });
await p2.fill('input[autocomplete="username"]', "demo.member@aaswfoundation.test");
await p2.fill('input[autocomplete="current-password"]', "AaswTest#2026");
await p2.click('button:has-text("Sign in")');
await p2.waitForURL("**/member/dashboard**", { timeout: 20000 });
// measure immediately at 300ms and at 3000ms to see animation lifecycle
for (const wait of [300, 700, 1500, 2600, 3400]) {
  await p2.waitForTimeout(wait === 300 ? 300 : wait - (300 + 700 + 1500 + 2600 - (300+700+1500+2600)) );
}
await p2.waitForTimeout(3500);
const late = await p2.evaluate(() => {
  const el = document.querySelector(".member-sidebar");
  const r = el.getBoundingClientRect();
  return { left: Math.round(r.left), transform: getComputedStyle(el).transform, cls: document.querySelector(".member-sidebar-page").className };
});
console.log("LATE-SETTLED:", JSON.stringify(late));
await browser.close();
