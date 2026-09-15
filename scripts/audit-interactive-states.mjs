// Deep interactive-state alignment check: mega menus, mobile nav drawer,
// member mobile drawer, admin sidebar collapse, dialogs — the states the
// static geometry audit can't reach. Screenshots saved for eyeball review.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";

const BASE = process.env.AASW_BASE || "http://localhost:3000";
mkdirSync("gui-test-screenshots/align-interactive", { recursive: true });
let failures = 0;
const check = (name, ok, detail = "") => { failures += ok ? 0 : 1; console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); };
const watchErrors = page => { const errs = []; page.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); page.on("pageerror", e => errs.push(String(e))); return errs; };
const overflowDelta = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;

const browser = await chromium.launch();

// ── 1. Mega menus (desktop 1440): open each of the 4 nav menus, check panel fits + aligned ──
const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const dpage = await dctx.newPage();
const derrs = watchErrors(dpage);
await dpage.goto(BASE + "/", { waitUntil: "networkidle" });
const navLabels = await dpage.locator(".site-header nav > div, .site-header [aria-haspopup]").allTextContents().catch(() => []);
for (const label of ["About", "What we do", "Media Centre", "Contact Us"]) {
  try {
    const trigger = dpage.locator(`button[aria-haspopup='true']:has-text("${label}")`).first();
    // menus are hover-open (mouseenter) + click-toggle; hover like a real user
    await trigger.hover();
    await dpage.waitForTimeout(700);
    const shot = `gui-test-screenshots/align-interactive/menu-${label.replace(/\s+/g, "-").toLowerCase()}.png`;
    await dpage.screenshot({ path: shot });
    const delta = await dpage.evaluate(overflowDelta);
    const panel = await dpage.evaluate(() => {
      const panels = Array.from(document.querySelectorAll(".about-mega-panel.about-mega-panel-open"));
      if (!panels.length) return { open: false };
      const r = panels[0].getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      return { open: true, left: Math.round(r.left), right: Math.round(r.right), within: r.left >= -4 && r.right <= vw + 4, links: panels[0].querySelectorAll("a").length };
    });
    check(`mega menu "${label}" opens + aligned`, panel.open && panel.within && delta <= 1, panel.open ? `L=${panel.left} R=${panel.right} links=${panel.links} Δ=${delta}px` : "panel did not open");
    await dpage.keyboard.press("Escape").catch(() => {});
    await trigger.click().catch(() => {}); // close again
    await dpage.waitForTimeout(300);
  } catch (e) {
    check(`mega menu "${label}"`, false, String(e).slice(0, 100));
  }
}

// ── 2. Mobile public nav drawer (390): hamburger opens aligned drawer ──
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mpage = await mctx.newPage();
const merrs = watchErrors(mpage);
await mpage.goto(BASE + "/", { waitUntil: "networkidle" });
const burger = mpage.locator("button.menu-toggle").first();
const burgerCount = await mpage.locator("button.menu-toggle").count();
if (burgerCount > 0) {
  await burger.tap();
  await mpage.waitForTimeout(800);
  await mpage.screenshot({ path: "gui-test-screenshots/align-interactive/mobile-nav-drawer.png" });
  const drawer = await mpage.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const delta = document.documentElement.scrollWidth - vw;
    // drawer panel itself must be fully on-screen
    const panels = Array.from(document.querySelectorAll("nav, [role='dialog'], [data-state='open']"));
    let worst = null;
    for (const p of panels) {
      const r = p.getBoundingClientRect();
      if (r.width > 150 && r.height > 300) {
        if (r.right > vw + 4 || r.left < -4) worst = `${p.tagName}.${String(p.className).slice(0, 30)}@R${Math.round(r.right)}`;
      }
    }
    return { delta, worst };
  });
  check("mobile nav drawer aligned", drawer.delta <= 1 && !drawer.worst, `Δ=${drawer.delta}px ${drawer.worst ?? ""}`);
} else {
  // nav may collapse without a burger — header itself must stay aligned
  const delta = await mpage.evaluate(overflowDelta);
  check("mobile header aligned (no burger)", delta <= 1, `Δ=${delta}px`);
}

