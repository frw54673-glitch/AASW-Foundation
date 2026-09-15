import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { countMemberServiceCompletionsByStatus, createGalleryMedia, getFoundationManagementSummary, getGalleryDriveSyncConfig, getMemberById, getMembershipApplicationProofKey, getVolunteerApplicationByRef, listContactInquiries, listDonationIntents, listFoundationAdminAlerts, listFoundationMemberServiceCompletions, listFoundationMemberServiceRequests, listFoundationMemberSupportMessages, listGalleryMedia, listMemberCompletionActivity, listMembershipApplications, listPaymentTransactions, listVolunteerApplications, markFoundationAdminAlertRead, markVolunteerDecisionNotification, payMemberServiceCompletion, rejectMemberServiceCompletion, respondToMemberSupportMessage, saveGalleryDriveSyncConfig, updateContactInquiryStatus, updateDonationIntentStatus, updateGalleryMedia, updateMemberServiceRequestStatus, updateMembershipApplicationStatus, updateVolunteerApplicationStatus, verifyMemberServiceCompletion, writeMisAuditLog } from "../db";
import { dispatchMemberPayoutStatusEmail } from "../email/memberPayoutNotification";
import { dispatchVolunteerDecisionEmail } from "../email/volunteerNotification";
import { storageGetLocalUpload, storageGetSignedUrl, storagePut } from "../storage";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

