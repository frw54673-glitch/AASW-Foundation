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

// Direct-login automation: every new member receives a ready-to-use password
// in the welcome email. The alphabet drops ambiguous characters (0/O, 1/I/l)
// so the password stays easy to read and type from a phone.
const MEMBER_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generateMemberPassword() {
  const bytes = randomBytes(9);
  let password = "Aasw@";
  for (let index = 0; index < bytes.length; index += 1) password += MEMBER_PASSWORD_ALPHABET[bytes[index] % MEMBER_PASSWORD_ALPHABET.length];
  return password;
}
