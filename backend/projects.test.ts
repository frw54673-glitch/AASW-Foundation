import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMisActivity, createMisFunderPartner, createMisObjective, createMisProject, createMisTargetGroup, getMisProject, getNextProjectSequence, listMisProjects } = vi.hoisted(() => ({ createMisActivity: vi.fn(), createMisFunderPartner: vi.fn(), createMisObjective: vi.fn(), createMisProject: vi.fn(), createMisTargetGroup: vi.fn(), getMisProject: vi.fn(), getNextProjectSequence: vi.fn(), listMisProjects: vi.fn() }));
vi.mock("./db", () => ({ createMisActivity, createMisFunderPartner, createMisObjective, createMisProject, createMisTargetGroup, getMisProject, getNextProjectSequence, listMisProjects }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "user" | "admin" | "project_manager" | "field_staff" | null): TrpcContext {
  return { user: role ? { id: 1, openId: `${role}-id`, role, name: "MIS user", email: "mis@example.org", loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } : null, req: {}, res: {} } as TrpcContext;
}

describe("MIS Phase 1 project router", () => {
  beforeEach(() => { vi.resetAllMocks(); getNextProjectSequence.mockResolvedValue(7); createMisProject.mockResolvedValue(42); listMisProjects.mockResolvedValue([]); });
  it("generates a Project Code server-side and persists the owner identity", async () => {
    const caller = appRouter.createCaller(context("project_manager"));
    await expect(caller.projects.suggestCode()).resolves.toBe("PRJ-2026-007");
    await expect(caller.projects.create({ projectName: "Capability programme", projectTheme: "Digital skills", projectLocation: "Lucknow", startDate: "2026-04-01", endDate: "2027-03-31", projectStatus: "planned", projectLead: "Foundation Lead" })).resolves.toEqual({ id: 42, projectCode: "PRJ-2026-007" });
    expect(createMisProject).toHaveBeenCalledWith(expect.objectContaining({ projectCode: "PRJ-2026-007", createdByOpenId: "project_manager-id", startDate: expect.any(Date), endDate: expect.any(Date) }));
  });
  it("rejects invalid date ranges and SDG values before persistence", async () => {
    const caller = appRouter.createCaller(context("project_manager"));
    await expect(caller.projects.create({ projectName: "Capability programme", projectTheme: "Digital skills", projectLocation: "Lucknow", startDate: "2026-04-01", endDate: "2026-04-01", projectStatus: "planned", projectLead: "Foundation Lead" })).rejects.toBeDefined();
    await expect(caller.projects.objectives.create({ projectId: 1, problemAddressed: "A community capability gap needs focused support.", projectObjectives: "Strengthen digital skills for local women and youth.", targetOutcomes: "Participants can use relevant digital tools safely.", sdgLinkage: ["Not an SDG"] as never })).rejects.toBeDefined();
    expect(createMisProject).not.toHaveBeenCalled();
    expect(createMisObjective).not.toHaveBeenCalled();
  });
  it("allows project staff read access but prevents write access outside the requested roles", async () => {
    const reader = appRouter.createCaller(context("field_staff"));
    await expect(reader.projects.list({ limit: 25 })).resolves.toEqual([]);
    await expect(reader.projects.create({ projectName: "Blocked project", projectTheme: "Skills", projectLocation: "Delhi", startDate: "2026-04-01", endDate: "2027-03-31", projectStatus: "planned", projectLead: "Foundation Lead" })).rejects.toBeDefined();
    await expect(appRouter.createCaller(context("user")).projects.list({ limit: 25 })).rejects.toBeDefined();
  });
});
