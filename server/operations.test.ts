import { beforeEach, describe, expect, it, vi } from "vitest";
const { createMisBudgetAllocation, createMisDocument, createMisFinanceRecord, createMisMonitoringIndicator, createMisReport, createMisRisk, createMisTeamAssignment, listMisReports, listMisRisks, updateMisFinanceApproval } = vi.hoisted(() => ({ createMisBudgetAllocation: vi.fn(), createMisDocument: vi.fn(), createMisFinanceRecord: vi.fn(), createMisMonitoringIndicator: vi.fn(), createMisReport: vi.fn(), createMisRisk: vi.fn(), createMisTeamAssignment: vi.fn(), listMisReports: vi.fn(), listMisRisks: vi.fn(), updateMisFinanceApproval: vi.fn() }));
vi.mock("./db", () => ({ createMisBudgetAllocation, createMisDocument, createMisFinanceRecord, createMisMonitoringIndicator, createMisReport, createMisRisk, createMisTeamAssignment, listMisReports, listMisRisks, updateMisFinanceApproval }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
function context(role: "admin" | "project_manager" | "field_staff" | "finance" | "monitoring" | "management" | "user"): TrpcContext { return { user: { id: 1, openId: `${role}-id`, role, name: "MIS user", email: "mis@example.org", loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {}, res: {} } as TrpcContext; }
describe("MIS Phase 3–4 operational router", () => {
  beforeEach(() => { vi.resetAllMocks(); createMisBudgetAllocation.mockResolvedValue(1); createMisFinanceRecord.mockResolvedValue(2); createMisMonitoringIndicator.mockResolvedValue(3); createMisRisk.mockResolvedValue(4); createMisReport.mockResolvedValue(5); listMisReports.mockResolvedValue([{ id: 1, dueDate: new Date("2026-04-01"), status: "overdue" }]); });
  it("permits finance-only budget entry with Indian-rupee numeric values and prevents field staff from finance writes", async () => {
    await expect(appRouter.createCaller(context("finance")).operations.finance.addBudget({ projectId: 1, fiscalYear: "2026-27", budgetLine: "Training delivery", allocatedAmount: 500000, approvedAmount: 450000 })).resolves.toEqual({ id: 1 });
    expect(createMisBudgetAllocation).toHaveBeenCalledWith(expect.objectContaining({ allocatedAmount: "500000", approvedAmount: "450000", createdByOpenId: "finance-id" }));
    await expect(appRouter.createCaller(context("field_staff")).operations.finance.addBudget({ projectId: 1, fiscalYear: "2026-27", budgetLine: "Training delivery", allocatedAmount: 500000 })).rejects.toBeDefined();
  });
  it("allows monitoring staff to manage indicators while calculated report alerts use the requested colors", async () => {
    await expect(appRouter.createCaller(context("monitoring")).operations.monitoring.create({ projectId: 1, indicatorType: "outcome", indicatorName: "Participants retaining skills", baselineValue: 0, targetValue: 100, currentValue: 55, measurementFrequency: "Quarterly" })).resolves.toEqual({ id: 3 });
    const result = await appRouter.createCaller(context("management")).operations.reports.list({ limit: 10 });
    expect(result[0].alert.tone).toBe("red");
    expect(result[0].alert.className).toContain("bg-red-100");
  });
  it("requires project manager or admin access for risks and reports", async () => {
    await expect(appRouter.createCaller(context("project_manager")).operations.risks.create({ projectId: 1, riskTitle: "Weather disruption", riskDescription: "Seasonal rainfall could postpone field activities.", riskCategory: "Operational", severity: 3, likelihood: 4, mitigationPlan: "Keep alternate dates and communicate with communities." })).resolves.toEqual({ id: 4 });
    await expect(appRouter.createCaller(context("user")).operations.reports.create({ projectId: 1, reportType: "monthly", reportingPeriod: "April 2026", dueDate: "2026-05-10" })).rejects.toBeDefined();
  });
});
