import { describe, expect, it } from "vitest";
import { memberRouter } from "./routers/member";
import { MEMBER_SESSION_COOKIE } from "./security/memberSession";
import type { TrpcContext } from "./_core/context";

type CookieCall = { name: string; options: Record<string, unknown> };

function createMemberLogoutContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user: null,
    member: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: (name: string, options: Record<string, unknown>) => clearedCookies.push({ name, options }) } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("member.logout", () => {
  it("clears the isolated member cookie with matching secure options and no deprecated maxAge", async () => {
    const { ctx, clearedCookies } = createMemberLogoutContext();
    const result = await memberRouter.createCaller(ctx).logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toEqual([{ name: MEMBER_SESSION_COOKIE, options: { httpOnly: true, path: "/", sameSite: "none", secure: true } }]);
  });
});
