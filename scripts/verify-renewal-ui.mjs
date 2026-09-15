import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await page.goto("http://localhost:3000/membership?renewal=annual", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2500);
await page.evaluate(() => document.getElementById("membership-application")?.scrollIntoView());
await page.waitForTimeout(800);
const ui = await page.evaluate(() => {
  const form = document.querySelector("#membership-application form") || document.querySelector("#membership-application");
  const t = (form || document).innerText;
  return {
    hasRenewalHeading: /renew/i.test(t.slice(0, 400)),
    planLocked: !!form?.querySelector("input[value=annual][disabled], .membership-plan-annual"),
    formFields: form ? form.querySelectorAll("input, select").length : 0,
    renewalCopy: (t.match(/.{0,60}renew.{0,60}/i) || []).slice(0, 2),
    url: location.search
  };
});
console.log("RENEWAL-UI:", JSON.stringify(ui, null, 1));
await browser.close();
