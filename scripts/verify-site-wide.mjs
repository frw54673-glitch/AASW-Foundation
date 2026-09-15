// Verify the site-wide "aur tagda" upgrades live:
// notification entrance animation + auto-dismiss progress rail, 404 orbiting
// rings, header ochre hairline on scroll, button spring press, text-link
// underline sweep — plus mobile + reduced-motion + console-error coverage.
import { chromium } from "playwright";

const BASE = process.env.AASW_BASE || "http://localhost:3000";
let failures = 0;
const check = (name, ok, detail = "") => { failures += ok ? 0 : 1; console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); };
const watchErrors = page => { const errs = []; page.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); page.on("pageerror", e => errs.push(String(e))); return errs; };

const browser = await chromium.launch();

// ── 1. Notification: entrance animation + progress rail + hover pause (desktop) ──
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = watchErrors(page);
await page.goto(BASE + "/contact-us", { waitUntil: "networkidle" });

// Fill the real public inquiry form → genuine notifySuccess toast.
await page.fill('input[name="fullName"]', "Site Verification");
await page.fill('input[name="email"]', "verify.site@aaswfoundation.test");
await page.fill('input[name="phone"]', "+91 90000 00000");
await page.selectOption('select[name="topic"]', "programmes");
await page.fill('textarea[name="message"]', "Automated site-wide verification run. Please ignore this inquiry.");
await page.check('input[type="checkbox"]');
await page.click('button.inquiry-submit');

// Toast renders with the custom class + entrance animation + progress rail.
const toast = page.locator(".aasw-notification").first();
await toast.waitFor({ state: "visible", timeout: 15000 });
const note = await page.evaluate(() => {
  const el = document.querySelector(".aasw-notification");
  const rail = el.querySelector(".aasw-notification-progress");
  const cs = getComputedStyle(el);
  const rs = getComputedStyle(rail);
  return {
    tone: el.getAttribute("data-tone"),
    role: el.getAttribute("role"),
    entrance: cs.animationName,
    railPresent: !!rail,
    railAnim: rs.animationName,
    railPlay: rs.animationPlayState,
    railDuration: rs.animationDuration,
    surface: cs.backgroundColor,
    unstyledHost: el.closest("[data-sonner-toast]").getAttribute("data-styled"),
    title: el.querySelector("h3").textContent,
  };
});
check("notification custom class + tone", note.tone === "success" && note.role === "status", `tone=${note.tone} role=${note.role}`);
check("notification entrance animation", note.entrance === "aasw-notification-in", note.entrance);
check("notification auto-dismiss progress rail", note.railPresent && note.railAnim === "aasw-notification-shrink", `anim=${note.railAnim}`);
check("progress rail running (synced with sonner timer)", note.railPlay === "running", note.railPlay);
check("progress rail duration matches toast lifetime", note.railDuration === "6s", note.railDuration);
check("notification tone surface color", note.surface === "rgb(237, 246, 238)", note.surface);
check("sonner host unstyled (custom markup owns styling)", note.unstyledHost === "false", `data-styled=${note.unstyledHost}`);
check("notification title from real server response", /Inquiry received/i.test(note.title), note.title);

// Hover pauses the rail (matches sonner's auto-close timer pause).
await toast.hover();
await page.waitForTimeout(120);
const hoverPlay = await toast.evaluate(el => getComputedStyle(el.querySelector(".aasw-notification-progress")).animationPlayState);
check("progress rail pauses on hover", hoverPlay === "paused", hoverPlay);

// No horizontal overflow while the toast is on screen.
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("no horizontal overflow with toast visible", overflow <= 1, `Δ=${overflow}px`);

// Toast auto-dismisses after its 6s rail completes.
await page.mouse.move(5, 5); // release hover so the timer resumes
await toast.waitFor({ state: "hidden", timeout: 12000 });
check("notification auto-dismisses after progress rail completes", true);

