import { describe, expect, it } from "vitest";
import { ANNUAL_MEMBERSHIP_GRACE_DAYS, getMembershipValidity } from "../shared/memberMembership";

describe("member membership validity", () => {
  it("keeps an annual membership active through the day before its first anniversary", () => {
    const result = getMembershipValidity("annual", "2026-08-14", new Date("2027-08-13T12:00:00.000Z"));
    expect(result).toMatchObject({ membershipTypeLabel: "Annual Membership", membershipStatus: "active", portalAccessStatus: "active" });
    expect(result.expiresOn?.toISOString().slice(0, 10)).toBe("2027-08-13");
  });

  it("marks the term expired but retains portal access for three complete grace days", () => {
    const result = getMembershipValidity("annual", "2026-08-14", new Date("2027-08-14T00:00:00.000Z"));
    expect(result.membershipStatus).toBe("expired");
    expect(result.portalAccessStatus).toBe("grace");
    expect(result.graceEndsOn?.toISOString().slice(0, 10)).toBe("2027-08-16");
    expect(ANNUAL_MEMBERSHIP_GRACE_DAYS).toBe(3);
  });

  it("blocks the portal on the fourth day after an annual term ends", () => {
    const result = getMembershipValidity("annual", "2026-08-14", new Date("2027-08-17T00:00:00.000Z"));
    expect(result).toMatchObject({ membershipStatus: "expired", portalAccessStatus: "expired" });
  });

  it("keeps a lifetime membership active without calculating an expiry date", () => {
    expect(getMembershipValidity("lifetime", "2026-08-14", new Date("2050-01-01T00:00:00.000Z"))).toEqual({ membershipTypeLabel: "Lifetime Membership", expiresOn: null, graceEndsOn: null, membershipStatus: "active", portalAccessStatus: "active" });
  });
});
