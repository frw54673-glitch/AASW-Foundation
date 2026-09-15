import { describe, expect, it } from "vitest";
import { certificateIssueDate, certificateMembershipTerm, memberCertificateFileName } from "../client/src/lib/memberCertificatePdf";

describe("member certificate PDF download", () => {
  it("creates a safe, member-specific certificate filename", () => {
    expect(memberCertificateFileName("AASW-2026-H1COR")).toBe("AASW-Membership-Certificate-AASW-2026-H1COR.pdf");
    expect(memberCertificateFileName("AASW/2026 H1COR")).toBe("AASW-Membership-Certificate-AASW2026H1COR.pdf");
  });

  it("uses the official template wording for annual and lifetime membership variations", () => {
    expect(certificateMembershipTerm("Annual Membership")).toBe("(1 Year)");
    expect(certificateMembershipTerm("Lifetime Membership")).toBe("(Lifetime)");
    expect(certificateIssueDate("2026-08-14")).toBe("14-08-2026");
  });
});
