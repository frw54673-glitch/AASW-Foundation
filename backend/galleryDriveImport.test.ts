import { describe, expect, it, vi } from "vitest";
import { persistGoogleDriveGalleryMedia, type GoogleDriveGalleryMediaInput } from "./db";

const input: GoogleDriveGalleryMediaInput = { mediaRef: "AASW-MEDIA-DRIVE001", title: "Field learning session", description: "A verified Foundation field-learning photograph from the shared source folder.", altText: "Participants at an AASW learning session.", quarter: "2026 Q3", displayOrder: 7, storageKey: "gallery-media/drive-1.jpg", imageUrl: "/manus-storage/drive-1.jpg", originalName: "drive-1.jpg", mimeType: "image/jpeg", fileSize: 1450, sourceFileId: "1A2B3C4D5E6F7G8H9I0J", uploadedByOpenId: "foundation-sync" };
function database() { const values = vi.fn().mockResolvedValue(undefined); const set = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })); return { insert: vi.fn(() => ({ values })), update: vi.fn(() => ({ set })), values, set }; }

describe("Drive gallery importer persistence", () => {
  it("creates a new Drive item as a draft", async () => {
    const db = database();
    await expect(persistGoogleDriveGalleryMedia(db, undefined, input)).resolves.toEqual({ decision: "create_draft", mediaRef: input.mediaRef });
    expect(db.values).toHaveBeenCalledWith(expect.objectContaining({ source: "google_drive", status: "draft", sourceFileId: input.sourceFileId }));
  });
  it("updates an existing Drive record without changing its approved publication state", async () => {
    const db = database();
    const existing = { id: 7, mediaRef: "AASW-MEDIA-EXISTING", source: "google_drive", sourceFileId: input.sourceFileId, status: "published" };
    await expect(persistGoogleDriveGalleryMedia(db, existing, input)).resolves.toEqual({ decision: "update_existing", mediaRef: "AASW-MEDIA-EXISTING" });
    expect(db.set).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: input.imageUrl, title: input.title }));
    expect(db.insert).not.toHaveBeenCalled();
  });
  it("does not write an archived Drive item or a manual conflict", async () => {
    const archived = database();
    await expect(persistGoogleDriveGalleryMedia(archived, { id: 8, mediaRef: "AASW-MEDIA-ARCHIVED", source: "google_drive", sourceFileId: input.sourceFileId, status: "archived" }, input)).resolves.toMatchObject({ decision: "skip_archived" });
    expect(archived.insert).not.toHaveBeenCalled(); expect(archived.update).not.toHaveBeenCalled();
    const manual = database();
    await expect(persistGoogleDriveGalleryMedia(manual, { id: 9, mediaRef: "AASW-MEDIA-MANUAL", source: "manual_upload", sourceFileId: input.sourceFileId, status: "published" }, input)).resolves.toMatchObject({ decision: "manual_conflict" });
    expect(manual.insert).not.toHaveBeenCalled(); expect(manual.update).not.toHaveBeenCalled();
  });
});
