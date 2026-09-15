import { describe, expect, it } from "vitest";
import { isAnnualRenewalSearch, membershipSubmissionErrorMessage } from "../client/src/lib/membershipRenewal";

describe("membership renewal UX helpers", () => {
  it("detects only the annual renewal entry-point query", () => {
    expect(isAnnualRenewalSearch("?renewal=annual")).toBe(true);
    expect(isAnnualRenewalSearch("?renewal=lifetime")).toBe(false);
    expect(isAnnualRenewalSearch("")).toBe(false);
  });

  it("turns renewal identity-match failures into clear member guidance", () => {
    const message = membershipSubmissionErrorMessage("Membership renewal identity did not match.", true);
    expect(message).toContain("exact email address and PAN");
    expect(message).toContain("has not been submitted");
    expect(membershipSubmissionErrorMessage("No existing membership found for this renewal email.", true)).toContain("could not find an AASW member account");
  });

  it("keeps active-account and temporary submission failures understandable", () => {
    expect(membershipSubmissionErrorMessage("An active membership already exists for this email.", true)).toContain("already active");
    expect(membershipSubmissionErrorMessage("Failed to fetch", true)).toContain("check your connection");
  });
});
