import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
await p.goto("http://localhost:3000/team", { waitUntil: "networkidle" });
await p.addStyleTag({ content: "html.js-reveal [data-reveal]{opacity:1 !important;transform:none !important;transition:none !important}" });
await p.evaluate(() => document.querySelectorAll("[data-reveal]").forEach(el => el.setAttribute("data-revealed", "true")));
await p.waitForTimeout(900);
const info = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll(".team-card-placeholder").forEach((card, i) => {
    if (i > 3) return;
    const avatar = card.querySelector(".team-default-avatar");
    const copy = card.querySelector(".team-card-copy");
    const avEls = Array.from(avatar.children).map(c => `${c.tagName}"${(c.textContent||"").trim().slice(0,14)}" L=${Math.round(c.getBoundingClientRect().left)} W=${Math.round(c.getBoundingClientRect().width)} cs=${getComputedStyle(c).textAlign.slice(0,1)}`);
    const cpEls = Array.from(copy.children).map(c => `${c.tagName}.${String(c.className).split(" ")[0]} L=${Math.round(c.getBoundingClientRect().left)} W=${Math.round(c.getBoundingClientRect().width)} cs=${getComputedStyle(c).textAlign.slice(0,1)}`);
    out.push(`card${i} AVATAR[${avEls.join(" | ")}] COPY[${cpEls.join(" | ")}]`);
  });
  return out;
});
info.forEach(l => console.log(l));
await b.close();
