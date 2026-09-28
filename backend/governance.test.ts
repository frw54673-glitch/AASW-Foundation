import { beforeEach, describe, expect, it, vi } from "vitest";
const { createMisImpactEvidence, getMisDeliverySummary, getMisProject, listMisAuditLogs, upsertMisClosure, writeMisAuditLog } = vi.hoisted(() => ({ createMisImpactEvidence: vi.fn(), getMisDeliverySummary: vi.fn(), getMisProject: vi.fn(), listMisAuditLogs: vi.fn(), upsertMisClosure: vi.fn(), writeMisAuditLog: vi.fn() }));
vi.mock("./db", () => ({ createMisImpactEvidence, getMisDeliverySummary, getMisProject, listMisAuditLogs, upsertMisClosure, writeMisAuditLog }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
function context(role: "admin" | "project_manager" | "field_staff" | "user"): TrpcContext { return { user: { id: 1, openId: "owner-id", role, name: "Owner", email: "owner@example.org", loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {}, res: {} } as TrpcContext; }
describe("MIS governance controls", () => {
  beforeEach(() => { vi.resetAllMocks(); createMisImpactEvidence.mockResolvedValue(7); getMisProject.mockResolvedValue({ project: { projectCode: "PRJ-2026-001", projectName: "Learning Project", projectTheme: "Education", projectLocation: "Lucknow", projectStatus: "active", projectLead: "AASW" }, partners: [], objectives: [], targetGroups: [], activities: [] }); getMisDeliverySummary.mockResolvedValue({ beneficiaries: 10, fieldEvents: 2, targetRecords: 1, outputs: 3, outcomes: 1 }); });
  it("requires consent before public impact evidence is recorded", async () => {
    await expect(appRouter.createCaller(context("field_staff")).governance.impact.create({ projectId: 1, evidenceType: "photo", title: "Workshop photo", description: "A field workshop image captured with the participant group.", consentConfirmed: false, visibility: "public" })).rejects.toBeDefined();
    await expect(appRouter.createCaller(context("field_staff")).governance.impact.create({ projectId: 1, evidenceType: "photo", title: "Workshop photo", description: "A field workshop image captured with the participant group.", consentConfirmed: true, visibility: "public" })).resolves.toEqual({ id: 7 });
  });
  it("blocks project closure until the required finance, report and evidence checks are complete", async () => {
    await expect(appRouter.createCaller(context("project_manager")).governance.closure.save({ projectId: 1, closureDate: "2026-08-14", finalReportApproved: true, financeApproved: false, impactEvidenceAttached: true, lessonsLearned: "Future work should retain flexible activity schedules and early community review.", closureStatus: "closed" })).rejects.toBeDefined();
    await expect(appRouter.createCaller(context("project_manager")).governance.closure.save({ projectId: 1, closureDate: "2026-08-14", finalReportApproved: true, financeApproved: true, impactEvidenceAttached: true, lessonsLearned: "Future work should retain flexible activity schedules and early community review.", closureStatus: "closed" })).resolves.toEqual({ success: true });
  });
  it("returns a CSV export and records its audit event", async () => {
    const result = await appRouter.createCaller(context("project_manager")).governance.exports.projectSummaryCsv({ projectId: 1 });
    expect(result.filename).toBe("PRJ-2026-001-summary.csv");
    expect(result.content).toContain("Beneficiaries");
    expect(writeMisAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "project_summary.exported" }));
  });
});
