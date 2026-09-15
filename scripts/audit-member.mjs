// Live member-portal audit: login as demo member, walk every section/page,
// capture screenshots + geometry (overflow, console errors) at desktop & mobile.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const EMAIL = "demo.member@aaswfoundation.test";
const PASSWORD = "AaswTest#2026";

const browser = await chromium.launch();
const findings = [];

async function auditPage(page, label, route) {
  const errors = [];
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", err => errors.push(String(err)));
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const geo = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowers = Array.from(document.querySelectorAll("body *")).filter(el => {
      const r = el.getBoundingClientRect();
      return r.right > doc.clientWidth + 1.5 && r.width > 4 && r.height > 4;
    }).slice(0, 5).map(el => `${el.tagName}.${(el.className || "").toString().slice(0, 40)} r=${Math.round(el.getBoundingClientRect().right)}`);
    return { docW: doc.clientWidth, scrollW: doc.scrollWidth, overflowers };
  });
  const ok = geo.docW >= geo.scrollW - 1 && errors.length === 0;
  console.log(`${ok ? "PASS" : "FAIL"} [${label}] ${route} docW=${geo.docW} scrollW=${geo.scrollW} errors=${errors.length}${errors.length ? " :: " + errors[0].slice(0, 100) : ""}${geo.overflowers.length ? " OV:" + geo.overflowers.join(" | ") : ""}`);
  if (!ok) findings.push({ label, route, geo, errors: errors.slice(0, 3) });
  await page.screenshot({ path: `gui-test-screenshots/member_${label}.png`, fullPage: false });
  return ok;
}

// --- Desktop pass ---
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE + "/member/login", { waitUntil: "networkidle" });
await page.fill('input[autocomplete="username"]', EMAIL);
await page.fill('input[autocomplete="current-password"]', PASSWORD);
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/member/dashboard", { timeout: 15000 });
await page.waitForTimeout(2600); // welcome intro (1.95s) + dashboard reveal settle
await page.screenshot({ path: "gui-test-screenshots/member_home_desktop.png" });
console.log("PASS login → dashboard reached");

// Section walk (home already shown)
const sectionLabels = { profile: "My profile", membership: "My membership", history: "Membership history", services: "My services", password: "Change password" };
for (const [key, label] of Object.entries(sectionLabels)) {
  const btn = page.locator(`.member-sidebar nav button`, { hasText: label }).first();
  await btn.click();
  await page.waitForTimeout(500);
  const geo = await page.evaluate(() => ({ docW: document.documentElement.clientWidth, scrollW: document.documentElement.scrollWidth }));
  const ok = geo.docW >= geo.scrollW - 1;
  console.log(`${ok ? "PASS" : "FAIL"} [section:${key}] docW=${geo.docW} scrollW=${geo.scrollW}`);
  if (!ok) findings.push({ label, route: `section:${key}`, geo });
  await page.screenshot({ path: `gui-test-screenshots/member_${key}.png` });
}

// Discover + programmes + projects pages
for (const [label, route] of [["discover", "/member/discover"], ["programmes", "/member/programmes"], ["projects", "/member/projects"], ["certificate", "/member/certificate"]]) {
  await auditPage(page, label, route);
}

// Save session for mobile pass (same cookie)
const storage = await ctx.storageState();
await ctx.close();

// --- Mobile pass (375px) ---
const mctx = await browser.newContext({ viewport: { width: 375, height: 812 }, storageState: storage });
const mpage = await mctx.newPage();
const merrors = [];
mpage.on("console", msg => { if (msg.type() === "error") merrors.push(msg.text()); });
for (const route of ["/member/dashboard", "/member/discover", "/member/programmes", "/member/projects"]) {
  await mpage.goto(BASE + route, { waitUntil: "networkidle" });
  await mpage.waitForTimeout(700);
  const geo = await mpage.evaluate(() => {
    const doc = document.documentElement;
    const overflowers = Array.from(document.querySelectorAll("body *")).filter(el => {
      const r = el.getBoundingClientRect();
      return r.right > doc.clientWidth + 1.5 && r.width > 4 && r.height > 4;
    }).slice(0, 5).map(el => `${el.tagName}.${(el.className || "").toString().slice(0, 40)} r=${Math.round(el.getBoundingClientRect().right)}`);
    return { docW: doc.clientWidth, scrollW: doc.scrollWidth, overflowers };
  });
  const ok = geo.docW >= geo.scrollW - 1;
  console.log(`${ok ? "PASS" : "FAIL"} [mobile] ${route} docW=${geo.docW} scrollW=${geo.scrollW}${geo.overflowers.length ? " OV:" + geo.overflowers.join(" | ") : ""}`);
  if (!ok) findings.push({ label: "mobile", route, geo });
}
await mpage.goto(BASE + "/member/dashboard", { waitUntil: "networkidle" });
await mpage.waitForTimeout(500);
await mpage.click(".member-mobile-menu-trigger");
await mpage.waitForTimeout(450);
await mpage.screenshot({ path: "gui-test-screenshots/member_mobile_drawer.png" });
console.log(`mobile console errors: ${merrors.length}${merrors.length ? " :: " + merrors[0].slice(0, 120) : ""}`);
await mctx.close();
await browser.close();

console.log(findings.length === 0 ? "AUDIT CLEAN" : `AUDIT FINDINGS: ${findings.length}`);
process.exit(findings.length === 0 ? 0 : 1);
