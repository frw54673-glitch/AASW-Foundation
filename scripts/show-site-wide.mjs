// Headed demo of the site-wide "aur tagda" pass: shows the animated
// notification with progress rail, the 404 orbiting rings, and the
// scrolled header hairline. Window stays open afterwards.
import { chromium } from "playwright";

const BASE = process.env.AASW_BASE || "http://localhost:3000";
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 1. Real notification: submit the public contact inquiry form.
await page.goto(BASE + "/contact-us", { waitUntil: "networkidle" });
await page.fill('input[name="fullName"]', "Owner Demo");
await page.fill('input[name="email"]', "owner.demo@aaswfoundation.test");
await page.fill('input[name="phone"]', "+91 90000 00003");
await page.selectOption('select[name="topic"]', "programmes");
await page.fill('textarea[name="message"]', "Demo run of the new notification design. Please ignore.");
await page.check('input[type="checkbox"]');
await page.click('button.inquiry-submit');
await page.locator(".aasw-notification").first().waitFor({ state: "visible", timeout: 15000 });
await page.waitForTimeout(2500); // watch the progress rail drain + hover-pause
await page.locator(".aasw-notification").first().hover().catch(() => {});
await page.waitForTimeout(2500);

// 2. 404 with orbiting rings.
await page.goto(BASE + "/definitely-not-a-page", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

// 3. Home: scroll to show header hairline + reveals + text-link sweep.
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.evaluate(() => document.querySelectorAll("[data-reveal]")[2]?.scrollIntoView({ behavior: "smooth" }));
await page.waitForTimeout(1800);

console.log("Demo window open at", BASE, "— close the browser to end the script.");
await new Promise(resolve => browser.on("disconnected", resolve));
process.exit(0);
