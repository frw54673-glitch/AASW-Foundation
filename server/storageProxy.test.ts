import { describe, expect, it, vi } from "vitest";
import { canServePublicStorageKey, normalizePublicStorageKey } from "./_core/storageProxy";
import { serveLocalStorageAsset } from "./_core/storageProxy";

describe("managed storage public boundary", () => {
  it("keeps source-backed root assets public", async () => {
    await expect(canServePublicStorageKey("aasw-foundation-official-logo_41a4007d.png")).resolves.toBe(true);
  });

  it("serves a committed root asset from the local directory when the storage backend is not configured", () => {
    const sendFile = vi.fn();
    const type = vi.fn().mockReturnThis();
    const set = vi.fn();
    const res = { set, type, sendFile } as unknown as Parameters<typeof serveLocalStorageAsset>[1];
    expect(serveLocalStorageAsset("aasw-foundation-official-logo_41a4007d.png", res)).toBe(true);
    expect(sendFile).toHaveBeenCalledTimes(1);
    expect(type).toHaveBeenCalledWith("image/png");
  });

  it("never serves a storage key that does not exist as a committed local asset", () => {
    const res = { set: vi.fn(), type: vi.fn().mockReturnThis(), sendFile: vi.fn() } as unknown as Parameters<typeof serveLocalStorageAsset>[1];
    expect(serveLocalStorageAsset("aasw-uncommitted-asset_00000000.jpg", res)).toBe(false);
    expect(res.sendFile).not.toHaveBeenCalled();
  });

  it("allows gallery media only when its matching record is published", async () => {
    const published = vi.fn().mockResolvedValue(true);
    await expect(canServePublicStorageKey("gallery-media/AASW-MEDIA-TEST/photo_1234.webp", { isPublishedGalleryStorageKey: published })).resolves.toBe(true);
    expect(published).toHaveBeenCalledWith("gallery-media/AASW-MEDIA-TEST/photo_1234.webp");

    await expect(canServePublicStorageKey("gallery-media/AASW-MEDIA-TEST/photo_1234.webp", { isPublishedGalleryStorageKey: async () => false })).resolves.toBe(false);
  });

  it("keeps gallery media private when the publication lookup itself fails", async () => {
    await expect(canServePublicStorageKey("gallery-media/AASW-MEDIA-TEST/photo_1234.webp", { isPublishedGalleryStorageKey: async () => { throw new Error("Database is unavailable for Foundation media management."); } })).resolves.toBe(false);
  });

  it("never treats private membership, member or MIS document keys as public assets", async () => {
    for (const key of ["membership-applications/AASW-MEM-TEST/id-proof_1234.pdf", "member-profile-photos/AASW-2026-TEST/avatar_1234.jpg", "mis-documents/user/1/report_1234.pdf"]) {
      await expect(canServePublicStorageKey(key)).resolves.toBe(false);
    }
  });

  it("rejects traversal and malformed storage-key input", () => {
    expect(normalizePublicStorageKey("../membership-applications/private.pdf")).toBeNull();
    expect(normalizePublicStorageKey(" gallery-media/item.webp")).toBeNull();
    expect(normalizePublicStorageKey("gallery-media\\item.webp")).toBeNull();
  });
});
