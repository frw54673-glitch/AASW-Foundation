// Webhook integrity boundary: verify raw bytes before JSON parsing, then process each Razorpay event idempotently.
import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import { createPaymentWebhookEvent, getPaymentTransactionByGatewayOrderId, getPaymentWebhookEvent, markPaymentRefundFailed, markPaymentRefundProcessed, markPaymentTransactionRefundedByPaymentId, markPaymentTransactionStatus, markPaymentWebhookEventProcessed } from "../db";
import { dispatchVerifiedPaymentReceipt } from "../email/receipt";
import { getRazorpayConfig, verifyRazorpayWebhookSignature } from "./razorpay";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } };
    order?: { entity?: { id?: string } };
    refund?: { entity?: { id?: string; payment_id?: string; status?: string; notes?: Record<string, string> } };
  };
};

export async function handleRazorpayWebhook(req: Request, res: Response) {
  const config = getRazorpayConfig();
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
  const signature = req.header("x-razorpay-signature");
  const eventId = req.header("x-razorpay-event-id");

  if (!config || !process.env.RAZORPAY_WEBHOOK_SECRET) {
    return res.status(503).json({ received: false, message: "Razorpay webhook is not configured." });
  }
  if (!rawBody || !signature || !eventId) {
    return res.status(400).json({ received: false, message: "Missing webhook signature, event id, or raw request body." });
  }
  if (!verifyRazorpayWebhookSignature(rawBody, signature, process.env.RAZORPAY_WEBHOOK_SECRET)) {
    return res.status(401).json({ received: false, message: "Invalid webhook signature." });
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return res.status(400).json({ received: false, message: "Invalid webhook JSON." });
  }
  if (!payload.event) return res.status(400).json({ received: false, message: "Missing webhook event type." });

  const payment = payload.payload?.payment?.entity;
  const order = payload.payload?.order?.entity;
  const refund = payload.payload?.refund?.entity;
  const gatewayOrderId = payment?.order_id ?? order?.id;
  const gatewayPaymentId = payment?.id;
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const existing = await getPaymentWebhookEvent(eventId);
  if (existing?.status === "processed") return res.status(200).json({ received: true, duplicate: true });

  if (!existing) {
    await createPaymentWebhookEvent({ gatewayEventId: eventId, eventType: payload.event, gatewayOrderId, gatewayPaymentId, payloadHash });
  }

  if (payload.event === "refund.processed" || payload.event === "refund.failed") {
    // Refund events carry their own refund entity; both paths are idempotent
    // (already-processed refunds short-circuit inside markPaymentRefundProcessed).
    if (!refund?.id) return res.status(400).json({ received: false, message: "Refund event is missing its refund entity." });
    if (payload.event === "refund.processed") {
      const outcome = await markPaymentRefundProcessed(refund.id);
      if (outcome.matched) {
        // The recorded refund exists; nothing else to do.
      } else if (refund.payment_id) {
        // Dashboard-initiated refund has no local payment_refunds row; keep the
        // transaction state consistent so a refunded payment never stays captured.
        await markPaymentTransactionRefundedByPaymentId(refund.payment_id, refund.id);
      } else {
        console.warn("[Payments] Refund webhook arrived without a payment id.", { gatewayRefundId: refund.id });
      }
    } else {
      await markPaymentRefundFailed(refund.id, refund.notes?.reason ?? "Gateway reported the refund as failed.");
    }
  } else if (gatewayOrderId) {
    if (payload.event === "payment.captured" || payload.event === "order.paid") {
      await markPaymentTransactionStatus(gatewayOrderId, "captured", gatewayPaymentId);
      const transaction = await getPaymentTransactionByGatewayOrderId(gatewayOrderId);
      if (transaction) {
        const receiptDelivery = await dispatchVerifiedPaymentReceipt({ ...transaction, status: "captured", gatewayPaymentId: gatewayPaymentId ?? transaction.gatewayPaymentId });
        if (receiptDelivery === "failed") console.error("[Payments] Webhook receipt delivery could not be completed.", { receipt: transaction.receipt });
      }
    } else if (payload.event === "payment.failed") {
      await markPaymentTransactionStatus(gatewayOrderId, "failed", gatewayPaymentId);
    }
  }

  await markPaymentWebhookEventProcessed(eventId);
  return res.status(200).json({ received: true });
}
