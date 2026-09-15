// Preconfigured storage helpers for Manus WebDev templates
// Uploads via Forge Server presigned URL to S3 (PUT direct).
// Downloads return /manus-storage/{key} paths served via 307 redirect.

import fs from "fs";
import path from "path";
import { ENV } from "./_core/env";

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

// Dev-only fallback: without Forge credentials, keep uploads on local disk so
// the full membership/application flow works in local development. Private
// uploads (ID proofs) are never publicly served, so a private project-local
// directory is sufficient. Production keeps requiring real storage credentials.
const localUploadsDir = path.resolve(import.meta.dirname, "../.local-storage");

function putLocalUpload(key: string, data: Buffer | Uint8Array | string) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
  const target = path.resolve(localUploadsDir, key);
  if (!target.startsWith(localUploadsDir + path.sep)) {
    throw new Error("Invalid storage key");
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data);
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY");
    }
    const key = appendHashSuffix(normalizeKey(relKey));
    putLocalUpload(key, data);
    return { key, url: `/manus-storage/${key}` };
  }
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);

  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}

const localProofMimeByExtension: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };

// Dev-only: reads a locally stored upload back for inline preview when Forge
// credentials (and therefore signed URLs) are unavailable. Path-traversal is
// rejected exactly like the write path, and the mime is derived from the key
// extension so a caller can never smuggle an executable content type.
export function storageGetLocalUpload(relKey: string): { data: Buffer; mimeType: string } {
  const key = normalizeKey(relKey);
  const target = path.resolve(localUploadsDir, key);
  if (!target.startsWith(localUploadsDir + path.sep)) throw new Error("Invalid storage key");
  const extension = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  const mimeType = localProofMimeByExtension[extension];
  if (!mimeType) throw new Error("Unsupported proof file type");
  return { data: fs.readFileSync(target), mimeType };
}
