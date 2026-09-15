import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
// overflow re-check at tablet widths
for (const [path, w] of [["/donate", 820], ["/donate", 800], ["/donate", 900], ["/", 820], ["/faq", 820], ["/reports", 820], ["/about", 820]]) {
  const p = await browser.newPage({ viewport: { width: w, height: 900 } });
  await p.goto("http://localhost:3000" + path, { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(1800);
  const docW = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log((docW <= w ? "PASS" : "FAIL").padEnd(5), `${path} @${w}`, "docW=" + docW);
  await p.close();
}
// newsletter duplicate subscribe test (fresh form)
{
  const p = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(2000);
  // same email as first E2E (already in DB)
  await p.fill("#footer-newsletter-email", "newsletter-e2e@aaswfoundation.test");
  await p.click(".footer-newsletter button[type=submit]");
  await p.waitForTimeout(3500);
  const res = await p.evaluate(() => ({
    done: !!document.querySelector(".footer-newsletter-done"),
    text: document.querySelector(".footer-newsletter-done")?.textContent?.trim() ?? null
  }));
  console.log((res.done ? "PASS" : "FAIL").padEnd(5), "newsletter duplicate idempotent", res.text);
  await p.close();
}
await browser.close();
