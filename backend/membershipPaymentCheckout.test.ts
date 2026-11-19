import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertMembershipEligibility,
  createMembershipApplication,
  createPaymentTransaction,
  getPaymentTransactionByGatewayOrderId,
  markPaymentTransactionStatus,
  getMembershipApplicationByRef,
  activateMembershipFromExistingApplication,
  markMembershipApplicationNotification,
  createMemberCertificateEmailToken,
  storagePut,
  createRazorpayOrder,
  fetchRazorpayPayment,
  captureRazorpayPayment,
  dispatchVerifiedPaymentReceipt,
  dispatchMembershipApplicationNotification,
  dispatchMemberActivationEmail,
  createMemberSetupToken,
  generateMemberPassword,
} = vi.hoisted(() => ({
  assertMembershipEligibility: vi.fn(),
  createMembershipApplication: vi.fn(),
  createPaymentTransaction: vi.fn(),
  getPaymentTransactionByGatewayOrderId: vi.fn(),
  markPaymentTransactionStatus: vi.fn(),
  getMembershipApplicationByRef: vi.fn(),
  activateMembershipFromExistingApplication: vi.fn(),
  markMembershipApplicationNotification: vi.fn(),
  createMemberCertificateEmailToken: vi.fn(),
  storagePut: vi.fn(),
  createRazorpayOrder: vi.fn(),
  fetchRazorpayPayment: vi.fn(),
  captureRazorpayPayment: vi.fn(),
  dispatchVerifiedPaymentReceipt: vi.fn(),
  dispatchMembershipApplicationNotification: vi.fn(),
  dispatchMemberActivationEmail: vi.fn(),
  createMemberSetupToken: vi.fn(),
  generateMemberPassword: vi.fn(),
}));

const TEST_KEY_ID = "rzp_test_unit_key";
const TEST_KEY_SECRET = "unit_test_razorpay_secret";

