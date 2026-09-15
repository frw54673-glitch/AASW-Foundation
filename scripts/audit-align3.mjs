// COMPREHENSIVE ALIGNMENT AUDIT: all routes x widths, geometry checks on every section
import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const issues = [];

const ROUTES = ["/", "/about", "/donate", "/faq", "/reports", "/membership", "/volunteer", "/stories", "/updates", "/team", "/contact-us", "/media-centre", "/field-gallery"];
const WIDTHS = [1366, 820, 375];

for (const vw of WIDTHS) {
  for (const path of ROUTES) {
    const p = await browser.newPage({ viewport: { width: vw, height: 900 } });
    try {
      await p.goto("http://localhost:3000" + path, { waitUntil: "networkidle", timeout: 30000 });
      await p.addStyleTag({ content: "html.js-reveal [data-reveal]{opacity:1 !important;transform:none !important;transition:none !important}" });
      await p.evaluate(() => { document.querySelectorAll("[data-reveal]").forEach(el => el.setAttribute("data-revealed", "true")); });
      await p.waitForTimeout(2500);
      const r = await p.evaluate(() => {
        const out = [];
        const w = window.innerWidth;
        const docW = document.documentElement.scrollWidth;
        if (docW > w + 1) out.push({ t: "page-overflow", d: `${docW}>${w}` });

        // 1) any visible element escaping viewport (with clip detection)
        let escapes = 0;
        for (const el of document.querySelectorAll("main *, footer *")) {
          const rect = el.getBoundingClientRect();
          if (rect.width < 2 || rect.height < 2) continue;
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
          if (rect.right > w + 6 || rect.left < -6) {
            let clipped = false, par = el.parentElement;
            while (par) { const pcs = getComputedStyle(par); if (/(hidden|clip)/.test(pcs.overflow + pcs.overflowX + pcs.overflowY)) { clipped = true; break; } par = par.parentElement; }
            if (!clipped) {
              const tag = el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.split(" ").slice(0, 2).join(".") : "");
              out.push({ t: "escape", d: `${tag} l=${Math.round(rect.left)} r=${Math.round(rect.right)}` });
              if (++escapes > 4) break;
            }
          }
        }

        // 2) text overlap between visible text-bearing leaf elements
        const leaves = [];
        for (const el of document.querySelectorAll("main h1, main h2, main h3, main h4, main p, main a, main span, main strong, main button, footer h3, footer p, footer a, footer span, footer strong, footer button")) {
          if (!el.textContent?.trim()) continue;
          if (el.children.length > 0) { let textOnly = true; for (const c of el.children) if (!["svg", "i", "b", "em", "small", "strong", "span", "br"].includes(c.tagName.toLowerCase())) { textOnly = false; break; } if (!textOnly) continue; }
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width < 8 || rect.height < 6) continue;
          let clipped = false, par = el.parentElement;
          while (par) { const pcs = getComputedStyle(par); if (/(hidden|clip)/.test(pcs.overflow + pcs.overflowX + pcs.overflowY)) { clipped = true; break; } par = par.parentElement; }
          if (clipped) continue;
          // skip fixed/floating elements (whatsapp button, back-to-top)
          if (cs.position === "fixed") continue;
          leaves.push({ el, rect, text: el.textContent.trim().slice(0, 22) });
          if (leaves.length > 400) break;
        }
        let overlaps = 0;
        outer: for (let i = 0; i < leaves.length; i++) {
          for (let j = i + 1; j < leaves.length; j++) {
            const a = leaves[i], b = leaves[j];
            if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
            const ix = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
            const iy = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
            if (ix > 12 && iy > 8) {
              out.push({ t: "text-overlap", d: `"${a.text}" <> "${b.text}" ix=${Math.round(ix)} iy=${Math.round(iy)}` });
              if (++overlaps > 3) break outer;
            }
          }
        }

        // 3) container left-edge consistency: main containers on a page should share left edge
        const containers = Array.from(document.querySelectorAll("main > .container, main > section .container")).map(c => Math.round(c.getBoundingClientRect().left)).filter(l => l > -10);
        const uniq = [...new Set(containers)];
        if (uniq.length > 1) out.push({ t: "container-left-mismatch", d: JSON.stringify(uniq.slice(0, 5)) });

        // 4) card grids: same-row cards should share top AND equal heights in same row
        for (const grid of document.querySelectorAll(".trust-strip-grid, .faq-groups, .report-library-grid, .about-alignment-grid, .donate-impact-grid, .tax-benefit-block")) {
          const kids = Array.from(grid.children).map(k => ({ top: Math.round(k.getBoundingClientRect().top), h: Math.round(k.getBoundingClientRect().height), w: Math.round(k.getBoundingClientRect().width), cls: String(k.className).slice(0, 28) }));
          if (!kids.length) continue;
          const rows = {};
          for (const k of kids) { (rows[k.top] ||= []).push(k); }
          for (const [top, row] of Object.entries(rows)) {
            if (row.length > 1) {
              const heights = row.map(k => k.h), widths = row.map(k => k.w);
              const hSpread = Math.max(...heights) - Math.min(...heights);
              const wSpread = Math.max(...widths) - Math.min(...widths);
              if (hSpread > 8 && !grid.className.includes("tax-benefit")) out.push({ t: "row-height-mismatch", d: `${grid.className.slice(0, 28)} top=${top} h=${heights.join(",")}` });
              if (wSpread > 8) out.push({ t: "row-width-mismatch", d: `${grid.className.slice(0, 28)} top=${top} w=${widths.join(",")}` });
            }
          }
        }

        // 5) section spacing rhythm: consecutive main sections padding shouldn't be wildly inconsistent
        const secs = Array.from(document.querySelectorAll("main > section")).filter(s => s.offsetHeight > 40);
        for (const s of secs.slice(1)) {
          const cs = getComputedStyle(s);
          const pad = parseFloat(cs.paddingTop);
          const prev = s.previousElementSibling;
          if (!prev || prev.tagName !== "SECTION") continue;
          const pprev = getComputedStyle(prev);
          const padPrev = parseFloat(pprev.paddingTop);
          if (pad > 0 && padPrev > 0 && Math.abs(pad - padPrev) > 90) out.push({ t: "section-rhythm", d: `${s.className.slice(0, 30)} pad=${pad} vs prev=${padPrev}` });
        }
        return out;
      });
      if (r.length) { issues.push({ path, vw, r }); console.log(`${path.padEnd(18)} @${vw}: ${r.length} issues`); for (const x of r.slice(0, 4)) console.log("   ", x.t, "-", x.d); }
      else console.log(`${path.padEnd(18)} @${vw}: clean`);
    } catch (e) { console.log(path, "FAIL", String(e).split("\n")[0].slice(0, 50)); }
    await p.close();
  }
}
console.log("\n==== TOTAL PAGES WITH ISSUES:", issues.length, "====");
await browser.close();
