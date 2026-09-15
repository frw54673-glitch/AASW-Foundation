// Verify the scroll-reveal system + reading progress bar live on the dev server.
// Checks: (1) js-reveal class present, (2) after scrolling, every [data-reveal] has data-revealed,
// (3) no element remains opacity 0, (4) progress bar scales, (5) hero reveals on load.
// All waits are condition-based (no hard-coded sleeps) so cold-start module transforms
// can't race the checks — a failure here means the reveal system actually misbehaved.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const routes = ["/", "/faq", "/reports", "/about", "/donate", "/team"];

const browser = await chromium.launch();
let failures = 0;

for (const route of routes) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto(BASE + route, { waitUntil: "networkidle" });

  const jsReveal = await page.evaluate(() => document.documentElement.classList.contains("js-reveal"));

  // Above-fold hero must reveal on load. Wait for the reveal to land; an element
  // already cleaned up (attribute removed post-settle) counts as passed too.
  const heroOnLoad = await page
    .waitForFunction(
      () => {
        const hero = document.querySelector(".hero-copy [data-reveal], .inner-hero-copy[data-reveal]");
        return !hero || hero.getAttribute("data-revealed") === "true";
      },
      { timeout: 5000 }
    )
    .then(() => true)
    .catch(() => false);

  // Scroll through the whole page slowly so every element intersects
  await page.evaluate(async () => {
    const step = 600;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    for (let y = 0; y < max + step; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 180));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
  });

  // Every element must end up revealed with its entrance transition actually
  // started (opacity left 0). This absorbs IntersectionObserver delivery frames
  // and the scroll-settle safety net's 140ms debounce deterministically.
  const settled = await page
    .waitForFunction(
      () => {
        const all = Array.from(document.querySelectorAll("[data-reveal]"));
        return (
          all.every((el) => el.getAttribute("data-revealed") === "true") &&
          !all.some((el) => getComputedStyle(el).opacity === "0")
        );
      },
      { timeout: 5000, polling: 250 }
    )
    .then(() => true)
    .catch(() => false);

  const stats = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("[data-reveal]"));
    const revealed = all.filter((el) => el.getAttribute("data-revealed") === "true");
    const invisible = all.filter((el) => {
      const style = getComputedStyle(el);
      return el.getAttribute("data-revealed") === "true" && (style.opacity === "0" || style.transform.includes("26px") || style.transform.includes("28px"));
    });
    const bar = document.querySelector(".reading-progress");
    const barTransform = bar ? getComputedStyle(bar).transform : "none";
    return { total: all.length, revealed: revealed.length, invisible: invisible.length, barTransform };
  });
  const progressWorks = stats.barTransform !== "none" && !stats.barTransform.includes("0, 0, 0, 1");

  // Back to top: bar should shrink again
  await page.evaluate(() => window.scrollTo(0, 0));
  await page
    .waitForFunction(() => document.querySelector(".reading-progress")?.classList.contains("reading-progress-hidden") ?? false, { timeout: 2000 })
    .catch(() => {});

  const ok = jsReveal && settled && stats.invisible === 0 && stats.revealed === stats.total && progressWorks && heroOnLoad;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${route}  js-reveal=${jsReveal}  revealed=${stats.revealed}/${stats.total}  stuckInvisible=${stats.invisible}  progressBar=${progressWorks}  heroOnLoad=${heroOnLoad}  settled=${settled}`);

  if (route === "/" || route === "/faq") {
    // Mid-scroll screenshot with reveal active
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(900);
    await page.screenshot({ path: `gui-test-screenshots/reveal_${route === "/" ? "home" : "faq"}.png` });
  }
  await page.close();
}

// Reduced-motion: content must be fully visible immediately, no hiding
const rm = await browser.newPage({ viewport: { width: 1366, height: 900 }, reducedMotion: "reduce" });
await rm.goto(BASE + "/", { waitUntil: "networkidle" });
const rmCheck = await rm
  .waitForFunction(() => {
    const staged = document.querySelector("[data-reveal]");
    if (!staged) return true;
    const style = getComputedStyle(staged);
    return style.opacity === "1" && style.transform === "none";
  }, { timeout: 3000 })
  .then(() => ({ ok: true, reason: "contentVisibleImmediately" }))
  .catch(() => rm.evaluate(() => {
    const staged = document.querySelector("[data-reveal]");
    const style = staged ? getComputedStyle(staged) : null;
    return { ok: false, reason: `opacity=${style?.opacity} transform=${style?.transform}` };
  }));
console.log(`${rmCheck.ok ? "PASS" : "FAIL"} reduced-motion  ${rmCheck.reason}`);
if (!rmCheck.ok) failures++;
await rm.close();

await browser.close();
console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
