import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });

// --- Volunteer form debug ---
const v = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const vErrs = [];
v.on("console", m => { if (m.type() === "error") vErrs.push(m.text().slice(0, 150)); });
v.on("response", r => { if (r.url().includes("api/") && r.status() >= 400) vErrs.push("HTTP " + r.status() + " " + r.url().slice(0, 110)); });
await v.goto("http://localhost:3000/volunteer", { waitUntil: "networkidle", timeout: 30000 });
await v.waitForTimeout(1500);
// inspect form structure first
const formInfo = await v.evaluate(() => {
  const form = document.querySelector("form");
  if (!form) return { form: false };
  const inputs = Array.from(form.querySelectorAll("input, select, textarea")).map(i => ({ name: i.name || i.id, type: i.type || i.tagName, required: i.required, placeholder: (i.placeholder || "").slice(0, 25) }));
  return { form: true, action: form.action, inputs: inputs.slice(0, 15) };
});
console.log("VOLUNTEER FORM:", JSON.stringify(formInfo, null, 1));
// fill properly by name
try {
  await v.evaluate(() => {
    const set = (sel, val) => { const el = document.querySelector(sel); if (!el) return false; const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set; return true; };
  });
  for (const inp of formInfo.inputs || []) {
    if (!inp.name) continue;
    if (inp.type === "email") await v.fill(`[name="${inp.name}"]`, "e2e-volunteer@aaswfoundation.test").catch(() => {});
    else if (inp.type === "tel") await v.fill(`[name="${inp.name}"]`, "9876543210").catch(() => {});
    else if (inp.type === "text" && /name|full/i.test(inp.name)) await v.fill(`[name="${inp.name}"]`, "E2E Volunteer").catch(() => {});
    else if (inp.type === "textarea" || inp.type === "TEXTAREA") await v.fill(`[name="${inp.name}"]`, "E2E volunteer verification").catch(() => {});
  }
  await v.click("form button[type=submit]");
  await v.waitForTimeout(4000);
  const result = await v.evaluate(() => {
    const toast = document.querySelector("[data-sonner-toast], [role=status], .toast");
    return {
      toastText: toast ? toast.textContent.slice(0, 200) : null,
      formStill: !!document.querySelector("form"),
      successText: /thank|received|application|reference/i.test(document.body.innerText) ? document.body.innerText.match(/.{0,80}(thank|received|reference).{0,80}/i)?.[0] : null
    };
  });
  console.log("VOLUNTEER RESULT:", JSON.stringify(result, null, 1));
  console.log("VOLUNTEER ERRS:", JSON.stringify(vErrs));
} catch (e) { console.log("VOLUNTEER ERR:", String(e).split("\n")[0]); }
await v.close();

// --- Mobile nav first link debug ---
const m = await browser.newPage({ viewport: { width: 375, height: 800 } });
await m.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
await m.waitForTimeout(1500);
await m.click(".menu-toggle");
await m.waitForTimeout(500);
const navInfo = await m.evaluate(() => {
  const links = Array.from(document.querySelectorAll(".mobile-nav-link")).slice(0, 12).map(a => ({ tag: a.tagName, href: a.getAttribute("href"), text: a.textContent.trim().slice(0, 30), parentCls: a.parentElement?.className?.slice(0, 30) }));
  return links;
});
console.log("MOBILE LINKS:", JSON.stringify(navInfo, null, 1));
await m.close();
await browser.close();
