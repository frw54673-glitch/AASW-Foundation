import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
page.on("pageerror", e => errors.push("PAGEERROR: " + String(e).slice(0, 200)));
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 }).catch(e => console.log("goto:", e.message.split("\n")[0]));
await page.waitForTimeout(4000);
const state = await page.evaluate(() => ({
  header: !!document.querySelector("header"),
  headerCls: document.querySelector("header")?.className || null,
  rootKids: document.getElementById("root")?.children.length,
  anyHeaderRow: document.querySelector("header > div")?.className || null,
  title: document.title
}));
console.log(JSON.stringify(state, null, 1));
console.log("ERRORS:", JSON.stringify(errors.slice(0, 5), null, 1));
await browser.close();
