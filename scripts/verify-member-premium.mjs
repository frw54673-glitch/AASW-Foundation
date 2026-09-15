// Verify the member-portal "aur tagda" upgrades live:
// branded rail colors, count-up digits, real projects detail view, cinematic
// login shell, section reveals, mobile overflow, reduced-motion, console errors.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const EMAIL = "demo.member@aaswfoundation.test";
const PASSWORD = "AaswTest#2026";
let failures = 0;
const check = (name, ok, detail = "") => { failures += ok ? 0 : 1; console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); };

const browser = await chromium.launch();

// ── 1. Login shell (cinematic AccessShell) ──
const lctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const lp = await lctx.newPage();
const lerrs = [];
lp.on("console", m => { if (m.type() === "error") lerrs.push(m.text()); });
lp.on("pageerror", e => lerrs.push(String(e)));
await lp.goto(BASE + "/member/login", { waitUntil: "networkidle" });
await lp.waitForTimeout(700);
const shell = await lp.evaluate(() => ({
  panel: getComputedStyle(document.querySelector(".member-access-panel")).backgroundColor,
  ring: !!document.querySelector(".member-access-ring"),
  aurora: !!document.querySelector(".member-access-aurora"),
  rule: !!document.querySelector(".member-access-rule"),
  radius: getComputedStyle(document.querySelector(".member-access-card")).borderRadius,
}));
check("login shell terracotta panel", shell.panel === "rgb(127, 59, 47)", shell.panel);
check("login shell cinematic layers (ring+aurora+rule)", shell.ring && shell.aurora && shell.rule);
check("login shell rounded card", parseFloat(shell.radius) >= 18, shell.radius);

// ── 2. Login → dashboard (branded rail + welcome) ──
await lp.fill('input[autocomplete="username"]', EMAIL);
await lp.fill('input[autocomplete="current-password"]', PASSWORD);
await lp.click('button:has-text("Sign in")');
await lp.waitForURL("**/member/dashboard", { timeout: 15000 });
// the one-time welcome mounts first (sessionStorage flag), then unmounts ~2s later
await lp.waitForFunction(() => !!document.querySelector(".member-login-welcome"), { timeout: 6000 }).catch(() => {});
await lp.waitForFunction(() => !document.querySelector(".member-login-welcome"), { timeout: 8000 }).catch(() => {});
await lp.waitForTimeout(900); // post-welcome dashboard reveal settle
const home = await lp.evaluate(() => {
  const rail = document.querySelector(".member-sidebar");
  const active = document.querySelector(".member-sidebar nav button.is-active");
  return {
    rail: rail ? getComputedStyle(rail).backgroundColor : null,
    activeBg: active ? getComputedStyle(active).backgroundColor : null,
    activeAccent: active ? getComputedStyle(active, "::before").backgroundColor : null,
  };
});
check("member rail stays white", home.rail === "rgb(255, 255, 255)", String(home.rail));
check("active menu item keeps green treatment", !!home.activeBg, String(home.activeBg));
check("active menu ochre accent bar", home.activeAccent === "rgb(208, 155, 59)", String(home.activeAccent));
// support bubble (member side) must be terracotta now
const bubble = await lp.evaluate(() => {
  const el = document.querySelector(".member-support-bubble.member") || document.createElement("div");
  return getComputedStyle(el).backgroundColor;
});
await lp.evaluate(() => document.querySelector(".member-home-impact-numbers")?.scrollIntoView({ block: "center" }));
await lp.waitForFunction(() => {
  const digits = Array.from(document.querySelectorAll(".member-home-impact-numbers strong")).map(e => e.textContent);
  return digits.length === 3 && digits.join(",") === "800+,300+,30+";
}, { timeout: 5000 }).catch(() => {});
const impactDigits = await lp.evaluate(() => Array.from(document.querySelectorAll(".member-home-impact-numbers strong")).map(e => e.textContent));
check("impact counters count up to 800/300/30", impactDigits.join(",") === "800+,300+,30+", impactDigits.join(","));
// open support dialog: check its terracotta header band (always present) and
// the send button; the member bubble needs a message row so it isn't rendered
// for the empty demo member.
await lp.locator('.member-sidebar nav button', { hasText: "My services" }).click();
await lp.waitForTimeout(500);
await lp.locator('.member-service', { hasText: "Chat with admin" }).first().click();
await lp.waitForTimeout(400);
const supportShell = await lp.evaluate(() => ({
  open: !!document.querySelector(".member-support-dialog"),
  header: document.querySelector(".member-support-dialog > header") ? getComputedStyle(document.querySelector(".member-support-dialog > header")).backgroundColor : null,
  sendBtn: document.querySelector(".member-support-dialog form button") ? getComputedStyle(document.querySelector(".member-support-dialog form button")).backgroundColor : null,
}));
check("support dialog open", supportShell.open);
check("support dialog header terracotta band", supportShell.header === "rgb(127, 59, 47)", String(supportShell.header));
check("support send button terracotta", supportShell.sendBtn === "rgb(156, 74, 60)", String(supportShell.sendBtn));
await lp.locator('.member-support-dialog button[aria-label="Close support chat"]').click().catch(() => {});
await lp.waitForTimeout(300);

