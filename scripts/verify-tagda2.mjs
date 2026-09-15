// Verify the "aur tagda" round-2 upgrades live:
// hero Ken Burns settle, avatar-stack staggered pop, FAQ smooth expand,
// mega-menu stagger, social-link spring, scroll-to-top button.
import { chromium } from "playwright";

const BASE = process.env.AASW_BASE || "http://localhost:3000";
let failures = 0;
const check = (name, ok, detail = "") => { failures += ok ? 0 : 1; console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); };
const watchErrors = page => { const errs = []; page.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); page.on("pageerror", e => errs.push(String(e))); return errs; };

const browser = await chromium.launch();

// ── 1. Home hero: Ken Burns settle + avatar pop stagger ──
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = watchErrors(page);
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const hero = await page.evaluate(() => {
  const img = document.querySelector(".hero-visual img");
  const avatars = Array.from(document.querySelectorAll(".avatar-stack .avatar"));
  return {
    settle: img ? getComputedStyle(img).animationName : null,
    avatarAnims: avatars.map(a => getComputedStyle(a).animationName),
    avatarDelays: avatars.map((a, i) => getComputedStyle(a).animationDelay),
  };
});
check("hero Ken Burns settle animation", hero.settle === "aasw-hero-settle", hero.settle);
check("avatar-stack staggered pop", hero.avatarAnims.every(a => a === "aasw-avatar-pop") && hero.avatarDelays[0] !== hero.avatarDelays[2], hero.avatarDelays.join(", "));

// ── 2. FAQ smooth expand: grid-rows transition + hidden attr removed ──
// NOTE: the first FAQ is open by design (donations-0) — sample a CLOSED item.
await page.goto(BASE + "/faq", { waitUntil: "networkidle" });
const closedQ = page.locator(".faq-item:not(.faq-item-open) .faq-question").first();
const before = await page.evaluate(() => {
  const ans = document.querySelector(".faq-item:not(.faq-item-open) .faq-answer");
  return { rows: getComputedStyle(ans).gridTemplateRows, hiddenAttr: ans.hasAttribute("hidden"), transition: getComputedStyle(ans).transitionDuration, h: Math.round(ans.getBoundingClientRect().height) };
});
await closedQ.click();
await page.waitForTimeout(450);
const after = await page.evaluate(() => {
  const item = document.querySelector(".faq-item-open .faq-answer");
  return item ? { rows: getComputedStyle(item).gridTemplateRows, height: Math.round(item.getBoundingClientRect().height) } : null;
});
check("FAQ collapsed state (flat, no hidden attr)", before.h <= 2 && !before.hiddenAttr, `h=${before.h}px rows=${before.rows} hidden=${before.hiddenAttr}`);
check("FAQ expands smoothly with height", after && after.height > 40, after ? `h=${after.height}px` : "no open item");
check("FAQ transition duration set", before.transition !== "0s", before.transition);
await page.screenshot({ path: "gui-test-screenshots/align-interactive/faq-smooth-open.png" });

// ── 3. Mega menu stagger: groups animate in with delays ──
// The About menu has a single group; use "What we do" (3 groups) for the stagger check.
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.locator("button[aria-haspopup='true']:has-text('What we do')").hover();
await page.waitForTimeout(350);
const mega = await page.evaluate(() => {
  const groups = Array.from(document.querySelectorAll(".about-mega-panel-open .about-mega-group"));
  return {
    count: groups.length,
    anims: groups.map(g => getComputedStyle(g).animationName),
    delays: groups.map(g => getComputedStyle(g).animationDelay),
  };
});
check("mega menu groups stagger in", mega.count >= 2 && mega.anims.every(a => a === "aasw-mega-item-in"), `count=${mega.count} anims[0]=${mega.anims[0]}`);
check("mega menu stagger delays differ", mega.delays[0] !== mega.delays[mega.delays.length - 1], mega.delays.join(", "));

// ── 4. Social links spring ──
const social = await page.evaluate(() => {
  const a = document.querySelector(".social-links a");
  if (!a) return null;
  const cs = getComputedStyle(a);
  return { transition: cs.transitionTimingFunction, activeFound: true };
});
check("footer social spring curve", social && social.transition.includes("1.56"), social ? social.transition : "no social links");

