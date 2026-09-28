import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMembershipApplicationWithActivation, createMemberCertificateEmailToken, markMembershipApplicationNotification, storagePut, dispatchMembershipApplicationNotification, dispatchMemberActivationEmail, createMemberSetupToken } = vi.hoisted(() => ({
  createMembershipApplicationWithActivation: vi.fn(),
  createMemberCertificateEmailToken: vi.fn(),
  markMembershipApplicationNotification: vi.fn(),
  storagePut: vi.fn(),
  dispatchMembershipApplicationNotification: vi.fn(),
  dispatchMemberActivationEmail: vi.fn(),
  createMemberSetupToken: vi.fn(),
}));

vi.mock("./db", () => ({ createMembershipApplicationWithActivation, createMemberCertificateEmailToken, markMembershipApplicationNotification }));
vi.mock("./storage", () => ({ storagePut }));
vi.mock("./email/membershipNotification", () => ({ dispatchMembershipApplicationNotification }));
vi.mock("./email/memberActivation", () => ({ dispatchMemberActivationEmail }));
vi.mock("./security/memberAccount", () => ({ createMemberSetupToken }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// The real PAN encryption helpers read JWT_SECRET at call time; provide a test-only value.
process.env.JWT_SECRET ||= "aasw-foundation-test-secret";

function caller() { return appRouter.createCaller({ user: null, req: {}, res: {} } as TrpcContext); }

describe("Membership submission workflow boundaries", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    storagePut.mockResolvedValue({ key: "membership-applications/private-application/id-proof.jpg", url: "/manus-storage/private-application" });
    createMembershipApplicationWithActivation.mockResolvedValue({ memberId: 9, membershipNo: "AASW-2026-0002" });
    dispatchMembershipApplicationNotification.mockResolvedValue("sent");
    dispatchMemberActivationEmail.mockResolvedValue("sent");
    createMemberSetupToken.mockReturnValueOnce({ token: "setup-token-for-integration-testing", tokenHash: "b".repeat(64), expiresAt: new Date("2026-08-17T00:00:00.000Z") }).mockReturnValueOnce({ token: "certificate-token-for-integration-testing", tokenHash: "c".repeat(64), expiresAt: new Date("2026-08-17T00:00:00.000Z") });
    createMemberCertificateEmailToken.mockResolvedValue(undefined);
    markMembershipApplicationNotification.mockResolvedValue(undefined);
  });

  it("hands an encoded proof to private storage, persists masked metadata and records a sent Foundation notification", async () => {
    const result = await caller().membership.submit({
      fullName: "Boundary Test Applicant", email: "boundary@example.com", phone: "+91 90000 00111", city: "Rura", state: "Uttar Pradesh", district: "Kanpur Dehat", membershipType: "lifetime", panNumber: "ABCDE1234F",
      idProof: { type: "driving_licence", originalName: "identity.jpg", mimeType: "image/jpeg", dataBase64: "/9j/4AAQSkZJRg==" }, privacyConsent: true,
    });

    expect(storagePut).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^membership-applications/${result.applicationRef}/id-proof\\.jpg$`)), expect.any(Buffer), "image/jpeg");
    expect(createMembershipApplicationWithActivation).toHaveBeenCalledWith(expect.objectContaining({ application: expect.objectContaining({ applicationRef: result.applicationRef, district: "Kanpur Dehat", panLastFour: "234F", idProofStorageKey: "membership-applications/private-application/id-proof.jpg", idProofMimeType: "image/jpeg", notificationStatus: "pending", status: "approved" }) }));
    const persisted = createMembershipApplicationWithActivation.mock.calls[0][0].application;
    expect(persisted.panEncrypted).not.toContain("ABCDE1234F");
    expect(dispatchMembershipApplicationNotification).toHaveBeenCalledWith(expect.objectContaining({ applicationRef: result.applicationRef, fullName: "Boundary Test Applicant", district: "Kanpur Dehat" }));
    expect(markMembershipApplicationNotification).toHaveBeenCalledWith(result.applicationRef, "sent");
    expect(result.notificationStatus).toBe("sent");
    expect(result.membershipNo).toBe("AASW-2026-0002");
    expect(result.status).toBe("approved");
    expect(createMemberCertificateEmailToken).toHaveBeenCalledWith(9, "c".repeat(64), expect.any(Date));
    expect(dispatchMemberActivationEmail).toHaveBeenCalledWith(expect.objectContaining({ email: "boundary@example.com", membershipNo: "AASW-2026-0002", certificateUrl: expect.stringContaining("/member/email-certificate?token=") }));
  });
});
