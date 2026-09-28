import { describe, expect, it } from "vitest";
import { createDemoCheckoutResult, createDemoReceipt, formatINR, resolveDemoAmount, resolvePaymentGatewayMode } from "../shared/payment-demo";
import { createCheckoutGateway } from "../shared/checkout-gateway";

describe("demo checkout safety boundary", () => {
  it("permits only published membership contribution amounts", () => {
    expect(resolveDemoAmount("membership", 1100)).toBe(1100);
    expect(resolveDemoAmount("membership", 10000)).toBe(10000);
    expect(resolveDemoAmount("membership", 2500)).toBeNull();
  });

  it("rejects invalid donation amounts before a demo confirmation is shown", () => {
    expect(resolveDemoAmount("donation", 10)).toBe(10);
    expect(resolveDemoAmount("donation", 9)).toBeNull();
    expect(resolveDemoAmount("donation", 10.5)).toBeNull();
  });

  it("makes every generated receipt explicitly non-financial", () => {
    expect(createDemoReceipt("donation", 1100, new Date("2026-08-12T00:00:00.000Z"))).toBe("AASW-DEMO-DON-20260812-1100");
    expect(formatINR(1100)).toBe("₹1,100");
  });

  it("models the demo lifecycle as explicit success or failure without charging money", () => {
    const failed = createDemoCheckoutResult("donation", 1100, "failed");
    const succeeded = createDemoCheckoutResult("membership", 1100, "success", new Date("2026-08-12T00:00:00.000Z"));
    expect(failed).toMatchObject({ status: "failed" });
    expect(failed.message).toContain("No bank, UPI or card request");
    expect(succeeded).toMatchObject({ status: "success", reference: "AASW-DEMO-MEM-20260812-1100" });
  });

  it("keeps demo as the safe default until a future live Razorpay adapter is enabled", () => {
    expect(resolvePaymentGatewayMode()).toBe("demo");
    expect(resolvePaymentGatewayMode("anything-else")).toBe("demo");
    expect(resolvePaymentGatewayMode("razorpay")).toBe("razorpay");
  });

  it("uses one adapter contract for demo execution and the future Razorpay handoff", async () => {
    const demo = createCheckoutGateway("demo");
    const live = createCheckoutGateway("razorpay");
    await expect(demo.complete({ kind: "donation", amount: 500 })).resolves.toMatchObject({ status: "success" });
    await expect(live.complete({ kind: "donation", amount: 500 })).resolves.toMatchObject({ status: "not_ready" });
  });
});
