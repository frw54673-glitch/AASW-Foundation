import { describe, expect, it } from "vitest";
import { filterDashboardProjects } from "@shared/dashboard";
import { reportingAlert, riskAlert } from "@shared/mis";

describe("MIS dashboard presentation rules", () => {
  it("uses the specified red, amber, green and blue status colours", () => {
    const now = new Date("2026-08-14T00:00:00.000Z");
    expect(reportingAlert("2026-08-13", "submitted", now).tone).toBe("green");
    expect(reportingAlert("2026-08-20", "overdue", now).tone).toBe("red");
    expect(reportingAlert("2026-08-20", "approved", now).tone).toBe("green");
    expect(reportingAlert("2026-08-20", "draft", now).tone).toBe("blue");
    expect(reportingAlert("2026-08-20", "", now).tone).toBe("amber");
    expect(riskAlert("2026-08-13", "open", now).tone).toBe("red");
    expect(riskAlert(undefined, "open", now).tone).toBe("blue");
  });
  it("filters portfolio projects by an exact selected project status without mutating the full list", () => {
    const projects = [{ projectCode: "PRJ-2026-001", projectStatus: "active" as const }, { projectCode: "PRJ-2026-002", projectStatus: "planned" as const }, { projectCode: "PRJ-2026-003", projectStatus: "active" as const }];
    expect(filterDashboardProjects(projects, "active").map((project) => project.projectCode)).toEqual(["PRJ-2026-001", "PRJ-2026-003"]);
    expect(filterDashboardProjects(projects, "planned").map((project) => project.projectCode)).toEqual(["PRJ-2026-002"]);
    expect(filterDashboardProjects(projects, "all")).toHaveLength(3);
    expect(projects).toHaveLength(3);
  });
});
