import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const v = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await v.goto("http://localhost:3000/volunteer", { waitUntil: "networkidle", timeout: 30000 });
await v.waitForTimeout(1500);
await v.fill('[name="fullName"]', "E2E Volunteer User");
await v.fill('[name="email"]', "e2e-volunteer@aaswfoundation.test");
await v.fill('[name="phone"]', "9876543210");
await v.selectOption('[name="state"]', "Uttar Pradesh");
await v.fill('[name="city"]', "Lucknow");
await v.fill('[name="availability"]', "Weekends");
await v.fill('[name="skills"]', "Teaching, community outreach");
await v.fill('[name="interests"]', "Digital literacy for women");
await v.click("form button[type=submit]");
await v.waitForTimeout(1500);
const errs = await v.evaluate(() => {
  // FieldError elements: small/span with role=alert or text in red
  const form = document.querySelector("form.membership-application-form");
  const errTexts = Array.from(form.querySelectorAll('[role="alert"], .field-error, small, [id*="error"]')).map(e => e.textContent.trim()).filter(t => t.length > 2);
  const ariaInvalid = Array.from(form.querySelectorAll("[aria-invalid='true']")).map(e => e.name || e.id);
  const submitting = form.getAttribute("data-submitting");
  const consent = !!form.querySelector('input[type="checkbox"]');
  const consentChecked = form.querySelector('input[type="checkbox"]')?.checked;
  return { errTexts: errTexts.slice(0, 6), ariaInvalid, submitting, consent, consentChecked };
});
console.log("AFTER CLICK:", JSON.stringify(errs, null, 1));
await browser.close();
