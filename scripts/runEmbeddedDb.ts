// Local-only helper: ensures the embedded MySQL/MariaDB server binary exists
// in the PROJECT-LOCAL .local-mysql/binaries directory, where Windows temp
// cleanup can never delete it. Downloads via mysql-memory-server (which
// extracts to the temp dir), then copies the whole version tree into the
// project and stops the temporary instance. Run once when the binary is
// missing — `runPersistentDb.ts` boots the real persistent server from the
// project-local copy.
import { createDB } from "mysql-memory-server";
import fs from "fs";
import os from "os";
import path from "path";

const storeRoot = path.resolve(import.meta.dirname, "../.local-mysql");
const persistentBinary = path.join(storeRoot, "binaries", "9.7.2", "mysql", "bin", "mysqld.exe");

if (fs.existsSync(persistentBinary)) {
  console.log("Persistent mysqld binary already present — nothing to do.");
  console.log(`BINARY_OK ${persistentBinary}`);
  process.exit(0);
}

console.log("Booting embedded MySQL to download the binary… (first run can take a few minutes)");
try {
  const db = await createDB({
    dbName: "aasw",
    port: 3306,
    portRetries: 5,
    username: "root",
  });
  console.log("EMBEDDED_MYSQL_READY");

  // The library extracts binaries to <tmpdir>/mysqlmsn/binaries/<version>.
  // Copy the version tree itself into binaries/ — NOT into binaries/9.7.2,
  // which fs.cpSync would treat as an existing dir and nest 9.7.2/9.7.2/.
  const tempVersionDir = path.join(os.tmpdir(), "mysqlmsn", "binaries", "9.7.2");
  if (fs.existsSync(path.join(tempVersionDir, "mysql", "bin", "mysqld.exe"))) {
    const destDir = path.join(storeRoot, "binaries");
    fs.mkdirSync(destDir, { recursive: true });
    fs.cpSync(tempVersionDir, path.join(destDir, "9.7.2"), { recursive: true });
    console.log(`PERSISTENT_BINARY_SAVED → ${persistentBinary}`);
  } else {
    console.error("Download completed but the temp binary was not found at the expected path.");
  }

  await db.stop();
  process.exit(0);
} catch (error) {
  console.error("EMBEDDED_MYSQL_FAILED", error);
  process.exit(1);
}