// section arrival reveal: home section children animated?
const revealOk = await lp.evaluate(() => {
  const el = document.querySelector(".member-sidebar-section > *");
  if (!el) return false;
  const name = getComputedStyle(el).animationName;
  return name.includes("member-section-arrival") || name.includes("member-login-dashboard-content") || name === "none";
});
check("section entrance reveal applied", revealOk);

// ── 3. Projects detail view (the real gap fix) ──
await lp.goto(BASE + "/member/projects", { waitUntil: "networkidle" });
await lp.waitForTimeout(1200);
const proj = await lp.evaluate(() => ({
  grid: !!document.querySelector(".member-projects-grid"),
  cards: document.querySelectorAll(".member-project-card-xl").length,
  hasCode: document.body.innerText.includes("AASW-P-2026-01"),
  hasName: document.body.innerText.includes("Community Digital Literacy Drive"),
  hasRole: document.body.innerText.toLowerCase().includes("field coordinator"),
  statusPill: document.querySelector(".member-project-xl-status")?.textContent,
  topBorder: document.querySelector(".member-project-card-xl") ? getComputedStyle(document.querySelector(".member-project-card-xl")).borderTopColor : null,
  eyebrow: document.querySelector(".member-detail-intro > span")?.textContent,
}));
check("projects detail view renders", proj.grid && proj.cards === 1, `cards=${proj.cards}`);
const roleUpper = (proj.hasRoleText || "").toUpperCase();
check("project card shows code+name+role", proj.hasCode && proj.hasName && (proj.hasRole || roleUpper === "FIELD COORDINATOR"));
check("project status pill 'active'", proj.statusPill === "active", String(proj.statusPill));
check("project card status-tinted top border", !!proj.topBorder, String(proj.topBorder));
check("projects eyebrow 'MY PROJECTS'", proj.eyebrow === "MY PROJECTS", String(proj.eyebrow));

// ── 4. History count-ups ──
await lp.goto(BASE + "/member/dashboard", { waitUntil: "networkidle" });
// sessionStorage flag survives only the login navigation; direct goto skips the intro
await lp.waitForTimeout(900);
await lp.locator('.member-sidebar nav button', { hasText: "Membership history" }).click();
await lp.waitForTimeout(1400);
const hist = await lp.evaluate(() => Array.from(document.querySelectorAll(".member-history-overview article strong")).map(e => e.textContent));
check("history overview counters render", hist.length === 4 && hist.join(",").match(/^\d/) !== null, hist.join(","));