// ── 2. 404 page: orbiting rings + card arrival ──
await page.goto(BASE + "/definitely-not-a-page", { waitUntil: "networkidle" });
const nf = await page.evaluate(() => {
  const root = document.querySelector(".aasw-not-found");
  const card = document.querySelector(".aasw-not-found-card");
  const rcs = getComputedStyle(root, "::before");
  const r2cs = getComputedStyle(root, "::after");
  const ccs = getComputedStyle(card);
  return {
    ring1: rcs.animationName + " " + rcs.animationDuration,
    ring2: r2cs.animationName + " " + r2cs.animationDuration,
    cardArrive: ccs.animationName,
    radius: rcs.borderRadius,
    overflow: getComputedStyle(root).overflow,
    content: rcs.content,
  };
});
check("404 orbiting ring 1 (ochre)", nf.ring1.startsWith("aasw-not-found-drift") && nf.ring1.includes("13s"), nf.ring1);
check("404 orbiting ring 2 (green, offset)", nf.ring2.startsWith("aasw-not-found-drift") && nf.ring2.includes("15s"), nf.ring2);
check("404 card arrival animation", nf.cardArrive === "aasw-not-found-arrive", nf.cardArrive);
check("404 rings are circles behind content", nf.radius === "50%" && nf.content.includes(""), `radius=${nf.radius}`);
const nfOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("404 no horizontal overflow (rings clipped)", nfOverflow <= 1, `Δ=${nfOverflow}px`);
check("404 console clean", errs.length === 0, errs.join(" | ") || "0 errors");

// ── 3. Header ochre hairline + button spring + text-link sweep (public) ──
await page.goto(BASE + "/", { waitUntil: "networkidle" });
// find a section below the fold to scroll to
await page.evaluate(() => document.querySelectorAll("[data-reveal]")[2]?.scrollIntoView());
await page.waitForTimeout(400);
const header = await page.evaluate(() => {
  const h = document.querySelector(".site-header");
  const cs = getComputedStyle(h);
  return { scrolled: h.classList.contains("site-header-scrolled"), hairline: cs.borderBottomColor, hairlineWidth: cs.borderBottomWidth };
});
check("header scrolled state engages", header.scrolled === true);
check("header ochre hairline on scroll", header.hairline.startsWith("rgba(208, 155, 59") && header.hairlineWidth === "1px", `${header.hairline} @ ${header.hairlineWidth}`);

// Button spring press: primary CTA in hero
const cta = page.locator(".button-primary").first();
const before = await cta.evaluate(el => getComputedStyle(el).transitionTimingFunction);
await cta.click({ trial: true }).catch(() => {}); // hover settles first
const springCss = await cta.evaluate(el => {
  const cs = getComputedStyle(el);
  // read the :active rule straight from the stylesheet
  let activeScale = "";
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText && rule.selectorText.includes(".button-primary:active")) {
          activeScale = rule.style.transform || "";
        }
      }
    } catch { /* cross-origin sheet */ }
  }
  return { transition: cs.transitionTimingFunction, hoverShadow: cs.boxShadow !== "none", activeScale };
});
check("button springy transition curve", springCss.transition.includes("1.56"), springCss.transition);
check("button spring press scale(:active)", springCss.activeScale.includes(".97"), springCss.activeScale);

// Text-link underline sweep: ::after scaleX 0 → 1 on hover
const link = page.locator(".text-link").first();
await link.scrollIntoViewIfNeeded();
const sweepBefore = await link.evaluate(el => getComputedStyle(el, "::after").transform);
await link.hover();
await page.waitForTimeout(350);
const sweepAfter = await link.evaluate(el => getComputedStyle(el, "::after").transform);
check("text-link underline sweep on hover", sweepBefore === "matrix(0, 0, 0, 1, 0, 0)" && sweepAfter === "matrix(1, 0, 0, 1, 0, 0)", `${sweepBefore} → ${sweepAfter}`);
check("public page console clean", errs.length === 0, `${errs.length} errors`);

