import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
for (const vw of [1360, 1361, 1440, 1520, 1535, 1536, 1537, 1560, 1580, 1599, 1600]) {
  const page = await browser.newPage({ viewport: { width: vw, height: 800 } });
  await page.goto("http://localhost:3000/about", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".inner-header-row", { timeout: 20000 });
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => {
    const row = document.querySelector(".inner-header-row");
    const nav = document.querySelector(".desktop-nav");
    return { docW: document.documentElement.scrollWidth, rowOver: row.scrollWidth - row.clientWidth, navDisplay: getComputedStyle(nav).display };
  });
  console.log(vw, JSON.stringify(r));
  await page.close();
}
await browser.close();
