// FULL SITE VERIFICATION: every public page - console errors, failed requests, broken images, h1, overflow
import { chromium } from "playwright";
const PAGES = ["/", "/about", "/about/vision-mission", "/about/our-team", "/about/governance", "/what-we-do", "/programs", "/transparency", "/media-centre", "/contact-us", "/stories", "/reports", "/membership", "/volunteer", "/team", "/donate", "/member/login", "/member/forgot-password", "/member/certificate", "/privacy", "/terms"];
const browser = await chromium.launch({ headless: true });
const issues = [];
// --- Pass 1: 1366px desktop ---
for (const path of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const errs = [], badReq = [];
  page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
  page.on("pageerror", e => errs.push("PAGEERROR: " + String(e).slice(0, 160)));
  page.on("response", r => { if (r.status() >= 400) badReq.push(r.status() + " " + r.url().slice(0, 120)); });
  try {
    await page.goto("http://localhost:3000" + path, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2200);
    const r = await page.evaluate(() => {
      const vw = window.innerWidth, docW = document.documentElement.scrollWidth;
      const imgs = Array.from(document.images);
      const broken = imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => (i.currentSrc || i.src).slice(-70));
      const pending = imgs.filter(i => !i.complete).length;
      const h1 = document.querySelector("h1")?.textContent?.trim().slice(0, 50) || null;
      const headerLinks = document.querySelectorAll("header a[href]").length;
      return { docW, vw, broken, pending, h1, headerLinks, imgTotal: imgs.length };
    });
    const flags = [];
    if (r.docW > r.vw + 1) flags.push(`overflow ${r.docW}>${r.vw}`);
    if (r.broken.length) flags.push("broken-imgs: " + JSON.stringify(r.broken));
    if (errs.length) flags.push("console-errors: " + JSON.stringify(errs.slice(0, 3)));
    if (badReq.length) flags.push("bad-requests: " + JSON.stringify(badReq.slice(0, 3)));
    if (!r.h1 && path !== "/member/forgot-password") flags.push("no-h1");
    if (flags.length) issues.push({ path, flags, h1: r.h1, imgTotal: r.imgTotal, pending: r.pending });
    console.log(path.padEnd(28), flags.length ? "ISSUES" : "OK", r.h1 ? `h1="${r.h1.slice(0, 32)}"` : "", `imgs=${r.imgTotal}`);
  } catch (e) {
    issues.push({ path, flags: ["LOAD-FAIL: " + String(e).split("\n")[0]] });
    console.log(path.padEnd(28), "LOAD-FAIL", String(e).split("\n")[0].slice(0, 80));
  }
  await ctx.close();
}
console.log("\n=== PASS1 DONE: " + issues.length + " pages with issues ===");
console.log(JSON.stringify(issues, null, 1));
await browser.close();