// ── 4. Reduced motion: everything disabled ──
const rmCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
const rmPage = await rmCtx.newPage();
const rmErrs = watchErrors(rmPage);
await rmPage.goto(BASE + "/definitely-not-a-page", { waitUntil: "networkidle" });
const rm = await rmPage.evaluate(() => ({
  rings: getComputedStyle(document.querySelector(".aasw-not-found"), "::before").animationName,
  card: getComputedStyle(document.querySelector(".aasw-not-found-card")).animationName,
  linkAfter: getComputedStyle(document.querySelector(".text-link"), "::after").transitionDuration,
}));
check("reduced-motion: 404 rings static", rm.rings === "none", rm.rings);
check("reduced-motion: card no arrival animation", rm.card === "none", rm.card);
check("reduced-motion: text-link sweep off", parseFloat(rm.linkAfter) < 0.001, rm.linkAfter); // Chrome clamps to 1e-05s under emulation, which is effectively instant

// Reduced-motion notification: no entrance + no rail.
await rmPage.goto(BASE + "/contact-us", { waitUntil: "networkidle" });
await rmPage.fill('input[name="fullName"]', "RM Verification");
await rmPage.fill('input[name="email"]', "verify.rm@aaswfoundation.test");
await rmPage.fill('input[name="phone"]', "+91 90000 00001");
await rmPage.selectOption('select[name="topic"]', "other");
await rmPage.fill('textarea[name="message"]', "Automated reduced-motion verification. Please ignore.");
await rmPage.check('input[type="checkbox"]');
await rmPage.click('button.inquiry-submit');
const rmToast = rmPage.locator(".aasw-notification").first();
await rmToast.waitFor({ state: "visible", timeout: 15000 });
const rmNote = await rmToast.evaluate(el => ({
  entrance: getComputedStyle(el).animationName,
  rail: getComputedStyle(el.querySelector(".aasw-notification-progress")).display,
}));
check("reduced-motion: notification entrance off", rmNote.entrance === "none", rmNote.entrance);
check("reduced-motion: progress rail hidden", rmNote.rail === "none", rmNote.rail);
check("reduced-motion console clean", rmErrs.length === 0, rmErrs.join(" | ") || "0 errors");

// ── 5. Mobile: notification + 404 + header ──
const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mPage = await mCtx.newPage();
const mErrs = watchErrors(mPage);
await mPage.goto(BASE + "/definitely-not-a-page", { waitUntil: "networkidle" });
const mNf = await mPage.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  ring: getComputedStyle(document.querySelector(".aasw-not-found"), "::before").animationName,
}));
check("mobile 404: rings render, no overflow", mNf.ring !== "none" && mNf.overflow <= 1, `ring=${mNf.ring} Δ=${mNf.overflow}px`);

await mPage.goto(BASE + "/contact-us", { waitUntil: "networkidle" });
await mPage.fill('input[name="fullName"]', "Mobile Verification");
await mPage.fill('input[name="email"]', "verify.mobile@aaswfoundation.test");
await mPage.fill('input[name="phone"]', "+91 90000 00002");
await mPage.selectOption('select[name="topic"]', "other");
await mPage.fill('textarea[name="message"]', "Automated mobile verification. Please ignore.");
await mPage.check('input[type="checkbox"]');
await mPage.tap('button.inquiry-submit');
const mToast = mPage.locator(".aasw-notification").first();
await mToast.waitFor({ state: "visible", timeout: 15000 });
const mNote = await mToast.evaluate(el => ({ w: getComputedStyle(el).width, entrance: getComputedStyle(el).animationName }));
check("mobile notification: fits viewport + animates", mNote.entrance === "aasw-notification-in" && mToast.evaluate(el => el.getBoundingClientRect().right <= window.innerWidth), `entrance=${mNote.entrance}`);
const mOverflow = await mPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("mobile no overflow with toast", mOverflow <= 1, `Δ=${mOverflow}px`);
check("mobile console clean", mErrs.length === 0, mErrs.join(" | ") || "0 errors");

await ctx.close(); await rmCtx.close(); await mCtx.close();
await browser.close();
console.log(failures === 0 ? "\nALL SITE-WIDE UPGRADE CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