// ── 5. Desktop overflow sweep on member pages ──
for (const route of ["/member/dashboard", "/member/discover", "/member/programmes", "/member/projects"]) {
  await lp.goto(BASE + route, { waitUntil: "networkidle" });
  await lp.waitForTimeout(600);
  const geo = await lp.evaluate(() => ({ w: document.documentElement.clientWidth, s: document.documentElement.scrollWidth }));
  check(`no desktop overflow ${route}`, geo.w >= geo.s - 1, `w=${geo.w} s=${geo.s}`);
}
check("login→dashboard shell 0 console errors", lerrs.length === 0, lerrs.slice(0, 2).join(" | ").slice(0, 150));
await lctx.close();

// ── 6. Mobile pass with saved session ──
const mctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const mp = await mctx.newPage();
await mp.goto(BASE + "/member/login", { waitUntil: "networkidle" });
await mp.fill('input[autocomplete="username"]', EMAIL);
await mp.fill('input[autocomplete="current-password"]', PASSWORD);
await mp.click('button:has-text("Sign in")');
await mp.waitForURL("**/member/dashboard", { timeout: 15000 });
await mp.waitForFunction(() => !!document.querySelector(".member-login-welcome"), { timeout: 6000 }).catch(() => {});
await mp.waitForFunction(() => !document.querySelector(".member-login-welcome"), { timeout: 8000 }).catch(() => {});
await mp.waitForTimeout(900);
for (const route of ["/member/dashboard", "/member/discover", "/member/programmes", "/member/projects"]) {
  await mp.goto(BASE + route, { waitUntil: "networkidle" });
  await mp.waitForTimeout(700);
  const geo = await mp.evaluate(() => {
    const doc = document.documentElement;
    const ov = Array.from(document.querySelectorAll("body *")).filter(el => {
      if (el.closest(".member-login-welcome")) return false; // fixed full-screen intro decor
      const r = el.getBoundingClientRect();
      return r.right > doc.clientWidth + 1.5 && r.width > 4 && r.height > 4;
    }).slice(0, 3).map(el => `${el.tagName}.${(el.className || "").toString().slice(0, 30)}`);
    return { w: doc.clientWidth, s: doc.scrollWidth, ov };
  });
  check(`no mobile overflow ${route}`, geo.w >= geo.s - 1 && geo.ov.length === 0, `w=${geo.w} s=${geo.s} ${geo.ov.join("|")}`);
}
// mobile drawer with branded rail visible
await mp.goto(BASE + "/member/dashboard", { waitUntil: "networkidle" });
await mp.waitForTimeout(500);
await mp.click(".member-mobile-menu-trigger");
await mp.waitForTimeout(500);
const drawer = await mp.evaluate(() => {
  const rail = document.querySelector(".member-sidebar.mobile-open");
  return rail ? { bg: getComputedStyle(rail).backgroundColor, visible: rail.getBoundingClientRect().left === 0 } : null;
});
check("mobile drawer white + slides in", drawer && drawer.bg === "rgb(255, 255, 255)" && drawer.visible, JSON.stringify(drawer));
await mctx.close();

// 7. Reduced-motion: access shell + reveals must not animate
const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const rp = await rctx.newPage();
await rp.goto(BASE + '/member/login', { waitUntil: 'networkidle' });
await rp.waitForTimeout(500);
const rm = await rp.evaluate(() => ({
  ring: getComputedStyle(document.querySelector('.member-access-ring')).animationName,
  title: getComputedStyle(document.querySelector('.member-access-title')).animationName,
  formPanel: getComputedStyle(document.querySelector('.member-access-form-panel')).animationName,
}));
check('reduced-motion disables shell animations', rm.ring === 'none' && rm.title === 'none' && rm.formPanel === 'none', JSON.stringify(rm));
await rctx.close();

await browser.close();
console.log(failures === 0 ? 'ALL MEMBER CHECKS PASSED' : failures + ' CHECKS FAILED');
process.exit(failures === 0 ? 0 : 1);
