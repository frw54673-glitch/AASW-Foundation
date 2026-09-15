import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded" });
await page.fill('input[autocomplete="username"]', "demo.member@aaswfoundation.test");
await page.fill('input[autocomplete="current-password"]', "AaswTest#2026");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/member/dashboard**", { timeout: 20000 });
await page.waitForTimeout(2500);
const info = await page.evaluate(() => {
  const side = document.querySelector(".member-sidebar");
  const shell = document.querySelector(".member-sidebar-shell");
  const pageEl = document.querySelector(".member-sidebar-page");
  const content = side?.querySelector(":scope > *:not(.member-sidebar-identity)");
  const nodes = [side, shell, pageEl, content].filter(Boolean).map(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      cls: String(el.className).slice(0, 40),
      rect: { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) },
      margin: cs.margin, padding: cs.padding, border: cs.border, transform: cs.transform !== "none" ? cs.transform : null,
      boxSizing: cs.boxSizing, width: cs.width, flexBasis: cs.flexBasis
    };
  });
  // any sibling of sidebar inside shell?
  const shellKids = shell ? Array.from(shell.children).map(k => ({ cls: String(k.className).slice(0, 40), left: Math.round(k.getBoundingClientRect().left) })) : [];
  // main content container
  const main = document.querySelector("main, .member-dashboard-content");
  return { nodes, shellKids, mainCls: main ? String(main.className).slice(0, 40) : null, bodyOverflowX: getComputedStyle(document.body).overflowX };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
