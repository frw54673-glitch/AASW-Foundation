import { chromium } from "playwright";

const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium" });

try {
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await desktop.goto(`${baseUrl}/team`, { waitUntil: "networkidle" });
  const filters = desktop.locator(".team-filter-controls");
  for (const [label, expectedCount] of [["Core", 3], ["Advisory", 14], ["Trainers", 3], ["State Council", 17]]) {
    const button = filters.getByRole("button", { name: label });
    await button.click();
    await button.getAttribute("aria-pressed").then((value) => { if (value !== "true") throw new Error(`${label} filter is not selected.`); });
    const cards = desktop.locator(".team-grid > .team-card");
    if (await cards.count() !== expectedCount) throw new Error(`${label} rendered ${await cards.count()} cards instead of ${expectedCount}.`);
    if (label === "State Council") {
      if (await desktop.locator(".team-default-avatar").count() !== 17) throw new Error("State Council fallback avatars are incomplete.");
      await desktop.getByText("Source portrait unavailable", { exact: true }).first().waitFor();
    }
  }
  await filters.getByRole("button", { name: "All people" }).click();
  if (await desktop.locator(".team-grid > .team-card").count() !== 37) throw new Error("All people filter did not restore the complete roster.");
  await desktop.screenshot({ path: "/home/ubuntu/team-filter-qa/filters-desktop.png", fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await mobile.goto(`${baseUrl}/team`, { waitUntil: "networkidle" });
  await mobile.locator(".team-filter-controls").getByRole("button", { name: "State Council" }).click();
  if (await mobile.locator(".team-default-avatar").count() !== 17) throw new Error("Mobile State Council fallback avatars are incomplete.");
  await mobile.screenshot({ path: "/home/ubuntu/team-filter-qa/filters-mobile-state-council.png", fullPage: true });
  console.log("Team filters and default-avatar checks passed.");
} finally {
  await browser.close();
}