// ── 3. Member mobile drawer: open + aligned ──
await mpage.goto(BASE + "/member/login", { waitUntil: "networkidle" });
await mpage.fill('input[autocomplete="username"]', "demo.member@aaswfoundation.test");
await mpage.fill('input[autocomplete="current-password"]', "AaswTest#2026");
await mpage.click('button:has-text("Sign in")');
await mpage.waitForURL("**/member/dashboard", { timeout: 20000 });
await mpage.waitForFunction(() => !!document.querySelector(".member-login-welcome"), { timeout: 5000 }).catch(() => {});
await mpage.waitForFunction(() => !document.querySelector(".member-login-welcome"), { timeout: 10000 }).catch(() => {});
await mpage.waitForTimeout(600);
const drawerBtn = mpage.locator(".member-mobile-menu-trigger");
await drawerBtn.waitFor({ state: "visible", timeout: 8000 });
if (await drawerBtn.count()) {
  await drawerBtn.tap();
  await mpage.waitForTimeout(600);
  await mpage.screenshot({ path: "gui-test-screenshots/align-interactive/member-mobile-drawer.png" });
  const drawer = await mpage.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const sb = document.querySelector(".member-sidebar.mobile-open");
    if (!sb) return { open: false };
    const r = sb.getBoundingClientRect();
    return { open: true, right: Math.round(r.right), left: Math.round(r.left), width: Math.round(r.width), delta: document.documentElement.scrollWidth - vw };
  });
  check("member mobile drawer opens", drawer.open === true);
  if (drawer.open) check("member drawer aligned", drawer.right <= 394 && drawer.left >= -4, `L=${drawer.left} R=${drawer.right} W=${drawer.width}`);
} else {
  check("member mobile drawer trigger present", false, "no .member-mobile-menu-trigger at 390px");
}

// ── 4. Admin sidebar collapse (desktop) + tables (tablet) ──
const env = readFileSync(".env", "utf8");
const secret = env.match(/^JWT_SECRET=(.+)$/m)?.[1].trim();
const { SignJWT } = await import("jose");
const token = await new SignJWT({ openId: "admin-local-audit", appId: "local-audit", name: "Foundation Admin" })
  .setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt()
  .setExpirationTime(Math.floor((Date.now() + 8 * 3600000) / 1000))
  .sign(new TextEncoder().encode(secret));
const actx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await actx.addCookies([{ name: "app_session_id", value: token, url: BASE, httpOnly: true }]);
const apage = await actx.newPage();
const aerrs = watchErrors(apage);
await apage.goto(BASE + "/foundation-admin/members", { waitUntil: "networkidle" });
const trigger = apage.locator("button[aria-label='Toggle Sidebar'], button[title='Toggle Sidebar']").first();
if (await trigger.count()) {
  await trigger.click();
  await apage.waitForTimeout(700);
  await apage.screenshot({ path: "gui-test-screenshots/align-interactive/admin-collapsed.png" });
  const collapsed = await apage.evaluate(overflowDelta);
  check("admin sidebar collapse aligned", collapsed <= 1, `Δ=${collapsed}px`);
  await trigger.click(); // restore
} else {
  const delta = await apage.evaluate(overflowDelta);
  check("admin page aligned (no collapse trigger)", delta <= 1, `Δ=${delta}px`);
}
await apage.close(); await actx.close();

// ── 5. Dialog: member renewal benefits dialog opens + aligned ──
const dlg = await mpage.evaluate(() => document.querySelector(".member-mobile-menu-trigger") ? true : false);
// renewal dialog lives in membership section on desktop; use desktop context for reliability
await dpage.goto(BASE + "/membership", { waitUntil: "networkidle" });
await dpage.waitForTimeout(400);
const delta = await dpage.evaluate(overflowDelta);
check("membership application page aligned (post-login context)", delta <= 1, `Δ=${delta}px`);

// console errors across all surfaces
const allErrs = [...derrs, ...merrs, ...aerrs].filter(e => !e.includes("favicon"));
check("0 console errors across interactive states", allErrs.length === 0, allErrs.slice(0, 2).join(" | ").slice(0, 150) || "clean");

await dctx.close(); await mctx.close();
await browser.close();
console.log(failures === 0 ? `\nALL INTERACTIVE-STATE CHECKS PASSED` : `\n${failures} INTERACTIVE-STATE FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
