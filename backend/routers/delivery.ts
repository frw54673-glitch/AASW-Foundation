import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createBeneficiaryId, createFieldEventId } from "@shared/mis";
import { createMisBeneficiary, createMisFieldEvent, createMisOutcome, createMisOutput, createMisTargetAchievement, findDuplicateBeneficiary, getMisDeliverySummary, getNextBeneficiarySequence, getNextFieldEventSequence, listMisBeneficiaries } from "../db";
import { misFieldProcedure, misMonitoringProcedure, misProjectReadProcedure, router } from "../_core/trpc";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const activityId = z.number().int().positive().optional();
const projectId = z.number().int().positive();
const numberValue = z.number().finite().min(0);
const phone = z.string().trim().regex(/^[0-9+\-() ]{7,32}$/, "Enter a valid phone number.");
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

export const deliveryRouter = router({
  summary: misProjectReadProcedure.input(z.object({ projectId })).query(({ input }) => getMisDeliverySummary(input.projectId)),
  beneficiaries: router({
    list: misProjectReadProcedure.input(z.object({ projectId: projectId.optional(), limit: z.number().int().min(1).max(500).default(100) })).query(({ input }) => listMisBeneficiaries(input.projectId, input.limit)),
    checkDuplicate: misFieldProcedure.input(z.object({ name: z.string().trim().min(2), phoneNumber: phone, village: z.string().trim().min(2) })).query(({ input }) => findDuplicateBeneficiary(input)),
    create: misFieldProcedure.input(z.object({ name: z.string().trim().min(2).max(255), village: z.string().trim().min(2).max(255), gender: z.string().trim().min(1).max(64), age: z.number().int().min(0).max(130), phoneNumber: phone, beneficiaryCategory: z.string().trim().min(2).max(180), projectId, activityId, registrationDate: dateString, status: z.enum(["active", "inactive", "exited"]).default("active"), beneficiaryCode: z.string().trim().max(80).optional(), duplicateOverrideReason: z.string().trim().min(5).max(1000).optional() })).mutation(async ({ input, ctx }) => {
      const duplicates = await findDuplicateBeneficiary(input);
      if (duplicates.length && !input.duplicateOverrideReason) throw new TRPCError({ code: "CONFLICT", message: "A beneficiary with the same name, phone number and village already exists. Provide an override reason to continue." });
      const beneficiaryId = createBeneficiaryId(await getNextBeneficiarySequence());
      try { const id = await createMisBeneficiary({ ...input, beneficiaryId, activityId: input.activityId ?? null, registrationDate: toDate(input.registrationDate), duplicateFlag: duplicates.length ? 1 : 0, duplicateOverrideReason: input.duplicateOverrideReason ?? null, createdByOpenId: ctx.user.openId }); return { id, beneficiaryId, duplicateFlag: Boolean(duplicates.length) }; }
      catch (error) { if (String(error).includes("Duplicate")) throw new TRPCError({ code: "CONFLICT", message: "Beneficiary ID already exists. Please retry." }); throw error; }
    }),
  }),
  targets: router({
    create: misMonitoringProcedure.input(z.object({ projectId, activityId, indicator: z.string().trim().min(2).max(255), reportingPeriod: z.string().trim().min(2).max(100), periodType: z.enum(["monthly", "quarterly"]), monthlyTarget: numberValue.default(0), quarterlyTarget: numberValue.default(0), actualAchievement: numberValue.default(0), cumulativeAchievement: numberValue.optional() })).mutation(async ({ input, ctx }) => { const target = input.periodType === "monthly" ? input.monthlyTarget : input.quarterlyTarget; const cumulative = input.cumulativeAchievement ?? input.actualAchievement; const percentage = target > 0 ? Number(((input.actualAchievement / target) * 100).toFixed(2)) : 0; return { id: await createMisTargetAchievement({ ...input, activityId: input.activityId ?? null, monthlyTarget: String(input.monthlyTarget), quarterlyTarget: String(input.quarterlyTarget), actualAchievement: String(input.actualAchievement), cumulativeAchievement: String(cumulative), percentageAchieved: percentage.toFixed(2), createdByOpenId: ctx.user.openId }), percentageAchieved: percentage, cumulativeAchievement: cumulative }; }),
  }),
  events: router({
    create: misFieldProcedure.input(z.object({ projectId, activityId, eventDate: dateString, village: z.string().trim().min(2).max(255), locationDetails: z.string().trim().min(5).max(5000), numParticipants: z.number().int().min(0), staffNames: z.array(z.string().trim().min(1).max(255)).default([]), volunteerNames: z.array(z.string().trim().min(1).max(255)).default([]), observations: z.string().trim().max(5000).optional(), attachmentPaths: z.array(z.string().trim().min(1).max(1024)).default([]) })).mutation(async ({ input, ctx }) => { const eventId = createFieldEventId(await getNextFieldEventSequence()); try { const id = await createMisFieldEvent({ ...input, eventId, activityId: input.activityId ?? null, eventDate: toDate(input.eventDate), observations: input.observations ?? null, createdByOpenId: ctx.user.openId }); return { id, eventId }; } catch (error) { if (String(error).includes("Duplicate")) throw new TRPCError({ code: "CONFLICT", message: "Field Event ID already exists. Please retry." }); throw error; } }),
  }),
  outputs: router({
    create: misFieldProcedure.input(z.object({ projectId, activityId, outputType: z.enum(["training", "camp", "kit_distribution", "session", "household", "referral", "other"]), indicator: z.string().trim().min(2).max(255), targetValue: numberValue, actualValue: numberValue, reportingPeriod: z.string().trim().min(2).max(100), notes: z.string().trim().max(5000).optional(), supportingEvidencePath: z.string().trim().max(1024).optional() })).mutation(async ({ input, ctx }) => ({ id: await createMisOutput({ ...input, activityId: input.activityId ?? null, targetValue: String(input.targetValue), actualValue: String(input.actualValue), notes: input.notes ?? null, supportingEvidencePath: input.supportingEvidencePath ?? null, createdByOpenId: ctx.user.openId }) })),
  }),
  outcomes: router({
    create: misMonitoringProcedure.input(z.object({ projectId, activityId, outcomeName: z.string().trim().min(2).max(255), behaviourChange: z.string().trim().max(5000).optional(), knowledgeChange: z.string().trim().max(5000).optional(), skillChange: z.string().trim().max(5000).optional(), followUpStatus: z.string().trim().max(180).optional(), successStories: z.string().trim().max(5000).optional(), outcomeIndicators: z.string().trim().max(5000).optional(), baselineValue: numberValue, currentValue: numberValue, targetValue: numberValue, measurementDate: dateString, evidencePath: z.string().trim().max(1024).optional() })).mutation(async ({ input, ctx }) => ({ id: await createMisOutcome({ ...input, activityId: input.activityId ?? null, behaviourChange: input.behaviourChange ?? null, knowledgeChange: input.knowledgeChange ?? null, skillChange: input.skillChange ?? null, followUpStatus: input.followUpStatus ?? null, successStories: input.successStories ?? null, outcomeIndicators: input.outcomeIndicators ?? null, baselineValue: String(input.baselineValue), currentValue: String(input.currentValue), targetValue: String(input.targetValue), measurementDate: toDate(input.measurementDate), evidencePath: input.evidencePath ?? null, createdByOpenId: ctx.user.openId }) })),
  }),
});
