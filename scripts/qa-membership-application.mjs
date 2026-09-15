import { chromium } from "playwright";

const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const outputDir = "/home/ubuntu/membership-application-qa";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium" });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${baseUrl}/membership`, { waitUntil: "networkidle" });
  const form = page.locator(".membership-application-form");
  await form.getByRole("button", { name: "Submit membership application" }).click();
  await page.getByText("Please enter your full name.", { exact: true }).waitFor();
  await page.getByText("Please confirm that AASW may follow up on this application.", { exact: true }).waitFor();
  await page.screenshot({ path: `${outputDir}/membership-invalid-desktop.png`, fullPage: true });

  await page.locator('input[name="fullName"]').fill("AASW QA Applicant");
  await page.locator('input[name="email"]').fill("qa-membership@aaswfoundation.invalid");
  await page.locator('input[name="phone"]').fill("+91 90000 00000");
  await page.locator('input[name="city"]').fill("Lucknow");
  await page.locator('input[name="state"]').fill("Uttar Pradesh");
  await page.locator('select[name="membershipType"]').selectOption("lifetime");
  await page.locator('.member-form-consent input[type="checkbox"]').check();
  await form.getByRole("button", { name: "Submit membership application" }).click();
  const success = page.locator(".membership-application-success");
  await success.waitFor();
  const reference = await success.locator("dd").first().textContent();
  if (!reference?.startsWith("AASW-MEM-")) throw new Error("Membership application reference was not rendered.");
  await page.screenshot({ path: `${outputDir}/membership-success-desktop.png`, fullPage: true });
  console.log(reference);

  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await mobile.goto(`${baseUrl}/membership`, { waitUntil: "networkidle" });
  const mobileForm = mobile.locator(".membership-application-form");
  await mobileForm.getByRole("button", { name: "Submit membership application" }).click();
  await mobile.getByText("Please enter your full name.", { exact: true }).waitFor();
  await mobile.screenshot({ path: `${outputDir}/membership-invalid-mobile.png`, fullPage: true });

  await mobile.locator('input[name="fullName"]').fill("AASW QA Mobile Applicant");
  await mobile.locator('input[name="email"]').fill("qa-mobile-membership@aaswfoundation.invalid");
  await mobile.locator('input[name="phone"]').fill("+91 90000 00001");
  await mobile.locator('input[name="city"]').fill("Lucknow");
  await mobile.locator('input[name="state"]').fill("Uttar Pradesh");
  await mobile.locator('.member-form-consent input[type="checkbox"]').check();
  await mobileForm.getByRole("button", { name: "Submit membership application" }).click();
  const mobileSuccess = mobile.locator(".membership-application-success");
  await mobileSuccess.waitFor();
  const mobileReference = await mobileSuccess.locator("dd").first().textContent();
  if (!mobileReference?.startsWith("AASW-MEM-")) throw new Error("Mobile Membership application reference was not rendered.");
  await mobile.screenshot({ path: `${outputDir}/membership-success-mobile.png`, fullPage: true });
  console.log(mobileReference);
} finally {
  await browser.close();
}
