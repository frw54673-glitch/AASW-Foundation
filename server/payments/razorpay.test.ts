import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyRazorpayCheckoutSignature, verifyRazorpayWebhookSignature } from "./razorpay";

describe("Razorpay signature verification", () => {
  it("accepts only the signature created from the stored order id and payment id", () => {
    const secret = "unit-test-secret";
    const signature = createHmac("sha256", secret).update("order_123|pay_123").digest("hex");
    expect(verifyRazorpayCheckoutSignature("order_123", "pay_123", signature, secret)).toBe(true);
    expect(verifyRazorpayCheckoutSignature("order_changed", "pay_123", signature, secret)).toBe(false);
  });

  it("validates webhook HMAC against the untouched raw body", () => {
    const secret = "webhook-test-secret";
    const rawBody = '{"event":"payment.captured","payload":{"x":1}}';
    const signature = createHmac("sha256", secret).update(rawBody).digest("hex");
    expect(verifyRazorpayWebhookSignature(rawBody, signature, secret)).toBe(true);
    expect(verifyRazorpayWebhookSignature(`${rawBody} `, signature, secret)).toBe(false);
  });
});
