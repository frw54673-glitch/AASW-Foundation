import { describe, expect, it } from "vitest";
import { createDonationNotification } from "./donationNotification";

describe("donation notification", () => {
  it("creates a branded alert without sensitive PAN, address or date-of-birth fields", () => {
    const notification = createDonationNotification({ donationRef: "AASW-DON-TEST123456", fullName: "Aarti Sharma", email: "aarti@example.com", phone: "+91 99887 76655", amount: 4000, state: "Uttar Pradesh", city: "Lucknow" });
    expect(notification.subject).toContain("AASW-DON-TEST123456");
    expect(notification.html).toContain("AASW Foundation");
    expect(notification.text).toContain("PAN, date of birth and address are not included");
  });
});
