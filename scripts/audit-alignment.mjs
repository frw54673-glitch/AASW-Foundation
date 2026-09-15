// Launch-readiness alignment audit: every route × 3 widths (desktop 1440,
// tablet 768, mobile 390). Checks: horizontal overflow, elements escaping the
// viewport (clipping-aware), clipped text, console errors.
// Usage: AASW_BASE=http://localhost:3010 node scripts/audit-alignment.mjs [--quick]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.env.AASW_BASE || "http://localhost:3000";
const QUICK = process.argv.includes("--quick");
let failures = 0;
const fail = (name, detail) => { failures++; console.log(`FAIL ${name} — ${detail}`); };
const pass = name => console.log(`PASS ${name}`);
const watchErrors = page => { const errs = []; page.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); page.on("pageerror", e => errs.push(String(e))); return errs; };

const PUBLIC_ROUTES = ["/", "/about", "/who-we-are", "/vision-mission", "/what-we-do", "/green-entrepreneurship", "/mentorship-community", "/programs", "/team", "/reports", "/governance", "/stories", "/updates", "/membership", "/volunteer", "/media-centre", "/field-gallery", "/contact", "/contact-us", "/faq", "/donate", "/thank-you", "/privacy", "/refund", "/nonexistent-page-test"];
const MEMBER_ROUTES = ["/member/dashboard", "/member/projects", "/member/discover", "/member/programmes", "/member/certificate"];
const ADMIN_ROUTES = ["/foundation-admin", "/foundation-admin/members", "/foundation-admin/service-requests", "/foundation-admin/support-inbox", "/mis/dashboard", "/mis/projects", "/mis/delivery", "/mis/operations", "/mis/governance"];
const WIDTHS = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "mobile", width: 390, height: 844 },
];

// In-page geometry scan.
const SCAN = () => {
  const vw = document.documentElement.clientWidth;
  const out = { overflow: 0, escapees: [], clippedTexts: [] };
  out.overflow = document.documentElement.scrollWidth - vw;

  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.position === "fixed" || cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
    if (el.closest(".member-login-welcome") || el.closest("[aria-hidden='true']")) continue;
    // closed off-canvas drawer (member sidebar slides via transform when not .mobile-open)
    if (el.closest(".member-sidebar") && !el.closest(".member-sidebar.mobile-open")) continue;
    if (r.right > vw + 8 || r.left < -8) {
      // skip if an ancestor clips it — the rings/aurora decor is intentional
      let clipped = false, p = el.parentElement;
      while (p) {
        const pcs = getComputedStyle(p);
        if (/(hidden|clip)/.test(pcs.overflow + pcs.overflowX + pcs.overflowY)) { clipped = true; break; }
        p = p.parentElement;
      }
      if (!clipped) out.escapees.push(`${el.tagName}.${String(el.className).slice(0, 36)}@L${Math.round(r.left)}R${Math.round(r.right)}`);
    }
    if (out.escapees.length >= 5) break;
  }

  for (const el of document.querySelectorAll("h1,h2,h3,p,a,span,button,blockquote,dt,dd")) {
    if (el.children.length > 0) continue;
    // sr-only is the intentional 1px screen-reader pattern, not visual clipping
    if (el.classList.contains("sr-only")) continue;
    if (el.scrollWidth > el.clientWidth + 6 && el.clientWidth > 0) {
      const cs = getComputedStyle(el);
      if (cs.overflow === "visible" || cs.textOverflow === "ellipsis") continue;
      out.clippedTexts.push(`"${el.textContent.trim().slice(0, 32)}" sw=${el.scrollWidth} cw=${el.clientWidth}`);
    }
    if (out.clippedTexts.length >= 4) break;
  }
  return out;
};

const auditPage = async (page, route, w) => {
  const label = `${route} [${w.label}]`;
  try {
    await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(500);
    const scan = await page.evaluate(SCAN);
    const errs = page.__errs.filter(e => !e.includes("favicon")).slice(0, 2);
    if (scan.overflow > 1) fail(label, `horizontal overflow Δ=${scan.overflow}px`);
    else if (scan.escapees.length) fail(label, `escapees: ${scan.escapees.join(" ; ")}`);
    else if (scan.clippedTexts.length) fail(label, `clipped: ${scan.clippedTexts.join(" ; ")}`);
    else if (errs.length) fail(label, `console: ${errs.join(" | ").slice(0, 150)}`);
    else pass(label);
  } catch (e) {
    fail(label, `load: ${String(e).slice(0, 120)}`);
  }
};

const browser = await chromium.launch();

// ── PUBLIC ──
for (const w of (QUICK ? WIDTHS.slice(0, 1) : WIDTHS)) {
  const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height }, isMobile: w.label === "mobile", hasTouch: w.label === "mobile" });
  for (const route of PUBLIC_ROUTES) {
    const page = await ctx.newPage();
    page.__errs = watchErrors(page);
    await auditPage(page, route, w);
    await page.close();
  }
  await ctx.close();
}

// ── MEMBER (login once per width) ──
if (!QUICK) for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height }, isMobile: w.label === "mobile", hasTouch: w.label === "mobile" });
  const page = await ctx.newPage();
  page.__errs = watchErrors(page);
  try {
    await page.goto(BASE + "/member/login", { waitUntil: "networkidle", timeout: 45000 });
    await page.fill('input[autocomplete="username"]', "demo.member@aaswfoundation.test");
    await page.fill('input[autocomplete="current-password"]', "AaswTest#2026");
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("**/member/dashboard", { timeout: 20000 });
    await page.waitForFunction(() => !!document.querySelector(".member-login-welcome"), { timeout: 5000 }).catch(() => {});
    await page.waitForFunction(() => !document.querySelector(".member-login-welcome"), { timeout: 10000 }).catch(() => {});
    for (const route of MEMBER_ROUTES) await auditPage(page, route, w);
  } catch (e) {
    fail(`member portal [${w.label}]`, String(e).slice(0, 140));
  }
  await ctx.close();
}

// ── ADMIN (JWT-minted session) ──
if (!QUICK) {
  const env = readFileSync(".env", "utf8");
  const secret = env.match(/^JWT_SECRET=(.+)$/m)?.[1].trim();
  const { SignJWT } = await import("jose");
  const token = await new SignJWT({ openId: "admin-local-audit", appId: "local-audit", name: "Foundation Admin" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + 8 * 3600000) / 1000))
    .sign(new TextEncoder().encode(secret));
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height }, isMobile: w.label === "mobile", hasTouch: w.label === "mobile" });
    await ctx.addCookies([{ name: "app_session_id", value: token, url: BASE, httpOnly: true }]);
    for (const route of ADMIN_ROUTES) {
      const page = await ctx.newPage();
      page.__errs = watchErrors(page);
      await auditPage(page, route, w);
      await page.close();
    }
    await ctx.close();
  }
}

await browser.close();
console.log(failures === 0 ? `\nALL ALIGNMENT CHECKS PASSED (0 failures)` : `\n${failures} ALIGNMENT FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
