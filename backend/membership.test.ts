import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMembershipApplicationWithActivation, createMemberCertificateEmailToken, markMembershipApplicationNotification, storagePut, encryptSensitiveValue, hashSensitiveMatchValue, dispatchMembershipApplicationNotification, dispatchMemberActivationEmail, createMemberSetupToken } = vi.hoisted(() => ({
  createMembershipApplicationWithActivation: vi.fn(),
  createMemberCertificateEmailToken: vi.fn(),
  markMembershipApplicationNotification: vi.fn(),
  storagePut: vi.fn(),
  encryptSensitiveValue: vi.fn(),
  hashSensitiveMatchValue: vi.fn(),
  dispatchMembershipApplicationNotification: vi.fn(),
  dispatchMemberActivationEmail: vi.fn(),
  createMemberSetupToken: vi.fn(),
}));

vi.mock("./db", () => ({ createMembershipApplicationWithActivation, createMemberCertificateEmailToken, markMembershipApplicationNotification }));
vi.mock("./storage", () => ({ storagePut }));
vi.mock("./security/sensitive", () => ({ encryptSensitiveValue, hashSensitiveMatchValue }));
vi.mock("./email/membershipNotification", () => ({ dispatchMembershipApplicationNotification }));
vi.mock("./email/memberActivation", () => ({ dispatchMemberActivationEmail }));
vi.mock("./security/memberAccount", () => ({ createMemberSetupToken }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicCaller() {
  return appRouter.createCaller({ user: null, req: {}, res: {} } as TrpcContext);
}

const validApplication = {
  fullName: "Aarti Sharma",
  email: "aarti@example.com",
  phone: "+91 99887 76655",
  city: "Lucknow",
  state: "Uttar Pradesh",
  district: "Lucknow",
  membershipType: "annual" as const,
  panNumber: "ABCDE1234F",
  idProof: { type: "voter_id" as const, originalName: "voter-id.pdf", mimeType: "application/pdf" as const, dataBase64: "JVBERi0xLjQ=" },
  message: "I would like to contribute to the Foundation's work.",
  privacyConsent: true as const,
};

describe("membership.submit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    storagePut.mockResolvedValue({ key: "membership-applications/test/id-proof.pdf", url: "/manus-storage/private-proof" });
    encryptSensitiveValue.mockReturnValue("encrypted-pan-value");
    hashSensitiveMatchValue.mockReturnValue("pan-match-hash");
    createMembershipApplicationWithActivation.mockResolvedValue({ memberId: 7, membershipNo: "AASW-2026-0001" });
    dispatchMembershipApplicationNotification.mockResolvedValue("sent");
    dispatchMemberActivationEmail.mockResolvedValue("sent");
    createMemberSetupToken.mockReturnValueOnce({ token: "setup-token-for-testing-1234567890", tokenHash: "a".repeat(64), expiresAt: new Date("2026-08-17T00:00:00.000Z") }).mockReturnValueOnce({ token: "certificate-token-for-testing-123456", tokenHash: "b".repeat(64), expiresAt: new Date("2026-08-17T00:00:00.000Z") });
    createMemberCertificateEmailToken.mockResolvedValue(undefined);
    markMembershipApplicationNotification.mockResolvedValue(undefined);
  });

  it("stores an encrypted-PAN application with a private proof key and sends a non-sensitive Foundation alert", async () => {
    const result = await createPublicCaller().membership.submit(validApplication);

    expect(result).toMatchObject({ status: "approved", notificationStatus: "sent", membershipNo: "AASW-2026-0001", activationEmailStatus: "sent" });
    expect(result.applicationRef).toMatch(/^AASW-MEM-[A-Z0-9_-]{12}$/);
    expect(storagePut).toHaveBeenCalledWith(expect.stringContaining(`${result.applicationRef}/id-proof.pdf`), expect.any(Buffer), "application/pdf");
    expect(encryptSensitiveValue).toHaveBeenCalledWith("ABCDE1234F");
    expect(hashSensitiveMatchValue).toHaveBeenCalledWith("ABCDE1234F");
    expect(createMembershipApplicationWithActivation).toHaveBeenCalledWith(expect.objectContaining({
      application: expect.objectContaining({ applicationRef: result.applicationRef, district: "Lucknow", panEncrypted: "encrypted-pan-value", panHash: "pan-match-hash", panLastFour: "234F", idProofStorageKey: "membership-applications/test/id-proof.pdf", notificationStatus: "pending", status: "approved" }),
      setupTokenHash: "a".repeat(64),
      renewalIntent: undefined,
    }));
    expect(dispatchMembershipApplicationNotification).toHaveBeenCalledWith(expect.objectContaining({ applicationRef: result.applicationRef, fullName: "Aarti Sharma", district: "Lucknow" }));
    expect(createMemberCertificateEmailToken).toHaveBeenCalledWith(7, "b".repeat(64), expect.any(Date));
    expect(dispatchMemberActivationEmail).toHaveBeenCalledWith(expect.objectContaining({ email: "aarti@example.com", membershipNo: "AASW-2026-0001", setupUrl: expect.stringContaining("/member/setup-password?token="), certificateUrl: expect.stringContaining("/member/email-certificate?token=") }));
    expect(markMembershipApplicationNotification).toHaveBeenCalledWith(result.applicationRef, "sent");
  });

  it("rejects invalid PAN, missing consent and invalid contact details before file storage", async () => {
    await expect(createPublicCaller().membership.submit({ ...validApplication, email: "not-an-email", panNumber: "invalid", privacyConsent: false as true })).rejects.toBeDefined();
    expect(storagePut).not.toHaveBeenCalled();
    expect(createMembershipApplicationWithActivation).not.toHaveBeenCalled();
  });

  it("rejects malformed proof payloads before file storage", async () => {
    await expect(createPublicCaller().membership.submit({ ...validApplication, idProof: { ...validApplication.idProof, dataBase64: "not-a-valid-proof" } })).rejects.toThrow("could not be read");
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("records a failed notification without rejecting the saved application", async () => {
    dispatchMembershipApplicationNotification.mockResolvedValue({ status: "failed", error: "SMTP unavailable" });
    const result = await createPublicCaller().membership.submit(validApplication);
    expect(result.notificationStatus).toBe("failed");
    expect(markMembershipApplicationNotification).toHaveBeenCalledWith(result.applicationRef, "failed", "SMTP unavailable");
  });

  it("passes explicit renewal intent through the secure matching boundary and preserves the existing account response", async () => {
    createMembershipApplicationWithActivation.mockResolvedValue({ memberId: 7, membershipNo: "AASW-2026-0001", isRenewal: true });

    const result = await createPublicCaller().membership.submit({ ...validApplication, renewalIntent: true });

    expect(createMembershipApplicationWithActivation).toHaveBeenCalledWith(expect.objectContaining({ renewalIntent: true }));
    expect(result).toMatchObject({ renewal: true, membershipNo: "AASW-2026-0001", activationEmailStatus: "not_required" });
    expect(dispatchMemberActivationEmail).not.toHaveBeenCalled();
  });

  it("preserves an active existing annual membership instead of creating an early duplicate renewal", async () => {
    createMembershipApplicationWithActivation.mockRejectedValue(new Error("An active membership already exists for this email."));

    await expect(createPublicCaller().membership.submit({ ...validApplication, renewalIntent: true })).rejects.toThrow("An active membership already exists for this email.");

    expect(createMembershipApplicationWithActivation).toHaveBeenCalledWith(expect.objectContaining({ renewalIntent: true }));
    expect(dispatchMemberActivationEmail).not.toHaveBeenCalled();
  });
});
