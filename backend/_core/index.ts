import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { createApiApp } from "./app";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => server.close(() => resolve(true)));
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function ensureDatabaseRunning() {
  if (!(await isPortAvailable(3306))) {
    console.log("[AutoDB] Local MySQL is active on 127.0.0.1:3306.");
    return;
  }

  console.log("[AutoDB] Local MySQL is not running on 3306. Auto-booting persistent database...");
  try {
    const { spawn } = await import("child_process");
    const path = await import("path");
    const scriptPath = path.resolve(process.cwd(), "scripts/runPersistentDb.ts");
    const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const useShell = process.platform === "win32";
    const dbProc = spawn(
      useShell ? `"${pnpmCmd}"` : pnpmCmd,
      useShell ? ["exec", "tsx", `"${scriptPath}"`] : ["exec", "tsx", scriptPath],
      { cwd: process.cwd(), detached: true, stdio: "ignore", windowsHide: true, shell: useShell },
    );
    dbProc.on("error", error => console.error("[AutoDB] Persistent database process could not start:", error));
    dbProc.unref();

    for (let i = 0; i < 40; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!(await isPortAvailable(3306))) {
        console.log("[AutoDB] Local MySQL is UP on 127.0.0.1:3306.");
        return;
      }
    }
    console.warn("[AutoDB] Warning: MySQL did not respond on 3306 within 20s.");
  } catch (error) {
    console.error("[AutoDB] Failed to auto-start MySQL:", error);
  }
}

async function startServer() {
  await ensureDatabaseRunning();
  const app = createApiApp();
  const server = createServer(app);

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port} instead`);

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/ (or http://127.0.0.1:${port}/)`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[Shutdown] ${signal} received — closing server gracefully…`);
    server.close(() => {
      console.log("[Shutdown] Server closed.");
      process.exit(0);
    });
    setTimeout(() => {
      console.log("[Shutdown] Forcing exit after timeout.");
      process.exit(0);
    }, 10000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", reason => console.error("[UnhandledRejection]", reason));
process.on("uncaughtException", error => console.error("[UncaughtException]", error));

startServer().catch(console.error);
