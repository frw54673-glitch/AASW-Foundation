import { describe, expect, it } from "vitest";
import { createDemoReceipt, formatINR, resolveDemoAmount } from "./payment-demo";

describe("demo payment boundary", () => {
  it("allows only published membership contribution amounts", () => {
    expect(resolveDemoAmount("membership", 1100)).toBe(1100);
    expect(resolveDemoAmount("membership", 10000)).toBe(10000);
    expect(resolveDemoAmount("membership", 2500)).toBeNull();
  });

  it("requires a valid minimum amount for a donation", () => {
    expect(resolveDemoAmount("donation", 10)).toBe(10);
    expect(resolveDemoAmount("donation", 9)).toBeNull();
    expect(resolveDemoAmount("donation", 10.5)).toBeNull();
  });

  it("creates a clearly labelled non-financial demonstration receipt", () => {
    expect(createDemoReceipt("donation", 1100, new Date("2026-08-12T00:00:00.000Z"))).toBe("AASW-DEMO-DON-20260812-1100");
    expect(formatINR(1100)).toBe("₹1,100");
  });
});
