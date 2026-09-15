import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
for (const path of ["/member/setup-password", "/member/reset-password", "/member/email-certificate"]) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto("http://localhost:3000" + path, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);
  const r = await page.evaluate(() => ({
    h1: document.querySelector("h1")?.textContent?.trim().slice(0, 45),
    hasForm: !!document.querySelector("form"),
    inputs: document.querySelectorAll("input").length,
    links: Array.from(document.querySelectorAll("a[href]")).map(a => a.getAttribute("href")),
    bodyLen: document.body.innerText.length,
    docW: document.documentElement.scrollWidth
  }));
  console.log(path.padEnd(32), "h1=" + JSON.stringify(r.h1), "form=" + r.hasForm, "inputs=" + r.inputs, "bodyLen=" + r.bodyLen, "docW=" + r.docW, "links=" + JSON.stringify(r.links));
  await page.close();
}
await browser.close();
