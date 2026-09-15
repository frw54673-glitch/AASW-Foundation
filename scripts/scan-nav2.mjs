import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
// Inner pages (worst case: 8 nav items) + Home at key widths
for (const path of ["/about", "/"]) {
  for (const vw of [941, 1100, 1279, 1280, 1281, 1366, 1440, 1535, 1536, 1600, 1920]) {
    const page = await browser.newPage({ viewport: { width: vw, height: 800 } });
    await page.goto("http://localhost:3000" + path, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".desktop-nav, header", { timeout: 20000 });
    await page.waitForTimeout(1000);
    const r = await page.evaluate(() => {
      const nav = document.querySelector(".desktop-nav");
      const row = document.querySelector(".inner-header-row") || document.querySelector("header > .container");
      return {
        docW: document.documentElement.scrollWidth, vw: window.innerWidth,
        rowOver: row.scrollWidth - row.clientWidth,
        navDisplay: nav ? getComputedStyle(nav).display : null
      };
    });
    const flag = r.docW > r.vw || r.rowOver > 0 ? " << OVERFLOW" : "";
    console.log(path.padEnd(6), vw, JSON.stringify(r), flag);
    await page.close();
  }
}
await browser.close();
