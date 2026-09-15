// At 1366px, find exactly WHICH element causes the 99px horizontal overflow.
import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await page.goto("http://localhost:3000/volunteer", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
const el = await page.evaluate(() => {
  const vw = window.innerWidth;
  let worst = null;
  for (const e of document.querySelectorAll("body *")) {
    const r = e.getBoundingClientRect();
    if (r.width === 0) continue;
    const cs = getComputedStyle(e);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    let clipped = false, p = e.parentElement;
    while (p) {
      const pcs = getComputedStyle(p);
      if (/(hidden|clip)/.test(pcs.overflow + pcs.overflowX)) { clipped = true; break; }
      p = p.parentElement;
    }
    if (clipped) continue;
    if (r.right > vw + 10 && (!worst || r.right > worst.right)) {
      worst = { tag: e.tagName, cls: String(e.className).slice(0, 60), right: Math.round(r.right), left: Math.round(r.left), w: Math.round(r.width), id: e.id || null, text: (e.textContent || "").trim().slice(0, 30) };
    }
  }
  return worst;
});
console.log("WIDEST ESCAPING ELEMENT:", JSON.stringify(el, null, 1));
// also list its ancestors for the CSS chain
const chain = await page.evaluate(sel => {
  let e = document.querySelector(sel.tag.toLowerCase() + (sel.cls ? "." + sel.cls.split(" ")[0].replace(/[.]/g, "") : ""));
  const out = [];
  while (e && out.length < 6) { out.push({ tag: e.tagName, cls: String(e.className).slice(0, 50) }); e = e.parentElement; }
  return out;
}, el).catch(() => []);
console.log("ancestors:", JSON.stringify(chain));
await browser.close();
