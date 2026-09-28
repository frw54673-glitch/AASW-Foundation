import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import type { MisRole } from "@shared/mis";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  // Explicit isDev keeps error responses free of stack traces (which contain
  // absolute server paths) whenever the server runs with NODE_ENV=production.
  // The default only checks globalThis.process.env, which is unset when the
  // bundled dist server is started from a shell without NODE_ENV exported.
  isDev: process.env.NODE_ENV !== "production",
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

const requireMember = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.member) throw new TRPCError({ code: "UNAUTHORIZED", message: "Member login is required." });
  return next({ ctx: { ...ctx, member: ctx.member } });
});

export const memberProcedure = t.procedure.use(requireMember);

export function memberRoleProcedure(roles: readonly ["member" | "volunteer" | "project_manager" | "admin" | "super_admin", ...("member" | "volunteer" | "project_manager" | "admin" | "super_admin")[]]) {
  return t.procedure.use(t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.member) throw new TRPCError({ code: "UNAUTHORIZED", message: "Member login is required." });
    if (!roles.includes(ctx.member.role)) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission for this member action." });
    return next({ ctx: { ...ctx, member: ctx.member } });
  }));
}

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export function roleProcedure(roles: readonly MisRole[]) {
  return t.procedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      if (!roles.includes(ctx.user.role as MisRole)) throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
      return next({ ctx: { ...ctx, user: ctx.user } });
    }),
  );
}

export const misManagementProcedure = roleProcedure(["admin", "project_manager", "finance", "monitoring", "management"]);
export const misProjectReadProcedure = roleProcedure(["admin", "project_manager", "field_staff", "finance", "monitoring", "management"]);
export const misProjectWriteProcedure = roleProcedure(["admin", "project_manager"]);
export const misFieldProcedure = roleProcedure(["admin", "project_manager", "field_staff"]);
export const misMonitoringProcedure = roleProcedure(["admin", "project_manager", "monitoring"]);
export const misFinanceProcedure = roleProcedure(["admin", "finance"]);
export const misOperationsProcedure = roleProcedure(["admin", "project_manager", "field_staff", "monitoring"]);
