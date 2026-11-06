// Storage helpers for AASW Foundation
// Supports InsForge Storage with automatic bucket routing (gallery, member-documents, receipts)
// with graceful local development / test fallback.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { ENV } from "./_core/env";
import { insforgeAdmin } from "./_core/insforge";

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

// Dev-only fallback: without cloud credentials, keep uploads on local disk so
// the full membership/application flow works in local development. Private
// uploads (ID proofs) are never publicly served, so a private project-local
// directory is sufficient.
const baseStorageDir = typeof import.meta.dirname === "string" ? import.meta.dirname : path.dirname(fileURLToPath(import.meta.url));
const localUploadsDir = path.resolve(baseStorageDir, "../.local-storage");

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

export function resolveInsForgeBucket(key: string): string {
  const lower = key.toLowerCase();
  if (lower.startsWith("gallery") || lower.includes("gallery")) return "gallery";
  if (lower.startsWith("receipt") || lower.includes("receipt")) return "receipts";
  return "member-documents";
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));

  // 1. Try InsForge Storage if configured
  if (ENV.insforgeApiKey && ENV.insforgeUrl) {
    try {
      const bucket = resolveInsForgeBucket(key);
      const blob = typeof data === "string"
        ? new Blob([data], { type: contentType })
        : new Blob([data as any], { type: contentType });

      const { data: uploadData, error } = await insforgeAdmin.storage
        .from(bucket)
        .upload(key, blob);

      if (!error && uploadData?.url) {
        return { key: uploadData.key, url: uploadData.url };
      }
      console.warn("[Storage] InsForge upload failed, falling back:", error);
    } catch (err) {
      console.warn("[Storage] InsForge upload error, falling back:", err);
    }
  }

  // 2. Legacy Forge Presigned PUT to S3 fallback
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    const { forgeUrl, forgeKey } = getForgeConfig();
    const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
    presignUrl.searchParams.set("path", key);

    const presignResp = await fetch(presignUrl, {
      headers: { Authorization: `Bearer ${forgeKey}` },
    });

    if (presignResp.ok) {
      const { url: s3Url } = (await presignResp.json()) as { url: string };
      if (s3Url) {
        const blob = typeof data === "string"
          ? new Blob([data], { type: contentType })
          : new Blob([data as any], { type: contentType });

        const uploadResp = await fetch(s3Url, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: blob,
        });

        if (uploadResp.ok) {
          return { key, url: `/manus-storage/${key}` };
        }
      }
    }
  }

  // 3. Local disk fallback (dev & vitest test suites)
  if (process.env.NODE_ENV === "production" && !ENV.insforgeApiKey) {
    throw new Error("Storage config missing: set INSFORGE_API_KEY or BUILT_IN_FORGE_API_KEY");
  }

  putLocalUpload(key, data);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  if (ENV.insforgeApiKey && ENV.insforgeUrl) {
    try {
      const bucket = resolveInsForgeBucket(key);
      const { data } = insforgeAdmin.storage.from(bucket).getPublicUrl(key);
      if (data?.publicUrl) return { key, url: data.publicUrl };
    } catch {
      // ignore and fallback
    }
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);

  if (ENV.insforgeApiKey && ENV.insforgeUrl) {
    try {
      const bucket = resolveInsForgeBucket(key);
      const { data, error } = await insforgeAdmin.storage.from(bucket).createSignedUrl(key, 3600);
      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch (err) {
      console.warn("[Storage] InsForge signed URL error:", err);
    }
  }

  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    const { forgeUrl, forgeKey } = getForgeConfig();
    const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
    getUrl.searchParams.set("path", key);

    const resp = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${forgeKey}` },
    });

    if (resp.ok) {
      const { url } = (await resp.json()) as { url: string };
      return url;
    }
  }

  throw new Error("Storage signed URL could not be generated");
}

const localProofMimeByExtension: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };

export function storageGetLocalUpload(relKey: string): { data: Buffer; mimeType: string } {
  const key = normalizeKey(relKey);
  const target = path.resolve(localUploadsDir, key);
  if (!target.startsWith(localUploadsDir + path.sep)) throw new Error("Invalid storage key");
  const extension = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  const mimeType = localProofMimeByExtension[extension];
  if (!mimeType) throw new Error("Unsupported proof file type");
  return { data: fs.readFileSync(target), mimeType };
}

export function isLocalUploadMode(): boolean {
  return (!ENV.forgeApiUrl || !ENV.forgeApiKey) && !ENV.insforgeApiKey;
}

export function storageLocalUploadDataUrl(relKey: string): string {
  const local = storageGetLocalUpload(relKey);
  return `data:${local.mimeType};base64,${local.data.toString("base64")}`;
}
