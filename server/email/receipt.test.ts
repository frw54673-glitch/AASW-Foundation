import type { PaymentTransaction } from "../../drizzle/schema";
import { createDonationReceiptMail, dispatchVerifiedPaymentReceipt, isReceiptEligible } from "./receipt";
import { describe, expect, it, vi } from "vitest";

function transaction(overrides: Partial<PaymentTransaction> = {}): PaymentTransaction {
  return {
    id: 1,
    receipt: "AASW-DON-TEST-001",
    kind: "donation",
    amount: 110000,
    currency: "INR",
    supporterName: "AASW Supporter",
    supporterEmail: "supporter@example.com",
    supporterPhone: null,
    gateway: "razorpay",
    gatewayOrderId: "order_test_001",
    gatewayPaymentId: "pay_test_001",
    status: "captured",
    receiptDeliveryStatus: "pending",
    receiptSentAt: null,
    receiptMessageId: null,
    receiptError: null,
    createdAt: new Date("2026-08-12T00:00:00.000Z"),
    updatedAt: new Date("2026-08-12T00:00:00.000Z"),
    ...overrides,
  };
}

describe("verified payment receipts", () => {
  it("is eligible only after a verified or captured payment", () => {
    expect(isReceiptEligible(transaction({ status: "created" }))).toBe(false);
    expect(isReceiptEligible(transaction({ status: "verified" }))).toBe(true);
    expect(isReceiptEligible(transaction({ receiptDeliveryStatus: "sent" }))).toBe(false);
  });

  it("builds a branded receipt containing the verified payment reference", () => {
    const mail = createDonationReceiptMail(transaction());
    expect(mail.subject).toContain("AASW-DON-TEST-001");
    expect(mail.html).toContain("₹1,100");
    expect(mail.html).toContain("verified payment receipt");
  });

  it("prevents duplicate dispatch when the database claim is unavailable", async () => {
    const deliver = vi.fn();
    const result = await dispatchVerifiedPaymentReceipt(transaction(), {
      claim: vi.fn().mockResolvedValue(false),
      markSent: vi.fn(),
      markFailed: vi.fn(),
      deliver,
    });
    expect(result).toBe("skipped");
    expect(deliver).not.toHaveBeenCalled();
  });

  it("marks the receipt sent only after the email provider accepts it", async () => {
    const markSent = vi.fn().mockResolvedValue(undefined);
    const result = await dispatchVerifiedPaymentReceipt(transaction(), {
      claim: vi.fn().mockResolvedValue(true),
      markSent,
      markFailed: vi.fn(),
      deliver: vi.fn().mockResolvedValue({ messageId: "smtp-message-1" }),
    });
    expect(result).toBe("sent");
    expect(markSent).toHaveBeenCalledWith("AASW-DON-TEST-001", "smtp-message-1");
  });
});
