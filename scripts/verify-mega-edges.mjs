import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
for (const vw of [1280, 1535]) {
  const page = await browser.newPage({ viewport: { width: vw, height: 900 } });
  await page.goto("http://localhost:3000/about", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".desktop-nav", { timeout: 20000 });
  await page.waitForTimeout(1000);
  const triggers = await page.$$(".desktop-nav .about-mega-trigger");
  const res = [];
  for (const t of triggers) {
    const label = (await t.textContent()).trim();
    await t.hover();
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => {
      for (const p of document.querySelectorAll(".about-mega-panel-open")) {
        const r = p.getBoundingClientRect();
        if (r.width > 0) return { l: Math.round(r.left), r: Math.round(r.right) };
      }
      return null;
    });
    res.push(`${label}:${st ? (st.l >= -1 && st.r <= vw + 1 ? "OK" : `ESCAPE l=${st.l} r=${st.r}`) : "closed"}`);
  }
  console.log(vw, "=>", res.join(" | "));
  await page.close();
}
await browser.close();
