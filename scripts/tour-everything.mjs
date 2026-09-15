// Guided LIVE tour: one headed window walks through EVERYTHING — public site,
// member portal (terracotta), admin panel — with pauses so the owner can watch.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const env = readFileSync(".env", "utf8");
const secret = env.match(/^JWT_SECRET=(.+)$/m)?.[1].trim();
const { SignJWT } = await import("jose");

const show = async (page, label, ms = 4200) => { console.log("▶ " + label); await page.waitForTimeout(ms); };
const scrollSlow = async (page, to, ms = 1600) => { await page.evaluate(async (y) => { const step = 120; for (let i = 0; i < y; i += step) { window.scrollTo(0, i); await new Promise(r => setTimeout(r, 45)); } }, to); };

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(String(e).slice(0, 100)));

console.log("═══ PUBLIC WEBSITE ═══");
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await show(page, "Home — hero + nav (4 mega menus)");
await scrollSlow(page, 1600); await show(page, "Home — scroll-reveal + reading progress bar live", 3000);
await scrollSlow(page, 3400); await show(page, "Home — impact counters (count-up 800+/300+/30+)", 3400);
await scrollSlow(page, 5600); await show(page, "Home — trust strip + stories", 2800);
await page.goto(BASE + "/team", { waitUntil: "networkidle" }); await show(page, "Team page — photo cards + filter bar", 4200);
await scrollSlow(page, 1500); await show(page, "Team — scroll reveals + member cards", 3000);
await page.goto(BASE + "/donate", { waitUntil: "networkidle" }); await show(page, "Donate — 80G tax-benefit block + calculator", 4200);
await page.goto(BASE + "/faq", { waitUntil: "networkidle" }); await show(page, "FAQ — 16 Q&A accordion groups", 3800);
await page.goto(BASE + "/membership", { waitUntil: "networkidle" }); await show(page, "Membership — application form", 3800);

console.log("═══ MEMBER PORTAL (TERRACOTTA) ═══");
await page.goto(BASE + "/member/login", { waitUntil: "networkidle" });
await show(page, "Member Login — naya terracotta cinematic panel (rings + aurora)", 4500);
await page.fill('input[autocomplete="username"]', "demo.member@aaswfoundation.test");
await page.fill('input[autocomplete="current-password"]', "AaswTest#2026");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/member/dashboard", { timeout: 20000 });
await show(page, "Welcome intro — one-time cinematic reveal (plane + aurora)", 5200);
await show(page, "Member Home — terracotta mast + pillars (white sidebar)", 4200);
await scrollSlow(page, 1800); await show(page, "Member Home — impact count-up", 3200);
await page.locator('.member-sidebar nav button', { hasText: "My membership" }).click();
await show(page, "My Membership — summary + countdown (lifetime member)", 4200);
await page.locator('.member-sidebar nav button', { hasText: "Membership history" }).click();
await show(page, "Membership History — overview count-ups + streams", 4200);
await page.locator('.member-sidebar nav button', { hasText: "My services" }).click();
await show(page, "My Services — 4 service cards", 3600);
await page.locator('.member-service', { hasText: "Chat with admin" }).first().click();
await show(page, "Support chat — terracotta header + private conversation", 4200);
await page.locator('.member-support-dialog button[aria-label="Close support chat"]').click();
await page.goto(BASE + "/member/projects", { waitUntil: "networkidle" });
await show(page, "★ MY PROJECTS — naya real view (pehle ye kaam hi nahi karta tha!)", 5200);
await page.goto(BASE + "/member/certificate", { waitUntil: "networkidle" });
await show(page, "Official membership certificate (PDF download/print)", 4200);
await page.locator('a[href="/member/login"], button:has-text("Sign out")').first().click().catch(() => {});

console.log("═══ FOUNDATION ADMIN PANEL ═══");
const token = await new SignJWT({ openId: "admin-local-audit", appId: "local-audit", name: "Foundation Admin" })
  .setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt()
  .setExpirationTime(Math.floor((Date.now() + 12 * 3600 * 1000) / 1000))
  .sign(new TextEncoder().encode(secret));
await ctx.addCookies([{ name: "app_session_id", value: token, url: BASE, httpOnly: true }]);
await page.goto(BASE + "/foundation-admin", { waitUntil: "networkidle" });
await page.waitForSelector(".foundation-admin-workspace", { timeout: 15000 });
await show(page, "Admin workspace — dark-green rail + ochre monogram + count-up summary", 5000);
await scrollSlow(page, 1400); await show(page, "Admin — record sections (memberships, inquiries, donations…)", 3800);
await scrollSlow(page, 3200); await show(page, "Admin — media upload + Drive sync sections", 3400);
await page.goto(BASE + "/foundation-admin/members", { waitUntil: "networkidle" });
await show(page, "Admin — Member accounts (assignments)", 3800);
await page.goto(BASE + "/mis/dashboard", { waitUntil: "networkidle" });
await show(page, "MIS Dashboard — KPI stats + count-up + panels", 4400);
await page.goto(BASE + "/foundation-admin/service-requests", { waitUntil: "networkidle" });
await show(page, "Admin — Member service requests", 3600);
await page.goto(BASE + "/foundation-admin/support-inbox", { waitUntil: "networkidle" });
await show(page, "Admin — Support inbox (member conversations)", 3600);

console.log("═══ TOUR COMPLETE — window khula rahega ═══");
console.log("page errors during tour: " + errors.length + (errors.length ? " :: " + errors[0] : ""));
console.log("TOUR DONE — browser window desktop par khula hai. Close karne ke liye window ka X dabaiye.");
await new Promise(resolve => browser.on("disconnected", resolve));
