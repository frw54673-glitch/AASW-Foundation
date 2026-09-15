import { describe, expect, it } from "vitest";
import { notificationToneDetails } from "./notifications";

describe("AASW custom notification system", () => {
  it("exposes the four semantic notification tones with the requested alert colors", () => {
    expect(notificationToneDetails.success.accent).toBe("#2f6b52");
    expect(notificationToneDetails.error.surface).toBe("#fff0ee");
    expect(notificationToneDetails.warning.surface).toBe("#fff6dc");
    expect(notificationToneDetails.info.accent).toBe("#225ea8");
  });
});
