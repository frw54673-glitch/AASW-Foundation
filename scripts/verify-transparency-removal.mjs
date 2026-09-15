// Verify the Transparency section removal: nav item gone everywhere, route 404s,
// and every destination that lived under it stays reachable.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
let failures = 0;

// 1. Header nav check on Home + an inner page (desktop + mobile)
for (const route of ["/", "/about", "/faq"]) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  const navText = await page.locator(".desktop-nav").innerText();
  const hasTransparency = /transparency/i.test(navText);
  const footerText = await page.locator(".site-footer").innerText();
  const footerHasTransparency = /transparency/i.test(footerText.split("Aapka Apna")[0]);
  const ok = !hasTransparency && !footerHasTransparency;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} nav+footer ${route}  navHasTransparency=${hasTransparency}  footerHasTransparency=${footerHasTransparency}`);
  console.log(`     nav items: ${navText.split("\n").filter(Boolean).join(", ")}`);
  await page.close();
}

// 2. Mobile nav (hamburger) check
const mobile = await browser.newPage({ viewport: { width: 375, height: 800 } });
await mobile.goto(BASE + "/", { waitUntil: "networkidle" });
await mobile.click(".menu-toggle");
await mobile.waitForTimeout(400);
const mobileNavText = await mobile.locator(".mobile-nav").innerText();
const mobileHasTransparency = /transparency/i.test(mobileNavText);
console.log(`${!mobileHasTransparency ? "PASS" : "FAIL"} mobile drawer — Transparency absent: ${!mobileHasTransparency}`);
if (mobileHasTransparency) failures++;
await mobile.close();

// 3. /transparency route now 404s
const gone = await browser.newPage();
const resp = await gone.goto(BASE + "/transparency", { waitUntil: "domcontentloaded" });
const bodyText = await gone.locator("body").innerText();
const is404 = (resp?.status() === 200 && /page you are looking for|not found|404/i.test(bodyText));
console.log(`${is404 ? "PASS" : "FAIL"} /transparency is 404 (status=${resp?.status()})`);
if (!is404) failures++;
await gone.close();

// 4. Sub-pages all still resolve 200
for (const sub of ["/stories", "/reports", "/updates", "/governance", "/field-gallery", "/media-centre"]) {
  const p = await browser.newPage();
  const r = await p.goto(BASE + sub, { waitUntil: "domcontentloaded" });
  const ok = r?.status() === 200;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${sub} reachable (${r?.status()})`);
  await p.close();
}

// 5. Screenshot of the cleaned header
const shot = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await shot.goto(BASE + "/", { waitUntil: "networkidle" });
await shot.screenshot({ path: "gui-test-screenshots/nav_transparency_removed.png" });
await shot.close();

await browser.close();
console.log(failures === 0 ? "ALL TRANSPARENCY-REMOVAL CHECKS PASSED" : `${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
