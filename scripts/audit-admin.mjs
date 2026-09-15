// ADMIN PANEL ALIGNMENT AUDIT: workspace + service requests + support inbox.
// Logs in with a minted admin session, then checks geometry + text alignment.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const env = readFileSync(".env", "utf8");
const secret = env.match(/^JWT_SECRET=(.+)$/m)?.[1].trim();
const owner = env.match(/^OWNER_OPEN_ID=(.*)$/m)?.[1].trim() || "admin-local-audit";

const { SignJWT } = await import("jose");
const token = await new SignJWT({ openId: owner, appId: "local-audit", name: "Foundation Admin" })
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setIssuedAt()
  .setExpirationTime(Math.floor((Date.now() + 8 * 3600 * 1000) / 1000))
  .sign(new TextEncoder().encode(secret));

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
await context.addCookies([{ name: "app_session_id", value: token, url: BASE, httpOnly: true }]);
let total = 0;

const ROUTES = ["/foundation-admin", "/foundation-admin/members", "/foundation-admin/service-requests", "/foundation-admin/support-inbox"];

for (const path of ROUTES) {
  for (const vw of [1366, 820]) {
    const page = await context.newPage();
    await page.setViewportSize({ width: vw, height: 900 });
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 60)); });
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(1600);
    const r = await page.evaluate(() => {
      const out = [];
      const w = window.innerWidth;
      const docW = document.documentElement.scrollWidth;
      if (docW > w + 1) out.push(`page-overflow ${docW}>${w}`);
      const main = document.querySelector("main");
      const gate = document.querySelector(".foundation-admin-access-shell, [data-sidebar-inset]");
      const sidebar = document.querySelector("[data-slot=sidebar-inset], [data-slot=sidebar]");
      if (!main) return ["no-main"];
      if (!sidebar) return ["GATE-SCREEN (not logged in as admin)"];
      const mainR = main.getBoundingClientRect();
      const inset = main.closest(".sidebar-inset, [data-slot=sidebar-inset]");
      if (inset) {
        const inR = inset.getBoundingClientRect();
        const pad = getComputedStyle(inset).padding;
        if (mainR.left < inR.left) out.push(`main-escapes-inset mainL=${Math.round(mainR.left)} insetL=${Math.round(inR.left)}`);
      }
      // workspace max-w container should center within the padded inset area
      const containers = Array.from(main.querySelectorAll("header, section, .foundation-admin-summary-grid")).filter((el) => el.offsetWidth > 100);
      if (containers.length > 1) {
        const lefts = [...new Set(containers.map((c) => Math.round(c.getBoundingClientRect().left)))].filter((l) => l > -1);
        if (lefts.length > 2) out.push(`section-left-mismatch [${lefts.join(",")}]`);
      }
      // record cards same-row equal height
      for (const grid of main.querySelectorAll("section.grid, div.grid")) {
        const kids = Array.from(grid.children).map((k) => ({ top: Math.round(k.getBoundingClientRect().top), h: Math.round(k.getBoundingClientRect().height), w: Math.round(k.getBoundingClientRect().width) }));
        if (kids.length < 2) continue;
        const rows = {};
        kids.forEach((k) => { (rows[k.top] ||= []).push(k); });
        for (const [top, row] of Object.entries(rows)) {
          if (row.length < 2) continue;
          const hs = row.map((k) => k.h), ws = row.map((k) => k.w);
          if (Math.max(...hs) - Math.min(...hs) > 14) out.push(`row-height-mismatch top=${top} h=[${hs.join(",")}]`);
          if (Math.max(...ws) - Math.min(...ws) > 8) out.push(`row-width-mismatch top=${top} w=[${ws.join(",")}]`);
        }
      }
      // card text left edges
      for (const card of main.querySelectorAll("article")) {
        const blocks = Array.from(card.children).filter((b) => b.textContent?.trim() && b.getBoundingClientRect().width > 40);
        if (blocks.length < 2) continue;
        const lefts = blocks.map((b) => Math.round(b.getBoundingClientRect().left));
        const spread = Math.max(...lefts) - Math.min(...lefts);
        const centered = blocks.some((b) => getComputedStyle(b.closest("article")).textAlign === "center");
        if (spread > 10 && !centered) out.push(`card-text-edge ${String(card.className).slice(0, 24)} Δ${spread}`);
      }
      return out;
    });
    const ok = r.length === 0 && errors.length === 0;
    if (!ok) total += r.length + errors.length;
    console.log(`${ok ? "PASS" : "FAIL"} ${path} @${vw}${r.length ? "  " + r.slice(0, 5).join(" | ") : ""}${errors.length ? "  CONSOLE: " + errors[0] : ""}`);
    await page.close();
  }
}

// screenshots
const shot = await context.newPage();
await shot.setViewportSize({ width: 1440, height: 900 });
await shot.goto(BASE + "/foundation-admin", { waitUntil: "networkidle" });
await shot.waitForTimeout(1800);
await shot.screenshot({ path: "gui-test-screenshots/admin_workspace_before.png", fullPage: false });
await shot.evaluate(() => window.scrollTo(0, 900));
await shot.waitForTimeout(400);
await shot.screenshot({ path: "gui-test-screenshots/admin_workspace_mid.png" });
await shot.close();

await browser.close();
console.log(total === 0 ? "ALL ADMIN AUDIT CHECKS PASSED" : `TOTAL ADMIN FINDINGS: ${total}`);
