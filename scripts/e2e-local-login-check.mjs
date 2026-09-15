import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto("http://localhost:3000/member/login", { waitUntil: "domcontentloaded" });
await page.fill('input[autocomplete="username"]', "demo.member@aaswfoundation.test");
await page.fill('input[autocomplete="current-password"]', "AaswTest#2026");

// capture the login response (cookie set check)
const [loginResp] = await Promise.all([
  page.waitForResponse(r => r.url().includes("member.login"), { timeout: 15000 }),
  page.click('button:has-text("Sign in")'),
]);
const setCookieHeader = loginResp.headers()["set-cookie"] || "";
console.log("login status:", loginResp.status());
console.log("cookie flags:", setCookieHeader.split(";").slice(1).join(";").trim() || "(none)");

await page.waitForURL("**/member/dashboard**", { timeout: 20000 });
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(2500);

const url = page.url();
const cookieStored = (await page.context().cookies()).some(c => c.name === "aasw_member_session");
const h1 = await page.locator("h1").first().textContent().catch(() => "none");
const welcomeText = await page.locator("body").innerText();

const checks = {
  dashboardUrl: url,
  sessionCookieStored: cookieStored,
  h1: (h1 || "").trim().slice(0, 60),
  showsMemberName: welcomeText.includes("Demo Member"),
  showsMembershipId: welcomeText.includes("AASW-2026-0001"),
  hasKpiCards: /Membership (ID|plan|status)/i.test(welcomeText),
  hasCertificateSection: /Membership certificate/i.test(welcomeText),
};

// dashboard screenshot evidence
await page.screenshot({ path: "gui-test-screenshots/t02_member_dashboard.png" });
console.log(JSON.stringify(checks, null, 2));

// logout flow check too
const signOut = page.locator("button:has-text(\"Sign out\")").first();
if (await signOut.count()) {
  await signOut.click();
  await page.waitForTimeout(3000);
  console.log("after logout url:", page.url());
  const cookieAfter = (await page.context().cookies()).filter(c => c.name === "aasw_member_session");
  console.log("cookie after logout:", cookieAfter.length === 0 ? "cleared" : "still present");
}

await browser.close();
