import { z } from "zod";
import { reportingAlert } from "@shared/mis";
import { createMisBudgetAllocation, createMisDocument, createMisFinanceRecord, createMisMonitoringIndicator, createMisReport, createMisRisk, createMisTeamAssignment, listMisReports, listMisRisks, updateMisFinanceApproval } from "../db";
import { misFinanceProcedure, misMonitoringProcedure, misOperationsProcedure, misProjectReadProcedure, misProjectWriteProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";

const projectId = z.number().int().positive();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const amount = z.number().finite().min(0);
const optionalText = (length: number) => z.string().trim().max(length).optional();
const asDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

export const operationsRouter = router({
  team: router({
    create: misProjectWriteProcedure.input(z.object({ projectId, staffOpenId: optionalText(64), staffName: z.string().trim().min(2).max(255), assignmentRole: z.string().trim().min(2).max(180), responsibilities: z.string().trim().min(5).max(5000), contactNumber: optionalText(32), startDate: dateString, endDate: dateString.optional(), assignmentStatus: z.enum(["active", "completed", "inactive"]).default("active") })).mutation(async ({ input, ctx }) => ({ id: await createMisTeamAssignment({ ...input, staffOpenId: input.staffOpenId ?? null, contactNumber: input.contactNumber ?? null, startDate: asDate(input.startDate), endDate: input.endDate ? asDate(input.endDate) : null, createdByOpenId: ctx.user.openId }) })),
  }),
  finance: router({
    addBudget: misFinanceProcedure.input(z.object({ projectId, fiscalYear: z.string().trim().regex(/^\d{4}-\d{2}$/), budgetLine: z.string().trim().min(2).max(255), allocatedAmount: amount, approvedAmount: amount.optional(), funderSource: optionalText(255), notes: optionalText(5000) })).mutation(async ({ input, ctx }) => ({ id: await createMisBudgetAllocation({ ...input, allocatedAmount: String(input.allocatedAmount), approvedAmount: input.approvedAmount === undefined ? null : String(input.approvedAmount), funderSource: input.funderSource ?? null, notes: input.notes ?? null, createdByOpenId: ctx.user.openId }) })),
    addExpense: misFinanceProcedure.input(z.object({ projectId, budgetAllocationId: z.number().int().positive().optional(), expenseDate: dateString, fiscalYear: z.string().trim().regex(/^\d{4}-\d{2}$/), expenseCategory: z.string().trim().min(2).max(255), amount, paymentMode: z.enum(["cash", "bank_transfer", "upi", "cheque", "card", "other"]), vendorName: optionalText(255), invoiceNumber: optionalText(120), description: z.string().trim().min(5).max(5000), supportingDocumentPath: optionalText(1024) })).mutation(async ({ input, ctx }) => ({ id: await createMisFinanceRecord({ ...input, budgetAllocationId: input.budgetAllocationId ?? null, expenseDate: asDate(input.expenseDate), amount: String(input.amount), vendorName: input.vendorName ?? null, invoiceNumber: input.invoiceNumber ?? null, supportingDocumentPath: input.supportingDocumentPath ?? null, createdByOpenId: ctx.user.openId }) })),
    approveExpense: misFinanceProcedure.input(z.object({ id: z.number().int().positive(), approvalStatus: z.enum(["approved", "rejected", "pending"]) })).mutation(async ({ input, ctx }) => { await updateMisFinanceApproval(input.id, input.approvalStatus, ctx.user.openId); return { success: true }; }),
  }),
  documents: router({
    createMetadata: misOperationsProcedure.input(z.object({ projectId, documentType: z.enum(["proposal", "mou", "plan", "budget", "invoice", "attendance", "report", "photo", "other"]), documentName: z.string().trim().min(2).max(255), storageKey: z.string().trim().min(3).max(1024), visibility: z.enum(["internal", "management", "public"]).default("internal"), reviewStatus: z.enum(["draft", "approved", "archived"]).default("draft") })).mutation(async ({ input, ctx }) => ({ id: await createMisDocument({ ...input, uploadedByOpenId: ctx.user.openId }) })),
    upload: misOperationsProcedure.input(z.object({ projectId, documentType: z.enum(["proposal", "mou", "plan", "budget", "invoice", "attendance", "report", "photo", "other"]), documentName: z.string().trim().min(2).max(255), fileName: z.string().trim().min(1).max(255), mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]), dataBase64: z.string().min(4), visibility: z.enum(["internal", "management", "public"]).default("internal") })).mutation(async ({ input, ctx }) => {
      const bytes = Buffer.from(input.dataBase64, "base64");
      if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error("Document must be between 1 byte and 10 MB.");
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const fileKey = `mis-documents/${ctx.user.openId}/${input.projectId}/${Date.now()}-${safeName}`;
      const stored = await storagePut(fileKey, bytes, input.mimeType);
      const id = await createMisDocument({ projectId: input.projectId, documentType: input.documentType, documentName: input.documentName, storageKey: stored.key, visibility: input.visibility, reviewStatus: "draft", uploadedByOpenId: ctx.user.openId });
      return { id, storageKey: stored.key, url: stored.url };
    }),
  }),
  monitoring: router({
    create: misMonitoringProcedure.input(z.object({ projectId, activityId: z.number().int().positive().optional(), indicatorType: z.enum(["input", "output", "outcome"]), indicatorName: z.string().trim().min(2).max(255), baselineValue: amount, targetValue: amount, currentValue: amount, measurementFrequency: z.string().trim().min(2).max(100), dataSource: optionalText(255), ownerOpenId: optionalText(64), lastMeasuredAt: dateString.optional() })).mutation(async ({ input, ctx }) => ({ id: await createMisMonitoringIndicator({ ...input, activityId: input.activityId ?? null, baselineValue: String(input.baselineValue), targetValue: String(input.targetValue), currentValue: String(input.currentValue), dataSource: input.dataSource ?? null, ownerOpenId: input.ownerOpenId ?? null, lastMeasuredAt: input.lastMeasuredAt ? asDate(input.lastMeasuredAt) : null, createdByOpenId: ctx.user.openId }) })),
  }),
  risks: router({
    list: misProjectReadProcedure.input(z.object({ limit: z.number().int().min(1).max(200).default(100) })).query(async ({ input }) => (await listMisRisks(input.limit)).map((risk) => ({ ...risk, score: risk.severity * risk.likelihood }))),
    create: misProjectWriteProcedure.input(z.object({ projectId, riskTitle: z.string().trim().min(2).max(255), riskDescription: z.string().trim().min(5).max(5000), riskCategory: z.string().trim().min(2).max(180), severity: z.number().int().min(1).max(5), likelihood: z.number().int().min(1).max(5), mitigationPlan: z.string().trim().min(5).max(5000), ownerOpenId: optionalText(64), dueDate: dateString.optional(), status: z.enum(["open", "mitigating", "accepted", "closed"]).default("open") })).mutation(async ({ input, ctx }) => ({ id: await createMisRisk({ ...input, ownerOpenId: input.ownerOpenId ?? null, dueDate: input.dueDate ? asDate(input.dueDate) : null, createdByOpenId: ctx.user.openId }) })),
  }),
  reports: router({
    list: misProjectReadProcedure.input(z.object({ limit: z.number().int().min(1).max(200).default(100) })).query(async ({ input }) => (await listMisReports(input.limit)).map((report) => ({ ...report, alert: reportingAlert(report.dueDate, report.status) }))),
    create: misProjectWriteProcedure.input(z.object({ projectId, reportType: z.enum(["monthly", "quarterly", "annual", "donor", "field"]), reportingPeriod: z.string().trim().min(2).max(100), dueDate: dateString, status: z.enum(["draft", "pending", "submitted", "approved", "overdue"]).default("draft"), narrative: optionalText(10000), financeSummary: optionalText(10000), documentPath: optionalText(1024) })).mutation(async ({ input, ctx }) => ({ id: await createMisReport({ ...input, dueDate: asDate(input.dueDate), narrative: input.narrative ?? null, financeSummary: input.financeSummary ?? null, documentPath: input.documentPath ?? null, createdByOpenId: ctx.user.openId }) })),
  }),
});
