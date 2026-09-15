import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const officialLogo = "/manus-storage/aasw-foundation-official-logo_41a4007d.png";
const retiredLogo = "/manus-storage/aasw-mark_4952f80d.png";
const brandFiles = [
  "client/index.html",
  "client/src/components/InnerPageShell.tsx",
  "client/src/pages/Home.tsx",
];

describe("official AASW Foundation branding", () => {
  it("uses the supplied official logo in every existing site-identity location", () => {
    for (const file of brandFiles) {
      const source = readFileSync(resolve(projectRoot, file), "utf8");
      expect(source).toContain(officialLogo);
      expect(source).not.toContain(retiredLogo);
    }
  });

  it("keeps the coloured official logo intact in the shared inner-page hero", () => {
    const styles = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");
    expect(styles).toContain(".inner-hero-symbol img");
    expect(styles).not.toContain("filter: brightness(0) invert(1)");
  });

  it("applies the requested bold readability system across public and protected workspace text", () => {
    const styles = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");
    expect(styles).toContain("body { font-weight:600; }");
    expect(styles).toContain("body :is(p, a, button, label, input, select, textarea, option, li, dt, dd, small, figcaption, th, td, summary) { font-weight:600; }");
    expect(styles).toContain("body :is(h1, h2, h3, h4, h5, h6) { font-weight:600; }");
    expect(styles).toContain("body :is(strong, b) { font-weight:800; }");
  });
});
