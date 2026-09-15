import { chromium } from "playwright";

const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const outputDir = "/home/ubuntu/navigation-qa";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium" });

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(baseUrl, { waitUntil: "networkidle" });
  const headerItems = await desktop.locator(".desktop-nav .nav-link, .header-contact").evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return { label: node.textContent?.replace(/\s+/g, " ").trim(), top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
  }));
  const expectedHeaderLabels = ["About", "What we do", "Transparency", "Media Centre", "Contact Us", "Membership", "Donate"];
  for (const label of expectedHeaderLabels) {
    if (!headerItems.some((item) => item.label?.startsWith(label))) throw new Error(`Missing desktop header item: ${label}`);
  }
  const contact = headerItems.find((item) => item.label?.replace(/\D/g, "") === "919984156418");
  if (!contact || contact.width === 0 || contact.height === 0) throw new Error("Foundation contact number is not visible in the desktop header.");
  if (Math.max(...headerItems.map((item) => item.top)) - Math.min(...headerItems.map((item) => item.top)) > 3) throw new Error("Desktop header items are not aligned on one row.");
  await desktop.locator(".about-mega-root:not(.header-mega-root)").hover();
  const desktopMenu = desktop.locator(".about-mega-panel-open");
  await desktopMenu.locator('a[href="/about"]').last().waitFor();
  for (const crossSectionRoute of ["/programs", "/digital-skills", "/green-entrepreneurship", "/mentorship-community", "/reports", "/updates", "/stories", "/transparency"]) {
    if (await desktopMenu.locator(`a[href="${crossSectionRoute}"]`).count() !== 0) throw new Error(`Cross-section route remained in About menu: ${crossSectionRoute}`);
  }
  await desktop.screenshot({ path: `${outputDir}/desktop-about-menu.png`, fullPage: true });

  await desktop.locator(".header-mega-root-what-we-do").hover();
  const desktopWorkMenu = desktop.locator(".header-mega-panel-what-we-do.about-mega-panel-open");
  await desktopWorkMenu.locator('a[href="/digital-skills"]').waitFor();
  await desktopWorkMenu.locator('a[href="/mentorship-community"]').waitFor();

  await desktop.locator(".header-mega-root-transparency").hover();
  const desktopTransparencyMenu = desktop.locator(".header-mega-panel-transparency.about-mega-panel-open");
  await desktopTransparencyMenu.locator('a[href="/stories"]').waitFor();
  await desktopTransparencyMenu.locator('a[href="/governance"]').waitFor();
  await desktop.screenshot({ path: `${outputDir}/desktop-new-dropdowns.png`, fullPage: true });

  await desktop.locator(".header-mega-root-media-centre").hover();
  const desktopMediaMenu = desktop.locator(".header-mega-panel-media-centre.about-mega-panel-open");
  await desktopMediaMenu.locator('a[href="/updates"]').waitFor();
  await desktopMediaMenu.locator('a[href="/reports"]').waitFor();
  await desktop.locator(".header-mega-root-contact-us").hover();
  const desktopContactMenu = desktop.locator(".header-mega-panel-contact-us.about-mega-panel-open");
  await desktopContactMenu.locator('a[href="/contact-us"]').last().waitFor();
  await desktopContactMenu.locator('a[href="tel:+919984156418"]').waitFor();
  await desktop.screenshot({ path: `${outputDir}/desktop-media-contact-dropdowns.png`, fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });
  await mobile.getByRole("button", { name: "Open menu" }).click();
  await mobile.getByRole("link", { name: "Membership" }).waitFor();
  await mobile.getByRole("link", { name: "Donate" }).first().waitFor();
  await mobile.getByRole("button", { name: "About" }).click();
  const mobileAboutLinks = mobile.locator(".mobile-about-links");
  await mobileAboutLinks.locator('a[href="/about"]').last().waitFor();
  for (const crossSectionRoute of ["/programs", "/digital-skills", "/green-entrepreneurship", "/mentorship-community", "/reports", "/updates", "/stories", "/transparency"]) {
    if (await mobileAboutLinks.locator(`a[href="${crossSectionRoute}"]`).count() !== 0) throw new Error(`Cross-section route remained in mobile About menu: ${crossSectionRoute}`);
  }

  await mobile.getByRole("button", { name: "What we do" }).click();
  await mobile.locator('.mobile-about-links a[href="/digital-skills"]').last().waitFor();
  await mobile.locator('.mobile-about-links a[href="/mentorship-community"]').last().waitFor();
  await mobile.getByRole("button", { name: "Transparency" }).click();
  await mobile.locator('.mobile-about-links a[href="/stories"]').last().waitFor();
  await mobile.locator('.mobile-about-links a[href="/governance"]').last().waitFor();
  await mobile.getByRole("button", { name: "Media Centre" }).click();
  await mobile.locator('.mobile-about-links a[href="/updates"]').last().waitFor();
  await mobile.locator('.mobile-about-links a[href="/reports"]').last().waitFor();
  await mobile.getByRole("button", { name: "Contact Us" }).click();
  await mobile.locator('.mobile-about-links a[href="/contact-us"]').last().waitFor();
  await mobile.locator('.mobile-about-links a[href="tel:+919984156418"]').last().waitFor();
  await mobile.screenshot({ path: `${outputDir}/mobile-open-navigation.png`, fullPage: true });

  console.log("Opened desktop and mobile navigation checks passed.");
} finally {
  await browser.close();
}
