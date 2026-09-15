// Final comprehensive check: ALL real routes + member auth flow + admin gating
import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const issues = [];

// ===== PART 1: All real routes load clean (console + images + overflow) =====
const ROUTES = ["/", "/about", "/who-we-are", "/vision-mission", "/what-we-do", "/digital-skills", "/green-entrepreneurship", "/mentorship-community", "/transparency", "/programs", "/team", "/reports", "/governance", "/stories", "/updates", "/membership", "/volunteer", "/media-centre", "/field-gallery", "/contact", "/contact-us", "/member/login", "/member/setup-password", "/member/reset-password", "/member/email-certificate", "/donate", "/thank-you", "/privacy", "/refund", "/404"];
for (const path of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e).slice(0, 120)));
  page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 120)); });
  try {
    await page.goto("http://localhost:3000" + path, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    const r = await page.evaluate(() => ({
      docW: document.documentElement.scrollWidth, vw: window.innerWidth,
      broken: Array.from(document.images).filter(i => i.complete && i.naturalWidth === 0).length,
      is404: document.querySelector("h1")?.textContent?.includes("not on the record") ?? false,
      links: document.querySelectorAll("a[href]").length
    }));
    const flags = [];
    if (r.docW > r.vw + 1) flags.push("overflow");
    if (r.broken > 0) flags.push("broken-img:" + r.broken);
    if (errs.length) flags.push("console:" + errs.length);
    if (r.links < 3 && path !== "/404") flags.push("no-links:" + r.links);
    console.log(path.padEnd(30), flags.length ? "ISSUES " + flags.join(",") : "OK" + (r.is404 ? " (404-page)" : ""), "links=" + r.links);
    if (flags.length) issues.push({ part: 1, path, flags });
  } catch (e) {
    console.log(path.padEnd(30), "LOAD-FAIL", String(e).split("\n")[0].slice(0, 60));
    issues.push({ part: 1, path, flags: ["load-fail"] });
  }
  await ctx.close();
}

// ===== PART 2: Auth-gated pages WITHOUT auth — must not leak data =====
const GATED = ["/member/dashboard", "/member/projects", "/member/discover", "/member/programmes", "/member/certificate", "/foundation-admin", "/foundation-admin/members", "/foundation-admin/service-requests", "/foundation-admin/support-inbox", "/mis/dashboard", "/mis/projects", "/mis/delivery", "/mis/operations", "/mis/governance"];
for (const path of GATED) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto("http://localhost:3000" + path, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => {
      const t = document.body.innerText;
      return {
        leakEmails: (t.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || []).filter(e => !/example|test/i.test(e)).slice(0, 3),
        leakPan: /\b[A-Z]{5}\d{4}[A-Z]\b/.test(t),
        memberDataVisible: /membership no|member id|dashboard|admin panel|inbox|service request/i.test(t),
        loginPrompt: /login|sign in|authenticat/i.test(t),
        url: location.pathname
      };
    });
    const ok = !r.leakEmails.length && !r.leakPan;
    console.log(path.padEnd(32), ok ? "GATED-OK" : "LEAK!", "loginPrompt=" + r.loginPrompt + " memberData=" + r.memberDataVisible, r.leakEmails.length ? JSON.stringify(r.leakEmails) : "");
    if (!ok) issues.push({ part: 2, path, r });
  } catch (e) { issues.push({ part: 2, path, flags: ["load-fail"] }); console.log(path.padEnd(32), "LOAD-FAIL"); }
  await ctx.close();
}

// ===== PART 3: Member auth flow E2E: login -> all dashboard sections -> certificate -> logout =====
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e).slice(0, 100)));
  page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 100)); });
  try {
    await page.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.fill('input[autocomplete="username"]', "demo.member@aaswfoundation.test");
    await page.fill('input[autocomplete="current-password"]', "AaswTest#2026");
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("**/member/dashboard**", { timeout: 25000 });
    await page.waitForSelector(".member-sidebar", { timeout: 20000 });
    await page.waitForTimeout(4000);
    // click through every sidebar nav button
    const navBtns = await page.$$(".member-sidebar nav button");
    console.log("\nDASHBOARD nav buttons:", navBtns.length);
    for (let i = 0; i < navBtns.length; i++) {
      const label = (await navBtns[i].textContent()).trim().split("\n")[0].slice(0, 18);
      await navBtns[i].click();
      await page.waitForTimeout(1200);
      const sec = await page.evaluate(() => ({
        heading: document.querySelector(".member-section-heading h1")?.textContent?.trim().slice(0, 30) ?? null,
        contentVisible: document.querySelector(".member-sidebar-section")?.children.length > 0,
        docW: document.documentElement.scrollWidth
      }));
      console.log("  section[" + i + "]", label.padEnd(20), "h1=" + (sec.heading || "-"), "content=" + sec.contentVisible, sec.docW > 1366 ? "OVERFLOW!" : "");
    }
    // certificate page
    await page.goto("http://localhost:3000/member/certificate", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    const cert = await page.evaluate(() => ({ hasName: /member|certificate|demo/i.test(document.body.innerText.slice(0, 600)), h1: document.querySelector("h1")?.textContent?.trim().slice(0, 40) }));
    console.log("CERTIFICATE:", JSON.stringify(cert));
    // logout via topbar button
    await page.goto("http://localhost:3000/member/dashboard", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2500);
    const logoutBtn = await page.$('.member-sidebar-topbar button:has-text("Sign out")');
    if (logoutBtn) {
      await logoutBtn.click();
      await page.waitForTimeout(2500);
      const after = await page.evaluate(() => ({ url: location.pathname, cookie: document.cookie.includes("aasw_member_session") }));
      console.log("LOGOUT:", JSON.stringify(after));
    } else console.log("LOGOUT: button not found");
    // dashboard after logout should show login-required
    await page.goto("http://localhost:3000/member/dashboard", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2500);
    const gated = await page.evaluate(() => /login required|sign in/i.test(document.body.innerText));
    console.log("POST-LOGOUT GATED:", gated);
    console.log("AUTH-FLOW CONSOLE ERRS:", errs.length, JSON.stringify(errs.slice(0, 3)));
    if (errs.length) issues.push({ part: 3, errs });
  } catch (e) {
    console.log("AUTH-FLOW FAIL:", String(e).split("\n")[0]);
    issues.push({ part: 3, error: String(e).split("\n")[0] });
  }
  await ctx.close();
}

await browser.close();
console.log("\n=== TOTAL ISSUES: " + issues.length + " ===");
console.log(JSON.stringify(issues, null, 1));
