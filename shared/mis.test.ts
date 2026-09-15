import { describe, expect, it } from "vitest";
import { UN_SDG_GOALS, createBeneficiaryId, createFieldEventId, formatIndianDate, formatIndianRupees, reportingAlert, suggestProjectCode } from "./mis";

describe("MIS shared foundations", () => {
  it("contains every UN SDG goal requested for project linkage", () => {
    expect(UN_SDG_GOALS).toHaveLength(17);
    expect(UN_SDG_GOALS[0]).toBe("SDG 1: No Poverty");
    expect(UN_SDG_GOALS[16]).toBe("SDG 17: Partnerships for the Goals");
  });

  it("formats India-specific currency, date and operations identifiers", () => {
    const date = new Date("2024-06-09T00:00:00.000Z");
    expect(formatIndianRupees(500000)).toBe("₹5,00,000");
    expect(formatIndianDate(date)).toBe("09/06/2024");
    expect(createBeneficiaryId(1, date)).toBe("BEN-2024-0001");
    expect(createFieldEventId(12, date)).toBe("EVT-2024-0012");
    expect(suggestProjectCode(1, date)).toBe("PRJ-2024-001");
  });

  it("maps overdue, due-soon, on-track and pending reporting alerts to requested tones", () => {
    const now = new Date("2024-06-10T00:00:00.000Z");
    expect(reportingAlert("2024-06-09", "Upcoming", now).tone).toBe("red");
    expect(reportingAlert("2024-06-16", "Upcoming", now).tone).toBe("amber");
    expect(reportingAlert("2024-07-01", "Approved", now).tone).toBe("green");
    expect(reportingAlert("2024-06-01", "Draft", now).tone).toBe("blue");
  });
});
