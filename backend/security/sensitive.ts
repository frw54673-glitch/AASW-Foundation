import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

/**
 * Dedicated PII key. PII_ENCRYPTION_KEY is preferred so sensitive data stays
 * independent of session-signing secrets; JWT_SECRET remains a documented
 * fallback so existing deployments keep decrypting rows written before the
 * dedicated key was introduced. Retire the fallback only after a re-encryption
 * pass documented in docs/deployment.md.
 */
function getEncryptionKey() {
  const secret = process.env.PII_ENCRYPTION_KEY?.trim() || process.env.JWT_SECRET;
  if (!secret) throw new Error("Sensitive application data encryption is not configured. Set PII_ENCRYPTION_KEY (or the legacy JWT_SECRET fallback).");
  return createHash("sha256").update(secret).digest();
}

export function encryptSensitiveValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptSensitiveValue(stored: string) {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = stored.split(".");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Sensitive value is not in a valid encrypted format.");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}

/** Deterministic, keyed comparison value for secure server-side identity matching. */
export function hashSensitiveMatchValue(value: string) {
  return createHmac("sha256", getEncryptionKey()).update(value.trim().toUpperCase(), "utf8").digest("hex");
}
