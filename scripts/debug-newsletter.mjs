import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const p = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const net = [];
p.on("response", r => { if (r.url().includes("newsletter")) net.push(r.status() + " " + r.url().split("3000")[1].slice(0, 40)); });
p.on("console", m => { if (m.type() === "error") net.push("CONSOLE: " + m.text().slice(0, 120)); });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
await p.waitForTimeout(2000);
await p.fill("#footer-newsletter-email", "newsletter-e2e@aaswfoundation.test");
await p.click(".footer-newsletter button[type=submit]");
await p.waitForTimeout(4000);
const state = await p.evaluate(() => ({
  done: !!document.querySelector(".footer-newsletter-done"),
  formStill: !!document.querySelector("#footer-newsletter-email")
}));
console.log("STATE:", JSON.stringify(state));
console.log("NET:", JSON.stringify(net));
await browser.close();
