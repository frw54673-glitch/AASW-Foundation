// Deep alignment audit: checks alignment RELATIONSHIPS (not just overflow).
import { chromium } from "playwright";

const PAGES = ["/", "/about", "/volunteer", "/membership", "/team", "/contact", "/who-we-are", "/programs", "/stories", "/donate"];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const report = [];

for (const path of PAGES) {
  await page.goto("http://localhost:3000" + path, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);
  const r = await page.evaluate(() => {
    const out = [];
    const vw = window.innerWidth;
    const round = n => Math.round(n);

    // A) container left-edge consistency
    const containers = Array.from(document.querySelectorAll('[class*="container"]')).filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 300 && r.height > 40 && r.left >= 0 && r.right <= vw;
    });
    const lefts = {};
    containers.forEach(el => {
      const key = round(el.getBoundingClientRect().left);
      lefts[key] = (lefts[key] || 0) + 1;
    });
    const mainLeft = Number(Object.entries(lefts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0);
    const oddLefts = Object.entries(lefts).filter(([k, v]) => Math.abs(Number(k) - mainLeft) > 4 && v >= 1 && Number(k) > 0);
    if (oddLefts.length) out.push({ type: "container-left-mismatch", mainLeft, odd: oddLefts.slice(0, 8) });

    // B) grid children: same-row tops + equal widths
    const grids = document.querySelectorAll('.chapter-card-grid, .story-grid, .field-note-grid, .program-list, .team-grid, [class*="grid"]');
    grids.forEach(grid => {
      const cs = getComputedStyle(grid);
      if (cs.display !== "grid") return;
      const kids = Array.from(grid.children);
      if (kids.length < 2) return;
      const tops = new Map();
      kids.forEach(k => {
        const r = k.getBoundingClientRect();
        const key = round(r.top);
        if (!tops.has(key)) tops.set(key, []);
        tops.get(key).push({ w: round(r.width), el: k.tagName + "." + String(k.className).slice(0, 30) });
      });
      tops.forEach((rowKids, top) => {
        if (rowKids.length < 2) return;
        const widths = new Set(rowKids.map(k => k.w));
        if (widths.size > 1) {
          out.push({ type: "grid-row-width-mismatch", grid: String(grid.className).slice(0, 30), top, widths: [...widths], kids: rowKids.map(k => k.el) });
        }
      });
    });

    // C) heading vs following content left edge inside sections
    document.querySelectorAll("section").forEach(sec => {
      const head = sec.querySelector("h2, h1, h3");
      if (!head) return;
      const hr = head.getBoundingClientRect();
      if (hr.left <= 0 || hr.right > vw) return;
      // find first paragraph or list after the heading
      let node = head.nextElementSibling;
      let checked = 0;
      while (node && checked < 3) {
        if (node.matches("p, div, ul, article, blockquote")) {
          const nr = node.getBoundingClientRect();
          if (nr.height > 8 && nr.width > 40) {
            const cs = getComputedStyle(node);
            // skip intentional indents (padding-left set, or flex with gap where node is a wrapper)
            const padL = parseFloat(cs.paddingLeft) || 0;
            const marginLeft = parseFloat(cs.marginLeft) || 0;
            const diff = round(nr.left - hr.left);
            if (Math.abs(diff) > 6 && padL === 0 && marginLeft === 0 && diff !== 0) {
              // ignore rail layouts: if heading itself has unusual left, skip
              out.push({ type: "heading-content-misaligned", section: String(sec.className).slice(0, 40), heading: head.textContent.trim().slice(0, 30), headingLeft: round(hr.left), nextLeft: round(nr.left), diff, nextTag: node.tagName + "." + String(node.className).slice(0, 25) });
            }
            break;
          }
        }
        node = node.nextElementSibling;
        checked++;
      }
    });

    // D) overlapping visible text siblings (same stacking area, non-nested)
    const textEls = Array.from(document.querySelectorAll("h1,h2,h3,h4,p,blockquote,a,button,span,strong,em")).filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 20 && r.height > 8 && r.top >= 0 && r.left >= 0 && r.right <= vw && r.bottom <= 4000;
    });
    const overlaps = [];
    for (let i = 0; i < Math.min(textEls.length, 400); i++) {
      for (let j = i + 1; j < Math.min(textEls.length, 400); j++) {
        const a = textEls[i], b = textEls[j];
        if (a.contains(b) || b.contains(a)) continue;
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (ix > 12 && iy > 6) {
          overlaps.push({ a: (a.textContent || "").trim().slice(0, 25), b: (b.textContent || "").trim().slice(0, 25), ix: Math.round(ix), iy: Math.round(iy) });
          if (overlaps.length >= 5) break;
        }
      }
      if (overlaps.length >= 5) break;
    }
    if (overlaps.length) out.push({ type: "text-overlap", detail: overlaps });

    return out;
  });
  if (r.length) report.push({ path, issues: r });
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
