import { chromium } from "playwright";

const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium" });

try {
  const membership = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await membership.goto(`${baseUrl}/membership`, { waitUntil: "networkidle" });
  const membershipForm = membership.locator(".membership-application-form");
  await membershipForm.getByRole("button", { name: "Submit membership application" }).click();
  for (const message of ["Please enter your full name.", "Please select your State.", "Please enter your district.", "Please enter a valid PAN number.", "Please choose the type of ID proof.", "Please upload an ID-proof image or PDF.", "Please confirm that AASW may follow up on this application."]) await membership.getByText(message, { exact: true }).waitFor();
  if (await membership.locator(".payment-demo-modal").count()) throw new Error("Membership requirements were bypassed into checkout.");

  const donation = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await donation.goto(`${baseUrl}/donate`, { waitUntil: "networkidle" });
  const donationForm = donation.locator(".donation-details-form");
  await donationForm.getByRole("button", { name: "Continue to donation demo" }).click();
  for (const message of ["Enter your full name.", "Enter a valid email ID.", "Enter a valid mobile number.", "Enter your date of birth.", "Enter a valid PAN number.", "Select State.", "Enter your city.", "Enter your address.", "Enter a 6-digit Pincode."]) await donation.getByText(message, { exact: true }).waitFor();
  if (await donation.locator(".payment-demo-modal").count()) throw new Error("Donation requirements were bypassed into checkout.");

  console.log("Membership and Donation required-field gates passed.");
} finally {
  await browser.close();
}
