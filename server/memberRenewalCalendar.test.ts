import { describe, expect, it } from "vitest";
import { createNextRenewalCalendarEvent, nextRenewalEligibilityDate } from "../client/src/lib/memberRenewalCalendar";

describe("member renewal calendar reminder", () => {
  it("opens renewal on the day after the annual validity end date", () => {
    expect(nextRenewalEligibilityDate("2027-08-13").toISOString()).toBe("2027-08-14T00:00:00.000Z");
  });

  it("creates a generic calendar event without leaking member identifiers", () => {
    const event = createNextRenewalCalendarEvent("2027-08-13", "https://example.org/member/dashboard");
    expect(event).toContain("DTSTART;VALUE=DATE:20270814");
    expect(event).toContain("AASW membership renewal is now available");
    expect(event).toContain("https://example.org/member/dashboard");
    expect(event).not.toContain("AASW-2026-H1COR");
  });
});
