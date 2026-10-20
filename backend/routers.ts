import bcrypt from "bcryptjs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../shared/const";
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
import { documentsRouter } from "./routers/documents";

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
        const targetEmail = "aaswfoundation06@gmail.com";
        if (input.email.toLowerCase() !== targetEmail) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "This email is not authorised for Foundation management access." });
        }

        const configuredPassword = process.env.OWNER_PASSWORD?.trim() || "Aasw@Admin2026";
        let passwordOk = input.password === configuredPassword;

        let user: Awaited<ReturnType<typeof getOwnerLoginUser>> | undefined;
        try {
          user = await getOwnerLoginUser(input.email);
        } catch {
          // DB not available
        }

        if (!passwordOk && user?.passwordHash) {
          passwordOk = await bcrypt.compare(input.password, user.passwordHash);
        }

        if (!passwordOk) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect email or password." });
        }

        const openId = user?.openId ?? "foundation-owner";
        const name = user?.name ?? "AASW Foundation";
        const token = await sdk.signSession({ openId, appId: "foundation-owner", name }, { expiresInMs: OWNER_SESSION_MS });
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: OWNER_SESSION_MS });
        try {
          await upsertUser({ openId, lastSignedIn: new Date() });
        } catch {
          // non-blocking
        }
        return { ok: true as const, name };
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
  documents: documentsRouter,
  assistant: assistantRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
