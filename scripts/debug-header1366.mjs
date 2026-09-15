import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
for (const vw of [1366, 1400, 1500, 1600, 1920]) {
  const page = await browser.newPage({ viewport: { width: vw, height: 900 } });
  await page.goto("http://localhost:3000/about", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".inner-header-row", { timeout: 20000 });
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => {
    const row = document.querySelector(".inner-header-row");
    const actions = document.querySelector(".header-actions");
    const nav = document.querySelector(".desktop-nav");
    const contact = document.querySelector(".header-contact");
    const brand = document.querySelector(".brand-lockup");
    const rowR = row.getBoundingClientRect();
    return {
      docScrollW: document.documentElement.scrollWidth,
      row: { scrollW: row.scrollWidth, clientW: row.clientWidth, over: row.scrollWidth - row.clientWidth },
      actions: { l: Math.round(actions.getBoundingClientRect().left), r: Math.round(actions.getBoundingClientRect().right), w: Math.round(actions.getBoundingClientRect().width), scrollW: actions.scrollWidth, over: actions.scrollWidth - actions.clientWidth, kidW: Array.from(actions.children).map(c => Math.round(c.getBoundingClientRect().width)) },
      nav: nav ? { w: Math.round(nav.getBoundingClientRect().width), display: getComputedStyle(nav).display } : null,
      contactW: contact ? Math.round(contact.getBoundingClientRect().width) : null,
      brandW: brand ? Math.round(brand.getBoundingClientRect().width) : null
    };
  });
  console.log(vw, "=>", JSON.stringify(info));
  await page.close();
}
await browser.close();
