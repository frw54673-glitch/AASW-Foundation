import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMisDashboardSummary, getMisProjectCommandCenter } = vi.hoisted(() => ({ getMisDashboardSummary: vi.fn(), getMisProjectCommandCenter: vi.fn() }));
vi.mock("./db", () => ({ getMisDashboardSummary, getMisProjectCommandCenter }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "project_manager" | "field_staff" | "user"): TrpcContext {
  return { user: { id: 1, openId: "manager-id", role, name: "Project manager", email: "manager@aasw.org", loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {}, res: {} } as TrpcContext;
}

describe("MIS dashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getMisDashboardSummary.mockResolvedValue({ totalProjects: 2, projectStatusCounts: { active: 1, planned: 1 }, totalBeneficiaries: 48, openRisks: 2, overdueReports: 1, reportsDueSoon: [], recentActivity: [], projects: [] });
    getMisProjectCommandCenter.mockResolvedValue({ project: { projectCode: "PRJ-2026-001", projectName: "Learning project" }, partners: [], objectives: [], targetGroups: [], activities: [], delivery: { beneficiaries: 48, fieldEvents: 3, targetRecords: 2, outputs: 4, outcomes: 1 }, risks: [], reports: [] });
  });

  it("returns aggregate counts for authorized MIS roles", async () => {
    await expect(appRouter.createCaller(context("project_manager")).dashboard.stats()).resolves.toMatchObject({ totalProjects: 2, totalBeneficiaries: 48, overdueReports: 1 });
  });

  it("returns command-center planning, delivery, risk and reporting sections for a selected project", async () => {
    await expect(appRouter.createCaller(context("project_manager")).dashboard.projectCommandCenter({ projectId: 1 })).resolves.toMatchObject({ project: { projectCode: "PRJ-2026-001" }, delivery: { fieldEvents: 3 }, risks: [], reports: [] });
    expect(getMisProjectCommandCenter).toHaveBeenCalledWith(1);
  });
});
