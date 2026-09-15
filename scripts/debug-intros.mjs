import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const checks = [
  { path: "/reports", cls: ".reports-intro" },
  { path: "/team", cls: ".team-intro" },
  { path: "/membership", cls: ".membership-intro" },
  { path: "/donate", cls: ".donate-inner-intro" },
  { path: "/transparency", cls: ".transparency-intro" },
];
for (const c of checks) {
  const p = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await p.goto("http://localhost:3000" + c.path, { waitUntil: "networkidle", timeout: 30000 });
  await p.waitForTimeout(1500);
  const r = await p.evaluate((cls) => {
    const sec = document.querySelector(cls);
    if (!sec) return { found: false };
    const cont = sec.querySelector(":scope > .container");
    const cs = getComputedStyle(sec);
    const cRect = cont?.getBoundingClientRect();
    // first content container of page for reference
    const ref = document.querySelector(".inner-subnav .container, .inner-hero-frame")?.getBoundingClientRect();
    return {
      found: true, secDisplay: cs.display, tmpl: cs.gridTemplateColumns,
      containerLeft: cRect ? Math.round(cRect.left) : null, containerW: cRect ? Math.round(cRect.width) : null,
      refLeft: ref ? Math.round(ref.left) : null,
      kids: cont ? Array.from(cont.children).map(k => Math.round(k.getBoundingClientRect().left)) : null
    };
  }, c.cls);
  console.log(c.path.padEnd(13), c.cls.padEnd(22), JSON.stringify(r));
  await p.close();
}
await browser.close();
