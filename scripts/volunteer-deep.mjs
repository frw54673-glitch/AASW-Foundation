import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const v = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const netLog = [];
v.on("response", r => { if (r.url().includes("/api/") || r.url().includes("trpc")) netLog.push(r.status() + " " + r.request().method() + " " + decodeURIComponent(r.url().split("3000")[1] || r.url()).slice(0, 90)); });
await v.goto("http://localhost:3000/volunteer", { waitUntil: "networkidle", timeout: 30000 });
await v.waitForTimeout(1500);
await v.fill('[name="fullName"]', "E2E Volunteer User");
await v.fill('[name="email"]', "e2e-volunteer@aaswfoundation.test");
await v.fill('[name="phone"]', "9876543210");
await v.fill('[name="city"]', "Lucknow");
await v.fill('[name="availability"]', "Weekends");
await v.fill('[name="skills"]', "Teaching, community outreach");
await v.fill('[name="interests"]', "Digital literacy for women");
await v.click("form button[type=submit]");
await v.waitForTimeout(2000);
// catch toasts immediately at 500ms marks too
let toastSeen = null;
for (let i = 0; i < 6; i++) {
  const t = await v.evaluate(() => {
    const toasts = Array.from(document.querySelectorAll("[data-sonner-toast], .sonner-toast, [role=status], li[class*=toast]"));
    const labels = Array.from(document.querySelectorAll("ol li")).map(l => l.textContent.trim().slice(0, 100)).filter(Boolean);
    return { toastCount: toasts.length, first: toasts[0]?.textContent?.slice(0, 200) ?? null, olItems: labels.slice(0, 3) };
  });
  if (t.toastCount > 0 || (t.olItems && t.olItems.length)) { toastSeen = t; break; }
  await v.waitForTimeout(500);
}
console.log("TOAST:", JSON.stringify(toastSeen, null, 1));
console.log("NETWORK:", JSON.stringify(netLog, null, 1));
// what does the form area show now?
const formArea = await v.evaluate(() => {
  const f = document.querySelector("form");
  return f ? "form still present" : "form removed (success state)";
});
console.log("FORM:", formArea);
await browser.close();
