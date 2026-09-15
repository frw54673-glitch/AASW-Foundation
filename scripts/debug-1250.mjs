import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
for (const vw of [1250, 1280]) {
  const page = await browser.newPage({ viewport: { width: vw, height: 800 } });
  await page.goto("http://localhost:3000/about", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".inner-header-row", { timeout: 20000 });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const row = document.querySelector(".inner-header-row");
    const cs = getComputedStyle(row);
    const brand = row.children[0], nav = row.children[1], actions = row.children[2];
    const g = el => { const r2 = el.getBoundingClientRect(); return { cls: String(el.className).slice(0, 28), w: Math.round(r2.width), l: Math.round(r2.left), r: Math.round(r2.right) }; };
    return {
      rowClientW: row.clientWidth, rowScrollW: row.scrollWidth,
      rowGap: cs.gap, rowPadding: cs.padding,
      brand: g(brand), nav: g(nav), actions: g(actions),
      actionsKids: Array.from(actions.children).map(g),
      navKids: Array.from(nav.children).map(g)
    };
  });
  console.log("=== " + vw + " ===");
  console.log(JSON.stringify(r, null, 1));
  await page.close();
}
await browser.close();
