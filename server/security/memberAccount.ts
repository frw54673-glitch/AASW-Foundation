import { createHash, randomBytes } from "node:crypto";

export const MEMBER_SETUP_TOKEN_TTL_MS = 72 * 60 * 60 * 1000;

export function createMemberSetupToken(now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash, expiresAt: new Date(now.getTime() + MEMBER_SETUP_TOKEN_TTL_MS) };
}

export function hashMemberSetupToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
