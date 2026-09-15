import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 250)); });
page.on("response", r => { if (r.url().includes("member.login") || r.url().includes("member/auth")) errs.push("HTTP " + r.status() + " " + r.url().slice(0, 120)); });
await page.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded" });
await page.fill('input[autocomplete="username"]', "demo.member@aaswfoundation.test");
await page.fill('input[autocomplete="current-password"]', "AaswTest#2026");
await page.click('button:has-text("Sign in")');
try {
  await page.waitForURL("**/member/dashboard**", { timeout: 25000 });
  console.log("LOGIN OK ->", page.url());
} catch (e) {
  console.log("LOGIN FAILED. URL:", page.url());
  const body = await page.evaluate(() => document.body.innerText.slice(0, 400));
  console.log("BODY:", body);
}
console.log("CONSOLE:", JSON.stringify(errs.slice(0, 6), null, 1));
await browser.close();
