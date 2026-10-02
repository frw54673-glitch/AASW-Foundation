import type { NextFunction, Request, Response } from "express";

type RateLimitRule = { id: string; maxAttempts: number; windowMs: number };
type RateLimitEntry = { count: number; resetAt: number };

const rules: Record<string, RateLimitRule> = {
  "member.login": { id: "member.login", maxAttempts: 8, windowMs: 15 * 60 * 1000 },
  "auth.ownerLogin": { id: "auth.ownerLogin", maxAttempts: 8, windowMs: 15 * 60 * 1000 },
  "member.requestPasswordReset": { id: "member.requestPasswordReset", maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  "member.setupPassword": { id: "member.setupPassword", maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  "member.resetPassword": { id: "member.resetPassword", maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  "membership.submit": { id: "membership.submit", maxAttempts: 8, windowMs: 60 * 60 * 1000 },
  "volunteer.submit": { id: "volunteer.submit", maxAttempts: 8, windowMs: 60 * 60 * 1000 },
  "contact.submit": { id: "contact.submit", maxAttempts: 8, windowMs: 60 * 60 * 1000 },
  "newsletter.subscribe": { id: "newsletter.subscribe", maxAttempts: 8, windowMs: 60 * 60 * 1000 },
  "donation.submitDetails": { id: "donation.submitDetails", maxAttempts: 8, windowMs: 60 * 60 * 1000 },
  "payment.createOrder": { id: "payment.createOrder", maxAttempts: 12, windowMs: 15 * 60 * 1000 },
  "payment.verifyCheckout": { id: "payment.verifyCheckout", maxAttempts: 12, windowMs: 15 * 60 * 1000 },
  "member.joinService": { id: "member.joinService", maxAttempts: 8, windowMs: 60 * 60 * 1000 },
  "member.sendSupportMessage": { id: "member.sendSupportMessage", maxAttempts: 10, windowMs: 60 * 60 * 1000 },
  "member.uploadCompletionProof": { id: "member.uploadCompletionProof", maxAttempts: 24, windowMs: 60 * 60 * 1000 },
  "member.submitCompletion": { id: "member.submitCompletion", maxAttempts: 6, windowMs: 60 * 60 * 1000 },
  "assistant.chat": { id: "assistant.chat", maxAttempts: 20, windowMs: 15 * 60 * 1000 },
};

// In-memory store remains the single-instance default; REDIS_URL switches the
// middleware to a shared store so limits hold across restarts and replicas.
const attempts = new Map<string, RateLimitEntry>();

export type RateLimitStore = {
  consume(key: string, rule: RateLimitRule, now?: number): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
};

export function createMemoryRateLimitStore(store = new Map<string, RateLimitEntry>()): RateLimitStore {
  return {
    async consume(key, rule, now = Date.now()) {
      return consumeRateLimit(store, key, rule, now);
    },
  };
}

/**
 * Redis-backed store. Uses a single INCR with expiry per key, so counters are
 * shared across instances. The redis client is loaded through a runtime-only
 * import on purpose: deployments without REDIS_URL keep a dependency-free
 * install, and a missing redis package surfaces as a clear fail-closed error
 * rather than a bundler or type-check failure.
 */
type MinimalRedisClient = { incr: (key: string) => Promise<number>; expire: (key: string, seconds: number) => Promise<unknown> };

const runtimeImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<Record<string, unknown>>;

export function createRedisRateLimitStore(url: string): RateLimitStore {
  let clientPromise: Promise<MinimalRedisClient> | null = null;

  async function getClient(): Promise<MinimalRedisClient> {
    // A rejected connect promise must not be cached forever, or one Redis
    // outage at startup would pin the limiter closed for the process lifetime.
    clientPromise ??= (async () => {
      let redisModule: Record<string, unknown>;
      try {
        redisModule = await runtimeImport("redis");
      } catch {
        throw new Error("REDIS_URL is set but the redis package is not installed. Run `pnpm add redis` or unset REDIS_URL to use the in-memory limiter.");
      }
      const createClient = redisModule.createClient as (config: { url: string }) => MinimalRedisClient & { connect: () => Promise<unknown>; on: (event: string, listener: (error: Error) => void) => unknown };
      const client = createClient({ url });
      client.on("error", (error: Error) => console.error("[RateLimit] Redis store error", { error: error.message }));
      await client.connect();
      return client;
    })().catch(error => {
      clientPromise = null;
      throw error;
    });
    return clientPromise;
  }

  return {
    async consume(key, rule, now = Date.now()) {
      try {
        const client = await getClient();
        const redisKey = `ratelimit:${key}`;
        const windowSeconds = Math.ceil(rule.windowMs / 1000);
        const count = await client.incr(redisKey);
        if (count === 1) await client.expire(redisKey, windowSeconds);
        if (count > rule.maxAttempts) {
          const retryAfterSeconds = Math.max(1, Math.ceil((now + rule.windowMs - Date.now()) / 1000));
          return { allowed: false, retryAfterSeconds };
        }
        return { allowed: true, retryAfterSeconds: 0 };
      } catch (error) {
        console.error("[RateLimit] Redis consume failed; failing closed", { error: error instanceof Error ? error.message : "unknown" });
        return { allowed: false, retryAfterSeconds: 30 };
      }
    },
  };
}

let activeStore: RateLimitStore | null = null;

/** Test seam: swap the store without touching process.env. */
export function setRateLimitStore(store: RateLimitStore | null) {
  activeStore = store;
}

function resolveStore(): RateLimitStore {
  if (activeStore) return activeStore;
  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl) {
    const store = createRedisRateLimitStore(redisUrl);
    activeStore = store;
    return store;
  }
  const memoryStore = createMemoryRateLimitStore(attempts);
  activeStore = memoryStore;
  return memoryStore;
}

export function sensitiveTrpcRule(method: string, originalUrl: string): RateLimitRule | null {
  if (method !== "POST") return null;
  const path = originalUrl.split("?", 1)[0];
  for (const rule of Object.values(rules)) {
    if (path.endsWith(`/${rule.id}`) || path.includes(`/${rule.id},`)) return rule;
  }
  return null;
}

export function trustedClientIp(req: Pick<Request, "ip">) {
  // Express already resolves `req.ip` correctly for the configured
  // `trust proxy` setting (app.set("trust proxy", 1)): behind a proxy it is
  // the client IP as seen by that trusted hop, and on direct connections it
  // is the socket address. Reading the first `x-forwarded-for` value instead
  // would let any caller spoof a fresh IP per request and bypass the limiter,
  // because proxies append rather than replace that header.
  return req.ip || "unknown";
}

export function consumeRateLimit(store: Map<string, RateLimitEntry>, key: string, rule: RateLimitRule, now = Date.now()) {
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + rule.windowMs };
    store.set(key, next);
    return { allowed: true, retryAfterSeconds: 0 } as const;
  }
  if (current.count >= rule.maxAttempts) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) } as const;
  }
  current.count += 1;
  store.set(key, current);
  return { allowed: true, retryAfterSeconds: 0 } as const;
}

export async function enforceSensitiveMutationRateLimit(req: Request, res: Response, next: NextFunction) {
  const rule = sensitiveTrpcRule(req.method, req.originalUrl);
  if (!rule) return next();

  try {
    const decision = await resolveStore().consume(`${rule.id}:${trustedClientIp(req)}`, rule);
    if (decision.allowed) return next();
    res.setHeader("Retry-After", String(decision.retryAfterSeconds));
    return res.status(429).json({ error: "Too many attempts. Please wait before trying again." });
  } catch (error) {
    console.error("[RateLimit] Store consume raised unexpectedly", { error: error instanceof Error ? error.message : "unknown" });
    // A limiter crash must not take down the request path; allow through with a log.
    return next();
  }
}
