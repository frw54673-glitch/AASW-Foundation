import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
for (const vw of [941, 1100, 1279]) {
  const page = await browser.newPage({ viewport: { width: vw, height: 800 } });
  await page.goto("http://localhost:3000/about", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".menu-toggle", { timeout: 20000 });
  await page.waitForTimeout(800);
  const canClick = await page.evaluate(() => {
    const t = document.querySelector(".menu-toggle");
    const cs = getComputedStyle(t);
    return { display: cs.display, w: Math.round(t.getBoundingClientRect().width) };
  });
  await page.click(".menu-toggle");
  await page.waitForTimeout(500);
  const open = await page.evaluate(() => ({
    menuOpen: document.querySelector(".mobile-nav").className.includes("mobile-nav-open"),
    links: document.querySelectorAll(".mobile-nav-link").length,
    docW: document.documentElement.scrollWidth, vw: window.innerWidth
  }));
  console.log(vw, "toggle=", JSON.stringify(canClick), "open=", JSON.stringify(open), open.docW > open.vw ? "OVERFLOW!" : "OK");
  await page.close();
}
await browser.close();
