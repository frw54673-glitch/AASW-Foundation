import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { createApiApp } from "./app";
import { serveStatic, setupVite } from "./vite";

function isMysqlListening(port = 3306, host = "127.0.0.1"): Promise<boolean> {
  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen({ port, host: "0.0.0.0" }, () => server.close(() => resolve(true)));
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
  if (await isMysqlListening(3306)) {
    console.log("[AutoDB] Local MySQL is active on 127.0.0.1:3306.");
    return;
  }

  console.log("[AutoDB] Local MySQL is not running on 3306. Auto-booting persistent database...");
  try {
    const { spawn } = await import("child_process");
    const path = await import("path");
    const fs = await import("fs");

    const storeRoot = path.resolve(process.cwd(), ".local-mysql");
    const binary = path.join(storeRoot, "binaries", "9.7.2", "mysql", "bin", process.platform === "win32" ? "mysqld.exe" : "mysqld");
    const dataDir = path.join(storeRoot, "data");
    const initFile = path.join(storeRoot, "init.sql");

    if (fs.existsSync(binary) && fs.existsSync(dataDir)) {
      const serverArgs = [
        "--no-defaults",
        "--port=3306",
        `--datadir=${dataDir}`,
        "--bind-address=127.0.0.1",
        "--default-time-zone=+00:00",
        "--console",
      ];
      if (fs.existsSync(initFile)) {
        serverArgs.push(`--init-file=${initFile}`);
      }

      const dbProc = spawn(binary, serverArgs, {
        cwd: storeRoot,
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      dbProc.on("error", error => console.error("[AutoDB] mysqld could not start:", error));
      dbProc.unref();
    } else {
      const scriptPath = path.resolve(process.cwd(), "scripts/runPersistentDb.ts");
      const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
      const dbProc = spawn(npxCmd, ["tsx", scriptPath], {
        cwd: process.cwd(),
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      dbProc.on("error", error => console.error("[AutoDB] Database bootstrap could not start:", error));
      dbProc.unref();
    }

    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (await isMysqlListening(3306)) {
        console.log("[AutoDB] Local MySQL is UP on 127.0.0.1:3306.");
        return;
      }
    }
    console.warn("[AutoDB] Warning: MySQL did not respond on 3306 within 30s.");
  } catch (error) {
    console.error("[AutoDB] Failed to auto-start MySQL:", error);
  }
}

async function startServer() {
  await ensureDatabaseRunning();
  const app = createApiApp();
  const server = createServer(app);

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port} instead`);

  const isDistBuild = import.meta.dirname.includes("dist") || (Boolean(process.argv[1]) && process.argv[1].includes("dist"));
  if (process.env.NODE_ENV === "development" && !isDistBuild) {
    await setupVite(app, server, port);
  } else {
    serveStatic(app);
  }

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