const limitInput = z.object({ limit: z.number().int().min(1).max(100).default(50) });
const membershipStatus = z.enum(["submitted", "reviewing", "approved", "declined"]);
const inquiryStatus = z.enum(["submitted", "reviewing", "responded", "closed"]);
const donationStatus = z.enum(["details_submitted", "checkout_created", "verified", "captured", "failed", "closed"]);
const mediaStatus = z.enum(["draft", "published", "archived"]);
const serviceRequestStatus = z.enum(["submitted", "reviewing", "accepted", "not_available", "completed", "closed"]);
const supportMessageStatus = z.enum(["submitted", "reviewing", "responded", "closed"]);
const volunteerStatus = z.enum(["submitted", "reviewing", "approved", "rejected", "inactive"]);
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function imageBuffer(dataBase64: string, mimeType: (typeof allowedImageTypes)[number]) {
  if (!/^[A-Za-z0-9+/=]+$/.test(dataBase64)) throw new TRPCError({ code: "BAD_REQUEST", message: "Image data could not be read." });
  const bytes = Buffer.from(dataBase64, "base64");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new TRPCError({ code: "BAD_REQUEST", message: "Use a JPG, PNG or WebP image up to 8 MB." });
  if (mimeType === "image/jpeg" && !(bytes[0] === 0xff && bytes[1] === 0xd8)) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected file does not match its declared image type." });
  if (mimeType === "image/png" && !bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected file does not match its declared image type." });
  if (mimeType === "image/webp" && bytes.subarray(0, 4).toString("ascii") !== "RIFF") throw new TRPCError({ code: "BAD_REQUEST", message: "The selected file does not match its declared image type." });
  return bytes;
}

function safeFileName(name: string) { return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "field-photo"; }
function driveFolderId(value: string) { const match = value.match(/(?:folders\/|id=)([a-zA-Z0-9_-]{10,})/) ?? value.match(/^([a-zA-Z0-9_-]{20,})$/); if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Provide a valid Google Drive folder link or folder ID." }); return match[1]; }

function memberAppBaseUrl(req: { protocol?: string; get?: (header: string) => string | undefined }) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = req.get?.("host");
  if (host) return `${req.protocol === "http" ? "http" : "https"}://${host}`;
  return "http://localhost:3000";
}

/**
 * Payout status emails never block the admin mutation: dispatch already
 * swallows delivery failures, and a missing member record only skips the mail.
 * Destination details (UPI id / bank account) stay out of the email body.
 * Returns "sent" | failed | "skipped" so the caller can record the attempt.
 */
async function notifyMemberOfPayout(memberId: number, email: { fullName: string; email: string; membershipNo: string } | undefined, input: { completionRef: string; status: "verified" | "paid"; amountInPaise: number; payoutNote?: string | null; payoutReference?: string | null }, req: { protocol?: string; get?: (header: string) => string | undefined }) {
  if (!email?.email) return "skipped" as const;
  return dispatchMemberPayoutStatusEmail({ fullName: email.fullName, email: email.email, membershipNo: email.membershipNo, completionRef: input.completionRef, status: input.status, amountInPaise: input.amountInPaise, payoutNote: input.payoutNote, payoutReference: input.payoutReference, dashboardUrl: `${memberAppBaseUrl(req)}/member/dashboard` });
}

export const managementRouter = router({
  summary: adminProcedure.query(() => getFoundationManagementSummary()),
  alerts: router({
    list: adminProcedure.input(limitInput).query(({ input }) => listFoundationAdminAlerts(input.limit)),
    markRead: adminProcedure.input(z.object({ alertId: z.number().int().positive() })).mutation(async ({ input }) => { await markFoundationAdminAlertRead(input.alertId); return { success: true } as const; }),
  }),
  memberships: router({
    list: adminProcedure.input(limitInput).query(({ input }) => listMembershipApplications(input.limit)),
    updateStatus: adminProcedure.input(z.object({ applicationRef: z.string().min(1), status: membershipStatus })).mutation(async ({ input }) => { await updateMembershipApplicationStatus(input.applicationRef, input.status); return { status: input.status }; }),
    proofUrl: adminProcedure.input(z.object({ applicationRef: z.string().min(1) })).query(async ({ input }) => { const key = await getMembershipApplicationProofKey(input.applicationRef); if (!key) throw new TRPCError({ code: "NOT_FOUND", message: "Membership proof was not found." }); return { url: await storageGetSignedUrl(key) }; }),
  }),
  inquiries: router({ list: adminProcedure.input(limitInput).query(({ input }) => listContactInquiries(input.limit)), updateStatus: adminProcedure.input(z.object({ inquiryRef: z.string().min(1), status: inquiryStatus })).mutation(async ({ input }) => { await updateContactInquiryStatus(input.inquiryRef, input.status); return { status: input.status }; }) }),
  volunteers: router({
    list: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50), status: volunteerStatus.optional() })).query(({ input }) => listVolunteerApplications(input.limit, input.status)),
    review: adminProcedure.input(z.object({ applicationRef: z.string().trim().min(6).max(40), status: volunteerStatus, reviewNotes: z.string().trim().max(1500).optional() })).mutation(async ({ input, ctx }) => {
      const application = await getVolunteerApplicationByRef(input.applicationRef);
      if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "Volunteer application was not found." });
      if (application.status === input.status) return { applicationRef: input.applicationRef, status: input.status, unchanged: true as const };

      await updateVolunteerApplicationStatus({ applicationRef: input.applicationRef, status: input.status, reviewNotes: input.reviewNotes, reviewerOpenId: ctx.user.openId });

      // Approved/rejected decisions notify the applicant; reviewer-only states stay internal.
      if (input.status === "approved" || input.status === "rejected") {
        const decision = await dispatchVolunteerDecisionEmail({ applicationRef: input.applicationRef, fullName: application.fullName, email: application.email, status: input.status, reviewNotes: input.reviewNotes });
        await markVolunteerDecisionNotification(input.applicationRef, decision === "sent" ? "sent" : "failed", decision === "sent" ? undefined : decision.error);
      }
      return { applicationRef: input.applicationRef, status: input.status };
    }),
  }),
  donations: router({ list: adminProcedure.input(limitInput).query(({ input }) => listDonationIntents(input.limit)), updateStatus: adminProcedure.input(z.object({ donationRef: z.string().min(1), status: donationStatus })).mutation(async ({ input }) => { await updateDonationIntentStatus(input.donationRef, input.status); return { status: input.status }; }) }),
  payments: router({ list: adminProcedure.input(limitInput).query(({ input }) => listPaymentTransactions(input.limit)) }),
  serviceRequests: router({
    list: adminProcedure.input(limitInput).query(({ input }) => listFoundationMemberServiceRequests(input.limit)),
    updateStatus: adminProcedure.input(z.object({ requestRef: z.string().min(1).max(40), status: serviceRequestStatus, adminNote: z.string().trim().max(1200).optional() })).mutation(async ({ input, ctx }) => { await updateMemberServiceRequestStatus({ ...input, reviewedByOpenId: ctx.user.openId }); return { requestRef: input.requestRef, status: input.status }; }),
  }),
  completions: router({
    list: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50), status: z.enum(["submitted", "verified", "rejected", "paid"]).optional() })).query(({ input }) => listFoundationMemberServiceCompletions(input.limit, input.status)),
    // Live queue counts power the numbered status chips on the verification page.
    stats: adminProcedure.query(() => countMemberServiceCompletionsByStatus()),
    // Recent verification/settlement moves for the activity feed; refresh
    // rides the same invalidation as stats.
    activity: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(30).default(12) }).default({ limit: 12 })).query(({ input }) => listMemberCompletionActivity(input.limit)),
    // Compliance export: one row per completion with payout outcome. Destinations
    // (UPI id / bank account) are deliberately excluded from the export.
    exportCsv: adminProcedure.input(z.object({ status: z.enum(["submitted", "verified", "rejected", "paid"]).optional() }).default({})).mutation(async ({ input, ctx }) => {
      const rows = await listFoundationMemberServiceCompletions(100, input.status);
      const escapeCsv = (value: string | number | null | undefined) => {
        const text = value == null ? "" : String(value);
        return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
      };
      const header = ["Completion ref", "Request ref", "Programme", "Member", "Membership no", "Status", "Payout amount (INR)", "Payout method", "Payout reference", "Verified at", "Paid at", "Reported at"];
      const lines = [header.join(",")];
      for (const row of rows) lines.push([row.completionRef, row.requestRef, row.serviceType, row.fullName, row.membershipNo, row.status, row.payoutAmount != null ? (row.payoutAmount / 100).toFixed(2) : "", row.payoutMethod ?? "", row.payoutReference ?? "", row.verifiedAt ? new Date(row.verifiedAt).toISOString() : "", row.paidAt ? new Date(row.paidAt).toISOString() : "", new Date(row.createdAt).toISOString()].map(escapeCsv).join(","));
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "completion.exported_csv", entityType: "member_service_completion", entityId: input.status ?? "all", details: { rows: rows.length, status: input.status ?? "all" } });
      return { filename: `AASW-completions-${input.status ?? "all"}-${new Date().toISOString().slice(0, 10)}.csv`, content: lines.join("\r\n") };
    }),
    proofUrl: adminProcedure.input(z.object({ storageKey: z.string().trim().min(10).max(512) })).mutation(async ({ input }) => {
      if (!input.storageKey.startsWith("member-completions/")) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid proof key." });
      try {
        return { url: await storageGetSignedUrl(input.storageKey) };
      } catch (error) {
        // Local dev has no Forge credentials, so signed URLs cannot be minted.
        // Inline the locally stored upload instead; production always signs.
        if (process.env.NODE_ENV === "production") throw error;
        const local = storageGetLocalUpload(input.storageKey);
        return { url: `data:${local.mimeType};base64,${local.data.toString("base64")}` };
      }
    }),
    verify: adminProcedure.input(z.object({ completionRef: z.string().trim().min(6).max(40), payoutAmount: z.number().int().min(10000, "Enter a payout of at least ₹100.").max(100 * 100 * 1000), payoutMethod: z.enum(["upi", "bank_transfer", "other"]), payoutNote: z.string().trim().max(2000).optional() })).mutation(async ({ input, ctx }) => {
      // Payout amounts are stored in paise exactly like payment transactions.
      const verified = await verifyMemberServiceCompletion({ completionRef: input.completionRef, payoutAmount: input.payoutAmount, payoutMethod: input.payoutMethod, payoutNote: input.payoutNote, verifiedByOpenId: ctx.user.openId });
      if (!verified) throw new TRPCError({ code: "BAD_REQUEST", message: "This completion report was already processed." });
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "completion.verified", entityType: "member_service_completion", entityId: input.completionRef, details: { payoutAmount: input.payoutAmount, payoutMethod: input.payoutMethod } });
      // The verified member is told the approved payout amount and method;
      // the delivery attempt lands in the audit log either way.
      const delivery = await notifyMemberOfPayout(verified.memberId, await getMemberById(verified.memberId), { completionRef: input.completionRef, status: "verified", amountInPaise: input.payoutAmount, payoutNote: input.payoutNote }, ctx.req);
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "completion.member_notified", entityType: "member_service_completion", entityId: input.completionRef, details: { emailKind: "payout_verified", delivery: delivery === "sent" ? "sent" : delivery === "skipped" ? "skipped_no_member_email" : "failed", error: typeof delivery === "object" ? delivery.error : undefined } });
      return { completionRef: input.completionRef, status: "verified" as const };
    }),
    reject: adminProcedure.input(z.object({ completionRef: z.string().trim().min(6).max(40), rejectionReason: z.string().trim().min(10, "Tell the member why the report was rejected (at least 10 characters).").max(2000) })).mutation(async ({ input, ctx }) => {
      const rejected = await rejectMemberServiceCompletion({ completionRef: input.completionRef, rejectionReason: input.rejectionReason, verifiedByOpenId: ctx.user.openId });
      if (!rejected) throw new TRPCError({ code: "BAD_REQUEST", message: "This completion report was already processed." });
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "completion.rejected", entityType: "member_service_completion", entityId: input.completionRef, details: { rejectionReason: input.rejectionReason } });
      return { completionRef: input.completionRef, status: "rejected" as const };
    }),
    markPaid: adminProcedure.input(z.object({ completionRef: z.string().trim().min(6).max(40), payoutReference: z.string().trim().min(4, "Enter the UPI or bank transfer reference number.").max(120) })).mutation(async ({ input, ctx }) => {
      const settled = await payMemberServiceCompletion({ completionRef: input.completionRef, payoutReference: input.payoutReference, paidByOpenId: ctx.user.openId });
      if (!settled) throw new TRPCError({ code: "BAD_REQUEST", message: "Only verified completions can be marked paid." });
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "completion.paid", entityType: "member_service_completion", entityId: input.completionRef, details: { payoutAmount: settled.payoutAmount, payoutMethod: settled.payoutMethod, payoutReference: input.payoutReference } });
      // The member is told the payout is settled and can download the receipt.
      // A verified completion always carries the amount set by the verify step.
      if (settled.payoutAmount != null) {
        const delivery = await notifyMemberOfPayout(settled.memberId, await getMemberById(settled.memberId), { completionRef: input.completionRef, status: "paid", amountInPaise: settled.payoutAmount, payoutNote: settled.payoutNote, payoutReference: input.payoutReference }, ctx.req);
        await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "completion.member_notified", entityType: "member_service_completion", entityId: input.completionRef, details: { emailKind: "payout_paid", delivery: delivery === "sent" ? "sent" : delivery === "skipped" ? "skipped_no_member_email" : "failed", error: typeof delivery === "object" ? delivery.error : undefined } });
      }
      return { completionRef: input.completionRef, status: "paid" as const };
    }),
  }),
  supportMessages: router({
    list: adminProcedure.input(limitInput).query(({ input }) => listFoundationMemberSupportMessages(input.limit)),
    respond: adminProcedure.input(z.object({ messageRef: z.string().min(1).max(40), status: supportMessageStatus, adminReply: z.string().trim().max(3000).optional() })).mutation(async ({ input, ctx }) => { await respondToMemberSupportMessage({ ...input, repliedByOpenId: ctx.user.openId }); return { messageRef: input.messageRef, status: input.status }; }),
  }),
  media: router({
    list: adminProcedure.input(limitInput).query(({ input }) => listGalleryMedia(input.limit)),
    upload: adminProcedure.input(z.object({ title: z.string().trim().min(3).max(180), description: z.string().trim().min(10).max(2000), altText: z.string().trim().min(10).max(500), quarter: z.string().trim().min(2).max(80), displayOrder: z.number().int().min(0).max(9999).default(0), status: mediaStatus.default("draft"), image: z.object({ originalName: z.string().min(1).max(255), mimeType: z.enum(allowedImageTypes), dataBase64: z.string().min(20) }) })).mutation(async ({ input, ctx }) => { const bytes = imageBuffer(input.image.dataBase64, input.image.mimeType); const mediaRef = `AASW-MEDIA-${nanoid(12).toUpperCase()}`; const upload = await storagePut(`gallery-media/${mediaRef}/${safeFileName(input.image.originalName)}`, bytes, input.image.mimeType); await createGalleryMedia({ mediaRef, title: input.title, description: input.description, altText: input.altText, quarter: input.quarter, displayOrder: input.displayOrder, storageKey: upload.key, imageUrl: upload.url, originalName: input.image.originalName, mimeType: input.image.mimeType, fileSize: bytes.length, source: "manual_upload", status: input.status, uploadedByOpenId: ctx.user.openId, publishedAt: input.status === "published" ? new Date() : null }); return { mediaRef, imageUrl: upload.url, status: input.status }; }),
    update: adminProcedure.input(z.object({ mediaRef: z.string().min(1), title: z.string().trim().min(3).max(180).optional(), description: z.string().trim().min(10).max(2000).optional(), altText: z.string().trim().min(10).max(500).optional(), quarter: z.string().trim().min(2).max(80).optional(), displayOrder: z.number().int().min(0).max(9999).optional(), status: mediaStatus.optional() })).mutation(async ({ input }) => { const { mediaRef, ...changes } = input; await updateGalleryMedia(mediaRef, changes); return { mediaRef, ...changes }; }),
  }),
  galleryDrive: router({
    configuration: adminProcedure.query(async () => (await getGalleryDriveSyncConfig()) ?? null),
    saveConfiguration: adminProcedure.input(z.object({ folderUrl: z.string().trim().min(10).max(1024), syncIntervalHours: z.number().int().min(12).max(168).default(24) })).mutation(async ({ input, ctx }) => {
      const folderId = driveFolderId(input.folderUrl);
      const id = await saveGalleryDriveSyncConfig({ ...input, folderId, updatedByOpenId: ctx.user.openId });
      return { id, folderId, syncStatus: "needs_access" as const };
    }),
  }),
});

export const publicMediaRouter = router({ list: publicProcedure.input(limitInput).query(({ input }) => listGalleryMedia(input.limit, true)) });
