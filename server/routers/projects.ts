import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { UN_SDG_GOALS, suggestProjectCode } from "@shared/mis";
import { createMisActivity, createMisFunderPartner, createMisObjective, createMisProject, createMisTargetGroup, getMisProject, getNextProjectSequence, listMisProjects } from "../db";
import { misProjectReadProcedure, misProjectWriteProcedure, router } from "../_core/trpc";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const projectStatus = z.enum(["planned", "active", "on_hold", "completed", "closed", "cancelled"]);
const activityStatus = z.enum(["planned", "ongoing", "completed", "delayed", "cancelled"]);
const projectInput = z.object({ projectName: z.string().trim().min(3).max(255), projectCode: z.string().trim().regex(/^PRJ-\d{4}-\d{3,}$/).max(32).optional(), projectTheme: z.string().trim().min(3).max(255), projectLocation: z.string().trim().min(3).max(255), startDate: dateString, endDate: dateString, projectStatus: projectStatus.default("planned"), projectLead: z.string().trim().min(2).max(255) }).superRefine((value, ctx) => { if (value.endDate <= value.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after start date." }); });

function asDate(value: string) { return new Date(`${value}T00:00:00.000Z`); }

export const projectRouter = router({
  list: misProjectReadProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(100) })).query(({ input }) => listMisProjects(input.limit)),
  suggestCode: misProjectWriteProcedure.query(async () => suggestProjectCode(await getNextProjectSequence())),
  get: misProjectReadProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ input }) => { const record = await getMisProject(input.projectId); if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Project was not found." }); return record; }),
  create: misProjectWriteProcedure.input(projectInput).mutation(async ({ input, ctx }) => {
    const projectCode = input.projectCode ?? suggestProjectCode(await getNextProjectSequence());
    try { const id = await createMisProject({ ...input, projectCode, startDate: asDate(input.startDate), endDate: asDate(input.endDate), createdByOpenId: ctx.user.openId }); return { id, projectCode }; }
    catch (error) { if (String(error).includes("Duplicate")) throw new TRPCError({ code: "CONFLICT", message: "Project code already exists. Please use a different code." }); throw error; }
  }),
  partners: router({
    create: misProjectWriteProcedure.input(z.object({ projectId: z.number().int().positive(), funderName: z.string().trim().min(2).max(255), csrCompanyName: z.string().trim().max(255).optional(), ngoPartnerName: z.string().trim().max(255).optional(), mouDetails: z.string().trim().max(5000).optional(), contactPerson: z.string().trim().max(255).optional(), contactNumber: z.string().trim().regex(/^[0-9+\-() ]{7,32}$/).optional(), email: z.string().email().optional(), partnershipDetails: z.string().trim().max(5000).optional(), reportingRequirements: z.string().trim().max(5000).optional(), mouDocumentPath: z.string().trim().max(1024).optional() })).mutation(async ({ input, ctx }) => ({ id: await createMisFunderPartner({ ...input, createdByOpenId: ctx.user.openId }) })),
  }),
  objectives: router({
    create: misProjectWriteProcedure.input(z.object({ projectId: z.number().int().positive(), problemAddressed: z.string().trim().min(10).max(5000), projectObjectives: z.string().trim().min(10).max(5000), targetOutcomes: z.string().trim().min(10).max(5000), sdgLinkage: z.array(z.enum(UN_SDG_GOALS)).min(1).max(17) })).mutation(async ({ input, ctx }) => ({ id: await createMisObjective({ ...input, createdByOpenId: ctx.user.openId }) })),
  }),
  targetGroups: router({
    create: misProjectWriteProcedure.input(z.object({ projectId: z.number().int().positive(), beneficiaryType: z.string().trim().min(2).max(180), gender: z.string().trim().max(64).optional(), ageGroup: z.string().trim().max(100).optional(), targetPopulation: z.string().trim().max(5000).optional(), targetNumber: z.number().int().positive(), geographyLocation: z.string().trim().min(2).max(255) })).mutation(async ({ input, ctx }) => ({ id: await createMisTargetGroup({ ...input, createdByOpenId: ctx.user.openId }) })),
  }),
  activities: router({
    create: misProjectWriteProcedure.input(z.object({ projectId: z.number().int().positive(), objectiveId: z.number().int().positive().optional(), activityName: z.string().trim().min(3).max(255), activityDescription: z.string().trim().min(10).max(5000), plannedFrequency: z.string().trim().max(120).optional(), responsiblePerson: z.string().trim().min(2).max(255), activityLocation: z.string().trim().min(2).max(255), plannedStartDate: dateString, plannedEndDate: dateString, status: activityStatus.default("planned") }).superRefine((value, ctx) => { if (value.plannedEndDate < value.plannedStartDate) ctx.addIssue({ code: "custom", path: ["plannedEndDate"], message: "Activity end date cannot be before its start date." }); })).mutation(async ({ input, ctx }) => ({ id: await createMisActivity({ ...input, objectiveId: input.objectiveId ?? null, plannedStartDate: asDate(input.plannedStartDate), plannedEndDate: asDate(input.plannedEndDate), createdByOpenId: ctx.user.openId }) })),
  }),
});
