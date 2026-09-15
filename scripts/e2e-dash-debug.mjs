import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// collect console errors + failed requests
page.on("console", msg => { if (msg.type() === "error") console.log("CONSOLE-ERR:", msg.text().slice(0, 200)); });
page.on("response", r => { if (r.status() >= 400) console.log("HTTP-" + r.status() + ":", r.url().slice(0, 120)); });

await page.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded" });
await page.fill('input[autocomplete="username"]', "demo.member@aaswfoundation.test");
await page.fill('input[autocomplete="current-password"]', "AaswTest#2026");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/member/dashboard**", { timeout: 20000 });
await page.waitForTimeout(6000);

const bodyText = (await page.locator("body").innerText()).slice(0, 1200);
console.log("=== DASHBOARD TEXT ===");
console.log(bodyText.replace(/\n+/g, " | "));
await browser.close();
