import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });

// --- footer geometry on /about vs home at 1366 ---
for (const path of ["/about", "/"]) {
  const p = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await p.goto("http://localhost:3000" + path, { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(1800);
  const r = await p.evaluate(() => {
    const grid = document.querySelector(".footer-grid");
    const gcs = getComputedStyle(grid);
    const kids = Array.from(grid.children).map(k => { const rect = k.getBoundingClientRect(); return { cls: String(k.className).slice(0, 30), l: Math.round(rect.left), r: Math.round(rect.right), w: Math.round(rect.width), top: Math.round(rect.top) }; });
    const nl = document.querySelector(".footer-newsletter");
    const nlRect = nl.getBoundingClientRect();
    const reach = document.querySelector('.footer-column a[href*="tel"]');
    const reachRect = reach?.getBoundingClientRect();
    return { template: gcs.gridTemplateColumns, gap: gcs.gap, kids, nlBox: { l: Math.round(nlRect.left), r: Math.round(nlRect.right) }, reachBox: reachRect ? { l: Math.round(reachRect.left), r: Math.round(reachRect.right), top: Math.round(reachRect.top) } : null };
  });
  console.log("=====", path, "=====");
  console.log("template:", r.template, "| gap:", r.gap);
  for (const k of r.kids) console.log("  col:", k.cls.padEnd(30), `l=${k.l} r=${k.r} w=${k.w} top=${k.top}`);
  console.log("newsletter box:", JSON.stringify(r.nlBox), "reach-tel box:", JSON.stringify(r.reachBox));
  await p.close();
}

// --- find the left=0 container on /reports ---
{
  const p = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await p.goto("http://localhost:3000/reports", { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(1800);
  const r = await p.evaluate(() => {
    const found = [];
    for (const c of document.querySelectorAll("main > .container, main > section .container")) {
      const l = c.getBoundingClientRect().left;
      if (l < 10) found.push({ cls: String(c.className).slice(0, 50), l: Math.round(l), w: Math.round(c.getBoundingClientRect().width), parent: c.parentElement?.className?.slice(0, 40) });
    }
    return found;
  });
  console.log("=== /reports containers at left<10 ===", JSON.stringify(r, null, 1));
  await p.close();
}
await browser.close();
