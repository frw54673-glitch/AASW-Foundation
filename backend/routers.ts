import bcrypt from "bcryptjs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getOwnerLoginUser, upsertUser } from "./db";
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

const OWNER_SESSION_MS = 12 * 60 * 60 * 1000;

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
    // Foundation owner sign-in: only the single seeded account that carries a
    // password hash (aaswfoundation06@gmail.com) can authenticate, and it is
    // granted the admin role that every MIS and Foundation Admin procedure
    // already requires. Session reuse keeps the existing adminProcedure,
    // roleProcedure and DashboardLayout flows untouched.
    ownerLogin: publicProcedure
      .input(z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(200) }))
      .mutation(async ({ input, ctx }) => {
        const user = await getOwnerLoginUser(input.email);
        const passwordHash = user?.passwordHash;
        if (!user || !passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "This email is not authorised for Foundation management access." });
        const passwordOk = await bcrypt.compare(input.password, passwordHash);
        if (!passwordOk) throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect email or password." });
        const token = await sdk.signSession({ openId: user.openId, appId: "foundation-owner", name: user.name ?? "AASW Foundation" }, { expiresInMs: OWNER_SESSION_MS });
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: OWNER_SESSION_MS });
        await upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        return { ok: true as const, name: user.name ?? "AASW Foundation" };
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
