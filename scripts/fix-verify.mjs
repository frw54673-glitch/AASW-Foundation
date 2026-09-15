import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });

// --- Volunteer form: fill ALL required fields ---
const v = await browser.newPage({ viewport: { width: 1366, height: 900 } });
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
await v.waitForTimeout(4500);
const vres = await v.evaluate(() => {
  const toast = document.querySelector("[data-sonner-toast], [role=status]");
  const successSection = /thank|received|reference|application/i.test(document.body.innerText) ? (document.body.innerText.match(/.{0,60}(thank you|received|reference no|application ref).{0,60}/i)?.[0] ?? "matched") : null;
  return { formGone: !document.querySelector("form"), toast: toast?.textContent?.slice(0, 200) ?? null, successSection };
});
console.log("VOLUNTEER(all fields):", JSON.stringify(vres, null, 1));
await v.close();

// --- Mobile mega accordion + real link nav ---
const m = await browser.newPage({ viewport: { width: 375, height: 800 } });
const mErrs = [];
m.on("pageerror", e => mErrs.push(String(e).slice(0, 120)));
await m.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
await m.waitForTimeout(1500);
await m.click(".menu-toggle");
await m.waitForTimeout(400);
// click About accordion button -> sub links should appear
await m.click(".mobile-nav-link >> nth=0");
await m.waitForTimeout(500);
const afterExpand = await m.evaluate(() => {
  const group = document.querySelector(".mobile-about-group");
  return {
    expanded: !!group,
    subLinks: Array.from(document.querySelectorAll(".mobile-about-group a")).map(a => ({ href: a.getAttribute("href"), t: a.textContent.trim().slice(0, 22) })).slice(0, 8)
  };
});
console.log("MOBILE ACCORDION:", JSON.stringify(afterExpand, null, 1));
// click a real nav anchor (membership)
await m.click('.mobile-nav-inner a[href="/membership"]');
await m.waitForTimeout(2500);
const nav = await m.evaluate(() => ({ path: location.pathname, h1: document.querySelector("h1")?.textContent?.trim().slice(0, 30) }));
console.log("MOBILE NAV-A:", JSON.stringify(nav), nav.path === "/membership" ? "OK" : "FAIL");
console.log("MOBILE ERRS:", JSON.stringify(mErrs));
await m.close();
await browser.close();
