import { describe, expect, it } from "vitest";
import { membershipExpiryMoment, membershipExpiryTimeRemaining } from "../client/src/lib/membershipTermTiming";

describe("member membership-term exact expiry timing", () => {
  it("keeps an annual membership available through the final millisecond of its displayed expiry date", () => {
    expect(membershipExpiryMoment("2027-08-13").toISOString()).toBe("2027-08-13T23:59:59.999Z");
  });

  it("returns exact whole-day, hour and minute timing without exposing member data", () => {
    expect(membershipExpiryTimeRemaining("2027-08-13", new Date("2027-08-12T11:59:59.999Z"))).toEqual({
      days: 1,
      hours: 12,
      minutes: 0,
      label: "1 day, 12 hours and 0 minutes remaining",
    });
  });
});
