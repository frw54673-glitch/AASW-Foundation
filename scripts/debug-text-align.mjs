// Debug the text-audit findings: dump which elements produce the left mismatches.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

async function dump(path, sel, label) {
  await page.goto("http://localhost:3000" + path, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "html.js-reveal [data-reveal]{opacity:1 !important;transform:none !important;transition:none !important}" });
  await page.evaluate(() => document.querySelectorAll("[data-reveal]").forEach((el) => el.setAttribute("data-revealed", "true")));
  await page.waitForTimeout(900);
  const rows = await page.evaluate((sel) => {
    const out = [];
    document.querySelectorAll(sel).forEach((card, i) => {
      const direct = Array.from(card.querySelectorAll(":scope h1, :scope h2, :scope h3, :scope h4, :scope p, :scope a, :scope span, :scope strong, :scope blockquote, :scope svg, :scope small, :scope button")).slice(0, 12);
      const info = direct.map((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : ""} L=${Math.round(r.left)} W=${Math.round(r.width)} align=${cs.textAlign.slice(0, 1)} pos=${cs.position.slice(0, 4)} "${(el.textContent || "").trim().slice(0, 16)}"`;
      });
      out.push(`card${i} [${String(card.className).slice(0, 34)}] :: ` + info.join(" | "));
    });
    return out;
  }, sel);
  console.log(`\n### ${label} (${path})`);
  rows.slice(0, 4).forEach((r) => console.log("  " + r));
}

await dump("/", ".story-card-large", "HOME story-card-large");
await dump("/reports", ".report-card", "REPORTS report-card");
await dump("/team", ".team-card-placeholder", "TEAM state placeholder");
await dump("/reports", ".report-card-copy", "REPORTS report-card-copy internals");

// report-card-copy inner elements + their text-align
const copyInfo = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll(".report-card-copy").forEach((c, i) => {
    const items = Array.from(c.children).map((el) => {
      const cs = getComputedStyle(el);
      return `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} align=${cs.textAlign} L=${Math.round(el.getBoundingClientRect().left)}`;
    });
    const ccs = getComputedStyle(c);
    out.push(`copy${i} parentAlign=${ccs.textAlign} [${items.join(", ")}]`);
  });
  return out;
});
console.log("\n### report-card-copy align");
copyInfo.forEach((c) => console.log("  " + c));

await browser.close();
