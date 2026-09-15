import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const shots = [
  { path: "/", name: "final_home", scroll: ".impact-strip", w: 1366 },
  { path: "/donate", name: "final_donate_tax", scroll: ".tax-benefit-block", w: 1366 },
  { path: "/faq", name: "final_faq", scroll: null, w: 1366 },
  { path: "/reports", name: "final_reports_library", scroll: ".report-library-section", w: 1366 },
  { path: "/about", name: "final_about_alignment", scroll: ".about-alignment-section", w: 1366 },
];
for (const s of shots) {
  const p = await browser.newPage({ viewport: { width: s.w, height: 900 } });
  await p.goto("http://localhost:3000" + s.path, { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(2000);
  if (s.scroll) { await p.evaluate(sel => document.querySelector(sel)?.scrollIntoView({ block: "center" }), s.scroll); await p.waitForTimeout(1600); }
  await p.screenshot({ path: `gui-test-screenshots/${s.name}.png` });
  console.log("shot:", s.name);
  await p.close();
}
await browser.close();
