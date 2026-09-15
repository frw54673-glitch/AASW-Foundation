import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("homepage public-information block removal", () => {
  it("does not render the removed Public information link cluster on the homepage", () => {
    expect(homeSource).not.toContain('className="transparency-card"');
    expect(homeSource).not.toContain("See the work on paper");
    expect(homeSource).not.toContain("Understand how decisions are held");
    expect(homeSource).not.toContain("Clear terms for a clear relationship");
    expect(homeSource).not.toContain("Request%20for%20AASW%20Foundation%20information");
  });

  it("keeps the immediate story-to-donate homepage flow intact", () => {
    expect(homeSource).toContain('className="container story-grid"');
    expect(homeSource).toContain('id="donate"');
  });
});
