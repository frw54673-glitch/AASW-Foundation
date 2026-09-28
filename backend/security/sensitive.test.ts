import { afterEach, describe, expect, it } from "vitest";
import { decryptSensitiveValue, encryptSensitiveValue, hashSensitiveMatchValue } from "./sensitive";

const originalPiiKey = process.env.PII_ENCRYPTION_KEY;
const originalJwtSecret = process.env.JWT_SECRET;

afterEach(() => {
  if (originalPiiKey === undefined) delete process.env.PII_ENCRYPTION_KEY;
  else process.env.PII_ENCRYPTION_KEY = originalPiiKey;
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

describe("sensitive value encryption", () => {
  it("round-trips a PAN through AES-256-GCM without exposing plaintext", () => {
    process.env.PII_ENCRYPTION_KEY = "aasw-pii-key-for-tests";
    const stored = encryptSensitiveValue("ABCDE1234F");
    expect(stored).not.toContain("ABCDE1234F");
    expect(stored.split(".")).toHaveLength(3);
    expect(decryptSensitiveValue(stored)).toBe("ABCDE1234F");
  });

  it("prefers the dedicated PII key over the legacy JWT secret", () => {
    process.env.PII_ENCRYPTION_KEY = "dedicated-pii-secret";
    process.env.JWT_SECRET = "legacy-session-secret";
    const stored = encryptSensitiveValue("ABCDE1234F");
    expect(decryptSensitiveValue(stored)).toBe("ABCDE1234F");

    // A different JWT secret must not change the derived key while PII key is set.
    process.env.JWT_SECRET = "another-legacy-secret";
    expect(decryptSensitiveValue(stored)).toBe("ABCDE1234F");
  });

  it("falls back to JWT_SECRET only when the dedicated key is absent", () => {
    delete process.env.PII_ENCRYPTION_KEY;
    process.env.JWT_SECRET = "legacy-session-secret";
    expect(decryptSensitiveValue(encryptSensitiveValue("ABCDE1234F"))).toBe("ABCDE1234F");
  });

  it("refuses to operate without any configured secret", () => {
    delete process.env.PII_ENCRYPTION_KEY;
    delete process.env.JWT_SECRET;
    expect(() => encryptSensitiveValue("ABCDE1234F")).toThrow(/not configured/i);
  });

  it("derives a stable, normalised HMAC match value for identity comparisons", () => {
    process.env.PII_ENCRYPTION_KEY = "aasw-pii-key-for-tests";
    expect(hashSensitiveMatchValue(" abcde1234f ")).toBe(hashSensitiveMatchValue("ABCDE1234F"));
    expect(hashSensitiveMatchValue("ABCDE1234F")).toMatch(/^[a-f0-9]{64}$/);
  });
});
