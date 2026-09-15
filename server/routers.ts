import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { membershipRouter } from "./routers/membership";
import { inquiryRouter, newsletterRouter } from "./routers/inquiries";
import { donationRouter } from "./routers/donations";
import { volunteerRouter } from "./routers/volunteer";
import { managementRouter, publicMediaRouter } from "./routers/management";
import { assistantRouter } from "./routers/assistant";
import { paymentRouter } from "./routers/payments";
import { projectRouter } from "./routers/projects";
import { deliveryRouter } from "./routers/delivery";
import { operationsRouter } from "./routers/operations";
import { governanceRouter } from "./routers/governance";
import { dashboardRouter } from "./routers/dashboard";
import { memberRouter } from "./routers/member";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return {
        success: true,
      } as const;
    }),
  }),
  payment: paymentRouter,
  membership: membershipRouter,
  inquiry: inquiryRouter,
  newsletter: newsletterRouter,
  donation: donationRouter,
  volunteer: volunteerRouter,
  management: managementRouter,
  media: publicMediaRouter,
  projects: projectRouter,
  delivery: deliveryRouter,
  operations: operationsRouter,
  governance: governanceRouter,
  dashboard: dashboardRouter,
  member: memberRouter,
  assistant: assistantRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