// ── 5. Home back-to-top (existing button, refined): hidden at top, appears past 520px, glides up ──
const atTop = await page.evaluate(() => !!document.querySelector(".back-to-top"));
check("back-to-top hidden at page top", atTop === false, `present=${atTop}`);
await page.evaluate(() => window.scrollTo(0, 700));
await page.waitForTimeout(500);
const btn = page.locator(".back-to-top");
await btn.waitFor({ state: "visible", timeout: 4000 });
const btnInfo = await btn.evaluate(el => {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  return { transition: cs.transitionTimingFunction, inViewport: r.right <= vw + 4 && r.bottom <= vh + 4 && r.left >= -4, label: el.getAttribute("aria-label"), diamond: cs.transform !== "none" && cs.transform !== "" };
});
check("back-to-top appears past fold + in viewport", btnInfo.inViewport, `inViewport=${btnInfo.inViewport} label=${btnInfo.label}`);
check("back-to-top spring + diamond preserved", btnInfo.transition.includes("1.56") && btnInfo.diamond, `curve=${btnInfo.transition} diamond=${btnInfo.diamond}`);
// must not clash with the floating WhatsApp pill (both bottom-right: pill is leftmost of the two)
const noClash = await page.evaluate(() => {
  const top = document.querySelector(".back-to-top");
  const wa = document.querySelector(".floating-whatsapp");
  if (!top || !wa) return { ok: true, why: "one not present" };
  const a = top.getBoundingClientRect(), b = wa.getBoundingClientRect();
  const overlaps = !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top);
  return { ok: !overlaps, why: `btnR=${Math.round(a.right)} waL=${Math.round(b.left)} overlap=${overlaps}` };
});
check("WhatsApp pill not covered by back-to-top", noClash.ok, noClash.why);
await btn.click();
await page.waitForTimeout(900);
const scrollTop = await page.evaluate(() => window.scrollY);
check("back-to-top glides to top", scrollTop < 60, `scrollY=${Math.round(scrollTop)}`);
await page.screenshot({ path: "gui-test-screenshots/align-interactive/scroll-top-btn.png" });

// ── 6. Reduced motion: everything off ──
const rmCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
const rmPage = await rmCtx.newPage();
const rmErrs = watchErrors(rmPage);
await rmPage.goto(BASE + "/", { waitUntil: "networkidle" });
const rm = await rmPage.evaluate(() => ({
  hero: getComputedStyle(document.querySelector(".hero-visual img")).animationName,
  avatars: getComputedStyle(document.querySelector(".avatar-stack .avatar")).animationName,
  faqTransition: null,
}));
await rmPage.goto(BASE + "/faq", { waitUntil: "networkidle" });
rm.faqTransition = await rmPage.evaluate(() => getComputedStyle(document.querySelector(".faq-answer")).transitionDuration);
check("reduced-motion: hero settle off", rm.hero === "none", rm.hero);
check("reduced-motion: avatar pop off", rm.avatars === "none", rm.avatars);
check("reduced-motion: FAQ instant", parseFloat(rm.faqTransition) < 0.001, rm.faqTransition); // Chrome clamps to 1e-05s under emulation

// ── 7. No overflow regressions on touched pages ──
for (const route of ["/", "/faq", "/team", "/reports"]) {
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  const delta = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`no overflow ${route}`, delta <= 1, `Δ=${delta}px`);
}
check("0 console errors (desktop)", errs.length === 0, errs.slice(0, 2).join(" | ") || "clean");
check("0 console errors (reduced-motion)", rmErrs.length === 0, rmErrs.slice(0, 2).join(" | ") || "clean");

// ── 8. Mobile: scroll-top fits + FAQ works ──
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mpage = await mctx.newPage();
await mpage.goto(BASE + "/faq", { waitUntil: "networkidle" });
await mpage.locator(".faq-item:not(.faq-item-open) .faq-question").first().tap();
await mpage.waitForTimeout(450);
const mFaq = await mpage.evaluate(() => {
  const item = document.querySelector(".faq-item-open .faq-answer");
  const delta = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  return { open: !!item, h: item ? Math.round(item.getBoundingClientRect().height) : 0, delta };
});
check("mobile FAQ opens + no overflow", mFaq.open && mFaq.h > 40 && mFaq.delta <= 1, `h=${mFaq.h}px Δ=${mFaq.delta}px`);

await ctx.close(); await rmCtx.close(); await mctx.close();
await browser.close();
console.log(failures === 0 ? `\nALL ROUND-2 UPGRADE CHECKS PASSED` : `\n${failures} ROUND-2 FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
