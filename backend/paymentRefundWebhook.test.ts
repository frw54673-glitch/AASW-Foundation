import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createPaymentWebhookEvent, getPaymentWebhookEvent, getPaymentTransactionByGatewayOrderId, markPaymentRefundFailed, markPaymentRefundProcessed, markPaymentTransactionRefundedByPaymentId, markPaymentTransactionStatus, markPaymentWebhookEventProcessed, dispatchVerifiedPaymentReceipt } = vi.hoisted(() => ({
  createPaymentWebhookEvent: vi.fn(),
  getPaymentWebhookEvent: vi.fn(),
  getPaymentTransactionByGatewayOrderId: vi.fn(),
  markPaymentRefundFailed: vi.fn(),
  markPaymentRefundProcessed: vi.fn(),
  markPaymentTransactionRefundedByPaymentId: vi.fn(),
  markPaymentTransactionStatus: vi.fn(),
  markPaymentWebhookEventProcessed: vi.fn(),
  dispatchVerifiedPaymentReceipt: vi.fn(),
}));

vi.mock("./db", () => ({ createPaymentWebhookEvent, getPaymentWebhookEvent, getPaymentTransactionByGatewayOrderId, markPaymentRefundFailed, markPaymentRefundProcessed, markPaymentTransactionRefundedByPaymentId, markPaymentTransactionStatus, markPaymentWebhookEventProcessed }));
vi.mock("./email/receipt", () => ({ dispatchVerifiedPaymentReceipt }));

import { handleRazorpayWebhook } from "./payments/webhook";
import { verifyRazorpayWebhookSignature } from "./payments/razorpay";

process.env.RAZORPAY_WEBHOOK_SECRET ||= "aasw-webhook-test-secret";
process.env.RAZORPAY_KEY_ID ||= "rzp_test_key";
process.env.RAZORPAY_KEY_SECRET ||= "rzp_test_secret";

type TestResponse = { statusCode: number; body: { message?: string; duplicate?: boolean } };

function expressResponse(capture: TestResponse) {
  return {
    status(code: number) {
      capture.statusCode = code;
      return { json(payload: Record<string, unknown>) { capture.body = payload as TestResponse["body"]; return capture; } };
    },
  } as never;
}

function signedWebhookRequest(event: unknown, eventId: string) {
  const rawBody = JSON.stringify(event);
  const signature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!).update(rawBody).digest("hex");
  return {
    header: (name: string) => name === "x-razorpay-signature" ? signature : name === "x-razorpay-event-id" ? eventId : undefined,
    body: Buffer.from(rawBody, "utf8"),
  } as never;
}

function collectResponse() {
  const capture: TestResponse = { statusCode: 0, body: {} };
  return { res: expressResponse(capture), capture };
}

describe("Razorpay webhook refund boundary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getPaymentWebhookEvent.mockResolvedValue(undefined);
    createPaymentWebhookEvent.mockResolvedValue(undefined);
    markPaymentWebhookEventProcessed.mockResolvedValue(undefined);
    markPaymentRefundProcessed.mockResolvedValue({ matched: true, alreadyProcessed: false });
    markPaymentTransactionRefundedByPaymentId.mockResolvedValue({ matched: true });
    markPaymentRefundFailed.mockResolvedValue(undefined);
    markPaymentTransactionStatus.mockResolvedValue(undefined);
    getPaymentTransactionByGatewayOrderId.mockResolvedValue(undefined);
    dispatchVerifiedPaymentReceipt.mockResolvedValue("sent");
  });

  it("rejects an invalid signature before any state change", async () => {
    const rawBody = JSON.stringify({ event: "refund.processed", payload: { refund: { entity: { id: "rfnd_123" } } } });
    const res = collectResponse();
    const req = { header: () => "deadbeef", body: Buffer.from(rawBody, "utf8") } as never;
    await handleRazorpayWebhook(req, res.res);
    expect(res.capture.statusCode).toBe(401);
    expect(markPaymentRefundProcessed).not.toHaveBeenCalled();
    expect(verifyRazorpayWebhookSignature(rawBody, "deadbeef", process.env.RAZORPAY_WEBHOOK_SECRET!)).toBe(false);
  });

  it("marks a recorded refund processed when refund.processed arrives", async () => {
    const req = signedWebhookRequest({ event: "refund.processed", payload: { refund: { entity: { id: "rfnd_123", payment_id: "pay_123", status: "processed" } } } }, "evt_refund_ok");
    const res = collectResponse();
    await handleRazorpayWebhook(req, res.res);
    expect(markPaymentRefundProcessed).toHaveBeenCalledWith("rfnd_123");
    expect(markPaymentTransactionStatus).not.toHaveBeenCalled();
    expect(markPaymentWebhookEventProcessed).toHaveBeenCalledWith("evt_refund_ok");
    expect(res.capture.statusCode).toBe(200);
  });

  it("marks a refund failed without touching the payment transaction state", async () => {
    const req = signedWebhookRequest({ event: "refund.failed", payload: { refund: { entity: { id: "rfnd_456", payment_id: "pay_123", status: "failed", notes: { reason: "bank rejected" } } } } }, "evt_refund_fail");
    const res = collectResponse();
    await handleRazorpayWebhook(req, res.res);
    expect(markPaymentRefundFailed).toHaveBeenCalledWith("rfnd_456", "bank rejected");
    expect(markPaymentTransactionStatus).not.toHaveBeenCalled();
    expect(res.capture.statusCode).toBe(200);
  });

  it("rejects a refund event whose refund entity is missing", async () => {
    const req = signedWebhookRequest({ event: "refund.processed", payload: {} }, "evt_refund_missing");
    const res = collectResponse();
    await handleRazorpayWebhook(req, res.res);
    expect(markPaymentRefundProcessed).not.toHaveBeenCalled();
    expect(res.capture.statusCode).toBe(400);
    expect(res.capture.body.message).toContain("missing its refund entity");
  });

  it("flips the transaction to refunded for a dashboard-created refund with no local record", async () => {
    markPaymentRefundProcessed.mockResolvedValue({ matched: false });
    const req = signedWebhookRequest({ event: "refund.processed", payload: { refund: { entity: { id: "rfnd_external", payment_id: "pay_ext_1", status: "processed" } } } }, "evt_refund_external");
    const res = collectResponse();
    await handleRazorpayWebhook(req, res.res);
    expect(markPaymentTransactionRefundedByPaymentId).toHaveBeenCalledWith("pay_ext_1", "rfnd_external");
    expect(res.capture.statusCode).toBe(200);
  });

  it("skips already-processed events before any state change", async () => {
    getPaymentWebhookEvent.mockResolvedValue({ status: "processed" });
    const req = signedWebhookRequest({ event: "refund.processed", payload: { refund: { entity: { id: "rfnd_123", payment_id: "pay_123" } } } }, "evt_refund_dup");
    const res = collectResponse();
    await handleRazorpayWebhook(req, res.res);
    expect(markPaymentRefundProcessed).not.toHaveBeenCalled();
    expect(markPaymentWebhookEventProcessed).not.toHaveBeenCalled();
    expect(res.capture.body.duplicate).toBe(true);
  });
});
