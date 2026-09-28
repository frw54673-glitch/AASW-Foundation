import { describe, expect, it } from "vitest";
import { membershipRenewalShareBadgeFileName } from "../frontend/src/lib/membershipRenewalShareBadge";

describe("membership renewal share badge", () => {
  it("uses a generic filename without member-specific data", () => {
    expect(membershipRenewalShareBadgeFileName()).toBe("AASW-Membership-Renewed-Badge.png");
  });
});
