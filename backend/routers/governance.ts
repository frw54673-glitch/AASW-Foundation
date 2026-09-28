import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createMisImpactEvidence, getMisDeliverySummary, getMisProject, listMisAuditLogs, upsertMisClosure, writeMisAuditLog } from "../db";
import { adminProcedure, misOperationsProcedure, misProjectReadProcedure, misProjectWriteProcedure, router } from "../_core/trpc";

const projectId = z.number().int().positive();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const asDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const csvEscape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export const governanceRouter = router({
  impact: router({
    create: misOperationsProcedure.input(z.object({ projectId, evidenceType: z.enum(["photo", "field_story", "case_study", "survey", "report", "other"]), title: z.string().trim().min(2).max(255), description: z.string().trim().min(10).max(5000), storageKey: z.string().trim().max(1024).optional(), consentConfirmed: z.boolean(), visibility: z.enum(["internal", "management", "public"]).default("internal") })).mutation(async ({ input, ctx }) => {
      if (input.visibility === "public" && !input.consentConfirmed) throw new TRPCError({ code: "BAD_REQUEST", message: "Public impact evidence requires confirmed consent." });
      const id = await createMisImpactEvidence({ ...input, storageKey: input.storageKey ?? null, consentConfirmed: input.consentConfirmed ? 1 : 0, createdByOpenId: ctx.user.openId });
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "impact_evidence.created", entityType: "impact_evidence", entityId: String(id), projectId: input.projectId, details: { evidenceType: input.evidenceType, visibility: input.visibility } });
      return { id };
    }),
  }),
  closure: router({
    save: misProjectWriteProcedure.input(z.object({ projectId, closureDate: dateString, finalReportApproved: z.boolean(), financeApproved: z.boolean(), impactEvidenceAttached: z.boolean(), lessonsLearned: z.string().trim().min(10).max(10000), closureStatus: z.enum(["draft", "ready_for_review", "closed"]) })).mutation(async ({ input, ctx }) => {
      if (input.closureStatus === "closed" && (!input.finalReportApproved || !input.financeApproved || !input.impactEvidenceAttached)) throw new TRPCError({ code: "BAD_REQUEST", message: "A project can close only after final report, finance and impact evidence checks are complete." });
      await upsertMisClosure({ ...input, closureDate: asDate(input.closureDate), finalReportApproved: input.finalReportApproved ? 1 : 0, financeApproved: input.financeApproved ? 1 : 0, impactEvidenceAttached: input.impactEvidenceAttached ? 1 : 0, approvedByOpenId: input.closureStatus === "closed" ? ctx.user.openId : null, createdByOpenId: ctx.user.openId });
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: `project_closure.${input.closureStatus}`, entityType: "project", entityId: String(input.projectId), projectId: input.projectId, details: { finalReportApproved: input.finalReportApproved, financeApproved: input.financeApproved, impactEvidenceAttached: input.impactEvidenceAttached } });
      return { success: true };
    }),
  }),
  audit: router({
    list: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(500).default(100) })).query(({ input }) => listMisAuditLogs(input.limit)),
  }),
  exports: router({
    projectSummaryCsv: misProjectReadProcedure.input(z.object({ projectId })).mutation(async ({ input, ctx }) => {
      const record = await getMisProject(input.projectId); if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Project was not found." });
      const delivery = await getMisDeliverySummary(input.projectId);
      const rows = [["Project code", record.project.projectCode], ["Project name", record.project.projectName], ["Theme", record.project.projectTheme], ["Location", record.project.projectLocation], ["Status", record.project.projectStatus], ["Project lead", record.project.projectLead], ["Partners", record.partners.length], ["Objectives", record.objectives.length], ["Target groups", record.targetGroups.length], ["Activities", record.activities.length], ["Beneficiaries", delivery.beneficiaries], ["Field events", delivery.fieldEvents], ["Target records", delivery.targetRecords], ["Outputs", delivery.outputs], ["Outcomes", delivery.outcomes]];
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "project_summary.exported", entityType: "project", entityId: String(input.projectId), projectId: input.projectId, details: { format: "csv" } });
      return { filename: `${record.project.projectCode}-summary.csv`, content: ["Metric,Value", ...rows.map(([key, value]) => `${csvEscape(key)},${csvEscape(value)}`)].join("\n") };
    }),
  }),
});
