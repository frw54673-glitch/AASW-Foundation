// Payment security boundary: Razorpay secrets remain server-only; this module never reaches the browser bundle.
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const razorpayOrderSchema = z.object({
  id: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  status: z.string(),
});

const razorpayRefundSchema = z.object({
  id: z.string().min(1),
  amount: z.number().int().nonnegative(),
  status: z.string(),
  payment_id: z.string().min(1),
});

export type RazorpayConfig = { keyId: string; keySecret: string };

export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return keyId && keySecret ? { keyId, keySecret } : null;
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyRazorpayCheckoutSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return secureEqual(expected, signature);
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return secureEqual(expected, signature);
}

export async function createRazorpayOrder(input: { amount: number; receipt: string; kind: "donation" | "membership" }): Promise<{ id: string; amount: number; currency: string; status: string }> {
  const config = getRazorpayConfig();
  if (!config) throw new Error("Razorpay live credentials are not configured.");

  const authorization = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${authorization}` },
    body: JSON.stringify({
      amount: input.amount,
      currency: "INR",
      receipt: input.receipt,
      notes: { purpose: input.kind, source: "aasw-foundation-website" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Razorpay order creation failed (${response.status}): ${text.slice(0, 300)}`);
  }

  return razorpayOrderSchema.parse(await response.json());
}

export type RazorpayRefund = z.infer<typeof razorpayRefundSchema>;

/**
 * Creates a gateway refund for a captured payment. Amount must be supplied in
 * paise and validated by the caller against the stored transaction; this module
 * trusts only values the server computed or bounded.
 */
export async function createRazorpayRefund(input: { paymentId: string; amount: number; reason?: string }): Promise<RazorpayRefund> {
  const config = getRazorpayConfig();
  if (!config) throw new Error("Razorpay live credentials are not configured.");
  const authorization = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(input.paymentId)}/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${authorization}` },
    body: JSON.stringify({
      amount: input.amount,
      speed: "normal",
      notes: { source: "aasw-foundation-website", ...(input.reason ? { reason: input.reason.slice(0, 200) } : {}) },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Razorpay refund creation failed (${response.status}): ${text.slice(0, 300)}`);
  }

  return razorpayRefundSchema.parse(await response.json());
}
