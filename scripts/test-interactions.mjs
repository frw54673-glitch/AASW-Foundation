// Interaction verification: forms submit properly, mega menus, mobile nav
import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const results = [];
const log = (name, ok, detail = "") => { results.push({ name, ok, detail: String(detail) }); console.log((ok ? "PASS" : "FAIL").padEnd(5), name.padEnd(38), String(detail).slice(0, 110)); };

// ===== 1. Contact form =====
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/contact-us", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  const form = await page.$("form");
  if (!form) log("contact-us form exists", false, "no form found");
  else {
    try {
      await page.fill('input[name="fullName"], input[name*="name"]', "E2E Test User");
      await page.fill('input[type="email"]', "e2e-test@aaswfoundation.test");
      const msgBox = await page.$("textarea");
      if (msgBox) await msgBox.fill("E2E verification message - automated site check.");
      const subjectSel = await page.$("select");
      if (subjectSel) await subjectSel.selectOption({ index: 1 }).catch(() => {});
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3500);
      const after = await page.evaluate(() => document.body.innerText.slice(0, 3000));
      const successVisible = /thank|received|we will|shortly|message/i.test(after);
      log("contact form submits", successVisible, successVisible ? "success message shown" : after.slice(0, 140));
    } catch (e) { log("contact form submits", false, String(e).split("\n")[0]); }
  }
  await ctx.close();
}

// ===== 2. Volunteer form =====
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/volunteer", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  const form = await page.$("form");
  if (!form) log("volunteer form exists", false, "no form found");
  else {
    try {
      await page.fill('input[name="fullName"], input[name*="name"]', "E2E Volunteer");
      await page.fill('input[type="email"]', "e2e-volunteer@aaswfoundation.test");
      await page.fill('input[type="tel"]', "9876543210").catch(() => {});
      const msgBox = await page.$("textarea");
      if (msgBox) await msgBox.fill("E2E volunteer application verification.");
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3500);
      const after = await page.evaluate(() => document.body.innerText.slice(0, 3000));
      const successVisible = /thank|received|we will|shortly/i.test(after);
      log("volunteer form submits", successVisible, successVisible ? "success shown" : after.slice(0, 140));
    } catch (e) { log("volunteer form submits", false, String(e).split("\n")[0]); }
  }
  await ctx.close();
}

// ===== 3. Membership form fields present =====
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/membership", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1800);
  try {
    await page.evaluate(() => document.getElementById("membership-application")?.scrollIntoView());
    await page.waitForTimeout(600);
    const count = await page.evaluate(() => document.querySelectorAll("#membership-application input, #membership-application select").length);
    log("membership form fields present", count >= 8, count + " fields");
  } catch (e) { log("membership form fields present", false, String(e).split("\n")[0]); }
  await ctx.close();
}

// ===== 4. Mega menu interactions (all 5) =====
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/about", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1200);
  const triggers = await page.$$(".desktop-nav .about-mega-trigger");
  let allOk = true, details = [];
  for (const t of triggers) {
    const label = (await t.textContent()).trim();
    await t.hover(); await page.waitForTimeout(450);
    const panel = await page.$(".about-mega-panel-open");
    const vis = panel ? await panel.boundingBox() : null;
    if (!vis) { allOk = false; details.push(label + ":no-panel"); }
    else details.push(label + ":open");
    await page.mouse.move(10, 10); await page.waitForTimeout(350);
  }
  log("mega menus hover (5)", allOk, details.join(" "));
  await ctx.close();
}

// ===== 5. Mobile (375px): hamburger + navigation + console =====
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e).slice(0, 100)));
  page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 100)); });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  const t = await page.$(".menu-toggle");
  if (!t) log("mobile hamburger exists", false);
  else {
    await t.click(); await page.waitForTimeout(500);
    const open = await page.evaluate(() => ({ open: document.querySelector(".mobile-nav").className.includes("open"), links: document.querySelectorAll(".mobile-nav-link").length }));
    log("mobile hamburger opens", open.open, open.links + " links");
    const first = await page.$(".mobile-nav-link");
    const href = await first.getAttribute("href");
    await first.click();
    await page.waitForTimeout(2200);
    const landed = await page.evaluate(() => ({ path: location.pathname }));
    log("mobile nav link navigates", landed.path === (href || "unknown").split("#")[0], "clicked " + href + " -> " + landed.path);
    const docW = await page.evaluate(() => document.documentElement.scrollWidth);
    log("mobile no h-overflow", docW <= 375, "docW=" + docW);
  }
  log("mobile console clean", errs.length === 0, errs.slice(0, 2).join(" | "));
  await ctx.close();
}

// ===== 6. Donate page CTA + member login link reachable =====
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/donate", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  const btns = await page.evaluate(() => Array.from(document.querySelectorAll("a, button")).map(b => b.textContent.trim()).filter(t => /donate|support|contribute|choose this cause|amount/i.test(t)).length);
  log("donate page CTAs present", btns >= 1, btns + " CTA elements");
  const memberLink = await page.evaluate(() => !!document.querySelector('a[href*="/member/login"]'));
  log("member login link reachable", memberLink);
  await ctx.close();
}

await browser.close();
console.log("\n=== INTERACTIONS: " + results.filter(r => !r.ok).length + " FAILURES ===");
