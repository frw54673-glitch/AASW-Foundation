// TEXT-SPECIFIC ALIGNMENT AUDIT: catches what geometry audits miss.
// 1. Card interior left-edges: kicker/h3/p inside cards should share the same left edge.
// 2. Icon+label rows: icon should vertically align with its text (first-line center).
// 3. Misaligned text-align: body paragraphs that are centered while siblings are left.
// 4. Footer/nav link columns: every link in a column shares the left edge.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const ROUTES = ["/", "/about", "/donate", "/faq", "/reports", "/membership", "/volunteer", "/team", "/contact-us", "/updates"];
const browser = await chromium.launch();
let totalIssues = 0;

for (const path of ROUTES) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "html.js-reveal [data-reveal]{opacity:1 !important;transform:none !important;transition:none !important}" });
  await page.evaluate(() => document.querySelectorAll("[data-reveal]").forEach((el) => el.setAttribute("data-revealed", "true")));
  await page.waitForTimeout(1200);

  const findings = await page.evaluate(() => {
    const out = [];
    const visible = (el) => { const cs = getComputedStyle(el); return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) !== 0; };

    // 1) Card interior: text blocks inside a card should share left edge (±4px).
    //    Skip: cards whose text lives in a nested copy panel (grid two-zone cards),
    //    absolute badges/labels, and centered identity tiles.
    for (const card of document.querySelectorAll(".team-card, .story-card, .faq-item, .report-card, .governance-card, .about-alignment-grid article, .about-roster-card, .get-in-touch-card, .donate-action-card, .reports-contact-card, .trust-strip-item")) {
      if (!visible(card)) continue;
      const copyPanel = card.querySelector(":scope .team-card-copy, :scope .story-card-copy, :scope .report-card-copy");
      const scope = copyPanel || card;
      const blocks = Array.from(scope.querySelectorAll(":scope h1, :scope h2, :scope h3, :scope h4, :scope p, :scope a, :scope span:not(.image-source-label), :scope strong, :scope blockquote")).filter(visible).slice(0, 14);
      if (blocks.length < 2) continue;
      const centered = getComputedStyle(scope).textAlign === "center";
      const textBlocks = blocks.filter((b) => b.getBoundingClientRect().width > 40 && getComputedStyle(b).position !== "absolute");
      if (textBlocks.length < 2) continue;
      if (centered) {
        // Centered design: every line should share the same CENTER (not left edge).
        const centers = textBlocks.map((b) => { const r = b.getBoundingClientRect(); return Math.round(r.left + r.width / 2); });
        const cmin = Math.min(...centers), cmax = Math.max(...centers);
        if (cmax - cmin > 8 && !card.classList.contains("team-card-patron")) {
          out.push({ t: "card-center-misaligned", d: `${String(card.className).slice(0, 30)} centers vary ${cmin}..${cmax} (Δ${cmax - cmin})` });
        }
      } else {
        const lefts = textBlocks.map((b) => Math.round(b.getBoundingClientRect().left));
        const tmin = Math.min(...lefts), tmax = Math.max(...lefts);
        if (tmax - tmin > 8 && !card.classList.contains("team-card-patron")) {
          out.push({ t: "card-text-edge", d: `${String(card.className).slice(0, 30)} lefts vary ${tmin}..${tmax} (Δ${tmax - tmin})` });
        }
      }
    }

    // 2) Icon+text vertical alignment: icon center vs first text line center (±5px)
    for (const row of document.querySelectorAll(".trust-strip-item, .donate-contact a, .reports-contact-card, .policy-band, .about-note, .member-data-note, .faq-question, .contact-ribbon-inner")) {
      if (!visible(row)) continue;
      const icon = row.querySelector(":scope > svg");
      if (!icon) continue;
      const label = row.querySelector(":scope > div, :scope > span:not(.sun-disc), :scope > p, :scope > strong");
      if (!label) continue;
      const ir = icon.getBoundingClientRect(), lr = label.getBoundingClientRect();
      const iconCenter = ir.top + ir.height / 2;
      const lineHeight = parseFloat(getComputedStyle(label).lineHeight) || 16;
      const firstLineCenter = lr.top + Math.min(lineHeight, lr.height) / 2;
      if (Math.abs(iconCenter - firstLineCenter) > 7 && lr.height > 0) {
        out.push({ t: "icon-text-vertical", d: `${String(row.className).slice(0, 28)} icon@${Math.round(iconCenter)} vs text@${Math.round(firstLineCenter)} (Δ${Math.round(Math.abs(iconCenter - firstLineCenter))})` });
      }
    }

    // 3) Centered body copy inconsistency: a <p> longer than 60 chars that is text-align:center while the section's primary copy is left-aligned. Cards with centered identity design (report-card cover, avatar tiles) are exempt.
    for (const p of document.querySelectorAll("main p")) {
      if (!visible(p)) continue;
      const cs = getComputedStyle(p);
      if (cs.textAlign !== "center") continue;
      if ((p.textContent || "").trim().length < 60) continue;
      if (p.closest(".team-default-avatar, .report-card-cover, .team-section-header")) continue;
      const section = p.closest("section") || p.closest("div.container");
      if (!section) continue;
      const siblings = Array.from(section.querySelectorAll("p")).filter((q) => q !== p && visible(q));
      const leftAligned = siblings.some((q) => getComputedStyle(q).textAlign === "left" || getComputedStyle(q).textAlign === "start");
      if (leftAligned && p.getBoundingClientRect().width < 900) out.push({ t: "centered-long-copy", d: `"${(p.textContent || "").trim().slice(0, 28)}…" centered amid left copy` });
    }

    // 4) Footer/nav column link left edges
    for (const col of document.querySelectorAll(".footer-column, .about-mega-group, .faq-list")) {
      if (!visible(col)) continue;
      const links = Array.from(col.querySelectorAll("a, button")).filter(visible).slice(0, 12);
      if (links.length < 2) continue;
      const lefts = links.map((l) => Math.round(l.getBoundingClientRect().left));
      const spread = Math.max(...lefts) - Math.min(...lefts);
      if (spread > 6) out.push({ t: "column-link-edge", d: `${String(col.className).slice(0, 26)} link lefts vary Δ${spread}` });
    }
    return out;
  });

  if (findings.length) {
    totalIssues += findings.length;
    console.log(`${path.padEnd(14)}: ${findings.length} findings`);
    for (const f of findings.slice(0, 6)) console.log("   ", f.t, "-", f.d);
  } else {
    console.log(`${path.padEnd(14)}: clean`);
  }
  await page.close();
}

await browser.close();
console.log(`\n==== TOTAL TEXT-ALIGNMENT FINDINGS: ${totalIssues} ====`);
