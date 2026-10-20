import "dotenv/config";
import compression from "compression";
import express, { type Request, type Response, type NextFunction } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { handleRazorpayWebhook } from "../payments/webhook";
import { handleMembershipExpirySchedule } from "../scheduled/membershipExpiry";
import { handleMembershipReminderSchedule } from "../scheduled/membershipReminder";
import { backendHealth, backendReadiness } from "./health";
import { applyHttpSecurity } from "./httpSecurity";
import { enforceSensitiveMutationRateLimit } from "./rateLimit";
import { createContext } from "./context";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "../../shared/const";
import { getSessionCookieOptions } from "./cookies";
import { buildPublicSitemap, publicSiteOrigin } from "./sitemap";

/** Create the shared API application for the long-running server and Vercel Functions. */
export function createApiApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(compression());
  app.use(applyHttpSecurity);

  // Normalize URL for serverless environments (e.g. Vercel) where rewrites or proxying may adjust paths
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const forwardedUri = req.headers["x-forwarded-uri"] as string | undefined;
    const matchedPath = req.headers["x-matched-path"] as string | undefined;
    const isGenericApiEntry = req.url === "/api" || req.url === "/api/" || req.url.startsWith("/api/index");

    if (isGenericApiEntry) {
      if (forwardedUri && forwardedUri.startsWith("/api")) {
        req.url = forwardedUri;
      } else if (matchedPath && matchedPath.startsWith("/api") && !matchedPath.startsWith("/api/index") && matchedPath !== "/api") {
        req.url = matchedPath;
      }
    } else if (!req.url.startsWith("/api") && !req.url.startsWith("/sitemap.xml")) {
      req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
    }
    next();
  });

  app.get("/api/health", (_req: Request, res: Response) => res.json(backendHealth()));
  app.get("/api/ready", (_req: Request, res: Response) => {
    const readiness = backendReadiness();
    return res.status(readiness.ok ? 200 : 503).json(readiness);
  });
  app.get("/sitemap.xml", (req: Request, res: Response) => {
    res.type("application/xml").send(buildPublicSitemap(publicSiteOrigin({ protocol: req.protocol, host: req.get("host") })));
  });

  // Local-only preview sign-in; never activated in production.
  if (process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_PREVIEW_LOGIN === "true") {
    app.get("/api/dev-preview-login", async (_req, res) => {
      try {
        const token = await sdk.signSession({ openId: "local-dev-admin", appId: "local-dev", name: "Local Dev Admin" }, { expiresInMs: 365 * 24 * 60 * 60 * 1000 });
        res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(_req), maxAge: 365 * 24 * 60 * 60 * 1000 });
        res.redirect(302, "/foundation-admin");
      } catch {
        res.status(500).send("Dev preview login failed");
      }
    });
  }

  // Razorpay signs the original body; keep this before the JSON body parser.
  app.post("/api/razorpay/webhook", express.raw({ type: "application/json", limit: "1mb" }), handleRazorpayWebhook);
  app.use(express.json({ limit: "12mb" }));
  app.use(express.urlencoded({ limit: "12mb", extended: true }));
  app.post("/api/scheduled/membership-expiry", handleMembershipExpirySchedule);
  app.post("/api/scheduled/membership-reminder", handleMembershipReminderSchedule);
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use("/api/trpc", enforceSensitiveMutationRateLimit);
  app.use("/api/trpc", createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ error, path, type }) => {
      console.error(`[tRPC] ${type} ${path ?? "<unknown>"}:`, error);
    },
  }));

  return app;
}
