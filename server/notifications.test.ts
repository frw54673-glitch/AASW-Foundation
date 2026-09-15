import { describe, expect, it } from "vitest";
import { notificationToneDetails } from "../client/src/lib/notifications";

describe("AASW custom notification configuration", () => {
  it("provides distinct semantic notification colors for success, error, warning and information", () => {
    expect(notificationToneDetails.success.accent).toBe("#2f6b52");
    expect(notificationToneDetails.error.surface).toBe("#fff0ee");
    expect(notificationToneDetails.warning.surface).toBe("#fff6dc");
    expect(notificationToneDetails.info.accent).toBe("#225ea8");
  });
});
