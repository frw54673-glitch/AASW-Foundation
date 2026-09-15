import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await page.waitForSelector("header", { timeout: 20000 });
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const hdr = document.querySelector("header");
  const row = hdr.firstElementChild;
  return {
    docScrollW: document.documentElement.scrollWidth,
    rowCls: row.className,
    rowOver: row.scrollWidth - row.clientWidth,
    kids: Array.from(row.children).map(k => ({ c: String(k.className).slice(0, 30), w: Math.round(k.getBoundingClientRect().width), r: Math.round(k.getBoundingClientRect().right) }))
  };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
