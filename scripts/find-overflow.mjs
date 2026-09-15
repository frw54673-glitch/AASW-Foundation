import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const p = await browser.newPage({ viewport: { width: 820, height: 900 } });
await p.goto("http://localhost:3000/faq", { waitUntil: "networkidle", timeout: 30000 });
await p.waitForTimeout(1800);
const culprits = await p.evaluate(() => {
  const vw = window.innerWidth;
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 2 || r.left < -2) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      out.push({ tag: el.tagName, cls: String(el.className).slice(0, 45), l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) });
      if (out.length >= 8) break;
    }
  }
  return out;
});
console.log(JSON.stringify(culprits, null, 1));
await browser.close();
