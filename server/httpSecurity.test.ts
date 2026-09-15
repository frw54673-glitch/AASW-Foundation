import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "./_core/httpSecurity";

describe("HTTP security headers", () => {
  it("sets safe baseline headers without requiring HTTPS in local development", () => {
    const headers = buildSecurityHeaders({ isHttps: false, isProduction: false });
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Strict-Transport-Security"]).toBeUndefined();
    expect(headers["Content-Security-Policy"]).toBeUndefined();
  });

  it("adds HSTS and a production CSP only for production HTTPS traffic", () => {
    const headers = buildSecurityHeaders({ isHttps: true, isProduction: true });
    expect(headers["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
  });
});
