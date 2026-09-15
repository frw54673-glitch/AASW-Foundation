import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const p = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await p.goto("http://localhost:3000/transparency", { waitUntil: "networkidle", timeout: 30000 });
await p.waitForTimeout(1500);
const r = await p.evaluate(() => {
  const layouts = document.querySelectorAll(".transparency-layout");
  return Array.from(layouts).slice(0, 3).map(l => {
    const cs = getComputedStyle(l);
    return { parent: l.parentElement?.className?.slice(0, 40), display: cs.display, tmpl: cs.gridTemplateColumns.slice(0, 40), left: Math.round(l.getBoundingClientRect().left), inContainer: !!l.closest(".container") };
  });
});
console.log("transparency-layouts:", JSON.stringify(r, null, 1));
// also find the container-left-mismatch source on /transparency
const r2 = await p.evaluate(() => {
  const found = [];
  for (const c of document.querySelectorAll("main .container")) {
    const l = c.getBoundingClientRect().left;
    if (l < 10 && c.getBoundingClientRect().width > 50) found.push({ cls: c.className.slice(0, 40), l: Math.round(l), w: Math.round(c.getBoundingClientRect().width), parent: c.parentElement?.className?.slice(0, 40) });
  }
  return found.slice(0, 4);
});
console.log("left<10 containers:", JSON.stringify(r2, null, 1));
await browser.close();
