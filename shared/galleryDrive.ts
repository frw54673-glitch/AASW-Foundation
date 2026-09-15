export type GalleryDriveExistingMedia = { source: "manual_upload" | "google_drive" | "official_archive"; sourceFileId: string | null; status: "draft" | "published" | "archived" };
export type GalleryDriveDuplicateDecision = "create_draft" | "update_existing" | "skip_archived" | "manual_conflict";

/**
 * Applies the non-destructive Drive import policy. A Drive file ID, rather than
 * a filename, is the stable duplicate key. Importers must preserve the current
 * public status; they are never allowed to auto-publish imported media.
 */
export function decideGalleryDriveImport(existing: GalleryDriveExistingMedia | undefined): GalleryDriveDuplicateDecision {
  if (!existing) return "create_draft";
  if (existing.source !== "google_drive") return "manual_conflict";
  if (existing.status === "archived") return "skip_archived";
  return "update_existing";
}
