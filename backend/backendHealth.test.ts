import { describe, expect, it } from "vitest";
import { backendHealth, backendReadiness } from "./_core/health";

describe("backend deployment diagnostics", () => {
  it("exposes a privacy-safe liveness response", () => {
    const result = backendHealth();
    expect(result).toMatchObject({ ok: true, service: "aasw-foundation" });
    expect(() => new Date(result.timestamp)).not.toThrow();
  });

  it("reports readiness as boolean dependency checks without leaking secret values", () => {
    const result = backendReadiness();
    expect(result.service).toBe("aasw-foundation");
    expect(typeof result.ok).toBe("boolean");
    expect(result.checks).toEqual({
      database: expect.any(Boolean),
      sessionSigning: expect.any(Boolean),
      adminOAuth: expect.any(Boolean),
      managedStorage: expect.any(Boolean),
    });
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("JWT_SECRET");
  });
});
