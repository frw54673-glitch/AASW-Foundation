import { beforeEach, describe, expect, it, vi } from "vitest";

const { createPaymentTransaction, getPaymentRefundByGatewayRefundId, getPaymentRefundsByReceipt, getPaymentTransactionByGatewayOrderId, getPaymentTransactionByReceipt, listPaymentRefunds, markPaymentRefundNotified, markPaymentRefundProcessed, markPaymentTransactionStatus, recordPaymentRefundInitiated } = vi.hoisted(() => ({
  createPaymentTransaction: vi.fn(),
  getPaymentRefundByGatewayRefundId: vi.fn(),
  getPaymentRefundsByReceipt: vi.fn(),
  getPaymentTransactionByGatewayOrderId: vi.fn(),
  getPaymentTransactionByReceipt: vi.fn(),
  listPaymentRefunds: vi.fn(),
  markPaymentRefundNotified: vi.fn(),
  markPaymentRefundProcessed: vi.fn(),
  markPaymentTransactionStatus: vi.fn(),
  recordPaymentRefundInitiated: vi.fn(),
}));

const { dispatchVerifiedPaymentReceipt, dispatchRefundProcessedEmail, createRazorpayOrder, createRazorpayRefund } = vi.hoisted(() => ({
  dispatchVerifiedPaymentReceipt: vi.fn(),
  dispatchRefundProcessedEmail: vi.fn(),
  createRazorpayOrder: vi.fn(),
  createRazorpayRefund: vi.fn(),
}));

vi.mock("./db", () => ({ createPaymentTransaction, getPaymentRefundByGatewayRefundId, getPaymentRefundsByReceipt, getPaymentTransactionByGatewayOrderId, getPaymentTransactionByReceipt, listPaymentRefunds, markPaymentRefundNotified, markPaymentRefundProcessed, markPaymentTransactionStatus, recordPaymentRefundInitiated }));
vi.mock("./email/receipt", () => ({ dispatchVerifiedPaymentReceipt }));
vi.mock("./email/refundNotification", () => ({ dispatchRefundProcessedEmail }));
vi.mock("./payments/razorpay", () => ({ createRazorpayOrder, createRazorpayRefund, getRazorpayConfig: () => ({ keyId: "rzp_test", keySecret: "secret" }), verifyRazorpayCheckoutSignature: vi.fn() }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { PaymentTransaction } from "../drizzle/schema";

process.env.RAZORPAY_WEBHOOK_SECRET ||= "aasw-webhook-test-secret";

const adminUser = { id: 1, openId: "owner-open-id", role: "admin" } as never;
const financeUser = { id: 2, openId: "finance-open-id", role: "finance" } as never;
const regularUser = { id: 3, openId: "staff-open-id", role: "user" } as never;

function caller(user: unknown, member = null) {
  return appRouter.createCaller({ user, member, req: {}, res: {} } as TrpcContext);
}

const baseTransaction = { id: 9, receipt: "AASW-DON-TESTREF01", kind: "donation" as const, amount: 200_000, currency: "INR", supporterName: "Test Donor", supporterEmail: "donor@example.com", supporterPhone: null, gateway: "razorpay", gatewayOrderId: "order_1", gatewayPaymentId: "pay_1", status: "captured" as const, receiptDeliveryStatus: "sent" as const, receiptSentAt: null, receiptMessageId: null, receiptError: null, createdAt: new Date("2026-08-01T00:00:00.000Z"), updatedAt: new Date("2026-08-01T00:00:00.000Z") } satisfies PaymentTransaction;

describe("payment refund authorization and integrity", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createPaymentTransaction.mockResolvedValue(undefined);
    getPaymentTransactionByGatewayOrderId.mockResolvedValue(undefined);
    listPaymentRefunds.mockResolvedValue([]);
    markPaymentRefundNotified.mockResolvedValue(undefined);
    markPaymentRefundProcessed.mockResolvedValue({ matched: true, alreadyProcessed: false });
    markPaymentTransactionStatus.mockResolvedValue(undefined);
    recordPaymentRefundInitiated.mockResolvedValue({ refundRef: "AASW-RFD-TEST" });
    dispatchVerifiedPaymentReceipt.mockResolvedValue("sent");
    dispatchRefundProcessedEmail.mockResolvedValue("sent");
    createRazorpayRefund.mockResolvedValue({ id: "rfnd_gateway_1", amount: 200_000, status: "processed", payment_id: "pay_1" });
    getPaymentTransactionByReceipt.mockResolvedValue({ ...baseTransaction });
    getPaymentRefundByGatewayRefundId.mockResolvedValue(undefined);
    getPaymentRefundsByReceipt.mockResolvedValue([]);
  });

  it("allows an authorized finance role to create a full refund from the stored amount", async () => {
    const result = await caller(financeUser).payment.admin.refundPayment({ receipt: "AASW-DON-TESTREF01" });
    expect(createRazorpayRefund).toHaveBeenCalledWith(expect.objectContaining({ paymentId: "pay_1", amount: 200_000 }));
    expect(recordPaymentRefundInitiated).toHaveBeenCalledWith(expect.objectContaining({ receipt: "AASW-DON-TESTREF01", gatewayRefundId: "rfnd_gateway_1", amount: 200_000, initiatedByOpenId: "finance-open-id" }));
    expect(result).toMatchObject({ refundedAmount: 200_000, notificationStatus: "sent" });
  });

  it("rejects a non-finance user even with a valid session", async () => {
    await expect(caller(regularUser).payment.admin.refundPayment({ receipt: "AASW-DON-TESTREF01" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated caller", async () => {
    await expect(caller(null).payment.admin.refundPayment({ receipt: "AASW-DON-TESTREF01" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuses a partial refund amount without the explicit allowPartial flag", async () => {
    await expect(caller(adminUser).payment.admin.refundPayment({ receipt: "AASW-DON-TESTREF01", amount: 100_000 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });

  it("refuses a partial refund that exceeds the original charge or is below one rupee", async () => {
    await expect(caller(adminUser).payment.admin.refundPayment({ receipt: "AASW-DON-TESTREF01", amount: 300_000, allowPartial: true })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller(adminUser).payment.admin.refundPayment({ receipt: "AASW-DON-TESTREF01", amount: 50, allowPartial: true })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });

  it("refunds only verified or captured transactions", async () => {
    getPaymentTransactionByReceipt.mockResolvedValue({ ...baseTransaction, status: "failed" });
    await expect(caller(adminUser).payment.admin.refundPayment({ receipt: "AASW-DON-TESTREF01" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("blocks a second refund before any gateway call once one is already recorded", async () => {
    getPaymentRefundsByReceipt.mockResolvedValue([{ refundRef: "AASW-RFD-EXISTING", status: "initiated", amount: 200_000, gatewayRefundId: "rfnd_gateway_1" }]);
    await expect(caller(adminUser).payment.admin.refundPayment({ receipt: "AASW-DON-TESTREF01" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(createRazorpayRefund).not.toHaveBeenCalled();
    expect(recordPaymentRefundInitiated).not.toHaveBeenCalled();
  });

  it("allows a retry after a previous refund failed", async () => {
    getPaymentRefundsByReceipt.mockResolvedValue([]);
    const result = await caller(adminUser).payment.admin.refundPayment({ receipt: "AASW-DON-TESTREF01" });
    expect(createRazorpayRefund).toHaveBeenCalled();
    expect(result).toMatchObject({ refundedAmount: 200_000 });
  });
});
