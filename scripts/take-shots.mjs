import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const shots = [
  ["/", "a_home"],
  ["/volunteer", "b_volunteer"],
  ["/about", "c_about"],
  ["/membership", "d_membership"],
  ["/team", "e_team"],
  ["/contact", "f_contact"],
];
for (const [p, name] of shots) {
  await page.goto("http://localhost:3000" + p, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `gui-test-screenshots/${name}.png`, fullPage: true });
  console.log("saved", name);
}
await browser.close();
