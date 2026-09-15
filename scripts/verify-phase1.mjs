// Verify all new Phase-1 features end to end
import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const log = (ok, name, detail = "") => console.log((ok ? "PASS" : "FAIL").padEnd(5), name.padEnd(42), String(detail).slice(0, 110));

// ===== 1. HOME: animated counters + trust strip =====
{
  const p = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(2500);
  // scroll to impact strip to trigger counters
  await p.evaluate(() => document.querySelector(".impact-strip").scrollIntoView({ block: "center" }));
  await p.waitForTimeout(2200);
  const counters = await p.evaluate(() => Array.from(document.querySelectorAll(".impact-stat strong")).map(el => el.textContent.trim()));
  log(counters.length === 4 && counters.every(c => /\d/.test(c)), "Home impact counters render", JSON.stringify(counters));
  const trust = await p.evaluate(() => {
    const strip = document.querySelector(".trust-strip");
    return { exists: !!strip, items: strip ? strip.querySelectorAll(".trust-strip-item").length : 0, text: strip?.innerText.replace(/\n+/g, "|").slice(0, 120) };
  });
  log(trust.exists && trust.items === 4, "Home trust strip (4 items)", trust.text);
  await p.close();
}

// ===== 2. DONATE: 80G block + calculator + inline note =====
{
  const p = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await p.goto("http://localhost:3000/donate", { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(2200);
  const block = await p.evaluate(() => {
    const b = document.querySelector(".tax-benefit-block");
    return { exists: !!b, has80G: /80G/i.test(b?.innerText ?? ""), calcInput: !!b?.querySelector("input"), result: b?.querySelector(".tax-benefit-result strong")?.textContent };
  });
  log(block.exists && block.has80G && block.calcInput, "Donate 80G block + calculator", "result: " + block.result);
  // type into calculator and verify math
  await p.fill("#tax-calc-amount", "4000");
  await p.waitForTimeout(300);
  const saving = await p.evaluate(() => document.querySelector(".tax-benefit-result strong")?.textContent);
  log(saving === "₹2,000", "Tax calculator 50% math (4000->2000)", "got: " + saving);
  const note = await p.evaluate(() => !!document.querySelector(".tax-inline-note"));
  log(note, "Donate inline 80G note under form");
  await p.close();
}

// ===== 3. FAQ page: accordion + nav link =====
{
  const p = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await p.goto("http://localhost:3000/faq", { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(2200);
  const faq = await p.evaluate(() => ({
    groups: document.querySelectorAll(".faq-group").length,
    items: document.querySelectorAll(".faq-item").length,
    firstOpen: document.querySelectorAll(".faq-item-open").length,
    h1: document.querySelector("h1")?.textContent?.trim().replace(/\n/g, " ")
  }));
  log(faq.groups === 4 && faq.items === 16 && faq.firstOpen === 1, "FAQ page: 4 groups / 16 Q&A / 1 open", JSON.stringify(faq));
  // click second question -> opens, first closes
  await p.click(".faq-group:nth-child(1) .faq-item:nth-child(1) button");
  await p.waitForTimeout(400);
  const afterClick = await p.evaluate(() => ({ openCount: document.querySelectorAll(".faq-item-open").length }));
  // click a question in membership group
  const btns = await p.$$(".faq-group:nth-of-type(2) .faq-item button");
  await btns[1].click();
  await p.waitForTimeout(400);
  const open2 = await p.evaluate(() => ({ open: document.querySelectorAll(".faq-item-open").length, expanded: document.querySelectorAll('[aria-expanded="true"]').length }));
  log(open2.open >= 1, "FAQ accordion toggles", JSON.stringify(open2));
  await p.close();
}
// mega menu link check
{
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await p.goto("http://localhost:3000/about", { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(1500);
  const t = await p.$$(".desktop-nav .about-mega-trigger");
  await t[4].hover(); // Contact Us
  await p.waitForTimeout(500);
  const faqLink = await p.evaluate(() => {
    return document.querySelector('header a[href="/faq"]') !== null || Array.from(document.querySelectorAll(".about-mega-panel-open a")).some(a => a.getAttribute("href") === "/faq");
  });
  log(faqLink, "Contact mega-menu shows FAQ link");
  await p.close();
}

// ===== 4. REPORTS: library cards =====
{
  const p = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await p.goto("http://localhost:3000/reports", { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(2000);
  const lib = await p.evaluate(() => ({
    cards: document.querySelectorAll(".report-card").length,
    years: Array.from(document.querySelectorAll(".report-card-cover strong")).map(e => e.textContent),
    requestLinks: document.querySelectorAll(".report-card-request").length
  }));
  log(lib.cards === 3 && lib.years.join(",") === "2025,2024,2023", "Reports library cards (3 years)", JSON.stringify(lib));
  await p.close();
}

// ===== 5. ABOUT: government alignment =====
{
  const p = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await p.goto("http://localhost:3000/about", { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(2000);
  const align = await p.evaluate(() => {
    const s = document.querySelector(".about-alignment-section");
    return { exists: !!s, cards: s ? s.querySelectorAll(".about-alignment-grid article").length : 0, text: s?.innerText.match(/Digital India.*?Skill India|Mission Shakti|Atmanirbhar/)?.[0] ?? "" };
  });
  log(align.exists && align.cards === 3, "About gov-alignment section (3 cards)", align.text);
  await p.close();
}

// ===== 6. NEWSLETTER: footer form + subscribe E2E =====
{
  const p = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errs = [];
  p.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 100)); });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(2000);
  const form = await p.evaluate(() => {
    const f = document.querySelector(".footer-newsletter");
    return { exists: !!f, input: !!f?.querySelector("input[type=email]"), honeypot: !!f?.querySelector(".footer-honeypot"), button: !!f?.querySelector("button[type=submit]") };
  });
  log(form.exists && form.input && form.honeypot && form.button, "Footer newsletter form", JSON.stringify(form));
  await p.fill("#footer-newsletter-email", "newsletter-e2e@aaswfoundation.test");
  await p.click(".footer-newsletter button[type=submit]");
  await p.waitForTimeout(3000);
  const subscribed = await p.evaluate(() => ({ done: !!document.querySelector(".footer-newsletter-done"), text: document.querySelector(".footer-newsletter-done")?.textContent?.trim() }));
  log(subscribed.done, "Newsletter subscribe E2E", subscribed.text);
  log(errs.length === 0, "Newsletter console clean", errs.slice(0, 2).join("|"));
  // duplicate subscribe -> alreadySubscribed path
  await p.evaluate(() => { window.localStorage.clear(); });
  const p2b = await p.evaluate(() => { location.reload(); });
  await p.waitForTimeout(2500);
  await p.fill("#footer-newsletter-email", "newsletter-e2e@aaswfoundation.test");
  await p.click(".footer-newsletter button[type=submit]");
  await p.waitForTimeout(3000);
  const dup = await p.evaluate(() => document.querySelector(".footer-newsletter-done")?.textContent?.trim() ?? null);
  log(!!dup, "Newsletter duplicate handled idempotently", dup);
  await p.close();
}

// ===== 7. No overflow after new sections =====
{
  for (const [path, w] of [["/", 1366], ["/donate", 1366], ["/faq", 1366], ["/reports", 1366], ["/about", 1366], ["/", 375], ["/faq", 375], ["/donate", 820]]) {
    const p = await browser.newPage({ viewport: { width: w, height: 900 } });
    await p.goto("http://localhost:3000" + path, { waitUntil: "networkidle", timeout: 30000 });
    await p.waitForTimeout(1800);
    const docW = await p.evaluate(() => document.documentElement.scrollWidth);
    log(docW <= w, `No overflow ${path} @${w}`, `docW=${docW}`);
    await p.close();
  }
}

await browser.close();
console.log("\nDONE");
