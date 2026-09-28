import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFoundationManagementSummary, getGalleryDriveSyncConfig, listMembershipApplications, listContactInquiries, listDonationIntents, listFoundationAdminAlerts, listPaymentTransactions, listGalleryMedia, markFoundationAdminAlertRead, saveGalleryDriveSyncConfig, updateMembershipApplicationStatus, updateContactInquiryStatus, updateDonationIntentStatus, createGalleryMedia, updateGalleryMedia, getMembershipApplicationProofKey, storageGetSignedUrl, storagePut } = vi.hoisted(() => ({ getFoundationManagementSummary: vi.fn(), getGalleryDriveSyncConfig: vi.fn(), listMembershipApplications: vi.fn(), listContactInquiries: vi.fn(), listDonationIntents: vi.fn(), listFoundationAdminAlerts: vi.fn(), listPaymentTransactions: vi.fn(), listGalleryMedia: vi.fn(), markFoundationAdminAlertRead: vi.fn(), saveGalleryDriveSyncConfig: vi.fn(), updateMembershipApplicationStatus: vi.fn(), updateContactInquiryStatus: vi.fn(), updateDonationIntentStatus: vi.fn(), createGalleryMedia: vi.fn(), updateGalleryMedia: vi.fn(), getMembershipApplicationProofKey: vi.fn(), storageGetSignedUrl: vi.fn(), storagePut: vi.fn() }));
vi.mock("./db", () => ({ getFoundationManagementSummary, getGalleryDriveSyncConfig, listMembershipApplications, listContactInquiries, listDonationIntents, listFoundationAdminAlerts, listPaymentTransactions, listGalleryMedia, markFoundationAdminAlertRead, saveGalleryDriveSyncConfig, updateMembershipApplicationStatus, updateContactInquiryStatus, updateDonationIntentStatus, createGalleryMedia, updateGalleryMedia, getMembershipApplicationProofKey }));
vi.mock("./storage", () => ({ storageGetSignedUrl, storagePut }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "user" | null): TrpcContext { return { user: role ? { id: 1, openId: `${role}-open-id`, role, name: "AASW User", email: "user@aasw.org", loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } : null, req: {}, res: {} } as TrpcContext; }

describe("Foundation management APIs", () => {
  beforeEach(() => { vi.resetAllMocks(); getFoundationManagementSummary.mockResolvedValue({ memberships: 2, inquiries: 3, donations: 4, payments: 1, publishedMedia: 5, unreadAdminAlerts: 1 }); getGalleryDriveSyncConfig.mockResolvedValue(undefined); listMembershipApplications.mockResolvedValue([]); listContactInquiries.mockResolvedValue([]); listDonationIntents.mockResolvedValue([]); listFoundationAdminAlerts.mockResolvedValue([]); listPaymentTransactions.mockResolvedValue([]); listGalleryMedia.mockResolvedValue([]); saveGalleryDriveSyncConfig.mockResolvedValue(1); storagePut.mockResolvedValue({ key: "gallery-media/a.jpg", url: "/manus-storage/a.jpg" }); createGalleryMedia.mockResolvedValue(undefined); });
  it("rejects all protected management data from public and non-admin callers", async () => {
    await expect(appRouter.createCaller(context(null)).management.summary()).rejects.toBeDefined();
    await expect(appRouter.createCaller(context("user")).management.summary()).rejects.toBeDefined();
    expect(getFoundationManagementSummary).not.toHaveBeenCalled();
  });
  it("keeps the public gallery feed separate from protected draft management records", async () => {
    listGalleryMedia.mockResolvedValue([{ mediaRef: "AASW-MEDIA-PUBLIC", status: "published" }]);
    const result = await appRouter.createCaller(context(null)).media.list({ limit: 12 });
    expect(result).toEqual([{ mediaRef: "AASW-MEDIA-PUBLIC", status: "published" }]);
    expect(listGalleryMedia).toHaveBeenCalledWith(12, true);
  });
  it("allows Foundation admins to retrieve summaries and update public-record workflow states", async () => {
    const admin = appRouter.createCaller(context("admin"));
    await expect(admin.management.summary()).resolves.toMatchObject({ memberships: 2, publishedMedia: 5, unreadAdminAlerts: 1 });
    await expect(admin.management.alerts.list({ limit: 12 })).resolves.toEqual([]);
    await expect(admin.management.alerts.markRead({ alertId: 3 })).resolves.toEqual({ success: true });
    await admin.management.memberships.updateStatus({ applicationRef: "AASW-MEM-TEST123456", status: "reviewing" });
    await admin.management.inquiries.updateStatus({ inquiryRef: "AASW-INQ-TEST123456", status: "responded" });
    await admin.management.donations.updateStatus({ donationRef: "AASW-DON-TEST123456", status: "closed" });
    expect(updateMembershipApplicationStatus).toHaveBeenCalledWith("AASW-MEM-TEST123456", "reviewing");
    expect(updateContactInquiryStatus).toHaveBeenCalledWith("AASW-INQ-TEST123456", "responded");
    expect(updateDonationIntentStatus).toHaveBeenCalledWith("AASW-DON-TEST123456", "closed");
    expect(listFoundationAdminAlerts).toHaveBeenCalledWith(12);
    expect(markFoundationAdminAlertRead).toHaveBeenCalledWith(3);
  });
  it("stores an admin-uploaded field photo with its explicit public gallery order", async () => {
    const admin = appRouter.createCaller(context("admin"));
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(24)]).toString("base64");
    const result = await admin.management.media.upload({ title: "Community field session", description: "A verified community learning session in the field.", altText: "Community participants in a learning session.", quarter: "2026 Q3", displayOrder: 3, status: "published", image: { originalName: "field.jpg", mimeType: "image/jpeg", dataBase64: jpeg } });
    expect(result).toMatchObject({ imageUrl: "/manus-storage/a.jpg", status: "published" });
    expect(createGalleryMedia).toHaveBeenCalledWith(expect.objectContaining({ title: "Community field session", displayOrder: 3, status: "published", source: "manual_upload", uploadedByOpenId: "admin-open-id" }));
  });
  it("lets only admins store a Drive folder configuration and keeps sync in needs-access state", async () => {
    const result = await appRouter.createCaller(context("admin")).management.galleryDrive.saveConfiguration({ folderUrl: "https://drive.google.com/drive/folders/1A2B3C4D5E6F7G8H9I0J", syncIntervalHours: 24 });
    expect(result).toMatchObject({ id: 1, folderId: "1A2B3C4D5E6F7G8H9I0J", syncStatus: "needs_access" });
    expect(saveGalleryDriveSyncConfig).toHaveBeenCalledWith(expect.objectContaining({ folderId: "1A2B3C4D5E6F7G8H9I0J", updatedByOpenId: "admin-open-id" }));
    await expect(appRouter.createCaller(context("user")).management.galleryDrive.saveConfiguration({ folderUrl: "https://drive.google.com/drive/folders/1A2B3C4D5E6F7G8H9I0J", syncIntervalHours: 24 })).rejects.toBeDefined();
    await expect(appRouter.createCaller(context("admin")).management.galleryDrive.saveConfiguration({ folderUrl: "not-a-drive-folder", syncIntervalHours: 24 })).rejects.toBeDefined();
  });
});
