import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
for (const vw of [941, 1100, 1200, 1249, 1250, 1280, 1300, 1366, 1400, 1440, 1500, 1535, 1536, 1600]) {
  const page = await browser.newPage({ viewport: { width: vw, height: 800 } });
  await page.goto("http://localhost:3000/about", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".inner-header-row", { timeout: 20000 });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const row = document.querySelector(".inner-header-row");
    const nav = document.querySelector(".desktop-nav");
    const actions = document.querySelector(".header-actions");
    const contact = document.querySelector(".header-contact");
    return {
      docW: document.documentElement.scrollWidth, vw: window.innerWidth,
      rowOver: row.scrollWidth - row.clientWidth,
      navDisplay: getComputedStyle(nav).display,
      navW: Math.round(nav.getBoundingClientRect().width),
      actionsR: Math.round(actions.getBoundingClientRect().right),
      contactDisplay: contact ? getComputedStyle(contact).display : "absent"
    };
  });
  console.log(vw, JSON.stringify(r));
  await page.close();
}
await browser.close();
