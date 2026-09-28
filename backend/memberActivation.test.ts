import { describe, expect, it } from "vitest";
import { createMemberActivationEmail, createMemberPasswordResetEmail } from "./email/memberActivation";
import { createMemberSetupToken, hashMemberSetupToken, MEMBER_SETUP_TOKEN_TTL_MS } from "./security/memberAccount";

describe("member activation security", () => {
  it("creates a high-entropy opaque setup token and persists only its SHA-256 hash", () => {
    const now = new Date("2026-08-14T00:00:00.000Z");
    const setup = createMemberSetupToken(now);
    expect(setup.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(setup.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(setup.tokenHash).toBe(hashMemberSetupToken(setup.token));
    expect(setup.expiresAt.getTime() - now.getTime()).toBe(MEMBER_SETUP_TOKEN_TTL_MS);
  });

  it("sends an approval email with Membership ID, secure setup and certificate links without a plaintext password", () => {
    const message = createMemberActivationEmail({ fullName: "Asha Kumar", email: "asha@example.org", membershipNo: "AASW-2026-0001", setupUrl: "https://example.org/member/setup-password?token=opaque-token", certificateUrl: "https://example.org/member/email-certificate?token=certificate-token" });
    expect(message.subject).toContain("Membership Is Approved");
    expect(message.text).toContain("AASW-2026-0001");
    expect(message.text).toContain("membership is approved");
    expect(message.text).toContain("72 hours");
    expect(message.text).toContain("opaque-token");
    expect(message.text).toContain("certificate-token");
    expect(message.text).toContain("Member Portal");
    expect(message.text).toContain("https://www.instagram.com/aaswfoundation");
    expect(message.text).toContain("https://www.linkedin.com/company/108100135/");
    expect(message.html).toContain("aasw-foundation-official-logo_41a4007d.png");
    expect(message.html).toContain("Stay connected:");
    expect(message.html).toContain("Facebook");
    expect(message.html).toContain("Instagram");
    expect(message.html).toContain("LinkedIn");
    expect(message.text).not.toMatch(/temporary password|your password is/i);
  });

  it("creates a one-time password reset email that preserves the existing password until reset", () => {
    const message = createMemberPasswordResetEmail({ fullName: "Asha Kumar", email: "asha@example.org", membershipNo: "AASW-2026-0001", setupUrl: "https://example.org/member/reset-password?token=opaque-token" });
    expect(message.subject).toContain("Reset Your Member Password");
    expect(message.text).toContain("AASW-2026-0001");
    expect(message.text).toContain("existing password will remain unchanged");
    expect(message.text).toContain("opaque-token");
    expect(message.text).not.toMatch(/temporary password|your password is/i);
  });
});
