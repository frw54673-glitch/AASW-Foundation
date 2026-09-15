// Crawl every valid public route, collect all internal hrefs, verify each maps to a real route
import { chromium } from "playwright";
const ROUTES = ["/", "/about", "/who-we-are", "/vision-mission", "/what-we-do", "/digital-skills", "/green-entrepreneurship", "/mentorship-community", "/transparency", "/programs", "/team", "/reports", "/governance", "/stories", "/updates", "/membership", "/volunteer", "/media-centre", "/field-gallery", "/contact", "/contact-us", "/member/login", "/member/setup-password", "/member/reset-password", "/member/email-certificate", "/donate", "/thank-you", "/privacy", "/refund", "/404"];
// auth-gated pages render their own shell; skip content crawl there
const browser = await chromium.launch({ headless: true });
const allLinks = new Map(); // href -> [fromPages]
for (const path of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto("http://localhost:3000" + path, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    const hrefs = await page.evaluate(() => Array.from(document.querySelectorAll("a[href]")).map(a => a.getAttribute("href")).filter(h => h && !h.startsWith("http") && !h.startsWith("mailto") && !h.startsWith("tel") && !h.startsWith("#") && !h.startsWith("javascript")));
    for (const h of hrefs) {
      const clean = h.split("?")[0];
      if (!allLinks.has(clean)) allLinks.set(clean, []);
      allLinks.get(clean).push(path);
    }
  } catch (e) { console.log("crawl-fail", path, String(e).split("\n")[0].slice(0, 60)); }
  await ctx.close();
}
// valid prefixes (routes + subpaths handled by same component)
const validExact = new Set(["/", "/about", "/who-we-are", "/vision-mission", "/what-we-do", "/digital-skills", "/green-entrepreneurship", "/mentorship-community", "/transparency", "/programs", "/team", "/reports", "/governance", "/stories", "/updates", "/membership", "/volunteer", "/media-centre", "/field-gallery", "/contact", "/contact-us", "/member/login", "/member/setup-password", "/member/reset-password", "/member/dashboard", "/member/projects", "/member/discover", "/member/programmes", "/member/email-certificate", "/member/certificate", "/foundation-admin", "/foundation-admin/members", "/foundation-admin/service-requests", "/foundation-admin/support-inbox", "/mis/dashboard", "/mis/projects", "/mis/delivery", "/mis/operations", "/mis/governance", "/donate", "/thank-you", "/privacy", "/refund", "/404"]);
console.log("unique internal hrefs found:", allLinks.size);
const broken = [];
for (const [href, from] of allLinks) {
  if (!validExact.has(href)) broken.push({ href, fromCount: from.length, from: [...new Set(from)].slice(0, 4) });
}
if (broken.length) { console.log("POSSIBLE BROKEN LINKS:"); console.log(JSON.stringify(broken, null, 1)); }
else console.log("ALL LINKS RESOLVE ✓");
await browser.close();
