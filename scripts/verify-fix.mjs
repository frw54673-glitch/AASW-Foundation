import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
// --- 1. Home page at 1366: overflow gone? ---
const h = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await h.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await h.waitForSelector("header", { timeout: 20000 });
await h.waitForTimeout(1500);
const home = await h.evaluate(() => ({
  docW: document.documentElement.scrollWidth,
  vw: window.innerWidth,
  navDisplay: getComputedStyle(document.querySelector(".desktop-nav")).display,
  menuToggle: getComputedStyle(document.querySelector(".menu-toggle")).display
}));
console.log("HOME@1366:", JSON.stringify(home));
await h.close();

// --- 2. Hamburger interaction in new range (1440px on /about) ---
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/about", { waitUntil: "domcontentloaded" });
await p.waitForSelector(".menu-toggle", { timeout: 20000 });
await p.waitForTimeout(1000);
await p.click(".menu-toggle");
await p.waitForTimeout(600);
const openState = await p.evaluate(() => {
  const nav = document.querySelector(".mobile-nav");
  const firstLink = document.querySelector(".mobile-nav-link");
  const inner = document.querySelector(".mobile-nav-inner");
  return {
    menuOpen: nav.className.includes("mobile-nav-open"),
    navMaxH: getComputedStyle(nav).maxHeight,
    innerVisible: inner ? getComputedStyle(inner).display : null,
    linkCount: document.querySelectorAll(".mobile-nav-link").length,
    firstLinkDisplay: firstLink ? getComputedStyle(firstLink).display : null,
    docW: document.documentElement.scrollWidth
  };
});
console.log("MENU-OPEN@1440:", JSON.stringify(openState));
// click a mobile nav link to verify navigation works
const link = await p.$(".mobile-nav-link");
const linkText = await link.textContent();
const linkHref = await link.getAttribute("href");
await link.click();
await p.waitForTimeout(1800);
const afterNav = await p.evaluate(() => ({ path: location.pathname, docW: document.documentElement.scrollWidth }));
console.log("AFTER-CLICK:", JSON.stringify({ clicked: linkText.trim(), href: linkHref, ...afterNav }));
await p.close();

// --- 3. Full nav at 1536: mega menu hover still works ---
const m = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await m.goto("http://localhost:3000/about", { waitUntil: "domcontentloaded" });
await m.waitForSelector(".desktop-nav", { timeout: 20000 });
await m.waitForTimeout(1000);
const mega = await m.evaluate(() => {
  const nav = document.querySelector(".desktop-nav");
  const root = nav.querySelector(".header-mega-root, [class*=mega]");
  const panel = document.querySelector(".header-mega-panel");
  return {
    navDisplay: getComputedStyle(nav).display,
    linkCount: nav.querySelectorAll(".nav-link").length,
    hasMega: !!panel,
    panelDisplay: panel ? getComputedStyle(panel).display : null,
    docW: document.documentElement.scrollWidth
  };
});
console.log("FULLNAV@1600:", JSON.stringify(mega));
await browser.close();
