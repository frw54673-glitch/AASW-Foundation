import { SignJWT, jwtVerify } from "jose";
import { parse } from "cookie";
import type { Request } from "express";
import { expireMemberIfDue, getMemberById } from "../db";
import { ENV } from "../_core/env";

export const MEMBER_SESSION_COOKIE = "aasw_member_session";
const MEMBER_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type AuthenticatedMember = {
  id: number;
  membershipNo: string;
  fullName: string;
  role: "member" | "volunteer" | "project_manager" | "admin" | "super_admin";
  email: string;
};

function secretKey() {
  if (!ENV.cookieSecret) throw new Error("Member session secret is not configured.");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createMemberSession(member: AuthenticatedMember) {
  return new SignJWT({ memberId: member.id, membershipNo: member.membershipNo, role: member.role, name: member.fullName })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + MEMBER_SESSION_TTL_MS) / 1000))
    .sign(secretKey());
}

export async function authenticateMemberRequest(req: Request): Promise<AuthenticatedMember | null> {
  const token = parse(req.headers.cookie ?? "")[MEMBER_SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const memberId = Number(payload.memberId);
    if (!Number.isInteger(memberId) || memberId <= 0) return null;
    const member = await getMemberById(memberId);
    if (!member) return null;
    if (await expireMemberIfDue(member)) return null;
    if (member.accountStatus !== "active" || member.status !== "active") return null;
    return { id: member.id, membershipNo: member.membershipNo, fullName: member.fullName, role: member.role, email: member.email };
  } catch {
    return null;
  }
}
