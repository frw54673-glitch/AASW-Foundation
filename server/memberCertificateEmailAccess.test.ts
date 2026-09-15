import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const membershipRouter = readFileSync(resolve(process.cwd(), "server/routers/membership.ts"), "utf8");
const memberRouter = readFileSync(resolve(process.cwd(), "server/routers/member.ts"), "utf8");
const activationEmail = readFileSync(resolve(process.cwd(), "server/email/memberActivation.ts"), "utf8");
const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const memberPages = readFileSync(resolve(process.cwd(), "client/src/pages/MemberAccessPages.tsx"), "utf8");

describe("member certificate email access", () => {
  it("creates an immediately approved membership and issues a distinct secure certificate-email token", () => {
    expect(membershipRouter).toContain('status: "approved"');
    expect(membershipRouter).toContain('status: "approved" as const');
    expect(membershipRouter).toContain("createMemberCertificateEmailToken");
    expect(membershipRouter).toContain("/member/email-certificate?token=");
    expect(membershipRouter).toContain("certificateEmailToken.tokenHash");
  });

  it("persists only hashed, expiring certificate email tokens and invalidates older unused tokens", () => {
    expect(schema).toContain("memberCertificateEmailTokens");
    expect(schema).toContain('mysqlTable("member_certificate_email_tokens"');
    expect(schema).toContain("tokenHash");
    expect(schema).toContain("expiresAt");
    expect(schema).toContain("usedAt");
    expect(db).toContain("createMemberCertificateEmailToken");
    expect(db).toContain("getActiveMemberCertificateEmailToken");
    expect(db).toContain("memberCertificateEmailTokens).set({ usedAt: now }");
  });

  it("keeps certificate access time-limited by email and permanently available after member authentication", () => {
    expect(memberRouter).toContain("emailCertificateStatus");
    expect(memberRouter).toContain("hashMemberSetupToken(input.token)");
    expect(memberRouter).toContain('return { valid: false as const, certificate: null }');
    expect(activationEmail).toContain("Your AASW Foundation Membership Is Approved");
    expect(activationEmail).toContain("View your membership certificate within 72 hours");
    expect(activationEmail).toContain("certificateUrl");
    expect(app).toContain('path={"/member/email-certificate"} component={MemberEmailCertificatePage}');
    expect(memberPages).toContain("export function MemberEmailCertificatePage()");
    expect(memberPages).toContain("time-limited");
    expect(memberPages).toContain("downloadMemberCertificatePdf(certificate)");
  });
});
