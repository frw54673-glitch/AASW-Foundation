import { z } from "zod";
import { getMisDashboardSummary, getMisProjectCommandCenter } from "../db";
import { misProjectReadProcedure, router } from "../_core/trpc";

export const dashboardRouter = router({
  stats: misProjectReadProcedure.query(() => getMisDashboardSummary()),
  projectCommandCenter: misProjectReadProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ input }) => {
    const commandCenter = await getMisProjectCommandCenter(input.projectId);
    if (!commandCenter) throw new Error("Project was not found.");
    return commandCenter;
  }),
});
