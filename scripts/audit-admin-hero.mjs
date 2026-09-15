import { chromium } from "playwright";
const fs = await import("node:fs");
const envText = fs.readFileSync(".env", "utf8");
const secret = envText.match(/^JWT_SECRET=(.+)$/m)?.[1].trim();
const { SignJWT } = await import("jose");
const key = new TextEncoder().encode(secret);
const token = await new SignJWT({ openId: "admin-local-audit", appId: "local-audit", name: "Foundation Admin" }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt().setExpirationTime(Math.floor((Date.now() + 8 * 36e5) / 1000)).sign(key);

let fails = 0, total = 0;
const pass = (name, ok, detail = "") => { total++; if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  |  " + detail : ""}`); };

for (const { w, h } of [{ w: 1366, h: 900 }, { w: 820, h: 1180 }, { w: 375, h: 812 }]) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.addCookies([{ name: "app_session_id", value: token, url: "http://localhost:3000" }]);
  const p = await ctx.newPage();
  const routes = ["/foundation-admin", "/foundation-admin/members", "/foundation-admin/service-requests", "/foundation-admin/support-inbox", "/mis/dashboard", "/mis/projects", "/mis/delivery", "/mis/operations", "/mis/governance"];
  for (const route of routes) {
    await p.goto("http://localhost:3000" + route, { waitUntil: "domcontentloaded" }).catch(() => {});
    await p.waitForSelector(".foundation-admin-workspace", { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const doc = document.documentElement;
      const main = document.querySelector("main.foundation-admin-workspace");
      if (!main) return { fatal: "no-workspace-main" };
      const off = [];
      main.querySelectorAll("*").forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.width > 1 && (b.right > doc.clientWidth + 1 || b.left < -1)) off.push(el.tagName + "." + String(el.className).split(" ")[0] + " r=" + Math.round(b.right));
      });
      const header = main.querySelector(":scope > header");
      const hb = header ? getComputedStyle(header) : null;
      const h1 = header?.querySelector("h1");
      const h1b = h1 ? getComputedStyle(h1) : null;
      // header children must stack (all left edges equal) and h1 below eyebrow
      let stacked = true, sidesBySide = false;
      if (header) {
        const kids = [...header.children].filter(c => c.tagName !== "BUTTON");
        const lefts = kids.map(c => Math.round(c.getBoundingClientRect().left));
        const tops = kids.map(c => Math.round(c.getBoundingClientRect().top));
        stacked = lefts.length === 0 || lefts.every(l => Math.abs(l - lefts[0]) <= 2);
        sidesBySide = tops.length >= 2 && tops.every(t => Math.abs(t - tops[0]) <= 2);
      }
      const statBlue = doc.querySelector("[data-mis-panels] > article");
      const statStyle = statBlue ? getComputedStyle(statBlue) : null;
      const panel = doc.querySelector("[data-mis-panels] > section");
      const panelStyle = panel ? getComputedStyle(panel) : null;
      return {
        overX: doc.scrollWidth - doc.clientWidth, off: off.slice(0, 3),
        heroBg: hb ? hb.backgroundColor : "none", heroRadius: hb ? hb.borderRadius : "none",
        h1Color: h1b ? h1b.color : "none",
        statBorderColor: statStyle ? statStyle.borderColor : "n/a", statRadius: statStyle ? statStyle.borderRadius : "n/a",
        panelBg: panelStyle ? panelStyle.backgroundColor : "n/a", panelRadius: panelStyle ? panelStyle.borderRadius : "n/a",
        stacked, sidesBySide,
      };
    });
    const hero = r.heroBg === "rgb(23, 76, 60)";
    pass(`${w} ${route}: hero band + stacked header + no overflow`,
      r.fatal ? false : (hero && r.stacked && !r.sidesBySide && r.overX <= 1 && r.off.length === 0),
      r.fatal ? r.fatal : `bg=${r.heroBg} overX=${r.overX} off=${JSON.stringify(r.off)} stacked=${r.stacked} sideBySide=${r.sidesBySide}`);
    if (route === "/mis/dashboard" && w === 1366) {
      pass("MIS stat cards keep colored themes + radius", r.statBorderColor !== "rgb(228, 221, 210)" && r.statRadius === "12px", `border=${r.statBorderColor} radius=${r.statRadius}`);
    }
  }
  await b.close();
}
console.log(`\n${total - fails}/${total} hero/stacking checks passed`);
process.exit(fails ? 1 : 0);
