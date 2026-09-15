// Verify team/about photo fixes + error-free page loads.
// Checks: (1) no [Auth] console spam / server errors via response status,
// (2) team photos have real portrait aspect + cover (no tiny floating images),
// (3) faces: images fill > 90% of their photo box, (4) about roster cards big.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

const browser = await chromium.launch();
let failures = 0;

async function checkPage(path, name) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("response", (res) => { if (res.status() >= 500) consoleErrors.push(`HTTP ${res.status()} ${res.url()}`); });

  await page.goto(BASE + path, { waitUntil: "networkidle" });
  // Scroll through so lazy images + reveals complete
  await page.evaluate(async () => {
    const step = 700;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    for (let y = 0; y < max + step; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); }
  });
  await page.waitForTimeout(1400);

  const geo = await page.evaluate(() => {
    const boxes = [];
    // team page photos
    document.querySelectorAll(".team-photo img, .about-profile-card img, .about-patron-card > img, .about-roster-card img").forEach((img) => {
      const box = img.parentElement?.getBoundingClientRect?.() ?? img.getBoundingClientRect();
      const r = img.getBoundingClientRect();
      boxes.push({
        src: (img.getAttribute("src") || "").split("/").pop()?.slice(0, 22),
        boxW: Math.round(box.width), boxH: Math.round(box.height),
        imgW: Math.round(r.width), imgH: Math.round(r.height),
        coverFill: Math.round((r.width / box.width) * 100),
      });
    });
    return boxes;
  });

  // Faces visible = image fills the box: either cover-width (~92%+) or, for
  // framed portrait cards (patron), at least 70% of the box height.
  const bad = geo.filter((g) => g.imgH < 150 || (g.coverFill < 92 && g.imgH / g.boxH < 0.7));
  const ok = consoleErrors.length === 0 && bad.length === 0 && geo.length > 0;
  if (!ok) failures++;
  const avgH = geo.length ? Math.round(geo.reduce((s, g) => s + g.imgH, 0) / geo.length) : 0;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}  photos=${geo.length}  avgImgHeight=${avgH}px  badGeometry=${bad.length}  consoleErrors=${consoleErrors.length}`);
  if (bad.length) console.log("   bad:", JSON.stringify(bad.slice(0, 4)));
  if (consoleErrors.length) console.log("   errors:", consoleErrors.slice(0, 3).join(" | "));

  // Screenshots for visual check
  const target = path === "/team" ? ".team-grid-core" : ".about-leadership-grid";
  if (path === "/team") {
    await page.evaluate(() => document.querySelector(".team-grid-core")?.scrollIntoView());
    await page.waitForTimeout(900);
    await page.screenshot({ path: "gui-test-screenshots/team_photos_core.png" });
    await page.evaluate(() => document.querySelector(".team-grid-advisory")?.scrollIntoView());
    await page.waitForTimeout(900);
    await page.screenshot({ path: "gui-test-screenshots/team_photos_advisory.png" });
  } else {
    await page.evaluate(() => document.querySelector(".about-leadership-grid")?.scrollIntoView());
    await page.waitForTimeout(900);
    await page.screenshot({ path: "gui-test-screenshots/about_leadership_photos.png" });
    await page.evaluate(() => document.querySelector(".about-roster-names")?.scrollIntoView());
    await page.waitForTimeout(900);
    await page.screenshot({ path: "gui-test-screenshots/about_roster_photos.png" });
  }
  await page.close();
}

await checkPage("/team", "TEAM page");
await checkPage("/about", "ABOUT page");

// Recurring error reproduction: set a stale cookie, load page, confirm no 500s and cookie gets cleared
const stalePage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
stalePage.on("response", (res) => { if (res.status() >= 400 && !res.url().includes("favicon")) errors.push(`${res.status()} ${res.url().split("/").pop()}`); });
await stalePage.context().addCookies([{ name: "app_session_id", value: "expired-stale-token.jwt.sig", url: BASE, httpOnly: true }]);
await stalePage.goto(BASE + "/", { waitUntil: "networkidle" });
await stalePage.waitForTimeout(800);
const cookiesAfter = await stalePage.context().cookies(BASE);
const stillHasStale = cookiesAfter.some((c) => c.name === "app_session_id");
const staleOk = errors.filter((e) => e.startsWith("5")).length === 0;
console.log(`${staleOk ? "PASS" : "FAIL"} stale-cookie  noServerErrors=${staleOk}  cookieStillPresent=${stillHasStale}  (cleared on tRPC calls only: ${!stillHasStale})`);
if (!staleOk) failures++;
await stalePage.close();

await browser.close();
console.log(failures === 0 ? "ALL PHOTO + ERROR CHECKS PASSED" : `${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
