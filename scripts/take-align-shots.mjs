import { chromium } from "playwright";
const browser = await chromium.launch();
const shots = [
  ["/reports", ".report-library-grid", "align_reports_cards.png"],
  ["/team", ".team-grid-state", "align_team_state_tiles.png"],
  ["/", "footer", "align_footer.png"],
];
for (const [path, sel, file] of shots) {
  const p = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await p.goto("http://localhost:3000" + path, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: "html.js-reveal [data-reveal]{opacity:1 !important;transform:none !important;transition:none !important}" });
  await p.evaluate(() => document.querySelectorAll("[data-reveal]").forEach(el => el.setAttribute("data-revealed", "true")));
  await p.waitForTimeout(900);
  if (sel === "footer") await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  else await p.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "center" }), sel);
  await p.waitForTimeout(700);
  await p.screenshot({ path: "gui-test-screenshots/" + file });
  console.log("shot:", file);
  await p.close();
}
await browser.close();
