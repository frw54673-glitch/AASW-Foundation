// Audit member dashboard pages (logged in) + wider desktop widths for overflow.
// Logs in ONCE (login rate limit is 8/15min), reuses the session cookie across all widths.
// Fresh contexts have no sessionStorage welcome flag, so the reveal entrance animation
// does not run and measurements reflect the settled layout.
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });

async function auditPage(page, label) {
  return page.evaluate(() => {
    const out = [];
    const vw = window.innerWidth;
    const docW = document.documentElement.scrollWidth;
    if (docW > vw + 1) out.push({ type: "page-h-overflow", detail: `${docW} > ${vw}` });
    const escapees = [];
    for (const el of document.querySelectorAll("main *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (r.right > vw + 8 || r.left < -8) {
        let clipped = false, p = el.parentElement;
        while (p) {
          const pcs = getComputedStyle(p);
          if (/(hidden|clip)/.test(pcs.overflow + pcs.overflowX)) { clipped = true; break; }
          p = p.parentElement;
        }
        if (!clipped) escapees.push({ tag: el.tagName, cls: String(el.className).slice(0, 45), right: Math.round(r.right), left: Math.round(r.left) });
      }
      if (escapees.length >= 6) break;
    }
    if (escapees.length) out.push({ type: "escapes-viewport", detail: escapees });

    // left edges of KPI cards row: should align
    const kpis = Array.from(document.querySelectorAll("[class*='kpi'], .member-dashboard-kpis > *")).map(el => Math.round(el.getBoundingClientRect().left));
    if (kpis.length > 1 && new Set(kpis).size > 1) out.push({ type: "kpi-left-mismatch", detail: kpis });
    return out;
  }).then(issues => ({ label, issues }));
}

async function settled(page, path) {
  await page.goto("http://localhost:3000" + path, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".member-sidebar-page, main", { timeout: 20000 });
  await page.waitForTimeout(2500);
}

// --- one login for the session cookie ---
const loginCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const loginPage = await loginCtx.newPage();
await loginPage.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded" });
await loginPage.fill('input[autocomplete="username"]', "demo.member@aaswfoundation.test");
await loginPage.fill('input[autocomplete="current-password"]', "AaswTest#2026");
await loginPage.click('button:has-text("Sign in")');
await loginPage.waitForURL("**/member/dashboard**", { timeout: 25000 });
await loginPage.waitForSelector(".member-sidebar", { timeout: 20000 });
const state = await loginCtx.storageState();
await loginCtx.close();

const results = [];

// Logged-in dashboard audit at multiple widths (cookie reused, no re-login)
for (const width of [1280, 1366, 1440, 1536, 1920, 820, 375]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, storageState: state });
  const page = await context.newPage();
  for (const path of ["/member/dashboard", "/member/certificate"]) {
    await settled(page, path);
    results.push(await auditPage(page, `${width}px ${path}`));
  }
  await context.close();
}

// Public pages at wider widths (overflow recheck)
for (const width of [1280, 1366, 1440, 1536, 1920]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  for (const path of ["/", "/volunteer", "/about", "/membership", "/team", "/donate", "/stories", "/reports", "/programs", "/contact"]) {
    await page.goto("http://localhost:3000" + path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);
    const r = await page.evaluate(() => {
      const vw = window.innerWidth;
      const docW = document.documentElement.scrollWidth;
      return docW > vw + 1 ? `${docW} > ${vw}` : null;
    });
    if (r) results.push({ label: `${width}px ${path}`, issues: [{ type: "page-h-overflow", detail: r }] });
  }
  await context.close();
}

await browser.close();
console.log(JSON.stringify(results.filter(r => r.issues.length), null, 1));
console.log("AUDIT-DONE");
