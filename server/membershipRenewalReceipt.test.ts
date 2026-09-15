import { describe, expect, it } from "vitest";
import { membershipRenewalReceiptFileName } from "../client/src/lib/membershipRenewalReceiptPdf";

describe("membership renewal receipt", () => {
  it("uses only a safe membership ID in its download filename", () => {
    expect(membershipRenewalReceiptFileName("AASW-2026-H1COR")).toBe("AASW-Membership-Renewal-AASW-2026-H1COR.pdf");
    expect(membershipRenewalReceiptFileName("AASW/2026 H1COR")).toBe("AASW-Membership-Renewal-AASW2026H1COR.pdf");
  });
});
