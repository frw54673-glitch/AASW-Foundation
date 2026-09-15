// Live checkout route: validates client input, creates Razorpay orders server-side, and verifies the returned signature against stored state.
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createPaymentTransaction, getPaymentRefundByGatewayRefundId, getPaymentRefundsByReceipt, getPaymentTransactionByGatewayOrderId, getPaymentTransactionByReceipt, listPaymentRefunds, markPaymentRefundNotified, markPaymentRefundProcessed, markPaymentTransactionStatus, recordPaymentRefundInitiated } from "../db";
import { dispatchRefundProcessedEmail } from "../email/refundNotification";
import { dispatchVerifiedPaymentReceipt } from "../email/receipt";
import { createRazorpayOrder, createRazorpayRefund, getRazorpayConfig, verifyRazorpayCheckoutSignature } from "../payments/razorpay";
import { resolveDemoAmount } from "../../shared/payment-demo";
import { misFinanceProcedure, publicProcedure, router } from "../_core/trpc";

const checkoutInput = z.object({
  kind: z.enum(["donation", "membership"]),
  amount: z.number().int(),
  supporterName: z.string().trim().min(2).max(255),
  supporterEmail: z.string().trim().toLowerCase().email().max(320),
  supporterPhone: z.string().trim().max(32).optional(),
});

function createReceipt(kind: "donation" | "membership") {
  const prefix = kind === "membership" ? "MEM" : "DON";
  return `AASW-${prefix}-${nanoid(16)}`;
}

export const paymentRouter = router({
  liveStatus: publicProcedure.query(() => ({ configured: Boolean(getRazorpayConfig()) })),
  createOrder: publicProcedure.input(checkoutInput).mutation(async ({ input }) => {
    const validAmount = resolveDemoAmount(input.kind, input.amount);
    if (!validAmount) throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported payment amount." });
    const config = getRazorpayConfig();
    if (!config) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Live payment setup is not complete yet." });

    const receipt = createReceipt(input.kind);
    const order = await createRazorpayOrder({ amount: validAmount * 100, receipt, kind: input.kind });
    await createPaymentTransaction({
      receipt,
      kind: input.kind,
      amount: validAmount * 100,
      currency: "INR",
      supporterName: input.supporterName,
      supporterEmail: input.supporterEmail,
      supporterPhone: input.supporterPhone || null,
      gateway: "razorpay",
      gatewayOrderId: order.id,
      status: "created",
    });
    return { keyId: config.keyId, orderId: order.id, amount: order.amount, currency: order.currency, receipt };
  }),
  verifyCheckout: publicProcedure.input(z.object({ razorpayOrderId: z.string().min(1), razorpayPaymentId: z.string().min(1), razorpaySignature: z.string().min(1) })).mutation(async ({ input }) => {
    const transaction = await getPaymentTransactionByGatewayOrderId(input.razorpayOrderId);
    const config = getRazorpayConfig();
    if (!transaction || !config || transaction.gatewayOrderId !== input.razorpayOrderId) throw new TRPCError({ code: "NOT_FOUND", message: "Payment order was not found." });
    if (!verifyRazorpayCheckoutSignature(transaction.gatewayOrderId, input.razorpayPaymentId, input.razorpaySignature, config.keySecret)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Payment verification failed." });
    }
    await markPaymentTransactionStatus(transaction.gatewayOrderId, "verified", input.razorpayPaymentId);
    const receiptDelivery = await dispatchVerifiedPaymentReceipt({ ...transaction, status: "verified", gatewayPaymentId: input.razorpayPaymentId });
    if (receiptDelivery === "failed") console.error("[Payments] Verified payment receipt could not be delivered.", { receipt: transaction.receipt });
    return { verified: true, receipt: transaction.receipt, receiptDelivery };
  }),
  admin: router({
    listRefunds: misFinanceProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50) })).query(({ input }) => listPaymentRefunds(input.limit)),
    /**
     * Finance-role refund initiation. The payable amount is always derived from
     * the stored transaction; a partial amount is accepted only when the caller
     * explicitly opts in, and can never exceed the original charge.
     */
    refundPayment: misFinanceProcedure.input(z.object({
      receipt: z.string().trim().min(6).max(40),
      amount: z.number().int().positive().optional(),
      allowPartial: z.boolean().optional(),
      reason: z.string().trim().max(500).optional(),
    })).mutation(async ({ input, ctx }) => {
      const transaction = await getPaymentTransactionByReceipt(input.receipt);
      if (!transaction) throw new TRPCError({ code: "NOT_FOUND", message: "No payment transaction was found for this receipt." });
      if (transaction.status !== "verified" && transaction.status !== "captured") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Only verified or captured payments can be refunded." });
      }
      if (!transaction.gatewayPaymentId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This transaction has no gateway payment id yet; wait for gateway confirmation." });

      // Duplicate-refund guard BEFORE any gateway call: once a non-failed refund
      // exists for this receipt, a second click must never create another one.
      const existingRefunds = await getPaymentRefundsByReceipt(transaction.receipt);
      if (existingRefunds.length > 0) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: `A refund is already ${existingRefunds[0].status === "processed" ? "processed" : "in progress"} for this receipt (${existingRefunds[0].refundRef}).` });
      }

      const refundAmount = input.amount ?? transaction.amount;
      if (input.amount && !input.allowPartial) throw new TRPCError({ code: "BAD_REQUEST", message: "Partial refunds require an explicit partial-refund confirmation." });
      if (input.amount && input.allowPartial && (input.amount > transaction.amount || input.amount < 100)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A partial refund must be at least ₹1 and cannot exceed the original amount." });
      }

      const config = getRazorpayConfig();
      if (!config) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Live payment setup is not complete; refunds require configured Razorpay credentials." });

      try {
        const gatewayRefund = await createRazorpayRefund({ paymentId: transaction.gatewayPaymentId, amount: refundAmount, reason: input.reason });
        // Idempotency guard: the unique gateway refund id also makes webhook replays safe.
        const existingRefund = await getPaymentRefundByGatewayRefundId(gatewayRefund.id);
        if (existingRefund) return { refundRef: existingRefund.refundRef, gatewayRefundId: gatewayRefund.id, duplicate: true };
        const refundRef = `AASW-RFD-${nanoid(16)}`;
        await recordPaymentRefundInitiated({ refundRef, receipt: transaction.receipt, gatewayPaymentId: transaction.gatewayPaymentId, gatewayRefundId: gatewayRefund.id, amount: gatewayRefund.amount, reason: input.reason, initiatedByOpenId: ctx.user.openId });
        // Razorpay normal-speed refunds settle within a few days; the webhook flips
        // the stored state to processed/refunded, so here we only mirror the gateway status.
        if (gatewayRefund.status === "processed") await markPaymentRefundProcessed(gatewayRefund.id);
        const refundRow = { refundRef, amount: gatewayRefund.amount, reason: input.reason || null };
        const notification = await dispatchRefundProcessedEmail({ transaction, refund: refundRow });
        await markPaymentRefundNotified(refundRef, notification === "sent" ? "sent" : "failed", notification === "sent" ? undefined : notification.error);
        if (notification !== "sent") console.error("[Payments] Refund notification could not be delivered.", { refundRef });
        return { refundRef, gatewayRefundId: gatewayRefund.id, refundedAmount: gatewayRefund.amount, notificationStatus: notification === "sent" ? "sent" : "failed" };
      } catch (error) {
        console.error("[Payments] Refund could not be completed", { receipt: transaction.receipt, error });
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The refund could not be created with the payment gateway. Please retry or contact support." });
      }
    }),
  }),
});