vi.mock("./db", () => ({
  assertMembershipEligibility,
  createMembershipApplication,
  createMembershipApplicationWithActivation: vi.fn(),
  createPaymentTransaction,
  getPaymentTransactionByGatewayOrderId,
  markPaymentTransactionStatus,
  getMembershipApplicationByRef,
  activateMembershipFromExistingApplication,
  markMembershipApplicationNotification,
  createMemberCertificateEmailToken,
}));
vi.mock("./storage", () => ({ storagePut }));
vi.mock("./payments/razorpay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./payments/razorpay")>();
  return {
    ...actual,
    getRazorpayConfig: () => ({ keyId: TEST_KEY_ID, keySecret: TEST_KEY_SECRET }),
    createRazorpayOrder,
    fetchRazorpayPayment,
    captureRazorpayPayment,
  };
});
vi.mock("./email/receipt", () => ({ dispatchVerifiedPaymentReceipt }));
vi.mock("./email/membershipNotification", () => ({ dispatchMembershipApplicationNotification }));
vi.mock("./email/memberActivation", () => ({ dispatchMemberActivationEmail }));
vi.mock("./security/memberAccount", () => ({ createMemberSetupToken, generateMemberPassword }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

process.env.JWT_SECRET ||= "aasw-foundation-test-secret";

function caller() {
  return appRouter.createCaller({ user: null, req: {}, res: {} } as TrpcContext);
}

const validInput = {
  fullName: "Paid Member Applicant",
  email: "paid.member@example.com",
  phone: "+91 98765 43210",
  city: "Kanpur",
  state: "Uttar Pradesh",
  district: "Kanpur Nagar",
  membershipType: "annual" as const,
  panNumber: "ABCDE1234F",
  idProof: {
    type: "aadhaar" as const,
    originalName: "aadhaar.png",
    mimeType: "image/png" as const,
    dataBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  },
  privacyConsent: true as const,
};

describe("pay-first membership checkout automation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    assertMembershipEligibility.mockResolvedValue({ existingMemberId: null, isRenewal: false });
    storagePut.mockResolvedValue({ key: "membership-applications/test/id-proof.png", url: "/manus-storage/test" });
    createMembershipApplication.mockResolvedValue(undefined);
    createPaymentTransaction.mockResolvedValue(undefined);
    createRazorpayOrder.mockResolvedValue({ id: "order_test_1100", amount: 110000, currency: "INR", status: "created" });
    markPaymentTransactionStatus.mockResolvedValue(undefined);
    dispatchVerifiedPaymentReceipt.mockResolvedValue("sent");
    dispatchMembershipApplicationNotification.mockResolvedValue("sent");
    dispatchMemberActivationEmail.mockResolvedValue("sent");
    markMembershipApplicationNotification.mockResolvedValue(undefined);
    createMemberCertificateEmailToken.mockResolvedValue(undefined);
    generateMemberPassword.mockReturnValue("Aasw@Paid123");
    createMemberSetupToken
      .mockReturnValueOnce({ token: "setup-tok", tokenHash: "a".repeat(64), expiresAt: new Date("2026-12-01T00:00:00Z") })
      .mockReturnValueOnce({ token: "cert-tok", tokenHash: "b".repeat(64), expiresAt: new Date("2026-12-01T00:00:00Z") });
  });

  it("creates an unpaid submitted application + Razorpay order WITHOUT activating a member", async () => {
    const order = await caller().membership.startPaymentCheckout(validInput);

    expect(order.orderId).toBe("order_test_1100");
    expect(order.amount).toBe(110000);
    expect(order.keyId).toBe(TEST_KEY_ID);
    expect(createMembershipApplication).toHaveBeenCalledWith(expect.objectContaining({ status: "submitted", membershipType: "annual" }));
    expect(activateMembershipFromExistingApplication).not.toHaveBeenCalled();
    expect(dispatchMemberActivationEmail).not.toHaveBeenCalled();
  });

  it("rejects confirmPaymentCheckout on invalid Razorpay signature without activating membership", async () => {
    getPaymentTransactionByGatewayOrderId.mockResolvedValue({
      receipt: "AASW-MEM-TEST12345678",
      kind: "membership",
      amount: 110000,
      currency: "INR",
      gatewayOrderId: "order_test_1100",
      status: "created",
    });

    await expect(
      caller().membership.confirmPaymentCheckout({
        applicationRef: "AASW-MEM-TEST12345678",
        razorpayOrderId: "order_test_1100",
        razorpayPaymentId: "pay_test_1",
        razorpaySignature: "bad_signature",
      }),
    ).rejects.toThrow("Payment verification failed");

    expect(activateMembershipFromExistingApplication).not.toHaveBeenCalled();
  });

  it("auto-captures an authorized Razorpay payment and activates Membership ID + welcome email", async () => {
    const applicationRef = "AASW-MEM-TEST12345678";
    const orderId = "order_test_1100";
    const paymentId = "pay_test_live_99";
    const signature = createHmac("sha256", TEST_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");

    getPaymentTransactionByGatewayOrderId.mockResolvedValue({
      receipt: applicationRef,
      kind: "membership",
      amount: 110000,
      currency: "INR",
      supporterName: validInput.fullName,
      supporterEmail: validInput.email,
      gatewayOrderId: orderId,
      status: "created",
      receiptDeliveryStatus: "pending",
      createdAt: new Date(),
    });
    fetchRazorpayPayment.mockResolvedValue({
      id: paymentId,
      order_id: orderId,
      amount: 110000,
      currency: "INR",
      status: "authorized",
    });
    captureRazorpayPayment.mockResolvedValue({
      id: paymentId,
      order_id: orderId,
      amount: 110000,
      currency: "INR",
      status: "captured",
    });
    getMembershipApplicationByRef.mockResolvedValue({
      applicationRef,
      fullName: validInput.fullName,
      email: validInput.email,
      phone: validInput.phone,
      district: validInput.district,
      state: validInput.state,
      membershipType: "annual",
      status: "submitted",
    });
    activateMembershipFromExistingApplication.mockResolvedValue({
      memberId: 42,
      membershipNo: "AASW-2026-0042",
      isRenewal: false,
    });

    const result = await caller().membership.confirmPaymentCheckout({
      applicationRef,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    });

    expect(captureRazorpayPayment).toHaveBeenCalledWith({ paymentId, amount: 110000, currency: "INR" });
    expect(markPaymentTransactionStatus).toHaveBeenCalledWith(orderId, "verified", paymentId);
    expect(activateMembershipFromExistingApplication).toHaveBeenCalledWith(expect.objectContaining({ applicationRef }));
    expect(dispatchVerifiedPaymentReceipt).toHaveBeenCalledTimes(1);
    expect(dispatchMemberActivationEmail).toHaveBeenCalledWith(expect.objectContaining({ membershipNo: "AASW-2026-0042" }));
    expect(result).toMatchObject({
      applicationRef,
      membershipNo: "AASW-2026-0042",
      status: "approved",
      paymentId,
    });
  });
});
