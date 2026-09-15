import { readFile } from "node:fs/promises";
import { storagePut } from "../server/storage.ts";
import { encryptSensitiveValue } from "../server/security/sensitive.ts";

const sourceFile = process.env.SOURCE_FILE;
const storageKey = process.env.STORAGE_KEY;
const panNumber = process.env.PAN_NUMBER;
const mimeType = process.env.MIME_TYPE ?? "image/jpeg";

if (!sourceFile || !storageKey || !panNumber) {
  console.error("SOURCE_FILE, STORAGE_KEY and PAN_NUMBER are required.");
  process.exit(1);
}

const bytes = await readFile(sourceFile);
const stored = await storagePut(storageKey, bytes, mimeType);
console.log(JSON.stringify({ storageKey: stored.key, panEncrypted: encryptSensitiveValue(panNumber) }));
