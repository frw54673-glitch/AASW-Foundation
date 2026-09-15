import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authenticateMemberRequest, MEMBER_SESSION_COOKIE, type AuthenticatedMember } from "../security/memberSession";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  member: AuthenticatedMember | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let member: AuthenticatedMember | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    // Authentication is optional for public procedures. If a stale platform
    // cookie was sent (e.g. signed before a secret rotation), clear it here so
    // the browser stops replaying it on every request.
    user = null;
    if (opts.req.headers.cookie?.includes(COOKIE_NAME)) {
      try {
        opts.res.clearCookie(COOKIE_NAME, getSessionCookieOptions(opts.req));
      } catch {
        // Clearing is best-effort; the request still proceeds anonymously.
      }
    }
  }

  try {
    member = await authenticateMemberRequest(opts.req);
  } catch {
    member = null;
    if (opts.req.headers.cookie?.includes(MEMBER_SESSION_COOKIE)) {
      try {
        opts.res.clearCookie(MEMBER_SESSION_COOKIE, getSessionCookieOptions(opts.req));
      } catch {
        // Clearing is best-effort; the request still proceeds anonymously.
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    member,
  };
}
