import { describe, expect, it } from "vitest";
import { decideGalleryDriveImport } from "@shared/galleryDrive";

describe("Foundation Drive gallery duplicate policy", () => {
  it("creates a new Drive file as a draft when no source-file record exists", () => {
    expect(decideGalleryDriveImport(undefined)).toBe("create_draft");
  });
  it("updates an existing non-archived Drive record rather than creating a duplicate", () => {
    expect(decideGalleryDriveImport({ source: "google_drive", sourceFileId: "drive-file-123", status: "published" })).toBe("update_existing");
  });
  it("skips archived Drive media and never overrides manual or official records", () => {
    expect(decideGalleryDriveImport({ source: "google_drive", sourceFileId: "drive-file-123", status: "archived" })).toBe("skip_archived");
    expect(decideGalleryDriveImport({ source: "manual_upload", sourceFileId: "drive-file-123", status: "published" })).toBe("manual_conflict");
    expect(decideGalleryDriveImport({ source: "official_archive", sourceFileId: "drive-file-123", status: "draft" })).toBe("manual_conflict");
  });
});
