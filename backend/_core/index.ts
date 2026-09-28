import "dotenv/config";
import express from "express";
import compression from "compression";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleRazorpayWebhook } from "../payments/webhook";
import { handleMembershipExpirySchedule } from "../scheduled/membershipExpiry";
import { handleMembershipReminderSchedule } from "../scheduled/membershipReminder";
import { backendHealth, backendReadiness } from "./health";
import { applyHttpSecurity } from "./httpSecurity";
import { enforceSensitiveMutationRateLimit } from "./rateLimit";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { buildPublicSitemap, publicSiteOrigin } from "./sitemap";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function ensureDatabaseRunning() {
  const isFree = await isPortAvailable(3306);
  if (!isFree) {
    console.log("[AutoDB] Local MySQL is active on 127.0.0.1:3306.");
    return;
  }

  console.log("[AutoDB] Local MySQL is not running on 3306. Auto-booting persistent database...");
  try {
    const { spawn } = await import("child_process");
    const path = await import("path");
    const scriptPath = path.resolve(process.cwd(), "scripts/runPersistentDb.ts");
    const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

    // Windows: spawning .cmd/.bat files requires shell:true since the
    // CVE-2024-27980 Node fix (otherwise spawn always fails with EINVAL).
    // Arguments are quoted explicitly because shell mode joins them verbatim.
    const useShell = process.platform === "win32";
    const dbProc = spawn(
      useShell ? `"${pnpmCmd}"` : pnpmCmd,
      useShell ? ["exec", "tsx", `"${scriptPath}"`] : ["exec", "tsx", scriptPath],
      {
        cwd: process.cwd(),
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        shell: useShell,
      },
    );
    dbProc.on("error", (spawnError) => {
      console.error("[AutoDB] Persistent database process could not start:", spawnError);
    });
    dbProc.unref();

    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 500));
      const free = await isPortAvailable(3306);
      if (!free) {
        console.log("[AutoDB] Local MySQL is UP on 127.0.0.1:3306.");
        return;
      }
    }
    console.warn("[AutoDB] Warning: MySQL did not respond on 3306 within 20s.");
  } catch (err) {
    console.error("[AutoDB] Failed to auto-start MySQL:", err);
  }
}

async function startServer() {
  await ensureDatabaseRunning();
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  // Gzip compress text responses (HTML/JS/CSS/JSON) so self-hosted production
  // deployments do not ship ~400KB vendor chunks uncompressed. Reversed proxies
  // that already set Content-Encoding are respected automatically.
  app.use(compression());
  app.use(applyHttpSecurity);
  app.get("/api/health", (_req, res) => res.json(backendHealth()));
  app.get("/api/ready", (_req, res) => {
    const readiness = backendReadiness();
    return res.status(readiness.ok ? 200 : 503).json(readiness);
  });
  app.get("/sitemap.xml", (req, res) => {
    res.type("application/xml").send(buildPublicSitemap(publicSiteOrigin({ protocol: req.protocol, host: req.get("host") })));
  });
  // Dev-only preview sign-in: signs the browser into the seeded local admin
  // user so the Foundation Admin and MIS dashboards can be reviewed without
  // the platform OAuth server. Opt-in via ALLOW_DEV_PREVIEW_LOGIN=true in
  // .env so it can never activate in a production deployment by accident.
  if (process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_PREVIEW_LOGIN === "true") {
    app.get("/api/dev-preview-login", async (_req, res) => {
      try {
        // ENV.appId is empty without the platform config, but the session
        // verifier requires a non-empty appId, so sign with an explicit one.
        const token = await sdk.signSession({ openId: "local-dev-admin", appId: "local-dev", name: "Local Dev Admin" }, { expiresInMs: 365 * 24 * 60 * 60 * 1000 });
        res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(_req), maxAge: 365 * 24 * 60 * 60 * 1000 });
        res.redirect(302, "/foundation-admin");
      } catch {
        res.status(500).send("Dev preview login failed");
      }
    });
  }
  // Razorpay signatures are computed from the unparsed raw request body; this route must precede JSON parsing.
  app.post("/api/razorpay/webhook", express.raw({ type: "application/json", limit: "1mb" }), handleRazorpayWebhook);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "12mb" }));
  app.use(express.urlencoded({ limit: "12mb", extended: true }));
  app.post("/api/scheduled/membership-expiry", handleMembershipExpirySchedule);
  app.post("/api/scheduled/membership-reminder", handleMembershipReminderSchedule);
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use("/api/trpc", enforceSensitiveMutationRateLimit);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path, type }) => {
        // Full error + stack stays in server logs; production responses no
        // longer carry stacks (see isDev in _core/trpc.ts).
        console.error(`[tRPC] ${type} ${path ?? "<unknown>"}:`, error);
      },
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/ (or http://127.0.0.1:${port}/)`);
  });

  // Graceful shutdown: stop accepting new connections, let in-flight
  // requests finish, then close. Without this, a Ctrl+C or a deploy-time
  // SIGTERM kills the process mid-request (truncated payment webhooks,
  // dropped page loads).
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[Shutdown] ${signal} received — closing server gracefully…`);
    server.close(() => {
      console.log("[Shutdown] Server closed.");
      process.exit(0);
    });
    // Force-exit if connections refuse to drain (keep-alive sockets can hold
    // the server open for a while otherwise).
    setTimeout(() => {
      console.log("[Shutdown] Forcing exit after timeout.");
      process.exit(0);
    }, 10000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// A rejected promise outside express/tRPC error handling would otherwise
// crash the process on Node's default policy; log it and keep serving.
process.on("unhandledRejection", reason => {
  console.error("[UnhandledRejection]", reason);
});
process.on("uncaughtException", error => {
  console.error("[UncaughtException]", error);
});

startServer().catch(console.error);
