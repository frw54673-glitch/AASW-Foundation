import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await page.goto("http://localhost:3000/about", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".desktop-nav", { timeout: 20000 });
await page.waitForTimeout(1200);
// hover each mega trigger, check panel visible + within viewport
const triggers = await page.$$(".desktop-nav .about-mega-trigger");
console.log("triggers:", triggers.length);
for (let i = 0; i < triggers.length; i++) {
  const t = triggers[i];
  const label = (await t.textContent()).trim();
  await t.hover();
  await page.waitForTimeout(500);
  const st = await page.evaluate(() => {
    const panels = document.querySelectorAll(".about-mega-panel-open, [class*='header-mega-panel']");
    let out = null;
    for (const p of panels) {
      const cs = getComputedStyle(p);
      if (cs.display === "none") continue;
      const r = p.getBoundingClientRect();
      if (r.width > 0 && cs.opacity !== "0" && r.height > 0) { out = { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }; break; }
    }
    return { panel: out, docW: document.documentElement.scrollWidth, vw: window.innerWidth };
  });
  const inView = st.panel && st.panel.l >= -1 && st.panel.r <= st.vw + 1;
  console.log(`  [${i}] ${label.padEnd(14)} panel=${JSON.stringify(st.panel)} ${st.panel ? (inView ? "IN-VIEW" : "ESCAPES!") : "not-open"} docW=${st.docW}/${st.vw}`);
}
// also hover all nav links quickly to ensure no layout shift
const docW = await page.evaluate(() => document.documentElement.scrollWidth);
console.log("final docW:", docW);
await browser.close();
