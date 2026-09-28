import { describe, expect, it } from "vitest";
import { consumeRateLimit, sensitiveTrpcRule, trustedClientIp } from "./_core/rateLimit";

describe("sensitive tRPC mutation rate limiter", () => {
  it("recognises only the intended public mutations", () => {
    expect(sensitiveTrpcRule("POST", "/api/trpc/member.login?batch=1")?.id).toBe("member.login");
    expect(sensitiveTrpcRule("POST", "/api/trpc/membership.submit?batch=1")?.id).toBe("membership.submit");
    expect(sensitiveTrpcRule("GET", "/api/trpc/member.login?batch=1")).toBeNull();
    expect(sensitiveTrpcRule("POST", "/api/trpc/member.dashboard?batch=1")).toBeNull();
  });

  it("allows attempts within a window and returns a safe retry delay after the cap", () => {
    const store = new Map();
    const rule = { id: "test", maxAttempts: 2, windowMs: 1_000 };
    expect(consumeRateLimit(store, "test:ip", rule, 10)).toMatchObject({ allowed: true });
    expect(consumeRateLimit(store, "test:ip", rule, 20)).toMatchObject({ allowed: true });
    expect(consumeRateLimit(store, "test:ip", rule, 30)).toMatchObject({ allowed: false, retryAfterSeconds: 1 });
    expect(consumeRateLimit(store, "test:ip", rule, 1_020)).toMatchObject({ allowed: true });
  });

  it("uses the express-resolved IP and ignores a spoofable x-forwarded-for header", () => {
    // Express computes req.ip with the configured trust-proxy setting; the
    // limiter must use that instead of a client-supplied forwarded header,
    // otherwise every request could claim a fresh IP and bypass the limit.
    expect(trustedClientIp({ ip: "203.0.113.9" } as never)).toBe("203.0.113.9");
    expect(trustedClientIp({ ip: "" } as never)).toBe("unknown");
  });
});

import { beforeEach, describe as describeSuite, expect as expectIt, it as itCase } from "vitest";
import { createMemoryRateLimitStore, createRedisRateLimitStore, setRateLimitStore } from "./_core/rateLimit";

describe("rate limit store adapters", () => {
  itCase("exposes the same fixed-window semantics through the store interface", async () => {
    const store = createMemoryRateLimitStore();
    const rule = { id: "test", maxAttempts: 2, windowMs: 1_000 };
    await expectIt(store.consume("k", rule, 10)).resolves.toMatchObject({ allowed: true });
    await expectIt(store.consume("k", rule, 20)).resolves.toMatchObject({ allowed: true });
    await expectIt(store.consume("k", rule, 30)).resolves.toMatchObject({ allowed: false, retryAfterSeconds: 1 });
    await expectIt(store.consume("k", rule, 1_030)).resolves.toMatchObject({ allowed: true });
  });

  itCase("fails closed with a bounded retry window when the redis package is unavailable", async () => {
    // In this dependency-free environment the runtime import of "redis" cannot
    // resolve, which is exactly the misconfiguration the store must survive.
    const store = createRedisRateLimitStore("redis://localhost:6379");
    const rule = { id: "test", maxAttempts: 100, windowMs: 1_000 };
    await expectIt(store.consume("k", rule)).resolves.toMatchObject({ allowed: false, retryAfterSeconds: 30 });
  });
});

describeSuite("volunteer and checkout rules are guarded", () => {
  itCase("rate-limits the new volunteer submission and checkout verification mutations", () => {
    expectIt(sensitiveTrpcRule("POST", "/api/trpc/volunteer.submit?batch=1")?.id).toBe("volunteer.submit");
    expectIt(sensitiveTrpcRule("POST", "/api/trpc/payment.verifyCheckout?batch=1")?.id).toBe("payment.verifyCheckout");
    expectIt(sensitiveTrpcRule("POST", "/api/trpc/payment.createOrder?batch=1")?.id).toBe("payment.createOrder");
  });
});

beforeEach(() => {
  setRateLimitStore(null);
});
