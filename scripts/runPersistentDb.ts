// Local-only helper: boots the cached embedded MariaDB (mysql-memory-server
// binary) against a PERSISTENT data directory inside the project, so local
// preview data survives restarts. Keep this process running while the app runs.
//
// The binary lives in .local-mysql/binaries (project-local, immune to
// Windows temp cleanup). The legacy temp location is checked once for an
// existing download and migrated over, so upgrades from the old layout
// keep working without a re-download.
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const storeRoot = path.resolve(import.meta.dirname, "../.local-mysql");
const binary = path.join(storeRoot, "binaries", "9.7.2", "mysql", "bin", "mysqld.exe");

// One-time migration: if a previous download still survives in the temp dir,
// copy the whole version tree into the project before temp cleanup eats it.
// cpSync into the version dir itself would nest 9.7.2/9.7.2 — copy into the
// PARENT so the canonical binary path lands at binaries/9.7.2/mysql/bin.
const legacyTempVersionDir = path.join(os.tmpdir(), "mysqlmsn", "binaries", "9.7.2");
if (!fs.existsSync(binary) && fs.existsSync(path.join(legacyTempVersionDir, "mysql", "bin", "mysqld.exe"))) {
  fs.mkdirSync(path.join(storeRoot, "binaries"), { recursive: true });
  fs.cpSync(legacyTempVersionDir, path.join(storeRoot, "binaries", "9.7.2"), { recursive: true });
  console.log("Migrated mysqld binaries from temp → .local-mysql/binaries (temp-cleanup safe).");
}

if (!fs.existsSync(binary)) {
  console.error("EMBEDDED_BINARY_MISSING — run `pnpm exec tsx scripts/runEmbeddedDb.ts` once to download it into .local-mysql/binaries.");
  process.exit(1);
}

const dataDir = path.join(storeRoot, "data");
const initFile = path.join(storeRoot, "init.sql");
fs.mkdirSync(dataDir, { recursive: true });

const port = 3306;
const alreadyInitialized = fs.existsSync(path.join(dataDir, "mysql"));

if (!alreadyInitialized) {
  console.log("Initializing fresh data directory…");
  // Create the bootstrap init file: application database + passwordless root.
  // --skip-grant-tables style bootstrap is avoided; insecure-initialize sets
  // up the data dir, and init-file runs as the server comes up.
  fs.writeFileSync(initFile, [
    "CREATE DATABASE IF NOT EXISTS aasw;",
    "CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED BY '';",
    "GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost';",
    "CREATE USER IF NOT EXISTS 'root'@'127.0.0.1' IDENTIFIED BY '';",
    "GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1';",
    "FLUSH PRIVILEGES;",
  ].join("\n"));
  const init = execFile(binary, ["--no-defaults", `--datadir=${dataDir}`, "--initialize-insecure"], { maxBuffer: 8 * 1024 * 1024 });
  await new Promise((resolve, reject) => { init.on("exit", resolve); init.on("error", reject); });
  console.log("Data directory initialized.");
} else {
  console.log("Reusing existing data directory.");
}

console.log("Booting persistent MariaDB…");

const serverArgs = [
  "--no-defaults",
  `--port=${port}`,
  `--datadir=${dataDir}`,
  "--bind-address=127.0.0.1",
  // UTC everywhere: the app pins DB sessions to UTC, so NOW() and seed
  // scripts must write UTC wall-clock values too, keeping timestamps
  // consistent with what mysql2 reads back.
  "--default-time-zone=+00:00",
  "--console",
  `--init-file=${initFile}`,
  `--log-error=${path.join(storeRoot, "error.err")}`,
];

// A dev box this server runs on is frequently near-full on disk, so never
// enable the general query log (it once wrote unbounded MBs per day and each
// login attempt's full SQL). Error log only — that stays a few KB.
const staleGeneralLog = path.join(storeRoot, "log.log");
if (fs.existsSync(staleGeneralLog)) fs.rmSync(staleGeneralLog);

function bootMysqld(): ReturnType<typeof execFile> {
  return execFile(binary, serverArgs, { maxBuffer: 10 * 1024 * 1024 });
}

let proc = bootMysqld();
let exiting = false;
let restarts = 0;
let lastRestartAt = 0;
const RESTART_WINDOW_MS = 60_000;

// Watchdog: if mysqld dies unexpectedly (temp cleanup previously killed the
// whole DB along with its binary, and OOM/disk-full can do the same), boot a
// replacement after a short backoff. Guarded so a crash-loop never floods
// the machine: at most 5 restarts per 60s window, then give up and exit.
function attachExitHandler(p: ReturnType<typeof execFile>) {
  p.on("exit", (code: number | null) => {
    if (exiting) return;
    const now = Date.now();
    if (now - lastRestartAt > RESTART_WINDOW_MS) restarts = 0;
    if (restarts >= 5) {
      console.error(`EMBEDDED_MYSQL_EXITED code=${code} — restart limit reached, giving up.`);
      process.exit(1);
    }
    restarts += 1;
    lastRestartAt = now;
    console.error(`EMBEDDED_MYSQL_EXITED code=${code} — watchdog restarting mysqld (${restarts}/5)…`);
    setTimeout(() => {
      if (exiting) return;
      proc = bootMysqld();
      attachExitHandler(proc);
    }, 1500);
  });
}
attachExitHandler(proc);

process.on("SIGTERM", () => { exiting = true; proc.kill(); });
process.on("SIGINT", () => { exiting = true; proc.kill(); });

await new Promise(r => setTimeout(r, 7000));
console.log("EMBEDDED_MYSQL_READY");
console.log(`DB_HOST=127.0.0.1 DB_PORT=${port} DB_NAME=aasw DB_USER=root`);
setInterval(() => {}, 60000);
