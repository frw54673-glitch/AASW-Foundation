import { chromium } from "playwright";
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
const info = await p.evaluate(() => {
  const rows = document.querySelectorAll(".footer-newsletter-row");
  const inputs = document.querySelectorAll(".footer-newsletter-row input");
  return { rows: rows.length, inputs: inputs.length };
});
console.log("row/input count:", JSON.stringify(info));
await p.fill(".footer-newsletter-row input", "debug-news@example.com");
await p.waitForTimeout(300);
const after = await p.evaluate(() => {
  const input = document.querySelector(".footer-newsletter-row input");
  const btn = document.querySelector(".footer-newsletter-row button");
  return { inputValue: input?.value, btnDisabled: btn?.disabled, btnText: btn?.textContent?.trim() };
});
console.log("after fill:", JSON.stringify(after));
await browser.close();
