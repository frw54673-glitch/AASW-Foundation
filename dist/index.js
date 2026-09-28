// backend/_core/index.ts
import "dotenv/config";
import express2 from "express";
import compression from "compression";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// backend/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// backend/db.ts
import { and, asc, count, desc, eq, gt, inArray, isNull, like, max, or, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// backend/drizzle/schema.ts
import { boolean, date, decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "project_manager", "field_staff", "finance", "monitoring", "management"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var paymentTransactions = mysqlTable("payment_transactions", {
  id: int("id").autoincrement().primaryKey(),
  receipt: varchar("receipt", { length: 40 }).notNull().unique(),
  kind: mysqlEnum("kind", ["donation", "membership"]).notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  supporterName: varchar("supporterName", { length: 255 }).notNull(),
  supporterEmail: varchar("supporterEmail", { length: 320 }).notNull(),
  supporterPhone: varchar("supporterPhone", { length: 32 }),
  gateway: varchar("gateway", { length: 32 }).notNull().default("razorpay"),
  gatewayOrderId: varchar("gatewayOrderId", { length: 255 }).unique(),
  gatewayPaymentId: varchar("gatewayPaymentId", { length: 255 }).unique(),
  status: mysqlEnum("status", ["created", "verified", "captured", "failed", "refunded"]).notNull().default("created"),
  receiptDeliveryStatus: mysqlEnum("receiptDeliveryStatus", ["pending", "sending", "sent", "failed"]).notNull().default("pending"),
  receiptSentAt: timestamp("receiptSentAt"),
  receiptMessageId: varchar("receiptMessageId", { length: 255 }),
  receiptError: varchar("receiptError", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var paymentRefunds = mysqlTable("payment_refunds", {
  id: int("id").autoincrement().primaryKey(),
  refundRef: varchar("refundRef", { length: 40 }).notNull().unique(),
  receipt: varchar("receipt", { length: 40 }).notNull().references(() => paymentTransactions.receipt, { onDelete: "restrict" }),
  gatewayPaymentId: varchar("gatewayPaymentId", { length: 255 }).notNull(),
  gatewayRefundId: varchar("gatewayRefundId", { length: 255 }).notNull().unique(),
  amount: int("amount").notNull(),
  status: mysqlEnum("status", ["initiated", "processed", "failed"]).notNull().default("initiated"),
  reason: varchar("reason", { length: 500 }),
  initiatedByOpenId: varchar("initiatedByOpenId", { length: 64 }).notNull(),
  notificationStatus: mysqlEnum("notificationStatus", ["pending", "sent", "failed"]).notNull().default("pending"),
  notificationError: varchar("notificationError", { length: 500 }),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var donationIntents = mysqlTable("donation_intents", {
  id: int("id").autoincrement().primaryKey(),
  donationRef: varchar("donationRef", { length: 40 }).notNull().unique(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  dob: varchar("dob", { length: 10 }).notNull(),
  panEncrypted: text("panEncrypted").notNull(),
  panLastFour: varchar("panLastFour", { length: 4 }).notNull(),
  country: varchar("country", { length: 64 }).notNull().default("India"),
  state: varchar("state", { length: 128 }).notNull(),
  city: varchar("city", { length: 128 }).notNull(),
  address: text("address").notNull(),
  pincode: varchar("pincode", { length: 12 }).notNull(),
  amount: int("amount").notNull(),
  status: mysqlEnum("status", ["details_submitted", "checkout_created", "verified", "captured", "failed", "closed"]).notNull().default("details_submitted"),
  paymentReceipt: varchar("paymentReceipt", { length: 40 }),
  notificationStatus: mysqlEnum("notificationStatus", ["pending", "sent", "failed"]).notNull().default("pending"),
  notificationSentAt: timestamp("notificationSentAt"),
  notificationError: varchar("notificationError", { length: 500 }),
  consentAt: timestamp("consentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var paymentWebhookEvents = mysqlTable("payment_webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  gatewayEventId: varchar("gatewayEventId", { length: 255 }).notNull().unique(),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  gatewayOrderId: varchar("gatewayOrderId", { length: 255 }),
  gatewayPaymentId: varchar("gatewayPaymentId", { length: 255 }),
  payloadHash: varchar("payloadHash", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["received", "processed", "ignored"]).notNull().default("received"),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt")
});
var membershipApplications = mysqlTable("membership_applications", {
  id: int("id").autoincrement().primaryKey(),
  applicationRef: varchar("applicationRef", { length: 40 }).notNull().unique(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  city: varchar("city", { length: 128 }).notNull(),
  state: varchar("state", { length: 128 }).notNull(),
  district: varchar("district", { length: 128 }).notNull(),
  membershipType: mysqlEnum("membershipType", ["annual", "lifetime"]).notNull(),
  message: text("message"),
  panEncrypted: text("panEncrypted").notNull(),
  panHash: varchar("panHash", { length: 64 }),
  panLastFour: varchar("panLastFour", { length: 4 }).notNull(),
  idProofType: mysqlEnum("idProofType", ["aadhaar", "voter_id", "passport", "driving_licence", "other"]).notNull(),
  idProofStorageKey: varchar("idProofStorageKey", { length: 512 }).notNull(),
  idProofOriginalName: varchar("idProofOriginalName", { length: 255 }).notNull(),
  idProofMimeType: varchar("idProofMimeType", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["submitted", "reviewing", "approved", "declined"]).notNull().default("submitted"),
  notificationStatus: mysqlEnum("notificationStatus", ["pending", "sent", "failed"]).notNull().default("pending"),
  notificationSentAt: timestamp("notificationSentAt"),
  notificationError: varchar("notificationError", { length: 500 }),
  consentAt: timestamp("consentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  applicationRef: varchar("applicationRef", { length: 40 }).notNull().unique().references(() => membershipApplications.applicationRef, { onDelete: "restrict" }),
  membershipNo: varchar("membershipNo", { length: 20 }).notNull().unique(),
  fullName: varchar("fullName", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 32 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  mustChangePassword: boolean("mustChangePassword").notNull().default(true),
  role: mysqlEnum("role", ["member", "volunteer", "project_manager", "admin", "super_admin"]).notNull().default("member"),
  memberType: varchar("memberType", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["active", "suspended", "expired", "rejected"]).notNull().default("active"),
  accountStatus: mysqlEnum("accountStatus", ["active", "inactive", "locked"]).notNull().default("active"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  district: varchar("district", { length: 128 }),
  address: text("address"),
  foundationUpdatesOptIn: boolean("foundationUpdatesOptIn").notNull().default(true),
  profilePhotoKey: varchar("profilePhotoKey", { length: 512 }),
  profilePhotoUrl: varchar("profilePhotoUrl", { length: 1024 }),
  profilePhotoUpdatedAt: timestamp("profilePhotoUpdatedAt"),
  joiningDate: date("joiningDate").notNull(),
  lastLogin: timestamp("lastLogin"),
  loginAttempts: int("loginAttempts").notNull().default(0),
  lockedUntil: timestamp("lockedUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var memberMembershipCycles = mysqlTable("member_membership_cycles", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  applicationRef: varchar("applicationRef", { length: 40 }).notNull().unique().references(() => membershipApplications.applicationRef, { onDelete: "restrict" }),
  cycleNumber: int("cycleNumber").notNull(),
  membershipType: mysqlEnum("membershipType", ["annual", "lifetime"]).notNull(),
  startsOn: date("startsOn").notNull(),
  expiresOn: date("expiresOn"),
  status: mysqlEnum("status", ["active", "expired", "renewed"]).notNull().default("active"),
  expiredAt: timestamp("expiredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  memberCycleUnique: uniqueIndex("member_membership_cycles_member_cycle_unique").on(table.memberId, table.cycleNumber)
}));
var membershipExpiryAutomation = mysqlTable("membership_expiry_automation", {
  id: int("id").autoincrement().primaryKey(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).unique(),
  lastRanAt: timestamp("lastRanAt"),
  lastExpiredCount: int("lastExpiredCount").notNull().default(0),
  lastError: varchar("lastError", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var memberExpiryReminders = mysqlTable("member_expiry_reminders", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  membershipCycleId: int("membershipCycleId").notNull().references(() => memberMembershipCycles.id, { onDelete: "cascade" }),
  reminderType: mysqlEnum("reminderType", ["seven_day", "post_grace"]).notNull().default("seven_day"),
  deliveryStatus: mysqlEnum("deliveryStatus", ["pending", "sent", "failed"]).notNull().default("pending"),
  attempts: int("attempts").notNull().default(0),
  sentAt: timestamp("sentAt"),
  lastError: varchar("lastError", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  cycleReminderUnique: uniqueIndex("member_expiry_reminders_cycle_type_unique").on(table.membershipCycleId, table.reminderType)
}));
var membershipReminderAutomation = mysqlTable("membership_reminder_automation", {
  id: int("id").autoincrement().primaryKey(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).unique(),
  lastRanAt: timestamp("lastRanAt"),
  lastEligibleCount: int("lastEligibleCount").notNull().default(0),
  lastError: varchar("lastError", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var memberServiceRequests = mysqlTable("member_service_requests", {
  id: int("id").autoincrement().primaryKey(),
  requestRef: varchar("requestRef", { length: 40 }).notNull().unique(),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  serviceType: mysqlEnum("serviceType", ["digital_skill_development", "green_entrepreneurship", "mentorship_business_support", "workshops_seminars", "building_community"]).notNull(),
  // Optional MIS project link: lets a member route a programme request at a
  // specific live project. The member sees the project in their portal and
  // the Foundation team sees it on the programme-request workspace card.
  projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
  message: text("message"),
  status: mysqlEnum("status", ["submitted", "reviewing", "accepted", "not_available", "completed", "closed"]).notNull().default("submitted"),
  adminNote: text("adminNote"),
  reviewedByOpenId: varchar("reviewedByOpenId", { length: 64 }),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  // Plain index keeps the memberId FK efficient without blocking repeat
  // programme requests after a previous one was completed or closed.
  memberIdIdx: index("member_service_requests_member_id_idx").on(table.memberId)
}));
var memberServiceCompletions = mysqlTable("member_service_completions", {
  id: int("id").autoincrement().primaryKey(),
  completionRef: varchar("completionRef", { length: 40 }).notNull().unique(),
  requestId: int("requestId").notNull().references(() => memberServiceRequests.id, { onDelete: "cascade" }),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  details: text("details").notNull(),
  driveLink: varchar("driveLink", { length: 500 }),
  status: mysqlEnum("status", ["submitted", "verified", "rejected", "paid"]).notNull().default("submitted"),
  rejectionReason: text("rejectionReason"),
  verifiedByOpenId: varchar("verifiedByOpenId", { length: 64 }),
  verifiedAt: timestamp("verifiedAt"),
  paidByOpenId: varchar("paidByOpenId", { length: 64 }),
  paidAt: timestamp("paidAt"),
  payoutAmount: int("payoutAmount"),
  payoutMethod: mysqlEnum("payoutMethod", ["upi", "bank_transfer", "other"]),
  payoutReference: varchar("payoutReference", { length: 120 }),
  payoutNote: text("payoutNote"),
  // Payout destination shared by the member with their completion report so
  // the Foundation can settle the verified amount without a follow-up email.
  payoutUpiId: varchar("payoutUpiId", { length: 120 }),
  payoutAccountName: varchar("payoutAccountName", { length: 140 }),
  payoutAccountNumber: varchar("payoutAccountNumber", { length: 34 }),
  payoutIfsc: varchar("payoutIfsc", { length: 11 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  // One completion record per service request; a rejected report is resubmitted
  // by updating the same row so the member's history stays coherent.
  completionRequestUnique: uniqueIndex("member_service_completions_request_unique").on(table.requestId)
}));
var memberServiceCompletionProofs = mysqlTable("member_service_completion_proofs", {
  id: int("id").autoincrement().primaryKey(),
  completionId: int("completionId").notNull().references(() => memberServiceCompletions.id, { onDelete: "cascade" }),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => ({
  proofUnique: uniqueIndex("member_service_completion_proofs_unique").on(table.completionId, table.storageKey)
}));
var memberSupportMessages = mysqlTable("member_support_messages", {
  id: int("id").autoincrement().primaryKey(),
  messageRef: varchar("messageRef", { length: 40 }).notNull().unique(),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["submitted", "reviewing", "responded", "closed"]).notNull().default("submitted"),
  adminReply: text("adminReply"),
  repliedByOpenId: varchar("repliedByOpenId", { length: 64 }),
  repliedAt: timestamp("repliedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var accountSetupTokens = mysqlTable("account_setup_tokens", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var memberPasswordResetTokens = mysqlTable("member_password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var memberCertificateEmailTokens = mysqlTable("member_certificate_email_tokens", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var foundationAdminAlerts = mysqlTable("foundation_admin_alerts", {
  id: int("id").autoincrement().primaryKey(),
  alertType: mysqlEnum("alertType", ["member_auto_approved", "completion_submitted"]).notNull(),
  // Member-activation alerts key on the membership application; completion
  // alerts key on the completion ref — so this column is a plain unique ref
  // string, not a foreign key into one table.
  applicationRef: varchar("applicationRef", { length: 40 }).notNull().unique(),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 180 }).notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var contactInquiries = mysqlTable("contact_inquiries", {
  id: int("id").autoincrement().primaryKey(),
  inquiryRef: varchar("inquiryRef", { length: 40 }).notNull().unique(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  topic: mysqlEnum("topic", ["programmes", "membership", "donation", "partnership", "media", "other"]).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["submitted", "reviewing", "responded", "closed"]).notNull().default("submitted"),
  notificationStatus: mysqlEnum("notificationStatus", ["pending", "sent", "failed"]).notNull().default("pending"),
  notificationSentAt: timestamp("notificationSentAt"),
  notificationError: varchar("notificationError", { length: 500 }),
  consentAt: timestamp("consentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var newsletterSubscribers = mysqlTable("newsletter_subscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  source: mysqlEnum("source", ["footer", "updates_page"]).notNull().default("footer"),
  status: mysqlEnum("status", ["subscribed", "unsubscribed"]).notNull().default("subscribed"),
  consentAt: timestamp("consentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").onUpdateNow().notNull()
});
var volunteerApplications = mysqlTable("volunteer_applications", {
  id: int("id").autoincrement().primaryKey(),
  applicationRef: varchar("applicationRef", { length: 40 }).notNull().unique(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  city: varchar("city", { length: 128 }).notNull(),
  state: varchar("state", { length: 128 }).notNull(),
  skills: text("skills").notNull(),
  availability: varchar("availability", { length: 255 }).notNull(),
  interests: text("interests").notNull(),
  message: text("message"),
  status: mysqlEnum("status", ["submitted", "reviewing", "approved", "rejected", "inactive"]).notNull().default("submitted"),
  reviewerOpenId: varchar("reviewerOpenId", { length: 64 }),
  reviewNotes: text("reviewNotes"),
  notificationStatus: mysqlEnum("notificationStatus", ["pending", "sent", "failed"]).notNull().default("pending"),
  notificationSentAt: timestamp("notificationSentAt"),
  notificationError: varchar("notificationError", { length: 500 }),
  decisionNotificationStatus: mysqlEnum("decisionNotificationStatus", ["pending", "sent", "failed"]).notNull().default("pending"),
  reviewedAt: timestamp("reviewedAt"),
  consentAt: timestamp("consentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var galleryMedia = mysqlTable("gallery_media", {
  id: int("id").autoincrement().primaryKey(),
  mediaRef: varchar("mediaRef", { length: 40 }).notNull().unique(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  altText: varchar("altText", { length: 500 }).notNull(),
  quarter: varchar("quarter", { length: 80 }).notNull(),
  displayOrder: int("displayOrder").notNull().default(0),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 1024 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(),
  source: mysqlEnum("source", ["manual_upload", "google_drive", "official_archive"]).notNull().default("manual_upload"),
  sourceFileId: varchar("sourceFileId", { length: 255 }),
  status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("draft"),
  uploadedByOpenId: varchar("uploadedByOpenId", { length: 64 }).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var galleryDriveSync = mysqlTable("gallery_drive_sync", {
  id: int("id").autoincrement().primaryKey(),
  folderUrl: varchar("folderUrl", { length: 1024 }).notNull(),
  folderId: varchar("folderId", { length: 255 }).notNull().unique(),
  syncStatus: mysqlEnum("syncStatus", ["not_configured", "needs_access", "ready", "paused", "error"]).notNull().default("not_configured"),
  syncIntervalHours: int("syncIntervalHours").notNull().default(24),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  lastSyncedAt: timestamp("lastSyncedAt"),
  lastSyncError: varchar("lastSyncError", { length: 500 }),
  updatedByOpenId: varchar("updatedByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  projectName: varchar("projectName", { length: 255 }).notNull(),
  projectCode: varchar("projectCode", { length: 32 }).notNull().unique(),
  projectTheme: varchar("projectTheme", { length: 255 }).notNull(),
  projectLocation: varchar("projectLocation", { length: 255 }).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  projectStatus: mysqlEnum("projectStatus", ["planned", "active", "on_hold", "completed", "closed", "cancelled"]).notNull().default("planned"),
  projectLead: varchar("projectLead", { length: 255 }).notNull(),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var memberProjectAssignments = mysqlTable("member_project_assignments", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  projectRole: varchar("projectRole", { length: 120 }).notNull().default("Member"),
  assignmentStatus: mysqlEnum("assignmentStatus", ["active", "inactive"]).notNull().default("active"),
  assignedByOpenId: varchar("assignedByOpenId", { length: 64 }).notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var fundersPartners = mysqlTable("funders_partners", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  funderName: varchar("funderName", { length: 255 }).notNull(),
  csrCompanyName: varchar("csrCompanyName", { length: 255 }),
  ngoPartnerName: varchar("ngoPartnerName", { length: 255 }),
  mouDetails: text("mouDetails"),
  contactPerson: varchar("contactPerson", { length: 255 }),
  contactNumber: varchar("contactNumber", { length: 32 }),
  email: varchar("email", { length: 320 }),
  partnershipDetails: text("partnershipDetails"),
  reportingRequirements: text("reportingRequirements"),
  mouDocumentPath: varchar("mouDocumentPath", { length: 1024 }),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var projectObjectives = mysqlTable("project_objectives", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  problemAddressed: text("problemAddressed").notNull(),
  projectObjectives: text("projectObjectives").notNull(),
  targetOutcomes: text("targetOutcomes").notNull(),
  sdgLinkage: json("sdgLinkage").$type().notNull(),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var projectTargetGroups = mysqlTable("project_target_groups", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  beneficiaryType: varchar("beneficiaryType", { length: 180 }).notNull(),
  gender: varchar("gender", { length: 64 }),
  ageGroup: varchar("ageGroup", { length: 100 }),
  targetPopulation: text("targetPopulation"),
  targetNumber: int("targetNumber").notNull(),
  geographyLocation: varchar("geographyLocation", { length: 255 }).notNull(),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var projectActivities = mysqlTable("project_activities", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  objectiveId: int("objectiveId").references(() => projectObjectives.id, { onDelete: "set null" }),
  activityName: varchar("activityName", { length: 255 }).notNull(),
  activityDescription: text("activityDescription").notNull(),
  plannedFrequency: varchar("plannedFrequency", { length: 120 }),
  responsiblePerson: varchar("responsiblePerson", { length: 255 }).notNull(),
  activityLocation: varchar("activityLocation", { length: 255 }).notNull(),
  plannedStartDate: date("plannedStartDate").notNull(),
  plannedEndDate: date("plannedEndDate").notNull(),
  status: mysqlEnum("status", ["planned", "ongoing", "completed", "delayed", "cancelled"]).notNull().default("planned"),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var beneficiaries = mysqlTable("beneficiaries", {
  id: int("id").autoincrement().primaryKey(),
  beneficiaryId: varchar("beneficiaryId", { length: 32 }).notNull().unique(),
  beneficiaryCode: varchar("beneficiaryCode", { length: 80 }),
  name: varchar("name", { length: 255 }).notNull(),
  village: varchar("village", { length: 255 }).notNull(),
  gender: varchar("gender", { length: 64 }).notNull(),
  age: int("age").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 32 }).notNull(),
  beneficiaryCategory: varchar("beneficiaryCategory", { length: 180 }).notNull(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  activityId: int("activityId").references(() => projectActivities.id, { onDelete: "set null" }),
  registrationDate: date("registrationDate").notNull(),
  status: mysqlEnum("status", ["active", "inactive", "exited"]).notNull().default("active"),
  duplicateFlag: int("duplicateFlag").notNull().default(0),
  duplicateOverrideReason: text("duplicateOverrideReason"),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var targetsAchievement = mysqlTable("targets_achievement", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  activityId: int("activityId").references(() => projectActivities.id, { onDelete: "set null" }),
  indicator: varchar("indicator", { length: 255 }).notNull(),
  reportingPeriod: varchar("reportingPeriod", { length: 100 }).notNull(),
  periodType: mysqlEnum("periodType", ["monthly", "quarterly"]).notNull(),
  monthlyTarget: decimal("monthlyTarget", { precision: 14, scale: 2 }).notNull().default("0"),
  quarterlyTarget: decimal("quarterlyTarget", { precision: 14, scale: 2 }).notNull().default("0"),
  actualAchievement: decimal("actualAchievement", { precision: 14, scale: 2 }).notNull().default("0"),
  cumulativeAchievement: decimal("cumulativeAchievement", { precision: 14, scale: 2 }).notNull().default("0"),
  percentageAchieved: decimal("percentageAchieved", { precision: 7, scale: 2 }).notNull().default("0"),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var fieldEvents = mysqlTable("field_events", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 32 }).notNull().unique(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  activityId: int("activityId").references(() => projectActivities.id, { onDelete: "set null" }),
  eventDate: date("eventDate").notNull(),
  village: varchar("village", { length: 255 }).notNull(),
  locationDetails: text("locationDetails").notNull(),
  numParticipants: int("numParticipants").notNull(),
  staffNames: json("staffNames").$type().notNull(),
  volunteerNames: json("volunteerNames").$type().notNull(),
  observations: text("observations"),
  attachmentPaths: json("attachmentPaths").$type().notNull(),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var projectOutputs = mysqlTable("project_outputs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  activityId: int("activityId").references(() => projectActivities.id, { onDelete: "set null" }),
  outputType: mysqlEnum("outputType", ["training", "camp", "kit_distribution", "session", "household", "referral", "other"]).notNull(),
  indicator: varchar("indicator", { length: 255 }).notNull(),
  targetValue: decimal("targetValue", { precision: 14, scale: 2 }).notNull().default("0"),
  actualValue: decimal("actualValue", { precision: 14, scale: 2 }).notNull().default("0"),
  reportingPeriod: varchar("reportingPeriod", { length: 100 }).notNull(),
  notes: text("notes"),
  supportingEvidencePath: varchar("supportingEvidencePath", { length: 1024 }),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var projectOutcomes = mysqlTable("project_outcomes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  activityId: int("activityId").references(() => projectActivities.id, { onDelete: "set null" }),
  outcomeName: varchar("outcomeName", { length: 255 }).notNull(),
  behaviourChange: text("behaviourChange"),
  knowledgeChange: text("knowledgeChange"),
  skillChange: text("skillChange"),
  followUpStatus: varchar("followUpStatus", { length: 180 }),
  successStories: text("successStories"),
  outcomeIndicators: text("outcomeIndicators"),
  baselineValue: decimal("baselineValue", { precision: 14, scale: 2 }).notNull().default("0"),
  currentValue: decimal("currentValue", { precision: 14, scale: 2 }).notNull().default("0"),
  targetValue: decimal("targetValue", { precision: 14, scale: 2 }).notNull().default("0"),
  measurementDate: date("measurementDate").notNull(),
  evidencePath: varchar("evidencePath", { length: 1024 }),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var projectTeamAssignments = mysqlTable("project_team_assignments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  staffOpenId: varchar("staffOpenId", { length: 64 }),
  staffName: varchar("staffName", { length: 255 }).notNull(),
  assignmentRole: varchar("assignmentRole", { length: 180 }).notNull(),
  responsibilities: text("responsibilities").notNull(),
  contactNumber: varchar("contactNumber", { length: 32 }),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  assignmentStatus: mysqlEnum("assignmentStatus", ["active", "completed", "inactive"]).notNull().default("active"),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var projectBudgetAllocations = mysqlTable("project_budget_allocations", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  fiscalYear: varchar("fiscalYear", { length: 16 }).notNull(),
  budgetLine: varchar("budgetLine", { length: 255 }).notNull(),
  allocatedAmount: decimal("allocatedAmount", { precision: 16, scale: 2 }).notNull(),
  approvedAmount: decimal("approvedAmount", { precision: 16, scale: 2 }),
  funderSource: varchar("funderSource", { length: 255 }),
  notes: text("notes"),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var projectFinanceRecords = mysqlTable("project_finance_records", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  budgetAllocationId: int("budgetAllocationId").references(() => projectBudgetAllocations.id, { onDelete: "set null" }),
  expenseDate: date("expenseDate").notNull(),
  fiscalYear: varchar("fiscalYear", { length: 16 }).notNull(),
  expenseCategory: varchar("expenseCategory", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 16, scale: 2 }).notNull(),
  paymentMode: mysqlEnum("paymentMode", ["cash", "bank_transfer", "upi", "cheque", "card", "other"]).notNull(),
  vendorName: varchar("vendorName", { length: 255 }),
  invoiceNumber: varchar("invoiceNumber", { length: 120 }),
  description: text("description").notNull(),
  supportingDocumentPath: varchar("supportingDocumentPath", { length: 1024 }),
  approvalStatus: mysqlEnum("approvalStatus", ["pending", "approved", "rejected"]).notNull().default("pending"),
  approvedByOpenId: varchar("approvedByOpenId", { length: 64 }),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var projectDocuments = mysqlTable("project_documents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  documentType: mysqlEnum("documentType", ["proposal", "mou", "plan", "budget", "invoice", "attendance", "report", "photo", "other"]).notNull(),
  documentName: varchar("documentName", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 1024 }).notNull(),
  visibility: mysqlEnum("visibility", ["internal", "management", "public"]).notNull().default("internal"),
  reviewStatus: mysqlEnum("reviewStatus", ["draft", "approved", "archived"]).notNull().default("draft"),
  uploadedByOpenId: varchar("uploadedByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var monitoringIndicators = mysqlTable("monitoring_indicators", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  activityId: int("activityId").references(() => projectActivities.id, { onDelete: "set null" }),
  indicatorType: mysqlEnum("indicatorType", ["input", "output", "outcome"]).notNull(),
  indicatorName: varchar("indicatorName", { length: 255 }).notNull(),
  baselineValue: decimal("baselineValue", { precision: 14, scale: 2 }).notNull().default("0"),
  targetValue: decimal("targetValue", { precision: 14, scale: 2 }).notNull().default("0"),
  currentValue: decimal("currentValue", { precision: 14, scale: 2 }).notNull().default("0"),
  measurementFrequency: varchar("measurementFrequency", { length: 100 }).notNull(),
  dataSource: varchar("dataSource", { length: 255 }),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }),
  lastMeasuredAt: date("lastMeasuredAt"),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var projectRisks = mysqlTable("project_risks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  riskTitle: varchar("riskTitle", { length: 255 }).notNull(),
  riskDescription: text("riskDescription").notNull(),
  riskCategory: varchar("riskCategory", { length: 180 }).notNull(),
  severity: int("severity").notNull(),
  likelihood: int("likelihood").notNull(),
  mitigationPlan: text("mitigationPlan").notNull(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }),
  dueDate: date("dueDate"),
  status: mysqlEnum("status", ["open", "mitigating", "accepted", "closed"]).notNull().default("open"),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var projectReports = mysqlTable("project_reports", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  reportType: mysqlEnum("reportType", ["monthly", "quarterly", "annual", "donor", "field"]).notNull(),
  reportingPeriod: varchar("reportingPeriod", { length: 100 }).notNull(),
  dueDate: date("dueDate").notNull(),
  status: mysqlEnum("status", ["draft", "pending", "submitted", "approved", "overdue"]).notNull().default("draft"),
  narrative: text("narrative"),
  financeSummary: text("financeSummary"),
  documentPath: varchar("documentPath", { length: 1024 }),
  submittedAt: timestamp("submittedAt"),
  approvedByOpenId: varchar("approvedByOpenId", { length: 64 }),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var impactEvidence = mysqlTable("impact_evidence", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  evidenceType: mysqlEnum("evidenceType", ["photo", "field_story", "case_study", "survey", "report", "other"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  storageKey: varchar("storageKey", { length: 1024 }),
  consentConfirmed: int("consentConfirmed").notNull().default(0),
  visibility: mysqlEnum("visibility", ["internal", "management", "public"]).notNull().default("internal"),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var projectClosures = mysqlTable("project_closures", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique().references(() => projects.id, { onDelete: "cascade" }),
  closureDate: date("closureDate").notNull(),
  finalReportApproved: int("finalReportApproved").notNull().default(0),
  financeApproved: int("financeApproved").notNull().default(0),
  impactEvidenceAttached: int("impactEvidenceAttached").notNull().default(0),
  lessonsLearned: text("lessonsLearned").notNull(),
  closureStatus: mysqlEnum("closureStatus", ["draft", "ready_for_review", "closed"]).notNull().default("draft"),
  approvedByOpenId: varchar("approvedByOpenId", { length: 64 }),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var misAuditLogs = mysqlTable("mis_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorOpenId: varchar("actorOpenId", { length: 64 }).notNull(),
  action: varchar("action", { length: 180 }).notNull(),
  entityType: varchar("entityType", { length: 120 }).notNull(),
  entityId: varchar("entityId", { length: 80 }).notNull(),
  projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
  details: json("details").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// backend/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// shared/memberMembership.ts
var ANNUAL_MEMBERSHIP_GRACE_DAYS = 3;
function parseMembershipDate(value) {
  if (value instanceof Date) return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) throw new Error("A valid membership joining date is required.");
  return new Date(Date.UTC(year, month - 1, day));
}
function getMembershipValidity(memberType, joiningDate, now = /* @__PURE__ */ new Date()) {
  const normalizedType = memberType.trim().toLowerCase();
  if (normalizedType === "lifetime") return { membershipTypeLabel: "Lifetime Membership", expiresOn: null, graceEndsOn: null, membershipStatus: "active", portalAccessStatus: "active" };
  const joined = parseMembershipDate(joiningDate);
  const expiresOn = new Date(Date.UTC(joined.getUTCFullYear() + 1, joined.getUTCMonth(), joined.getUTCDate() - 1));
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const graceEndsOn = new Date(Date.UTC(expiresOn.getUTCFullYear(), expiresOn.getUTCMonth(), expiresOn.getUTCDate() + ANNUAL_MEMBERSHIP_GRACE_DAYS));
  const membershipStatus2 = today > expiresOn ? "expired" : "active";
  const portalAccessStatus = today > graceEndsOn ? "expired" : membershipStatus2 === "expired" ? "grace" : "active";
  return { membershipTypeLabel: "Annual Membership", expiresOn, graceEndsOn, membershipStatus: membershipStatus2, portalAccessStatus };
}

// backend/security/sensitive.ts
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
function getEncryptionKey() {
  const secret = process.env.PII_ENCRYPTION_KEY?.trim() || process.env.JWT_SECRET;
  if (!secret) throw new Error("Sensitive application data encryption is not configured. Set PII_ENCRYPTION_KEY (or the legacy JWT_SECRET fallback).");
  return createHash("sha256").update(secret).digest();
}
function encryptSensitiveValue(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}
function decryptSensitiveValue(stored) {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = stored.split(".");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Sensitive value is not in a valid encrypted format.");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}
function hashSensitiveMatchValue(value) {
  return createHmac("sha256", getEncryptionKey()).update(value.trim().toUpperCase(), "utf8").digest("hex");
}

// backend/db.ts
var _db = null;
function utcConnectionString(url) {
  const [base, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.set("timezone", "Z");
  return `${base}?${params.toString()}`;
}
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(utcConnectionString(process.env.DATABASE_URL));
      _db.$client.on("connection", (connection) => connection.query("SET time_zone = '+00:00'"));
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createPaymentTransaction(transaction) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for payment transaction creation.");
  await db.insert(paymentTransactions).values(transaction);
}
function membershipCycleDates(memberType, joiningDate) {
  const validity = getMembershipValidity(memberType, joiningDate, joiningDate);
  return { startsOn: joiningDate, expiresOn: validity.expiresOn };
}
function nextMembershipNumber(lastMembershipNo, year) {
  const lastSequence = lastMembershipNo ? Number(lastMembershipNo.split("-").at(-1)) : 0;
  return `AASW-${year}-${String(lastSequence + 1).padStart(4, "0")}`;
}
function isDuplicateKeyError(error) {
  return error instanceof Error && /duplicate|unique/i.test(error.message);
}
async function createMembershipApplicationWithActivation(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership activation.");
  const year = (/* @__PURE__ */ new Date()).getUTCFullYear();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.transaction(async (tx) => {
        await tx.insert(membershipApplications).values(input.application);
        const [existing] = await tx.select({ member: members, applicationId: membershipApplications.id, panHash: membershipApplications.panHash, panEncrypted: membershipApplications.panEncrypted }).from(members).innerJoin(membershipApplications, eq(members.applicationRef, membershipApplications.applicationRef)).where(eq(members.email, input.application.email)).limit(1);
        const now = /* @__PURE__ */ new Date();
        if (existing) {
          const verifiedPanHash = existing.panHash || hashSensitiveMatchValue(decryptSensitiveValue(existing.panEncrypted));
          if (verifiedPanHash !== input.application.panHash) throw new Error("Membership renewal identity did not match.");
          if (!existing.panHash) await tx.update(membershipApplications).set({ panHash: verifiedPanHash, updatedAt: now }).where(eq(membershipApplications.id, existing.applicationId));
          const validity = getMembershipValidity(existing.member.memberType, existing.member.joiningDate, now);
          if (existing.member.status === "active" && existing.member.accountStatus === "active" && validity.membershipStatus === "active") throw new Error("An active membership already exists for this email.");
          const [latestCycle] = await tx.select({ cycleNumber: memberMembershipCycles.cycleNumber }).from(memberMembershipCycles).where(eq(memberMembershipCycles.memberId, existing.member.id)).orderBy(desc(memberMembershipCycles.cycleNumber)).limit(1);
          if (!latestCycle) {
            const historical = membershipCycleDates(existing.member.memberType, new Date(existing.member.joiningDate));
            await tx.insert(memberMembershipCycles).values({ memberId: existing.member.id, applicationRef: existing.member.applicationRef, cycleNumber: 1, membershipType: existing.member.memberType === "lifetime" ? "lifetime" : "annual", ...historical, status: "expired", expiredAt: now });
          } else {
            await tx.update(memberMembershipCycles).set({ status: "expired", expiredAt: now, updatedAt: now }).where(and(eq(memberMembershipCycles.memberId, existing.member.id), eq(memberMembershipCycles.status, "active")));
          }
          const cycleDates2 = membershipCycleDates(input.application.membershipType, now);
          const nextCycleNumber = (latestCycle?.cycleNumber ?? 1) + 1;
          await tx.update(members).set({ applicationRef: input.application.applicationRef, fullName: input.application.fullName, phone: input.application.phone, memberType: input.application.membershipType, city: input.application.city, state: input.application.state, district: input.application.district, joiningDate: now, status: "active", accountStatus: "active", loginAttempts: 0, lockedUntil: null, updatedAt: now }).where(eq(members.id, existing.member.id));
          await tx.insert(memberMembershipCycles).values({ memberId: existing.member.id, applicationRef: input.application.applicationRef, cycleNumber: nextCycleNumber, membershipType: input.application.membershipType, ...cycleDates2, status: "active" });
          await tx.insert(foundationAdminAlerts).values({ alertType: "member_auto_approved", applicationRef: input.application.applicationRef, memberId: existing.member.id, title: "Membership renewed", message: `${input.application.fullName} \xB7 ${existing.member.membershipNo} has started a renewed membership cycle.` });
          return { memberId: existing.member.id, membershipNo: existing.member.membershipNo, isRenewal: true };
        }
        if (input.renewalIntent) throw new Error("No existing membership found for this renewal email.");
        const current = await tx.select({ membershipNo: members.membershipNo }).from(members).where(like(members.membershipNo, `AASW-${year}-%`)).orderBy(desc(members.membershipNo)).limit(1);
        const membershipNo = nextMembershipNumber(current[0]?.membershipNo ?? null, year);
        const created = await tx.insert(members).values({
          applicationRef: input.application.applicationRef,
          membershipNo,
          fullName: input.application.fullName,
          email: input.application.email,
          phone: input.application.phone,
          memberType: input.application.membershipType,
          city: input.application.city,
          state: input.application.state,
          district: input.application.district,
          joiningDate: /* @__PURE__ */ new Date()
        });
        const memberId = Number(created[0].insertId);
        const cycleDates = membershipCycleDates(input.application.membershipType, now);
        await tx.insert(memberMembershipCycles).values({ memberId, applicationRef: input.application.applicationRef, cycleNumber: 1, membershipType: input.application.membershipType, ...cycleDates, status: "active" });
        await tx.insert(accountSetupTokens).values({ memberId, tokenHash: input.setupTokenHash, expiresAt: input.setupTokenExpiresAt });
        await tx.insert(foundationAdminAlerts).values({ alertType: "member_auto_approved", applicationRef: input.application.applicationRef, memberId, title: "New member auto-approved", message: `${input.application.fullName} \xB7 ${membershipNo} is ready to set a member password.` });
        return { memberId, membershipNo, isRenewal: false };
      });
    } catch (error) {
      if (attempt < 2 && isDuplicateKeyError(error)) continue;
      throw error;
    }
  }
  throw new Error("Membership number allocation could not be completed.");
}
async function getMemberByIdentifier(identifier) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member access.");
  const rows = await db.select().from(members).where(or(eq(members.email, identifier.toLowerCase()), eq(members.membershipNo, identifier.toUpperCase()))).limit(1);
  return rows[0];
}
async function getMemberById(memberId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member access.");
  const rows = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  return rows[0];
}
async function expireMemberIfDue(member, now = /* @__PURE__ */ new Date()) {
  const validity = getMembershipValidity(member.memberType, member.joiningDate, now);
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership expiry.");
  const [currentCycle] = await db.select({ id: memberMembershipCycles.id }).from(memberMembershipCycles).where(and(eq(memberMembershipCycles.memberId, member.id), eq(memberMembershipCycles.status, "active"))).limit(1);
  if (!currentCycle && member.status === "active") {
    const cycleDates = membershipCycleDates(member.memberType, new Date(member.joiningDate));
    await db.insert(memberMembershipCycles).values({ memberId: member.id, applicationRef: member.applicationRef, cycleNumber: 1, membershipType: member.memberType === "lifetime" ? "lifetime" : "annual", ...cycleDates, status: validity.portalAccessStatus === "expired" ? "expired" : "active", expiredAt: validity.portalAccessStatus === "expired" ? now : null });
  }
  if (validity.portalAccessStatus !== "expired" || member.status === "expired") return false;
  await db.transaction(async (tx) => {
    await tx.update(members).set({ status: "expired", accountStatus: "inactive", updatedAt: now }).where(and(eq(members.id, member.id), eq(members.status, "active")));
    await tx.update(memberMembershipCycles).set({ status: "expired", expiredAt: now, updatedAt: now }).where(and(eq(memberMembershipCycles.memberId, member.id), eq(memberMembershipCycles.status, "active")));
  });
  return true;
}
async function expireDueMemberships(now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership expiry.");
  const candidates = await db.select().from(members).where(and(eq(members.status, "active"), eq(members.accountStatus, "active")));
  let expiredCount = 0;
  for (const member of candidates) if (await expireMemberIfDue(member, now)) expiredCount += 1;
  return expiredCount;
}
async function listMemberMembershipCycles(memberId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member membership history.");
  return db.select({ cycleNumber: memberMembershipCycles.cycleNumber, membershipType: memberMembershipCycles.membershipType, startsOn: memberMembershipCycles.startsOn, expiresOn: memberMembershipCycles.expiresOn, status: memberMembershipCycles.status, expiredAt: memberMembershipCycles.expiredAt, createdAt: memberMembershipCycles.createdAt }).from(memberMembershipCycles).where(eq(memberMembershipCycles.memberId, memberId)).orderBy(desc(memberMembershipCycles.cycleNumber));
}
async function getMembershipExpiryAutomationByTaskUid(taskUid) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership expiry automation.");
  const [config] = await db.select().from(membershipExpiryAutomation).where(eq(membershipExpiryAutomation.scheduleCronTaskUid, taskUid)).limit(1);
  return config;
}
async function recordMembershipExpiryAutomationRun(taskUid, input, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership expiry automation.");
  await db.update(membershipExpiryAutomation).set({ lastRanAt: now, lastExpiredCount: input.expiredCount, lastError: input.error?.slice(0, 500) ?? null, updatedAt: now }).where(eq(membershipExpiryAutomation.scheduleCronTaskUid, taskUid));
}
function utcDaysUntil(date2, now) {
  const target = new Date(date2);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const normalizedTarget = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()));
  return Math.round((normalizedTarget.getTime() - today.getTime()) / 864e5);
}
async function claimSevenDayExpiryReminderCandidates(now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership reminders.");
  const cycles = await db.select({ cycleId: memberMembershipCycles.id, memberId: members.id, fullName: members.fullName, email: members.email, membershipNo: members.membershipNo, expiresOn: memberMembershipCycles.expiresOn }).from(memberMembershipCycles).innerJoin(members, eq(memberMembershipCycles.memberId, members.id)).where(and(eq(memberMembershipCycles.status, "active"), eq(members.status, "active"), eq(members.accountStatus, "active")));
  const claimed = [];
  for (const cycle of cycles) {
    const daysRemaining = cycle.expiresOn ? utcDaysUntil(cycle.expiresOn, now) : -1;
    if (!cycle.expiresOn || daysRemaining < 0 || daysRemaining > 7) continue;
    const [existing] = await db.select({ id: memberExpiryReminders.id, deliveryStatus: memberExpiryReminders.deliveryStatus, attempts: memberExpiryReminders.attempts }).from(memberExpiryReminders).where(and(eq(memberExpiryReminders.membershipCycleId, cycle.cycleId), eq(memberExpiryReminders.reminderType, "seven_day"))).limit(1);
    if (existing) {
      if (existing.deliveryStatus === "sent" || existing.attempts >= 3) continue;
      await db.update(memberExpiryReminders).set({ deliveryStatus: "pending", attempts: existing.attempts + 1, lastError: null, updatedAt: now }).where(eq(memberExpiryReminders.id, existing.id));
      claimed.push({ reminderId: existing.id, reminderType: "seven_day", fullName: cycle.fullName, email: cycle.email, membershipNo: cycle.membershipNo, expiresOn: new Date(cycle.expiresOn) });
      continue;
    }
    try {
      const created = await db.insert(memberExpiryReminders).values({ memberId: cycle.memberId, membershipCycleId: cycle.cycleId, reminderType: "seven_day", deliveryStatus: "pending", attempts: 1 });
      claimed.push({ reminderId: Number(created[0].insertId), reminderType: "seven_day", fullName: cycle.fullName, email: cycle.email, membershipNo: cycle.membershipNo, expiresOn: new Date(cycle.expiresOn) });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
  return claimed;
}
async function claimPostGraceRenewalFollowUpCandidates(now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for post-grace membership follow-up.");
  const cycles = await db.select({ cycleId: memberMembershipCycles.id, memberId: members.id, fullName: members.fullName, email: members.email, membershipNo: members.membershipNo, expiresOn: memberMembershipCycles.expiresOn }).from(memberMembershipCycles).innerJoin(members, eq(memberMembershipCycles.memberId, members.id)).where(and(eq(memberMembershipCycles.status, "expired"), eq(memberMembershipCycles.membershipType, "annual")));
  const claimed = [];
  for (const cycle of cycles) {
    const daysSinceExpiry = cycle.expiresOn ? -utcDaysUntil(cycle.expiresOn, now) : -1;
    if (!cycle.expiresOn || daysSinceExpiry < 3) continue;
    const [existing] = await db.select({ id: memberExpiryReminders.id, deliveryStatus: memberExpiryReminders.deliveryStatus, attempts: memberExpiryReminders.attempts }).from(memberExpiryReminders).where(and(eq(memberExpiryReminders.membershipCycleId, cycle.cycleId), eq(memberExpiryReminders.reminderType, "post_grace"))).limit(1);
    if (existing) {
      if (existing.deliveryStatus === "sent" || existing.attempts >= 3) continue;
      await db.update(memberExpiryReminders).set({ deliveryStatus: "pending", attempts: existing.attempts + 1, lastError: null, updatedAt: now }).where(eq(memberExpiryReminders.id, existing.id));
      claimed.push({ reminderId: existing.id, reminderType: "post_grace", fullName: cycle.fullName, email: cycle.email, membershipNo: cycle.membershipNo, expiresOn: new Date(cycle.expiresOn) });
      continue;
    }
    try {
      const created = await db.insert(memberExpiryReminders).values({ memberId: cycle.memberId, membershipCycleId: cycle.cycleId, reminderType: "post_grace", deliveryStatus: "pending", attempts: 1 });
      claimed.push({ reminderId: Number(created[0].insertId), reminderType: "post_grace", fullName: cycle.fullName, email: cycle.email, membershipNo: cycle.membershipNo, expiresOn: new Date(cycle.expiresOn) });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
  return claimed;
}
async function markMembershipExpiryReminder(reminderId, input, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership reminders.");
  await db.update(memberExpiryReminders).set({ deliveryStatus: input.status, sentAt: input.status === "sent" ? now : null, lastError: input.status === "failed" ? input.error?.slice(0, 500) ?? "Unknown email delivery error." : null, updatedAt: now }).where(eq(memberExpiryReminders.id, reminderId));
}
async function getMembershipReminderAutomationByTaskUid(taskUid) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership reminders.");
  const [config] = await db.select().from(membershipReminderAutomation).where(eq(membershipReminderAutomation.scheduleCronTaskUid, taskUid)).limit(1);
  return config;
}
async function recordMembershipReminderAutomationRun(taskUid, input, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership reminders.");
  await db.update(membershipReminderAutomation).set({ lastRanAt: now, lastEligibleCount: input.eligibleCount, lastError: input.error?.slice(0, 500) ?? null, updatedAt: now }).where(eq(membershipReminderAutomation.scheduleCronTaskUid, taskUid));
}
async function getActiveMemberSetupToken(tokenHash, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member account setup.");
  const rows = await db.select({ tokenId: accountSetupTokens.id, memberId: members.id, membershipNo: members.membershipNo, fullName: members.fullName, email: members.email }).from(accountSetupTokens).innerJoin(members, eq(accountSetupTokens.memberId, members.id)).where(and(eq(accountSetupTokens.tokenHash, tokenHash), isNull(accountSetupTokens.usedAt), gt(accountSetupTokens.expiresAt, now))).limit(1);
  return rows[0];
}
async function setMemberPasswordFromSetupToken(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member account setup.");
  const now = input.now ?? /* @__PURE__ */ new Date();
  return db.transaction(async (tx) => {
    const rows = await tx.select({ tokenId: accountSetupTokens.id, memberId: accountSetupTokens.memberId }).from(accountSetupTokens).where(and(eq(accountSetupTokens.tokenHash, input.tokenHash), isNull(accountSetupTokens.usedAt), gt(accountSetupTokens.expiresAt, now))).limit(1);
    const token = rows[0];
    if (!token) return false;
    await tx.update(members).set({ passwordHash: input.passwordHash, mustChangePassword: false, accountStatus: "active", loginAttempts: 0, lockedUntil: null, updatedAt: now }).where(eq(members.id, token.memberId));
    await tx.update(accountSetupTokens).set({ usedAt: now }).where(and(eq(accountSetupTokens.id, token.tokenId), isNull(accountSetupTokens.usedAt)));
    return true;
  });
}
async function recordMemberLoginSuccess(memberId, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member authentication.");
  await db.update(members).set({ loginAttempts: 0, lockedUntil: null, lastLogin: now, updatedAt: now }).where(eq(members.id, memberId));
}
async function recordMemberLoginFailure(memberId, currentAttempts, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member authentication.");
  const attempts2 = currentAttempts + 1;
  const lockedUntil = attempts2 >= 5 ? new Date(now.getTime() + 15 * 60 * 1e3) : null;
  await db.update(members).set({ loginAttempts: attempts2, lockedUntil, accountStatus: lockedUntil ? "locked" : "active", updatedAt: now }).where(eq(members.id, memberId));
  return lockedUntil;
}
async function changeMemberPassword(memberId, passwordHash, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member authentication.");
  await db.update(members).set({ passwordHash, mustChangePassword: false, loginAttempts: 0, lockedUntil: null, accountStatus: "active", updatedAt: now }).where(eq(members.id, memberId));
}
async function updateMemberProfilePhoto(memberId, photo, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member profile updates.");
  await db.update(members).set({ profilePhotoKey: photo.key, profilePhotoUrl: photo.url, profilePhotoUpdatedAt: now, updatedAt: now }).where(eq(members.id, memberId));
}
async function updateMemberProfileSettings(memberId, settings, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member profile updates.");
  await db.update(members).set({ ...settings, updatedAt: now }).where(eq(members.id, memberId));
}
async function createMemberPasswordResetToken(memberId, tokenHash, expiresAt, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for password reset.");
  await db.transaction(async (tx) => {
    await tx.update(memberPasswordResetTokens).set({ usedAt: now }).where(and(eq(memberPasswordResetTokens.memberId, memberId), isNull(memberPasswordResetTokens.usedAt)));
    await tx.insert(memberPasswordResetTokens).values({ memberId, tokenHash, expiresAt });
  });
}
async function getActiveMemberPasswordResetToken(tokenHash, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for password reset.");
  const rows = await db.select({ tokenId: memberPasswordResetTokens.id, memberId: members.id, membershipNo: members.membershipNo, fullName: members.fullName, email: members.email }).from(memberPasswordResetTokens).innerJoin(members, eq(memberPasswordResetTokens.memberId, members.id)).where(and(eq(memberPasswordResetTokens.tokenHash, tokenHash), isNull(memberPasswordResetTokens.usedAt), gt(memberPasswordResetTokens.expiresAt, now))).limit(1);
  return rows[0];
}
async function createMemberCertificateEmailToken(memberId, tokenHash, expiresAt, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for certificate email access.");
  await db.transaction(async (tx) => {
    await tx.update(memberCertificateEmailTokens).set({ usedAt: now }).where(and(eq(memberCertificateEmailTokens.memberId, memberId), isNull(memberCertificateEmailTokens.usedAt)));
    await tx.insert(memberCertificateEmailTokens).values({ memberId, tokenHash, expiresAt });
  });
}
async function getActiveMemberCertificateEmailToken(tokenHash, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for certificate email access.");
  const rows = await db.select({ memberId: members.id, membershipNo: members.membershipNo, fullName: members.fullName, email: members.email, memberType: members.memberType, joiningDate: members.joiningDate, status: members.status, accountStatus: members.accountStatus }).from(memberCertificateEmailTokens).innerJoin(members, eq(memberCertificateEmailTokens.memberId, members.id)).where(and(eq(memberCertificateEmailTokens.tokenHash, tokenHash), isNull(memberCertificateEmailTokens.usedAt), gt(memberCertificateEmailTokens.expiresAt, now))).limit(1);
  return rows[0];
}
async function resetMemberPasswordFromToken(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for password reset.");
  const now = input.now ?? /* @__PURE__ */ new Date();
  return db.transaction(async (tx) => {
    const rows = await tx.select({ tokenId: memberPasswordResetTokens.id, memberId: memberPasswordResetTokens.memberId }).from(memberPasswordResetTokens).where(and(eq(memberPasswordResetTokens.tokenHash, input.tokenHash), isNull(memberPasswordResetTokens.usedAt), gt(memberPasswordResetTokens.expiresAt, now))).limit(1);
    const token = rows[0];
    if (!token) return false;
    await tx.update(members).set({ passwordHash: input.passwordHash, mustChangePassword: false, loginAttempts: 0, lockedUntil: null, accountStatus: "active", updatedAt: now }).where(eq(members.id, token.memberId));
    await tx.update(memberPasswordResetTokens).set({ usedAt: now }).where(and(eq(memberPasswordResetTokens.id, token.tokenId), isNull(memberPasswordResetTokens.usedAt)));
    return true;
  });
}
async function listMemberProjectAssignments(memberId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member projects.");
  return db.select({ assignmentId: memberProjectAssignments.id, projectRole: memberProjectAssignments.projectRole, assignedAt: memberProjectAssignments.assignedAt, projectId: projects.id, projectCode: projects.projectCode, projectName: projects.projectName, projectTheme: projects.projectTheme, projectLocation: projects.projectLocation, projectStatus: projects.projectStatus, startDate: projects.startDate, endDate: projects.endDate }).from(memberProjectAssignments).innerJoin(projects, eq(memberProjectAssignments.projectId, projects.id)).where(and(eq(memberProjectAssignments.memberId, memberId), eq(memberProjectAssignments.assignmentStatus, "active"))).orderBy(desc(memberProjectAssignments.assignedAt));
}
async function createMemberServiceRequest(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member service requests.");
  const [existing] = await db.select().from(memberServiceRequests).where(and(eq(memberServiceRequests.memberId, input.memberId), eq(memberServiceRequests.serviceType, input.serviceType), inArray(memberServiceRequests.status, ["submitted", "reviewing", "accepted"]))).limit(1);
  if (existing) return { request: existing, created: false };
  try {
    const result = await db.insert(memberServiceRequests).values({ requestRef: input.requestRef, memberId: input.memberId, serviceType: input.serviceType, projectId: input.projectId ?? null, message: input.message || null });
    const [request] = await db.select().from(memberServiceRequests).where(eq(memberServiceRequests.id, Number(result[0].insertId))).limit(1);
    if (!request) throw new Error("Member service request could not be saved.");
    return { request, created: true };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const [request] = await db.select().from(memberServiceRequests).where(and(eq(memberServiceRequests.memberId, input.memberId), eq(memberServiceRequests.serviceType, input.serviceType), inArray(memberServiceRequests.status, ["submitted", "reviewing", "accepted"]))).limit(1);
    if (!request) throw error;
    return { request, created: false };
  }
}
async function listMemberServiceRequests(memberId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member service requests.");
  return db.select({ requestRef: memberServiceRequests.requestRef, serviceType: memberServiceRequests.serviceType, projectId: memberServiceRequests.projectId, projectCode: projects.projectCode, projectName: projects.projectName, message: memberServiceRequests.message, status: memberServiceRequests.status, adminNote: memberServiceRequests.adminNote, reviewedAt: memberServiceRequests.reviewedAt, createdAt: memberServiceRequests.createdAt, updatedAt: memberServiceRequests.updatedAt }).from(memberServiceRequests).leftJoin(projects, eq(memberServiceRequests.projectId, projects.id)).where(eq(memberServiceRequests.memberId, memberId)).orderBy(desc(memberServiceRequests.createdAt));
}
async function listFoundationMemberServiceRequests(limit) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service requests.");
  return db.select({ requestRef: memberServiceRequests.requestRef, serviceType: memberServiceRequests.serviceType, projectId: memberServiceRequests.projectId, projectCode: projects.projectCode, projectName: projects.projectName, message: memberServiceRequests.message, status: memberServiceRequests.status, adminNote: memberServiceRequests.adminNote, reviewedAt: memberServiceRequests.reviewedAt, createdAt: memberServiceRequests.createdAt, fullName: members.fullName, membershipNo: members.membershipNo, email: members.email }).from(memberServiceRequests).innerJoin(members, eq(memberServiceRequests.memberId, members.id)).leftJoin(projects, eq(memberServiceRequests.projectId, projects.id)).orderBy(desc(memberServiceRequests.createdAt)).limit(limit);
}
async function updateMemberServiceRequestStatus(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service requests.");
  await db.update(memberServiceRequests).set({ status: input.status, adminNote: input.adminNote || null, reviewedByOpenId: input.reviewedByOpenId, reviewedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq(memberServiceRequests.requestRef, input.requestRef));
}
async function getMemberServiceRequestByRefAndMember(requestRef, memberId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member service requests.");
  const [request] = await db.select().from(memberServiceRequests).where(and(eq(memberServiceRequests.requestRef, requestRef), eq(memberServiceRequests.memberId, memberId))).limit(1);
  return request ?? null;
}
async function getMemberServiceCompletionByRequest(requestId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for service completions.");
  const [completion] = await db.select().from(memberServiceCompletions).where(eq(memberServiceCompletions.requestId, requestId)).limit(1);
  return completion ?? null;
}
async function countMemberServiceCompletionsByStatus() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service completions.");
  const [rows, programmeRows] = await Promise.all([
    db.select({ status: memberServiceCompletions.status, total: count(), payoutTotal: sum(memberServiceCompletions.payoutAmount) }).from(memberServiceCompletions).groupBy(memberServiceCompletions.status),
    db.select({ serviceType: memberServiceRequests.serviceType, settled: count(), settledPaise: sum(memberServiceCompletions.payoutAmount) }).from(memberServiceCompletions).innerJoin(memberServiceRequests, eq(memberServiceCompletions.requestId, memberServiceRequests.id)).where(eq(memberServiceCompletions.status, "paid")).groupBy(memberServiceRequests.serviceType)
  ]);
  const counts = { submitted: 0, verified: 0, rejected: 0, paid: 0, verifiedPayoutPaise: 0, paidPayoutPaise: 0, settledByProgramme: [] };
  for (const row of rows) {
    counts[row.status] = Number(row.total);
    if (row.status === "verified") counts.verifiedPayoutPaise = Number(row.payoutTotal ?? 0);
    if (row.status === "paid") counts.paidPayoutPaise = Number(row.payoutTotal ?? 0);
  }
  for (const row of programmeRows) counts.settledByProgramme.push({ serviceType: row.serviceType, payouts: Number(row.settled), settledPaise: Number(row.settledPaise ?? 0) });
  return counts;
}
async function listMemberCompletionActivity(limit = 12) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service completions.");
  const rows = await db.select({ completionRef: memberServiceCompletions.completionRef, serviceType: memberServiceRequests.serviceType, fullName: members.fullName, membershipNo: members.membershipNo, payoutAmount: memberServiceCompletions.payoutAmount, payoutMethod: memberServiceCompletions.payoutMethod, payoutReference: memberServiceCompletions.payoutReference, verifiedAt: memberServiceCompletions.verifiedAt, paidAt: memberServiceCompletions.paidAt, updatedAt: memberServiceCompletions.updatedAt, createdAt: memberServiceCompletions.createdAt }).from(memberServiceCompletions).innerJoin(memberServiceRequests, eq(memberServiceCompletions.requestId, memberServiceRequests.id)).innerJoin(members, eq(memberServiceCompletions.memberId, members.id)).orderBy(desc(memberServiceCompletions.updatedAt)).limit(limit);
  return rows;
}
async function listFoundationMemberServiceCompletions(limit, status) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service completions.");
  const rows = status ? await db.select({ id: memberServiceCompletions.id, completionRef: memberServiceCompletions.completionRef, requestRef: memberServiceRequests.requestRef, serviceType: memberServiceRequests.serviceType, memberId: memberServiceCompletions.memberId, details: memberServiceCompletions.details, driveLink: memberServiceCompletions.driveLink, status: memberServiceCompletions.status, rejectionReason: memberServiceCompletions.rejectionReason, payoutUpiId: memberServiceCompletions.payoutUpiId, payoutAccountName: memberServiceCompletions.payoutAccountName, payoutAccountNumber: memberServiceCompletions.payoutAccountNumber, payoutIfsc: memberServiceCompletions.payoutIfsc, payoutAmount: memberServiceCompletions.payoutAmount, payoutMethod: memberServiceCompletions.payoutMethod, payoutReference: memberServiceCompletions.payoutReference, payoutNote: memberServiceCompletions.payoutNote, verifiedAt: memberServiceCompletions.verifiedAt, paidAt: memberServiceCompletions.paidAt, createdAt: memberServiceCompletions.createdAt, updatedAt: memberServiceCompletions.updatedAt, fullName: members.fullName, membershipNo: members.membershipNo, email: members.email }).from(memberServiceCompletions).innerJoin(memberServiceRequests, eq(memberServiceCompletions.requestId, memberServiceRequests.id)).innerJoin(members, eq(memberServiceCompletions.memberId, members.id)).where(eq(memberServiceCompletions.status, status)).orderBy(desc(memberServiceCompletions.updatedAt)).limit(limit) : await db.select({ id: memberServiceCompletions.id, completionRef: memberServiceCompletions.completionRef, requestRef: memberServiceRequests.requestRef, serviceType: memberServiceRequests.serviceType, memberId: memberServiceCompletions.memberId, details: memberServiceCompletions.details, driveLink: memberServiceCompletions.driveLink, status: memberServiceCompletions.status, rejectionReason: memberServiceCompletions.rejectionReason, payoutUpiId: memberServiceCompletions.payoutUpiId, payoutAccountName: memberServiceCompletions.payoutAccountName, payoutAccountNumber: memberServiceCompletions.payoutAccountNumber, payoutIfsc: memberServiceCompletions.payoutIfsc, payoutAmount: memberServiceCompletions.payoutAmount, payoutMethod: memberServiceCompletions.payoutMethod, payoutReference: memberServiceCompletions.payoutReference, payoutNote: memberServiceCompletions.payoutNote, verifiedAt: memberServiceCompletions.verifiedAt, paidAt: memberServiceCompletions.paidAt, createdAt: memberServiceCompletions.createdAt, updatedAt: memberServiceCompletions.updatedAt, fullName: members.fullName, membershipNo: members.membershipNo, email: members.email }).from(memberServiceCompletions).innerJoin(memberServiceRequests, eq(memberServiceCompletions.requestId, memberServiceRequests.id)).innerJoin(members, eq(memberServiceCompletions.memberId, members.id)).orderBy(desc(memberServiceCompletions.updatedAt)).limit(limit);
  if (!rows.length) return [];
  const proofRows = await db.select({ completionId: memberServiceCompletionProofs.completionId, storageKey: memberServiceCompletionProofs.storageKey, originalName: memberServiceCompletionProofs.originalName, mimeType: memberServiceCompletionProofs.mimeType, fileSize: memberServiceCompletionProofs.fileSize }).from(memberServiceCompletionProofs).where(inArray(memberServiceCompletionProofs.completionId, rows.map((row) => row.id)));
  return rows.map((row) => ({ ...row, proofs: proofRows.filter((proof) => proof.completionId === row.id) }));
}
async function verifyMemberServiceCompletion(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service completions.");
  return db.transaction(async (tx) => {
    const [completion] = await tx.select().from(memberServiceCompletions).where(and(eq(memberServiceCompletions.completionRef, input.completionRef), eq(memberServiceCompletions.status, "submitted"))).limit(1).for("update");
    if (!completion) return null;
    await tx.update(memberServiceCompletions).set({ status: "verified", payoutAmount: input.payoutAmount, payoutMethod: input.payoutMethod, payoutNote: input.payoutNote || null, rejectionReason: null, verifiedByOpenId: input.verifiedByOpenId, verifiedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq(memberServiceCompletions.id, completion.id));
    return { completionRef: completion.completionRef, memberId: completion.memberId, payoutAmount: input.payoutAmount, payoutMethod: input.payoutMethod, payoutNote: input.payoutNote || null };
  });
}
async function rejectMemberServiceCompletion(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service completions.");
  const result = await db.update(memberServiceCompletions).set({ status: "rejected", rejectionReason: input.rejectionReason, verifiedByOpenId: input.verifiedByOpenId, verifiedAt: /* @__PURE__ */ new Date(), payoutAmount: null, payoutMethod: null, payoutNote: null, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(memberServiceCompletions.completionRef, input.completionRef), eq(memberServiceCompletions.status, "submitted")));
  return Number(result[0].affectedRows) > 0;
}
async function payMemberServiceCompletion(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation service completions.");
  return db.transaction(async (tx) => {
    const [completion] = await tx.select().from(memberServiceCompletions).where(and(eq(memberServiceCompletions.completionRef, input.completionRef), eq(memberServiceCompletions.status, "verified"))).limit(1).for("update");
    if (!completion) return null;
    const paidAt = /* @__PURE__ */ new Date();
    await tx.update(memberServiceCompletions).set({ status: "paid", payoutReference: input.payoutReference, paidByOpenId: input.paidByOpenId, paidAt, updatedAt: paidAt }).where(eq(memberServiceCompletions.id, completion.id));
    await tx.update(memberServiceRequests).set({ status: "completed", updatedAt: paidAt }).where(eq(memberServiceRequests.id, completion.requestId));
    return { completionRef: completion.completionRef, requestId: completion.requestId, memberId: completion.memberId, payoutAmount: completion.payoutAmount, payoutMethod: completion.payoutMethod, payoutNote: completion.payoutNote, payoutReference: input.payoutReference, paidAt };
  });
}
async function upsertMemberServiceCompletion(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for service completions.");
  const [existing] = await db.select().from(memberServiceCompletions).where(eq(memberServiceCompletions.requestId, input.requestId)).limit(1);
  if (existing && (existing.status === "submitted" || existing.status === "verified" || existing.status === "paid")) return { completion: existing, created: false };
  const proofRows = input.proofs.map((proof) => ({ storageKey: proof.storageKey, originalName: proof.originalName, mimeType: proof.mimeType, fileSize: proof.fileSize }));
  if (existing) {
    await db.transaction(async (tx) => {
      await tx.delete(memberServiceCompletionProofs).where(eq(memberServiceCompletionProofs.completionId, existing.id));
      await tx.update(memberServiceCompletions).set({ details: input.details, driveLink: input.driveLink || null, payoutUpiId: input.payoutUpiId || null, payoutAccountName: input.payoutAccountName || null, payoutAccountNumber: input.payoutAccountNumber || null, payoutIfsc: input.payoutIfsc || null, status: "submitted", rejectionReason: null, verifiedByOpenId: null, verifiedAt: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq(memberServiceCompletions.id, existing.id));
      if (proofRows.length) await tx.insert(memberServiceCompletionProofs).values(proofRows.map((row) => ({ ...row, completionId: existing.id })));
    });
    const [updated] = await db.select().from(memberServiceCompletions).where(eq(memberServiceCompletions.id, existing.id)).limit(1);
    return { completion: updated, created: false };
  }
  const result = await db.transaction(async (tx) => {
    const inserted = await tx.insert(memberServiceCompletions).values({ completionRef: input.completionRef, requestId: input.requestId, memberId: input.memberId, details: input.details, driveLink: input.driveLink || null, payoutUpiId: input.payoutUpiId || null, payoutAccountName: input.payoutAccountName || null, payoutAccountNumber: input.payoutAccountNumber || null, payoutIfsc: input.payoutIfsc || null, status: "submitted" });
    const completionId = Number(inserted[0].insertId);
    if (proofRows.length) await tx.insert(memberServiceCompletionProofs).values(proofRows.map((row) => ({ ...row, completionId })));
    return completionId;
  });
  const [completion] = await db.select().from(memberServiceCompletions).where(eq(memberServiceCompletions.id, result)).limit(1);
  return { completion, created: true };
}
async function createCompletionSubmittedAdminAlert(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation alerts.");
  await db.insert(foundationAdminAlerts).values({ alertType: "completion_submitted", applicationRef: input.completionRef, memberId: input.memberId, title: "Completion report ready to verify", message: `${input.fullName} \xB7 ${input.membershipNo} submitted a report for ${input.serviceType.replaceAll("_", " ")}.` }).onDuplicateKeyUpdate({ set: { title: "Completion report ready to verify", message: `${input.fullName} \xB7 ${input.membershipNo} submitted a report for ${input.serviceType.replaceAll("_", " ")}.`, readAt: null, createdAt: /* @__PURE__ */ new Date() } });
}
async function listMemberServiceCompletions(memberId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for service completions.");
  const rows = await db.select({ id: memberServiceCompletions.id, completionRef: memberServiceCompletions.completionRef, requestId: memberServiceCompletions.requestId, requestRef: memberServiceRequests.requestRef, serviceType: memberServiceRequests.serviceType, details: memberServiceCompletions.details, driveLink: memberServiceCompletions.driveLink, status: memberServiceCompletions.status, rejectionReason: memberServiceCompletions.rejectionReason, payoutUpiId: memberServiceCompletions.payoutUpiId, payoutAccountName: memberServiceCompletions.payoutAccountName, payoutAccountNumber: memberServiceCompletions.payoutAccountNumber, payoutIfsc: memberServiceCompletions.payoutIfsc, payoutAmount: memberServiceCompletions.payoutAmount, payoutMethod: memberServiceCompletions.payoutMethod, payoutReference: memberServiceCompletions.payoutReference, payoutNote: memberServiceCompletions.payoutNote, verifiedAt: memberServiceCompletions.verifiedAt, paidAt: memberServiceCompletions.paidAt, createdAt: memberServiceCompletions.createdAt, updatedAt: memberServiceCompletions.updatedAt }).from(memberServiceCompletions).innerJoin(memberServiceRequests, eq(memberServiceCompletions.requestId, memberServiceRequests.id)).where(eq(memberServiceCompletions.memberId, memberId)).orderBy(desc(memberServiceCompletions.updatedAt));
  if (!rows.length) return [];
  const proofRows = await db.select({ completionId: memberServiceCompletionProofs.completionId, originalName: memberServiceCompletionProofs.originalName, mimeType: memberServiceCompletionProofs.mimeType, fileSize: memberServiceCompletionProofs.fileSize, storageKey: memberServiceCompletionProofs.storageKey }).from(memberServiceCompletionProofs).innerJoin(memberServiceCompletions, eq(memberServiceCompletionProofs.completionId, memberServiceCompletions.id)).where(inArray(memberServiceCompletions.id, rows.map((row) => row.id)));
  return rows.map((row) => ({ ...row, proofs: proofRows.filter((proof) => proof.completionId === row.id).map((proof) => ({ originalName: proof.originalName, mimeType: proof.mimeType, fileSize: proof.fileSize, storageKey: proof.storageKey })) }));
}
async function createMemberSupportMessage(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member support messages.");
  const result = await db.insert(memberSupportMessages).values(input);
  const [message] = await db.select().from(memberSupportMessages).where(eq(memberSupportMessages.id, Number(result[0].insertId))).limit(1);
  if (!message) throw new Error("Member support message could not be saved.");
  return message;
}
async function listMemberSupportMessages(memberId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member support messages.");
  return db.select({ messageRef: memberSupportMessages.messageRef, message: memberSupportMessages.message, status: memberSupportMessages.status, adminReply: memberSupportMessages.adminReply, repliedAt: memberSupportMessages.repliedAt, createdAt: memberSupportMessages.createdAt, updatedAt: memberSupportMessages.updatedAt }).from(memberSupportMessages).where(eq(memberSupportMessages.memberId, memberId)).orderBy(asc(memberSupportMessages.createdAt));
}
async function listFoundationMemberSupportMessages(limit) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation support messages.");
  return db.select({ messageRef: memberSupportMessages.messageRef, message: memberSupportMessages.message, status: memberSupportMessages.status, adminReply: memberSupportMessages.adminReply, repliedAt: memberSupportMessages.repliedAt, createdAt: memberSupportMessages.createdAt, fullName: members.fullName, membershipNo: members.membershipNo, email: members.email }).from(memberSupportMessages).innerJoin(members, eq(memberSupportMessages.memberId, members.id)).orderBy(desc(memberSupportMessages.updatedAt)).limit(limit);
}
async function respondToMemberSupportMessage(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation support messages.");
  const hasReply = Boolean(input.adminReply?.trim());
  await db.update(memberSupportMessages).set({ status: input.status, adminReply: hasReply ? input.adminReply.trim() : null, repliedByOpenId: hasReply ? input.repliedByOpenId : null, repliedAt: hasReply ? /* @__PURE__ */ new Date() : null, updatedAt: /* @__PURE__ */ new Date() }).where(eq(memberSupportMessages.messageRef, input.messageRef));
}
async function listMembersForAdmin(limit = 200) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member administration.");
  return db.select({ id: members.id, membershipNo: members.membershipNo, fullName: members.fullName, email: members.email, memberType: members.memberType, role: members.role, status: members.status, accountStatus: members.accountStatus, joiningDate: members.joiningDate, lastLogin: members.lastLogin }).from(members).orderBy(desc(members.createdAt)).limit(limit);
}
async function listMembersWithProgrammeProfile(limit = 200) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member administration.");
  const memberRows = await db.select({ id: members.id, membershipNo: members.membershipNo, fullName: members.fullName, email: members.email, memberType: members.memberType, role: members.role, status: members.status, accountStatus: members.accountStatus, joiningDate: members.joiningDate, lastLogin: members.lastLogin }).from(members).orderBy(desc(members.createdAt)).limit(limit);
  if (!memberRows.length) return [];
  const ids = memberRows.map((row) => row.id);
  const [requestRows, completionRows] = await Promise.all([
    db.select({ memberId: memberServiceRequests.memberId, total: count() }).from(memberServiceRequests).where(inArray(memberServiceRequests.memberId, ids)).groupBy(memberServiceRequests.memberId),
    db.select({ memberId: memberServiceCompletions.memberId, status: memberServiceCompletions.status, total: count(), payoutTotal: sum(memberServiceCompletions.payoutAmount), lastTouched: max(memberServiceCompletions.updatedAt) }).from(memberServiceCompletions).where(inArray(memberServiceCompletions.memberId, ids)).groupBy(memberServiceCompletions.memberId, memberServiceCompletions.status)
  ]);
  return memberRows.map((member) => {
    const requestCount = Number(requestRows.find((row) => row.memberId === member.id)?.total ?? 0);
    const rows = completionRows.filter((row) => row.memberId === member.id);
    const completions = { submitted: 0, verified: 0, rejected: 0, paid: 0 };
    let settledPaise = 0;
    let lastProgrammeActivityAt = null;
    for (const row of rows) {
      completions[row.status] = Number(row.total);
      if (row.status === "paid") settledPaise = Number(row.payoutTotal ?? 0);
      const touched = row.lastTouched ? new Date(row.lastTouched) : null;
      if (touched && (!lastProgrammeActivityAt || touched > lastProgrammeActivityAt)) lastProgrammeActivityAt = touched;
    }
    return { ...member, programmeRequests: requestCount, completions, settledPaise, lastProgrammeActivityAt };
  });
}
async function assignMemberToProject(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member project assignment.");
  const existing = await db.select({ id: memberProjectAssignments.id }).from(memberProjectAssignments).where(and(eq(memberProjectAssignments.memberId, input.memberId), eq(memberProjectAssignments.projectId, input.projectId))).limit(1);
  if (existing[0]) {
    await db.update(memberProjectAssignments).set({ projectRole: input.projectRole, assignmentStatus: "active", assignedByOpenId: input.assignedByOpenId, updatedAt: /* @__PURE__ */ new Date() }).where(eq(memberProjectAssignments.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(memberProjectAssignments).values({ ...input, assignmentStatus: "active" });
  return Number(result[0].insertId);
}
async function assignProjectToAllActiveMembers(projectId4, assignedByOpenId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member project assignment.");
  const activeMembers = await db.select({ id: members.id }).from(members).where(and(eq(members.status, "active"), eq(members.accountStatus, "active")));
  if (!activeMembers.length) return 0;
  const assignedMemberIds = new Set((await db.select({ memberId: memberProjectAssignments.memberId }).from(memberProjectAssignments).where(eq(memberProjectAssignments.projectId, projectId4))).map((row) => row.memberId));
  const pending = activeMembers.filter((member) => !assignedMemberIds.has(member.id));
  if (!pending.length) return 0;
  const result = await db.insert(memberProjectAssignments).values(pending.map((member) => ({ memberId: member.id, projectId: projectId4, projectRole: "Member", assignedByOpenId, assignmentStatus: "active" })));
  return result[0].affectedRows ?? pending.length;
}
async function subscribeNewsletterEmail(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for newsletter subscription.");
  try {
    await db.insert(newsletterSubscribers).values(input);
    return { created: true };
  } catch (error) {
    const duplicateSignals = [error, error instanceof Error ? error.cause : null];
    const isDuplicate = duplicateSignals.some((candidate) => {
      if (!candidate) return false;
      const record = candidate;
      return typeof record.message === "string" && /duplicate|unique/i.test(record.message) || record.errno === 1062 || record.code === "ER_DUP_ENTRY";
    });
    if (!isDuplicate) throw error;
    await db.update(newsletterSubscribers).set({ status: "subscribed", source: input.source ?? "footer", updatedAt: /* @__PURE__ */ new Date() }).where(eq(newsletterSubscribers.email, input.email));
    return { created: false };
  }
}
async function createContactInquiry(inquiry) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for inquiry submission.");
  await db.insert(contactInquiries).values(inquiry);
}
async function createDonationIntent(intent) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for donation detail submission.");
  await db.insert(donationIntents).values(intent);
}
async function markDonationIntentNotification(donationRef, status, error) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for donation notification tracking.");
  await db.update(donationIntents).set({ notificationStatus: status, notificationSentAt: status === "sent" ? /* @__PURE__ */ new Date() : null, notificationError: status === "failed" ? error?.slice(0, 500) ?? "Unknown notification error." : null, updatedAt: /* @__PURE__ */ new Date() }).where(eq(donationIntents.donationRef, donationRef));
}
async function markContactInquiryNotification(inquiryRef, status, error) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for inquiry notification tracking.");
  await db.update(contactInquiries).set({
    notificationStatus: status,
    notificationSentAt: status === "sent" ? /* @__PURE__ */ new Date() : null,
    notificationError: status === "failed" ? error?.slice(0, 500) ?? "Unknown notification error." : null,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(contactInquiries.inquiryRef, inquiryRef));
}
async function markMembershipApplicationNotification(applicationRef, status, error) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for membership notification tracking.");
  await db.update(membershipApplications).set({
    notificationStatus: status,
    notificationSentAt: status === "sent" ? /* @__PURE__ */ new Date() : null,
    notificationError: status === "failed" ? error?.slice(0, 500) ?? "Unknown notification error." : null,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(membershipApplications.applicationRef, applicationRef));
}
async function getPaymentTransactionByGatewayOrderId(gatewayOrderId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for payment lookup.");
  const rows = await db.select().from(paymentTransactions).where(eq(paymentTransactions.gatewayOrderId, gatewayOrderId)).limit(1);
  return rows[0];
}
async function markPaymentTransactionRefundedByPaymentId(gatewayPaymentId, gatewayRefundId, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for payment status update.");
  return db.transaction(async (tx) => {
    const [result] = await tx.update(paymentTransactions).set({ status: "refunded", updatedAt: now }).where(and(eq(paymentTransactions.gatewayPaymentId, gatewayPaymentId), inArray(paymentTransactions.status, ["verified", "captured"])));
    if (result.affectedRows === 0) return { matched: false };
    await tx.insert(misAuditLogs).values({ actorOpenId: "razorpay-webhook", action: "PAYMENT_REFUNDED_EXTERNALLY", entityType: "payment_transaction", entityId: gatewayPaymentId, details: { gatewayRefundId } });
    return { matched: true };
  });
}
async function getPaymentTransactionByReceipt(receipt) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for payment lookup.");
  const rows = await db.select().from(paymentTransactions).where(eq(paymentTransactions.receipt, receipt)).limit(1);
  return rows[0];
}
async function markPaymentTransactionStatus(gatewayOrderId, status, gatewayPaymentId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for payment status update.");
  await db.update(paymentTransactions).set({ status, gatewayPaymentId, updatedAt: /* @__PURE__ */ new Date() }).where(eq(paymentTransactions.gatewayOrderId, gatewayOrderId));
}
async function claimPaymentReceiptDelivery(receipt) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for receipt delivery.");
  const [result] = await db.update(paymentTransactions).set({ receiptDeliveryStatus: "sending", receiptError: null, updatedAt: /* @__PURE__ */ new Date() }).where(and(
    eq(paymentTransactions.receipt, receipt),
    eq(paymentTransactions.receiptDeliveryStatus, "pending"),
    inArray(paymentTransactions.status, ["verified", "captured"])
  ));
  return result.affectedRows === 1;
}
async function markPaymentReceiptSent(receipt, messageId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for receipt delivery.");
  await db.update(paymentTransactions).set({ receiptDeliveryStatus: "sent", receiptSentAt: /* @__PURE__ */ new Date(), receiptMessageId: messageId, receiptError: null, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(paymentTransactions.receipt, receipt), eq(paymentTransactions.receiptDeliveryStatus, "sending")));
}
async function markPaymentReceiptFailed(receipt, message) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for receipt delivery.");
  await db.update(paymentTransactions).set({ receiptDeliveryStatus: "failed", receiptError: message.slice(0, 500), updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(paymentTransactions.receipt, receipt), eq(paymentTransactions.receiptDeliveryStatus, "sending")));
}
async function getPaymentWebhookEvent(gatewayEventId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for webhook lookup.");
  const rows = await db.select().from(paymentWebhookEvents).where(eq(paymentWebhookEvents.gatewayEventId, gatewayEventId)).limit(1);
  return rows[0];
}
async function createPaymentWebhookEvent(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for webhook creation.");
  await db.insert(paymentWebhookEvents).values(input);
}
async function markPaymentWebhookEventProcessed(gatewayEventId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for webhook update.");
  await db.update(paymentWebhookEvents).set({ status: "processed", processedAt: /* @__PURE__ */ new Date() }).where(eq(paymentWebhookEvents.gatewayEventId, gatewayEventId));
}
async function recordPaymentRefundInitiated(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for refund recording.");
  const now = /* @__PURE__ */ new Date();
  return db.transaction(async (tx) => {
    await tx.insert(paymentRefunds).values({ refundRef: input.refundRef, receipt: input.receipt, gatewayPaymentId: input.gatewayPaymentId, gatewayRefundId: input.gatewayRefundId, amount: input.amount, reason: input.reason || null, initiatedByOpenId: input.initiatedByOpenId, status: "initiated" });
    await tx.update(paymentTransactions).set({ updatedAt: now }).where(eq(paymentTransactions.receipt, input.receipt));
    await tx.insert(misAuditLogs).values({ actorOpenId: input.initiatedByOpenId, action: "PAYMENT_REFUND_CREATED", entityType: "payment_refund", entityId: input.refundRef, details: { receipt: input.receipt, gatewayRefundId: input.gatewayRefundId, amount: input.amount } });
    return { refundRef: input.refundRef };
  });
}
async function markPaymentRefundProcessed(gatewayRefundId, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for refund update.");
  return db.transaction(async (tx) => {
    const [refund] = await tx.select().from(paymentRefunds).where(eq(paymentRefunds.gatewayRefundId, gatewayRefundId)).limit(1);
    if (!refund) return { matched: false };
    if (refund.status === "processed") return { matched: true, alreadyProcessed: true, refund };
    await tx.update(paymentRefunds).set({ status: "processed", processedAt: now, updatedAt: now }).where(eq(paymentRefunds.id, refund.id));
    await tx.update(paymentTransactions).set({ status: "refunded", updatedAt: now }).where(eq(paymentTransactions.receipt, refund.receipt));
    await tx.insert(misAuditLogs).values({ actorOpenId: "razorpay-webhook", action: "PAYMENT_REFUND_PROCESSED", entityType: "payment_refund", entityId: refund.refundRef, details: { gatewayRefundId, receipt: refund.receipt } });
    return { matched: true, alreadyProcessed: false, refund };
  });
}
async function getPaymentRefundByGatewayRefundId(gatewayRefundId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for refund lookup.");
  const rows = await db.select().from(paymentRefunds).where(eq(paymentRefunds.gatewayRefundId, gatewayRefundId)).limit(1);
  return rows[0];
}
async function getPaymentRefundsByReceipt(receipt) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for refund lookup.");
  return db.select({ refundRef: paymentRefunds.refundRef, status: paymentRefunds.status, amount: paymentRefunds.amount, gatewayRefundId: paymentRefunds.gatewayRefundId }).from(paymentRefunds).where(and(eq(paymentRefunds.receipt, receipt), inArray(paymentRefunds.status, ["initiated", "processed"])));
}
async function markPaymentRefundFailed(gatewayRefundId, error, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for refund update.");
  await db.update(paymentRefunds).set({ status: "failed", reason: error.slice(0, 500), updatedAt: now }).where(and(eq(paymentRefunds.gatewayRefundId, gatewayRefundId), eq(paymentRefunds.status, "initiated")));
}
async function markPaymentRefundNotified(refundRef, status, error, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for refund notification tracking.");
  await db.update(paymentRefunds).set({ notificationStatus: status, notificationError: status === "failed" ? error?.slice(0, 500) ?? "Unknown refund notification error." : null, updatedAt: now }).where(eq(paymentRefunds.refundRef, refundRef));
}
async function listPaymentRefunds(limit) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for refund listing.");
  return db.select({ refundRef: paymentRefunds.refundRef, receipt: paymentRefunds.receipt, amount: paymentRefunds.amount, status: paymentRefunds.status, reason: paymentRefunds.reason, notificationStatus: paymentRefunds.notificationStatus, processedAt: paymentRefunds.processedAt, createdAt: paymentRefunds.createdAt, supporterName: paymentTransactions.supporterName, supporterEmail: paymentTransactions.supporterEmail }).from(paymentRefunds).innerJoin(paymentTransactions, eq(paymentRefunds.receipt, paymentTransactions.receipt)).orderBy(desc(paymentRefunds.createdAt)).limit(limit);
}
async function createVolunteerApplication(application) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for volunteer application submission.");
  await db.insert(volunteerApplications).values(application);
}
async function markVolunteerApplicationNotification(applicationRef, status, error) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for volunteer notification tracking.");
  await db.update(volunteerApplications).set({ notificationStatus: status, notificationSentAt: status === "sent" ? /* @__PURE__ */ new Date() : null, notificationError: status === "failed" ? error?.slice(0, 500) ?? "Unknown volunteer notification error." : null, updatedAt: /* @__PURE__ */ new Date() }).where(eq(volunteerApplications.applicationRef, applicationRef));
}
async function markVolunteerDecisionNotification(applicationRef, status, error) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for volunteer notification tracking.");
  await db.update(volunteerApplications).set({ decisionNotificationStatus: status, notificationError: status === "failed" ? error?.slice(0, 500) ?? "Unknown volunteer decision notification error." : null, updatedAt: /* @__PURE__ */ new Date() }).where(eq(volunteerApplications.applicationRef, applicationRef));
}
async function listVolunteerApplications(limit, status) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for volunteer review.");
  const selection = { applicationRef: volunteerApplications.applicationRef, fullName: volunteerApplications.fullName, email: volunteerApplications.email, phone: volunteerApplications.phone, city: volunteerApplications.city, state: volunteerApplications.state, skills: volunteerApplications.skills, availability: volunteerApplications.availability, interests: volunteerApplications.interests, message: volunteerApplications.message, status: volunteerApplications.status, reviewNotes: volunteerApplications.reviewNotes, notificationStatus: volunteerApplications.notificationStatus, decisionNotificationStatus: volunteerApplications.decisionNotificationStatus, reviewedAt: volunteerApplications.reviewedAt, createdAt: volunteerApplications.createdAt };
  const query = db.select(selection).from(volunteerApplications);
  if (status) return query.where(eq(volunteerApplications.status, status)).orderBy(desc(volunteerApplications.createdAt)).limit(limit);
  return query.orderBy(desc(volunteerApplications.createdAt)).limit(limit);
}
async function updateVolunteerApplicationStatus(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for volunteer review.");
  const now = /* @__PURE__ */ new Date();
  await db.transaction(async (tx) => {
    await tx.update(volunteerApplications).set({ status: input.status, reviewNotes: input.reviewNotes || null, reviewerOpenId: input.reviewerOpenId, reviewedAt: now, updatedAt: now }).where(eq(volunteerApplications.applicationRef, input.applicationRef));
    await tx.insert(misAuditLogs).values({ actorOpenId: input.reviewerOpenId, action: `VOLUNTEER_APPLICATION_${input.status.toUpperCase()}`, entityType: "volunteer_application", entityId: input.applicationRef, details: { notes: input.reviewNotes?.slice(0, 200) ?? null } });
  });
}
async function getVolunteerApplicationByRef(applicationRef) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for volunteer review.");
  const rows = await db.select().from(volunteerApplications).where(eq(volunteerApplications.applicationRef, applicationRef)).limit(1);
  return rows[0];
}
async function listMemberPaymentReceipts(email, limit = 25) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member receipts.");
  const payments = await db.select({ receipt: paymentTransactions.receipt, kind: paymentTransactions.kind, amount: paymentTransactions.amount, currency: paymentTransactions.currency, status: paymentTransactions.status, gatewayPaymentId: paymentTransactions.gatewayPaymentId, createdAt: paymentTransactions.createdAt }).from(paymentTransactions).where(eq(paymentTransactions.supporterEmail, email.toLowerCase())).orderBy(desc(paymentTransactions.createdAt)).limit(limit);
  return payments.map((row) => ({ ...row, kind: row.kind }));
}
async function listMemberPaymentReceiptsWithPayouts(email, memberId, limit = 25) {
  const [payments, payouts] = await Promise.all([
    listMemberPaymentReceipts(email, limit),
    (async () => {
      const db = await getDb();
      if (!db) throw new Error("Database is unavailable for member receipts.");
      return db.select({ receipt: memberServiceCompletions.completionRef, amount: memberServiceCompletions.payoutAmount, reference: memberServiceCompletions.payoutReference, method: memberServiceCompletions.payoutMethod, upiId: memberServiceCompletions.payoutUpiId, accountNumber: memberServiceCompletions.payoutAccountNumber, paidAt: memberServiceCompletions.paidAt, programmeType: memberServiceRequests.serviceType }).from(memberServiceCompletions).innerJoin(memberServiceRequests, eq(memberServiceCompletions.requestId, memberServiceRequests.id)).where(and(eq(memberServiceCompletions.memberId, memberId), eq(memberServiceCompletions.status, "paid"))).orderBy(desc(memberServiceCompletions.paidAt)).limit(limit);
    })()
  ]);
  return [...payments, ...payouts.map((payout) => ({ receipt: payout.receipt, kind: "payout", amount: payout.amount ?? 0, currency: "INR", status: "paid", gatewayPaymentId: payout.reference, payoutMethod: payout.method, payoutDestination: payout.upiId ? `UPI \xB7 ${payout.upiId}` : payout.accountNumber ? `Bank \xB7 ${payout.accountNumber.replace(/.(?=.{4})/g, "\u2022")}` : null, programme: payout.programmeType ? payout.programmeType.replaceAll("_", " ") : null, createdAt: payout.paidAt ?? /* @__PURE__ */ new Date(0) }))].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, limit);
}
async function getMemberPaymentReceipt(receipt, email) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for member receipts.");
  const rows = await db.select({ receipt: paymentTransactions.receipt, kind: paymentTransactions.kind, amount: paymentTransactions.amount, currency: paymentTransactions.currency, status: paymentTransactions.status, gatewayPaymentId: paymentTransactions.gatewayPaymentId, supporterName: paymentTransactions.supporterName, supporterEmail: paymentTransactions.supporterEmail, createdAt: paymentTransactions.createdAt }).from(paymentTransactions).where(and(eq(paymentTransactions.receipt, receipt), eq(paymentTransactions.supporterEmail, email.toLowerCase()))).limit(1);
  return rows[0];
}
async function getFoundationManagementSummary() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  const [[membership], [inquiry], [donation], [payment], [media], [unreadAlert], [volunteer], [pendingRequests], payoutStats] = await Promise.all([
    db.select({ total: count() }).from(membershipApplications),
    db.select({ total: count() }).from(contactInquiries),
    db.select({ total: count() }).from(donationIntents),
    db.select({ total: count() }).from(paymentTransactions),
    db.select({ total: count() }).from(galleryMedia).where(eq(galleryMedia.status, "published")),
    db.select({ total: count() }).from(foundationAdminAlerts).where(isNull(foundationAdminAlerts.readAt)),
    db.select({ total: count() }).from(volunteerApplications),
    // New programme requests that still need an accept/decline decision.
    db.select({ total: count() }).from(memberServiceRequests).where(eq(memberServiceRequests.status, "submitted")),
    countMemberServiceCompletionsByStatus()
  ]);
  return { memberships: membership?.total ?? 0, inquiries: inquiry?.total ?? 0, donations: donation?.total ?? 0, payments: payment?.total ?? 0, publishedMedia: media?.total ?? 0, unreadAdminAlerts: unreadAlert?.total ?? 0, volunteers: volunteer?.total ?? 0, programmeRequests: pendingRequests?.total ?? 0, payoutQueue: payoutStats.verified, payoutQueuePaise: payoutStats.verifiedPayoutPaise, settledPayouts: payoutStats.paid, settledPayoutPaise: payoutStats.paidPayoutPaise };
}
async function listFoundationAdminAlerts(limit) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation alerts.");
  return db.select({ id: foundationAdminAlerts.id, alertType: foundationAdminAlerts.alertType, applicationRef: foundationAdminAlerts.applicationRef, title: foundationAdminAlerts.title, message: foundationAdminAlerts.message, readAt: foundationAdminAlerts.readAt, createdAt: foundationAdminAlerts.createdAt }).from(foundationAdminAlerts).orderBy(desc(foundationAdminAlerts.createdAt)).limit(limit);
}
async function markFoundationAdminAlertRead(alertId, now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation alerts.");
  await db.update(foundationAdminAlerts).set({ readAt: now }).where(and(eq(foundationAdminAlerts.id, alertId), isNull(foundationAdminAlerts.readAt)));
}
async function listMembershipApplications(limit) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  return db.select({ applicationRef: membershipApplications.applicationRef, fullName: membershipApplications.fullName, email: membershipApplications.email, phone: membershipApplications.phone, district: membershipApplications.district, state: membershipApplications.state, membershipType: membershipApplications.membershipType, status: membershipApplications.status, notificationStatus: membershipApplications.notificationStatus, idProofType: membershipApplications.idProofType, idProofOriginalName: membershipApplications.idProofOriginalName, createdAt: membershipApplications.createdAt, updatedAt: membershipApplications.updatedAt }).from(membershipApplications).orderBy(desc(membershipApplications.createdAt)).limit(limit);
}
async function updateMembershipApplicationStatus(applicationRef, status) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  await db.update(membershipApplications).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq(membershipApplications.applicationRef, applicationRef));
}
async function getMembershipApplicationProofKey(applicationRef) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  const rows = await db.select({ idProofStorageKey: membershipApplications.idProofStorageKey }).from(membershipApplications).where(eq(membershipApplications.applicationRef, applicationRef)).limit(1);
  return rows[0]?.idProofStorageKey;
}
async function listContactInquiries(limit) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  return db.select().from(contactInquiries).orderBy(desc(contactInquiries.createdAt)).limit(limit);
}
async function updateContactInquiryStatus(inquiryRef, status) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  await db.update(contactInquiries).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq(contactInquiries.inquiryRef, inquiryRef));
}
async function listDonationIntents(limit) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  return db.select({ donationRef: donationIntents.donationRef, fullName: donationIntents.fullName, email: donationIntents.email, phone: donationIntents.phone, state: donationIntents.state, city: donationIntents.city, amount: donationIntents.amount, status: donationIntents.status, notificationStatus: donationIntents.notificationStatus, paymentReceipt: donationIntents.paymentReceipt, createdAt: donationIntents.createdAt, updatedAt: donationIntents.updatedAt }).from(donationIntents).orderBy(desc(donationIntents.createdAt)).limit(limit);
}
async function updateDonationIntentStatus(donationRef, status) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  await db.update(donationIntents).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq(donationIntents.donationRef, donationRef));
}
async function listPaymentTransactions(limit) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation management.");
  return db.select().from(paymentTransactions).orderBy(desc(paymentTransactions.createdAt)).limit(limit);
}
async function createGalleryMedia(media) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation media management.");
  await db.insert(galleryMedia).values(media);
}
async function listGalleryMedia(limit, publishedOnly = false) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation media management.");
  if (publishedOnly) return db.select().from(galleryMedia).where(eq(galleryMedia.status, "published")).orderBy(asc(galleryMedia.displayOrder), desc(galleryMedia.createdAt)).limit(limit);
  return db.select().from(galleryMedia).orderBy(asc(galleryMedia.displayOrder), desc(galleryMedia.createdAt)).limit(limit);
}
async function isPublishedGalleryStorageKey(storageKey) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation media management.");
  const [media] = await db.select({ id: galleryMedia.id }).from(galleryMedia).where(and(eq(galleryMedia.storageKey, storageKey), eq(galleryMedia.status, "published"))).limit(1);
  return Boolean(media);
}
async function updateGalleryMedia(mediaRef, input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation media management.");
  await db.update(galleryMedia).set({ ...input, publishedAt: input.status === "published" ? /* @__PURE__ */ new Date() : void 0, updatedAt: /* @__PURE__ */ new Date() }).where(eq(galleryMedia.mediaRef, mediaRef));
}
async function getGalleryDriveSyncConfig() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation Drive configuration.");
  const [config] = await db.select().from(galleryDriveSync).orderBy(desc(galleryDriveSync.updatedAt)).limit(1);
  return config;
}
async function saveGalleryDriveSyncConfig(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Foundation Drive configuration.");
  const existing = await getGalleryDriveSyncConfig();
  const values = { folderUrl: input.folderUrl, folderId: input.folderId, syncIntervalHours: input.syncIntervalHours, syncStatus: "needs_access", scheduleCronTaskUid: null, lastSyncedAt: null, lastSyncError: "Awaiting authorised Drive access before sync can be enabled.", updatedByOpenId: input.updatedByOpenId, updatedAt: /* @__PURE__ */ new Date() };
  if (existing) {
    await db.update(galleryDriveSync).set(values).where(eq(galleryDriveSync.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(galleryDriveSync).values(values);
  return Number(result[0].insertId);
}
async function listMisProjects(limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  return db.select().from(projects).orderBy(desc(projects.createdAt)).limit(limit);
}
async function getMisProject(projectId4) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId4)).limit(1);
  if (!project) return void 0;
  const [partners, objectives, targetGroups, activities] = await Promise.all([
    db.select().from(fundersPartners).where(eq(fundersPartners.projectId, projectId4)).orderBy(desc(fundersPartners.createdAt)),
    db.select().from(projectObjectives).where(eq(projectObjectives.projectId, projectId4)).orderBy(desc(projectObjectives.createdAt)),
    db.select().from(projectTargetGroups).where(eq(projectTargetGroups.projectId, projectId4)).orderBy(desc(projectTargetGroups.createdAt)),
    db.select().from(projectActivities).where(eq(projectActivities.projectId, projectId4)).orderBy(desc(projectActivities.createdAt))
  ]);
  return { project, partners, objectives, targetGroups, activities };
}
async function getNextProjectSequence() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const [result] = await db.select({ total: count() }).from(projects);
  return Number(result?.total ?? 0) + 1;
}
async function createMisProject(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projects).values(input);
  return Number(result[0].insertId);
}
async function createMisFunderPartner(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(fundersPartners).values(input);
  return Number(result[0].insertId);
}
async function createMisObjective(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projectObjectives).values(input);
  return Number(result[0].insertId);
}
async function createMisTargetGroup(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projectTargetGroups).values(input);
  return Number(result[0].insertId);
}
async function createMisActivity(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projectActivities).values(input);
  return Number(result[0].insertId);
}
async function getNextBeneficiarySequence() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const [result] = await db.select({ total: count() }).from(beneficiaries);
  return Number(result?.total ?? 0) + 1;
}
async function getNextFieldEventSequence() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const [result] = await db.select({ total: count() }).from(fieldEvents);
  return Number(result?.total ?? 0) + 1;
}
async function findDuplicateBeneficiary(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  return db.select({ id: beneficiaries.id, beneficiaryId: beneficiaries.beneficiaryId, projectId: beneficiaries.projectId }).from(beneficiaries).where(and(eq(beneficiaries.name, input.name), eq(beneficiaries.phoneNumber, input.phoneNumber), eq(beneficiaries.village, input.village))).limit(5);
}
async function createMisBeneficiary(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(beneficiaries).values(input);
  return Number(result[0].insertId);
}
async function listMisBeneficiaries(projectId4, limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const query = db.select().from(beneficiaries);
  return projectId4 ? query.where(eq(beneficiaries.projectId, projectId4)).orderBy(desc(beneficiaries.createdAt)).limit(limit) : query.orderBy(desc(beneficiaries.createdAt)).limit(limit);
}
async function createMisFieldEvent(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(fieldEvents).values(input);
  return Number(result[0].insertId);
}
async function createMisTargetAchievement(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(targetsAchievement).values(input);
  return Number(result[0].insertId);
}
async function createMisOutput(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projectOutputs).values(input);
  return Number(result[0].insertId);
}
async function createMisOutcome(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projectOutcomes).values(input);
  return Number(result[0].insertId);
}
async function getMisDeliverySummary(projectId4) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const [beneficiaryTotal, eventTotal, targetTotal, outputTotal, outcomeTotal] = await Promise.all([db.select({ total: count() }).from(beneficiaries).where(eq(beneficiaries.projectId, projectId4)), db.select({ total: count() }).from(fieldEvents).where(eq(fieldEvents.projectId, projectId4)), db.select({ total: count() }).from(targetsAchievement).where(eq(targetsAchievement.projectId, projectId4)), db.select({ total: count() }).from(projectOutputs).where(eq(projectOutputs.projectId, projectId4)), db.select({ total: count() }).from(projectOutcomes).where(eq(projectOutcomes.projectId, projectId4))]);
  return { beneficiaries: Number(beneficiaryTotal[0]?.total ?? 0), fieldEvents: Number(eventTotal[0]?.total ?? 0), targetRecords: Number(targetTotal[0]?.total ?? 0), outputs: Number(outputTotal[0]?.total ?? 0), outcomes: Number(outcomeTotal[0]?.total ?? 0) };
}
async function createMisTeamAssignment(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projectTeamAssignments).values(input);
  return Number(result[0].insertId);
}
async function createMisBudgetAllocation(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projectBudgetAllocations).values(input);
  return Number(result[0].insertId);
}
async function createMisFinanceRecord(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projectFinanceRecords).values(input);
  return Number(result[0].insertId);
}
async function updateMisFinanceApproval(id, approvalStatus, approvedByOpenId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  await db.update(projectFinanceRecords).set({ approvalStatus, approvedByOpenId: approvedByOpenId ?? null, updatedAt: /* @__PURE__ */ new Date() }).where(eq(projectFinanceRecords.id, id));
}
async function createMisDocument(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projectDocuments).values(input);
  return Number(result[0].insertId);
}
async function createMisMonitoringIndicator(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(monitoringIndicators).values(input);
  return Number(result[0].insertId);
}
async function createMisRisk(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projectRisks).values(input);
  return Number(result[0].insertId);
}
async function createMisReport(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(projectReports).values(input);
  return Number(result[0].insertId);
}
async function listMisReports(limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  return db.select().from(projectReports).orderBy(desc(projectReports.dueDate)).limit(limit);
}
async function listMisRisks(limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  return db.select().from(projectRisks).orderBy(desc(projectRisks.updatedAt)).limit(limit);
}
async function createMisImpactEvidence(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const result = await db.insert(impactEvidence).values(input);
  return Number(result[0].insertId);
}
async function upsertMisClosure(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  await db.insert(projectClosures).values(input).onDuplicateKeyUpdate({ set: { closureDate: input.closureDate, finalReportApproved: input.finalReportApproved, financeApproved: input.financeApproved, impactEvidenceAttached: input.impactEvidenceAttached, lessonsLearned: input.lessonsLearned, closureStatus: input.closureStatus, approvedByOpenId: input.approvedByOpenId, updatedAt: /* @__PURE__ */ new Date() } });
}
async function writeMisAuditLog(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  await db.insert(misAuditLogs).values(input);
}
async function listMisAuditLogs(limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  return db.select().from(misAuditLogs).orderBy(desc(misAuditLogs.createdAt)).limit(limit);
}
function dateKey(value) {
  if (!value) return "";
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}
async function getMisDashboardSummary() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for Project MIS.");
  const [allProjects, beneficiaryCount, allRisks, allReports, recentActivity] = await Promise.all([
    db.select().from(projects).orderBy(desc(projects.updatedAt)).limit(100),
    db.select({ total: count() }).from(beneficiaries),
    db.select().from(projectRisks).orderBy(desc(projectRisks.updatedAt)).limit(100),
    db.select().from(projectReports).orderBy(desc(projectReports.dueDate)).limit(100),
    db.select().from(misAuditLogs).orderBy(desc(misAuditLogs.createdAt)).limit(5)
  ]);
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const dueSoonEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
  const reportsDueSoon = allReports.filter((report) => {
    const dueDate = dateKey(report.dueDate);
    return dueDate >= today && dueDate <= dueSoonEnd && !["submitted", "approved"].includes(report.status);
  });
  const overdueReports = allReports.filter((report) => dateKey(report.dueDate) < today && !["submitted", "approved"].includes(report.status));
  const statusCounts = allProjects.reduce((summary, project) => {
    summary[project.projectStatus] = (summary[project.projectStatus] ?? 0) + 1;
    return summary;
  }, {});
  return {
    totalProjects: allProjects.length,
    projectStatusCounts: statusCounts,
    totalBeneficiaries: Number(beneficiaryCount[0]?.total ?? 0),
    openRisks: allRisks.filter((risk) => risk.status !== "closed").length,
    overdueReports: overdueReports.length,
    reportsDueSoon,
    recentActivity,
    projects: allProjects
  };
}
async function getMisProjectCommandCenter(projectId4) {
  const [detail, delivery, risks, reports] = await Promise.all([
    getMisProject(projectId4),
    getMisDeliverySummary(projectId4),
    listMisRisks(200),
    listMisReports(200)
  ]);
  if (!detail) return void 0;
  return { ...detail, delivery, risks: risks.filter((risk) => risk.projectId === projectId4), reports: reports.filter((report) => report.projectId === projectId4) };
}

// backend/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    // Chrome rejects SameSite=None cookies that are not marked Secure, so on
    // plain HTTP (local development, non-HTTPS deployments) fall back to the
    // default Lax policy. Same-origin XHR still carries the session cookie,
    // and HTTPS requests keep the cross-site-capable None; Secure pair.
    sameSite: secure ? "none" : "lax",
    secure
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// backend/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    if (!ENV.oAuthServerUrl) {
      console.warn(
        "[OAuth] Platform OAuth login disabled (OAUTH_SERVER_URL not set). Local member sign-in and dev preview login are unaffected."
      );
      return;
    }
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey2 = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey2);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      return null;
    }
    try {
      const secretKey2 = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey2, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch {
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// backend/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    if (!ENV.oAuthServerUrl) {
      res.status(503).json({ error: "OAuth is not configured on this deployment" });
      return;
    }
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// backend/_core/storageProxy.ts
import fs from "fs";
import path from "path";
var rootPublicAssetKey = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;
function resolveLocalPublicStorageDir() {
  const candidates = [
    path.resolve(import.meta.dirname, "../../frontend/public/manus-storage"),
    // dev: backend/_core -> <root>/frontend/public/manus-storage
    path.resolve(import.meta.dirname, "../frontend/public/manus-storage")
    // bundled prod: dist -> <root>/frontend/public/manus-storage
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;
    } catch {
    }
  }
  return candidates[0];
}
var localPublicStorageDir = resolveLocalPublicStorageDir();
function resolveLocalUploadsDir() {
  const candidates = [
    path.resolve(import.meta.dirname, "../../.local-storage"),
    // dev: server/_core -> <root>/.local-storage
    path.resolve(import.meta.dirname, "../.local-storage")
    // bundled prod: dist -> <root>/.local-storage
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;
    } catch {
    }
  }
  return candidates[0];
}
var localUploadsDir = resolveLocalUploadsDir();
var storageContentTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf"
};
function normalizePublicStorageKey(key) {
  const normalized = key.trim();
  if (!normalized || normalized !== key || normalized.includes("\\") || normalized.includes("..") || normalized.includes("\0")) return null;
  return normalized;
}
async function canServePublicStorageKey(key, dependencies = {}) {
  const normalized = normalizePublicStorageKey(key);
  if (!normalized) return false;
  if (rootPublicAssetKey.test(normalized)) return true;
  if (!normalized.startsWith("gallery-media/")) return false;
  const lookup = dependencies.isPublishedGalleryStorageKey ?? isPublishedGalleryStorageKey;
  try {
    return await lookup(normalized);
  } catch (error) {
    console.error("[StorageProxy] gallery publication lookup failed:", error);
    return false;
  }
}
function serveLocalStorageAsset(key, res) {
  const localPath = path.join(localPublicStorageDir, key);
  if (!localPath.startsWith(localPublicStorageDir + path.sep)) return false;
  if (!fs.existsSync(localPath) || !fs.statSync(localPath).isFile()) return false;
  const contentType = storageContentTypes[path.extname(key).toLowerCase()];
  if (!contentType) return false;
  res.set("Cache-Control", "public, max-age=86400");
  res.type(contentType).sendFile(localPath);
  return true;
}
function serveLocalUploadAsset(key, res) {
  const localPath = path.join(localUploadsDir, key);
  if (!localPath.startsWith(localUploadsDir + path.sep)) return false;
  if (!fs.existsSync(localPath) || !fs.statSync(localPath).isFile()) return false;
  const contentType = storageContentTypes[path.extname(key).toLowerCase()];
  if (!contentType) return false;
  res.set("Cache-Control", "public, max-age=86400");
  res.type(contentType).sendFile(localPath);
  return true;
}
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!await canServePublicStorageKey(key)) {
      res.status(404).send("Stored asset was not found");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      if (serveLocalStorageAsset(key, res)) return;
      if (serveLocalUploadAsset(key, res)) return;
      res.status(500).send("Storage proxy not configured");
      return;
    }
    let forgeApiUrl;
    let forgeApiKey;
    try {
      forgeApiUrl = new URL(ENV.forgeApiUrl).toString();
      forgeApiKey = ENV.forgeApiKey;
    } catch {
      console.error("[StorageProxy] invalid BUILT_IN_FORGE_API_URL configured");
      res.status(500).send("Storage proxy misconfigured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// backend/_core/systemRouter.ts
import { z } from "zod";

// backend/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// backend/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson,
  // Explicit isDev keeps error responses free of stack traces (which contain
  // absolute server paths) whenever the server runs with NODE_ENV=production.
  // The default only checks globalThis.process.env, which is unset when the
  // bundled dist server is started from a shell without NODE_ENV exported.
  isDev: process.env.NODE_ENV !== "production"
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var requireMember = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.member) throw new TRPCError2({ code: "UNAUTHORIZED", message: "Member login is required." });
  return next({ ctx: { ...ctx, member: ctx.member } });
});
var memberProcedure = t.procedure.use(requireMember);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);
function roleProcedure(roles) {
  return t.procedure.use(
    t.middleware(async (opts) => {
      const { ctx, next } = opts;
      if (!ctx.user) throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      if (!roles.includes(ctx.user.role)) throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
      return next({ ctx: { ...ctx, user: ctx.user } });
    })
  );
}
var misManagementProcedure = roleProcedure(["admin", "project_manager", "finance", "monitoring", "management"]);
var misProjectReadProcedure = roleProcedure(["admin", "project_manager", "field_staff", "finance", "monitoring", "management"]);
var misProjectWriteProcedure = roleProcedure(["admin", "project_manager"]);
var misFieldProcedure = roleProcedure(["admin", "project_manager", "field_staff"]);
var misMonitoringProcedure = roleProcedure(["admin", "project_manager", "monitoring"]);
var misFinanceProcedure = roleProcedure(["admin", "finance"]);
var misOperationsProcedure = roleProcedure(["admin", "project_manager", "field_staff", "monitoring"]);

// backend/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// backend/routers/membership.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { nanoid } from "nanoid";
import { z as z2 } from "zod";

// backend/email/memberActivation.ts
import nodemailer from "nodemailer";
function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
var FOUNDATION_SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/share/19TMKDwzfi/",
  instagram: "https://www.instagram.com/aaswfoundation",
  linkedin: "https://www.linkedin.com/company/108100135/"
};
function officialLogoUrl(actionUrl) {
  try {
    return new URL("/manus-storage/aasw-foundation-official-logo_41a4007d.png", new URL(actionUrl).origin).toString();
  } catch {
    return "/manus-storage/aasw-foundation-official-logo_41a4007d.png";
  }
}
function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!host || !port || !user || !pass) throw new Error("Foundation member email sender is not configured.");
  return { host, port, user, pass };
}
async function deliverWithFoundationGmail(mail) {
  const smtp = smtpConfig();
  const transport = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: smtp.port !== 465, auth: { user: smtp.user, pass: smtp.pass } });
  return transport.sendMail({ from: { name: "AASW Foundation", address: smtp.user }, replyTo: smtp.user, ...mail });
}
function createMemberActivationEmail(input) {
  const safe = { fullName: escapeHtml(input.fullName), membershipNo: escapeHtml(input.membershipNo), setupUrl: escapeHtml(input.setupUrl), certificateUrl: escapeHtml(input.certificateUrl ?? ""), logoUrl: escapeHtml(officialLogoUrl(input.setupUrl)), facebook: FOUNDATION_SOCIAL_LINKS.facebook, instagram: FOUNDATION_SOCIAL_LINKS.instagram, linkedin: FOUNDATION_SOCIAL_LINKS.linkedin };
  return {
    subject: "Your AASW Foundation Membership Is Approved",
    text: `Dear ${input.fullName},

Congratulations. Your AASW Foundation membership is approved and your member account is active.

Membership ID: ${input.membershipNo}

Set your password within 72 hours: ${input.setupUrl}

View your membership certificate within 72 hours: ${input.certificateUrl}

After setting your password, your certificate will remain available anytime in the secure Member Portal. For your security, do not forward this email or share either link. If you did not submit this membership application, please contact AASW Foundation.

Connect with AASW Foundation:
Facebook: ${FOUNDATION_SOCIAL_LINKS.facebook}
Instagram: ${FOUNDATION_SOCIAL_LINKS.instagram}
LinkedIn: ${FOUNDATION_SOCIAL_LINKS.linkedin}

AASW Foundation
Rura, Kanpur Dehat, Uttar Pradesh 209303
Do not reply to this email.`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f6f0e6;color:#291d1d;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f0e6"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#fffdf7;border:1px solid #e5ddd4"><tr><td style="padding:22px 30px;background:#174c3c"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle"><img src="${safe.logoUrl}" width="48" height="48" alt="AASW Foundation" style="display:block;background:#fffdf7;padding:3px" /></td><td style="padding-left:13px;vertical-align:middle"><p style="margin:0;color:#eac06e;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase">AASW Foundation</p><p style="margin:4px 0 0;color:#ffffff;font-size:14px;font-weight:700;letter-spacing:.4px">Membership approval</p></td></tr></table></td></tr><tr><td style="padding:34px 30px 30px"><p style="margin:0 0 12px;color:#9a5d03;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Your member account is ready</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:34px;font-weight:400;line-height:1.15">Welcome, ${safe.fullName}.</h1><p style="margin:18px 0 0;color:#584744;font-size:15px;line-height:1.7">Congratulations. Your AASW Foundation membership is approved and your member account is active. Use the Membership ID below and complete secure account setup.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#fffaf0;border-left:4px solid #d4820a"><tr><td style="padding:17px 18px"><p style="margin:0;color:#796966;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Your Membership ID</p><p style="margin:7px 0 0;color:#291d1d;font-size:22px;font-weight:700;letter-spacing:.5px">${safe.membershipNo}</p></td></tr></table><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding:0 8px 10px 0"><a href="${safe.setupUrl}" style="display:inline-block;padding:14px 18px;background:#174c3c;color:#fffdf7;font-size:13px;font-weight:700;text-decoration:none">Set your password</a></td><td style="padding:0 0 10px"><a href="${safe.certificateUrl}" style="display:inline-block;padding:13px 17px;border:1px solid #174c3c;color:#174c3c;font-size:13px;font-weight:700;text-decoration:none">View certificate</a></td></tr></table><p style="margin:16px 0 0;color:#796966;font-size:12px;line-height:1.65">Both secure links expire in 72 hours. After you set a password, your certificate remains available anytime in the protected Member Portal.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;border-top:1px solid #e5ddd4"><tr><td style="padding-top:20px"><p style="margin:0;color:#5b4c47;font-size:12px;line-height:1.6">For your security, do not forward this email or share either link. If you did not submit this membership application, contact AASW Foundation.</p></td></tr></table></td></tr><tr><td style="padding:22px 30px;background:#f0e7d8;border-top:1px solid #e2d7c8"><p style="margin:0;color:#5b4c47;font-size:11px;line-height:1.6">AASW Foundation \xB7 Rura, Kanpur Dehat, Uttar Pradesh 209303</p><p style="margin:10px 0 0;color:#796966;font-size:11px">Stay connected: <a href="${safe.facebook}" style="color:#174c3c;font-weight:700;text-decoration:none">Facebook</a><span style="color:#b29f88"> \xB7 </span><a href="${safe.instagram}" style="color:#174c3c;font-weight:700;text-decoration:none">Instagram</a><span style="color:#b29f88"> \xB7 </span><a href="${safe.linkedin}" style="color:#174c3c;font-weight:700;text-decoration:none">LinkedIn</a></p><p style="margin:10px 0 0;color:#796966;font-size:10px">This is an automated account message; please do not reply.</p></td></tr></table></td></tr></table></body></html>`
  };
}
async function dispatchMemberActivationEmail(input, dependencies = { deliver: deliverWithFoundationGmail }) {
  const message = createMemberActivationEmail(input);
  try {
    await dependencies.deliver({ to: input.email, ...message });
    return "sent";
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.log("[EMAIL MOCK]", { to: input.email, subject: message.subject, body: message.text });
      return "mocked";
    }
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown member activation email error." };
  }
}
function createMemberExpiryReminderEmail(input) {
  const expiry = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(input.expiresOn);
  const safe = { fullName: escapeHtml(input.fullName), membershipNo: escapeHtml(input.membershipNo), expiry: escapeHtml(expiry), portalUrl: escapeHtml(input.portalUrl), logoUrl: escapeHtml(officialLogoUrl(input.portalUrl)) };
  return {
    subject: "AASW Foundation \u2014 Your Membership Expires in 7 Days",
    text: `Dear ${input.fullName},

This is a reminder that your AASW Foundation annual membership (${input.membershipNo}) is valid through ${expiry} and will expire in 7 days.

To continue with the same Member ID, password, profile, projects and activity history, submit a new membership application with the same email address and PAN after expiry.

Open Member Portal: ${input.portalUrl}

AASW Foundation
This is an automated membership reminder; please do not reply to this email.`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f6f0e6;color:#291d1d;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#fffdf7;border:1px solid #e5ddd4"><tr><td style="padding:22px 30px;background:#174c3c"><img src="${safe.logoUrl}" width="46" height="46" alt="AASW Foundation" style="display:block;background:#fffdf7;padding:3px" /><p style="margin:10px 0 0;color:#eac06e;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">AASW Foundation \xB7 Membership reminder</p></td></tr><tr><td style="padding:34px 30px"><p style="margin:0;color:#a45e08;font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase">7 days remaining</p><h1 style="margin:12px 0 0;color:#291d1d;font-family:Georgia,serif;font-size:32px;font-weight:400">Your membership is nearing expiry.</h1><p style="margin:18px 0 0;color:#584744;font-size:15px;line-height:1.7">Dear ${safe.fullName}, your AASW Foundation annual membership remains active through <strong>${safe.expiry}</strong>.</p><div style="margin:24px 0;background:#fff7e6;border-left:4px solid #d4820a;padding:17px"><p style="margin:0;color:#796966;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Membership ID</p><p style="margin:7px 0 0;color:#291d1d;font-size:22px;font-weight:700">${safe.membershipNo}</p></div><p style="margin:0;color:#584744;font-size:14px;line-height:1.65">After expiry, you can submit a new membership application using the same email address and PAN. Your Member ID, password, profile, projects and history will continue in the same account.</p><a href="${safe.portalUrl}" style="display:inline-block;margin-top:22px;padding:13px 18px;background:#174c3c;color:#fffdf7;font-size:13px;font-weight:700;text-decoration:none">Open Member Portal</a><p style="margin:25px 0 0;padding-top:16px;border-top:1px solid #e5ddd4;color:#796966;font-size:11px;line-height:1.55">AASW Foundation \xB7 Rura, Kanpur Dehat, Uttar Pradesh 209303<br/>This is an automated membership reminder; please do not reply.</p></td></tr></table></td></tr></table></body></html>`
  };
}
async function dispatchMemberExpiryReminderEmail(input, dependencies = { deliver: deliverWithFoundationGmail }) {
  const message = createMemberExpiryReminderEmail(input);
  try {
    await dependencies.deliver({ to: input.email, ...message });
    return "sent";
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.log("[EMAIL MOCK]", { to: input.email, subject: message.subject, body: message.text });
      return "mocked";
    }
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown membership reminder email error." };
  }
}
function createMemberPostGraceFollowUpEmail(input) {
  const expiry = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(input.expiresOn);
  const safe = { fullName: escapeHtml(input.fullName), membershipNo: escapeHtml(input.membershipNo), expiry: escapeHtml(expiry), portalUrl: escapeHtml(input.portalUrl), logoUrl: escapeHtml(officialLogoUrl(input.portalUrl)) };
  return {
    subject: "AASW Foundation \u2014 Renew Your Membership to Restore Portal Access",
    text: `Dear ${input.fullName},

Your AASW Foundation annual membership (${input.membershipNo}) ended on ${expiry}, and the three-day renewal grace period has now concluded.

To restore Member Portal access while keeping the same Member ID, password, profile, projects and activity history, submit a new membership application with the same email address and PAN.

Open Member Portal: ${input.portalUrl}

AASW Foundation
This is an automated membership follow-up; please do not reply to this email.`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f6f0e6;color:#291d1d;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#fffdf7;border:1px solid #e5ddd4"><tr><td style="padding:22px 30px;background:#174c3c"><img src="${safe.logoUrl}" width="46" height="46" alt="AASW Foundation" style="display:block;background:#fffdf7;padding:3px" /><p style="margin:10px 0 0;color:#eac06e;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">AASW Foundation \xB7 Renewal follow-up</p></td></tr><tr><td style="padding:34px 30px"><p style="margin:0;color:#a45e08;font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase">Renewal grace period concluded</p><h1 style="margin:12px 0 0;color:#291d1d;font-family:Georgia,serif;font-size:32px;font-weight:400">Restore your member access.</h1><p style="margin:18px 0 0;color:#584744;font-size:15px;line-height:1.7">Dear ${safe.fullName}, your annual membership ended on <strong>${safe.expiry}</strong>, and the three-day renewal grace period has concluded.</p><div style="margin:24px 0;background:#fff7e6;border-left:4px solid #d4820a;padding:17px"><p style="margin:0;color:#796966;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Membership ID</p><p style="margin:7px 0 0;color:#291d1d;font-size:22px;font-weight:700">${safe.membershipNo}</p></div><p style="margin:0;color:#584744;font-size:14px;line-height:1.65">Submit a new membership application using the same email address and PAN to restore access. Your Member ID, password, profile, projects and history will continue in the same account after renewal.</p><a href="${safe.portalUrl}" style="display:inline-block;margin-top:22px;padding:13px 18px;background:#174c3c;color:#fffdf7;font-size:13px;font-weight:700;text-decoration:none">Open Member Portal</a><p style="margin:25px 0 0;padding-top:16px;border-top:1px solid #e5ddd4;color:#796966;font-size:11px;line-height:1.55">AASW Foundation \xB7 Rura, Kanpur Dehat, Uttar Pradesh 209303<br/>This is an automated membership follow-up; please do not reply.</p></td></tr></table></td></tr></table></body></html>`
  };
}
async function dispatchMemberPostGraceFollowUpEmail(input, dependencies = { deliver: deliverWithFoundationGmail }) {
  const message = createMemberPostGraceFollowUpEmail(input);
  try {
    await dependencies.deliver({ to: input.email, ...message });
    return "sent";
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.log("[EMAIL MOCK]", { to: input.email, subject: message.subject, body: message.text });
      return "mocked";
    }
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown post-grace renewal follow-up email error." };
  }
}
function createMemberPasswordResetEmail(input) {
  const safe = { membershipNo: escapeHtml(input.membershipNo), setupUrl: escapeHtml(input.setupUrl) };
  return {
    subject: "AASW Foundation \u2014 Reset Your Member Password",
    text: `Dear ${input.fullName},

A password reset was requested for your AASW Foundation member account.

Membership ID: ${input.membershipNo}

Reset your password within 72 hours: ${input.setupUrl}

If you did not request this, you can ignore this email. Your existing password will remain unchanged. Do not forward this link.

AASW Foundation
Do not reply to this email.`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:620px;margin:0 auto;padding:30px 20px"><section style="border-top:6px solid #2f6b52;background:#fffaf0;padding:30px"><p style="margin:0 0 14px;color:#2f6b52;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">AASW Foundation \xB7 Member account</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:30px;font-weight:400">Reset your password.</h1><p style="margin:18px 0 0;color:#584744;line-height:1.65">A password reset was requested for your member account.</p><div style="margin:24px 0;padding:16px;background:#ffffff;border-left:3px solid #d4820a"><p style="margin:0;color:#796966;font-size:12px;letter-spacing:1px;text-transform:uppercase">Membership ID</p><p style="margin:7px 0 0;color:#291d1d;font-size:20px;font-weight:700">${safe.membershipNo}</p></div><a href="${safe.setupUrl}" style="display:inline-block;padding:13px 18px;background:#2f6b52;color:#fffdf7;font-size:13px;font-weight:700;text-decoration:none">Reset password</a><p style="margin:22px 0 0;color:#796966;font-size:12px;line-height:1.65">This secure link expires in 72 hours and can be used once. If you did not request a reset, ignore this email. Your existing password remains unchanged.</p><p style="margin:22px 0 0;padding-top:16px;border-top:1px solid #e5ddd4;color:#796966;font-size:11px;line-height:1.55">AASW Foundation \xB7 Rura, Kanpur Dehat, Uttar Pradesh 209303<br/>Do not reply to this email.</p></section></main></body></html>`
  };
}
async function dispatchMemberPasswordResetEmail(input, dependencies = { deliver: deliverWithFoundationGmail }) {
  const message = createMemberPasswordResetEmail(input);
  try {
    await dependencies.deliver({ to: input.email, ...message });
    return "sent";
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.log("[EMAIL MOCK]", { to: input.email, subject: message.subject, body: message.text });
      return "mocked";
    }
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown member password reset email error." };
  }
}

// backend/email/membershipNotification.ts
import nodemailer2 from "nodemailer";
function escapeHtml2(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
function smtpConfig2() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!host || !port || !user || !pass) throw new Error("Foundation notification sender is not configured.");
  return { host, port, user, pass };
}
async function deliverWithFoundationGmail2(mail) {
  const smtp = smtpConfig2();
  const transport = nodemailer2.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: smtp.port !== 465, auth: { user: smtp.user, pass: smtp.pass } });
  return transport.sendMail({ from: { name: "AASW Foundation", address: smtp.user }, replyTo: smtp.user, ...mail });
}
function createMembershipApplicationNotification(input) {
  const membershipLabel = input.membershipType === "annual" ? "Annual membership" : "Lifetime membership";
  const body = `A new Membership application has been received.

Application reference: ${input.applicationRef}
Applicant: ${input.fullName}
Email: ${input.email}
Phone: ${input.phone}
Location: ${input.district}, ${input.state}
Membership path: ${membershipLabel}

Sensitive identity details and uploaded proof are not included in this email. Review them only through the protected application records workflow.`;
  const safe = { applicationRef: escapeHtml2(input.applicationRef), fullName: escapeHtml2(input.fullName), email: escapeHtml2(input.email), phone: escapeHtml2(input.phone), district: escapeHtml2(input.district), state: escapeHtml2(input.state), membershipLabel: escapeHtml2(membershipLabel) };
  return {
    subject: `New Membership application \xB7 ${input.applicationRef}`,
    text: body,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:620px;margin:0 auto;padding:30px 20px"><section style="border-top:6px solid #2f6b52;background:#fffaf0;padding:30px"><p style="margin:0 0 14px;color:#2f6b52;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">AASW Foundation \xB7 Membership alert</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:30px;font-weight:400">New application received.</h1><table role="presentation" style="width:100%;margin-top:24px;border-collapse:collapse"><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Reference</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right;font-weight:700">${safe.applicationRef}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Applicant</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.fullName}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Contact</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.email}<br/>${safe.phone}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Location</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.district}, ${safe.state}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Membership</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.membershipLabel}</td></tr></table><p style="margin:22px 0 0;color:#796966;font-size:12px;line-height:1.6">For privacy, PAN and ID-proof information are not included in this email. Review identity documents only through the protected application records workflow.</p></section></main></body></html>`
  };
}
async function dispatchMembershipApplicationNotification(input, dependencies = { deliver: deliverWithFoundationGmail2 }) {
  try {
    const smtp = smtpConfig2();
    await dependencies.deliver({ to: smtp.user, ...createMembershipApplicationNotification(input) });
    return "sent";
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown notification error." };
  }
}

// backend/security/memberAccount.ts
import { createHash as createHash2, randomBytes as randomBytes2 } from "node:crypto";
var MEMBER_SETUP_TOKEN_TTL_MS = 72 * 60 * 60 * 1e3;
function createMemberSetupToken(now = /* @__PURE__ */ new Date()) {
  const token = randomBytes2(32).toString("base64url");
  const tokenHash = createHash2("sha256").update(token).digest("hex");
  return { token, tokenHash, expiresAt: new Date(now.getTime() + MEMBER_SETUP_TOKEN_TTL_MS) };
}
function hashMemberSetupToken(token) {
  return createHash2("sha256").update(token).digest("hex");
}

// backend/storage.ts
import fs2 from "fs";
import path2 from "path";
function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
var localUploadsDir2 = path2.resolve(import.meta.dirname, "../.local-storage");
function putLocalUpload(key, data) {
  fs2.mkdirSync(localUploadsDir2, { recursive: true });
  const target = path2.resolve(localUploadsDir2, key);
  if (!target.startsWith(localUploadsDir2 + path2.sep)) {
    throw new Error("Invalid storage key");
  }
  fs2.mkdirSync(path2.dirname(target), { recursive: true });
  fs2.writeFileSync(target, data);
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY");
    }
    const key2 = appendHashSuffix(normalizeKey(relKey));
    putLocalUpload(key2, data);
    return { key: key2, url: `/manus-storage/${key2}` };
  }
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}
async function storageGetSignedUrl(relKey) {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }
  const { url } = await resp.json();
  return url;
}
var localProofMimeByExtension = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };
function storageGetLocalUpload(relKey) {
  const key = normalizeKey(relKey);
  const target = path2.resolve(localUploadsDir2, key);
  if (!target.startsWith(localUploadsDir2 + path2.sep)) throw new Error("Invalid storage key");
  const extension = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  const mimeType = localProofMimeByExtension[extension];
  if (!mimeType) throw new Error("Unsupported proof file type");
  return { data: fs2.readFileSync(target), mimeType };
}
function isLocalUploadMode() {
  return !ENV.forgeApiUrl || !ENV.forgeApiKey;
}
function storageLocalUploadDataUrl(relKey) {
  const local = storageGetLocalUpload(relKey);
  return `data:${local.mimeType};base64,${local.data.toString("base64")}`;
}

// backend/routers/membership.ts
var MAX_ID_PROOF_BYTES = 5 * 1024 * 1024;
var ID_PROOF_TYPES = ["aadhaar", "voter_id", "passport", "driving_licence", "other"];
var ID_PROOF_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];
var membershipApplicationInput = z2.object({
  fullName: z2.string().trim().min(2, "Please enter your full name.").max(255),
  email: z2.string().trim().email("Please enter a valid email address.").max(320),
  phone: z2.string().trim().min(8, "Please enter a valid phone number.").max(32).regex(/^[0-9+()\-\s]+$/, "Please use a valid phone number."),
  city: z2.string().trim().min(2, "Please enter your city.").max(128),
  state: z2.string().trim().min(2, "Please enter your state or region.").max(128),
  district: z2.string().trim().min(2, "Please enter your district.").max(128),
  membershipType: z2.enum(["annual", "lifetime"]),
  panNumber: z2.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Please enter a valid PAN number."),
  idProof: z2.object({
    type: z2.enum(ID_PROOF_TYPES),
    originalName: z2.string().trim().min(1, "Please select an ID-proof file.").max(255),
    mimeType: z2.enum(ID_PROOF_MIME_TYPES),
    dataBase64: z2.string().min(8, "Please upload your ID proof.")
  }),
  message: z2.string().trim().max(1500).optional(),
  privacyConsent: z2.literal(true, { error: "Please confirm that AASW may use these details to follow up on your application." }),
  renewalIntent: z2.boolean().optional(),
  website: z2.string().max(0).optional()
});
function createApplicationRef() {
  return `AASW-MEM-${nanoid(12).toUpperCase()}`;
}
function decodeIdProof(dataBase64) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64) || dataBase64.length % 4 !== 0) throw new TRPCError3({ code: "BAD_REQUEST", message: "The ID-proof file could not be read." });
  const file = Buffer.from(dataBase64, "base64");
  if (file.length === 0 || file.length > MAX_ID_PROOF_BYTES) throw new TRPCError3({ code: "BAD_REQUEST", message: "ID proof must be an image or PDF up to 5 MB." });
  return file;
}
function proofExtension(mimeType) {
  return mimeType === "application/pdf" ? "pdf" : mimeType === "image/png" ? "png" : "jpg";
}
function memberAppBaseUrl(req) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = req.get?.("host");
  if (host) return `${req.protocol === "http" ? "http" : "https"}://${host}`;
  return "http://localhost:3000";
}
var membershipRouter = router({
  submit: publicProcedure.input(membershipApplicationInput).mutation(async ({ input, ctx }) => {
    if (input.website) throw new TRPCError3({ code: "BAD_REQUEST", message: "Unable to submit this application." });
    const applicationRef = createApplicationRef();
    const proofBuffer = decodeIdProof(input.idProof.dataBase64);
    let storedProof;
    try {
      storedProof = await storagePut(`membership-applications/${applicationRef}/id-proof.${proofExtension(input.idProof.mimeType)}`, proofBuffer, input.idProof.mimeType);
    } catch (error) {
      console.error("[Membership] ID-proof upload failed", { applicationRef, error });
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Your ID proof could not be securely uploaded. Please try again." });
    }
    const setup = createMemberSetupToken();
    let activation;
    try {
      activation = await createMembershipApplicationWithActivation({
        application: {
          applicationRef,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          city: input.city,
          state: input.state,
          district: input.district,
          membershipType: input.membershipType,
          message: input.message || null,
          panEncrypted: encryptSensitiveValue(input.panNumber),
          panHash: hashSensitiveMatchValue(input.panNumber),
          panLastFour: input.panNumber.slice(-4),
          idProofType: input.idProof.type,
          idProofStorageKey: storedProof.key,
          idProofOriginalName: input.idProof.originalName,
          idProofMimeType: input.idProof.mimeType,
          status: "approved",
          notificationStatus: "pending"
        },
        setupTokenHash: setup.tokenHash,
        setupTokenExpiresAt: setup.expiresAt,
        renewalIntent: input.renewalIntent
      });
    } catch (error) {
      console.error("[Membership] Member activation failed", { applicationRef, error });
      const reason = error instanceof Error ? error.message : "";
      if (input.renewalIntent && reason === "Membership renewal identity did not match.") throw new TRPCError3({ code: "CONFLICT", message: "Membership renewal identity did not match." });
      if (input.renewalIntent && reason === "No existing membership found for this renewal email.") throw new TRPCError3({ code: "NOT_FOUND", message: "No existing membership found for this renewal email." });
      if (input.renewalIntent && reason === "An active membership already exists for this email.") throw new TRPCError3({ code: "CONFLICT", message: "An active membership already exists for this email." });
      throw new TRPCError3({ code: "CONFLICT", message: "We could not activate this membership account. Please contact AASW Foundation for assistance." });
    }
    const notification = await dispatchMembershipApplicationNotification({ applicationRef, fullName: input.fullName, email: input.email, phone: input.phone, district: input.district, state: input.state, membershipType: input.membershipType });
    if (notification === "sent") await markMembershipApplicationNotification(applicationRef, "sent");
    else await markMembershipApplicationNotification(applicationRef, "failed", notification.error);
    if (activation.isRenewal) {
      return { applicationRef, membershipNo: activation.membershipNo, status: "approved", renewal: true, notificationStatus: notification === "sent" ? "sent" : "failed", activationEmailStatus: "not_required" };
    }
    const setupUrl = `${memberAppBaseUrl(ctx.req)}/member/setup-password?token=${encodeURIComponent(setup.token)}`;
    const certificateEmailToken = createMemberSetupToken();
    await createMemberCertificateEmailToken(activation.memberId, certificateEmailToken.tokenHash, certificateEmailToken.expiresAt);
    const certificateUrl = `${memberAppBaseUrl(ctx.req)}/member/email-certificate?token=${encodeURIComponent(certificateEmailToken.token)}`;
    const activationEmail = await dispatchMemberActivationEmail({ fullName: input.fullName, email: input.email, membershipNo: activation.membershipNo, setupUrl, certificateUrl });
    return { applicationRef, membershipNo: activation.membershipNo, status: "approved", renewal: false, notificationStatus: notification === "sent" ? "sent" : "failed", activationEmailStatus: activationEmail === "sent" || activationEmail === "mocked" ? activationEmail : "failed" };
  })
});

// backend/routers/inquiries.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
import { nanoid as nanoid2 } from "nanoid";
import { z as z3 } from "zod";

// backend/email/inquiryNotification.ts
import nodemailer3 from "nodemailer";
var INQUIRY_TOPICS = ["programmes", "membership", "donation", "partnership", "media", "other"];
function escapeHtml3(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
function topicLabel(topic) {
  return { programmes: "Programmes", membership: "Membership", donation: "Donation", partnership: "Partnership", media: "Media or information", other: "Other" }[topic];
}
function smtpConfig3() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!host || !port || !user || !pass) throw new Error("Foundation notification sender is not configured.");
  return { host, port, user, pass };
}
async function deliverWithFoundationGmail3(mail) {
  const smtp = smtpConfig3();
  const transport = nodemailer3.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: smtp.port !== 465, auth: { user: smtp.user, pass: smtp.pass } });
  return transport.sendMail({ from: { name: "AASW Foundation", address: smtp.user }, replyTo: smtp.user, ...mail });
}
function createInquiryNotification(input) {
  const label = topicLabel(input.topic);
  const body = `A new website inquiry has been received.

Inquiry reference: ${input.inquiryRef}
Name: ${input.fullName}
Email: ${input.email}
Phone: ${input.phone}
Topic: ${label}

Message:
${input.message}`;
  const safe = { inquiryRef: escapeHtml3(input.inquiryRef), fullName: escapeHtml3(input.fullName), email: escapeHtml3(input.email), phone: escapeHtml3(input.phone), topic: escapeHtml3(label), message: escapeHtml3(input.message).replace(/\n/g, "<br/>") };
  return {
    subject: `New website inquiry \xB7 ${input.inquiryRef}`,
    text: body,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:620px;margin:0 auto;padding:30px 20px"><section style="border-top:6px solid #2f6b52;background:#fffaf0;padding:30px"><p style="margin:0 0 14px;color:#2f6b52;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">AASW Foundation \xB7 Website inquiry</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:30px;font-weight:400">A new message has arrived.</h1><table role="presentation" style="width:100%;margin-top:24px;border-collapse:collapse"><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Reference</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right;font-weight:700">${safe.inquiryRef}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">From</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.fullName}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Contact</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.email}<br/>${safe.phone}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Topic</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.topic}</td></tr></table><div style="margin-top:22px;padding:16px;background:#f7f3ea"><p style="margin:0 0 8px;color:#796966;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Message</p><p style="margin:0;color:#291d1d;font-size:14px;line-height:1.7">${safe.message}</p></div></section></main></body></html>`
  };
}
async function dispatchInquiryNotification(input, dependencies = { deliver: deliverWithFoundationGmail3 }) {
  try {
    const smtp = smtpConfig3();
    await dependencies.deliver({ to: smtp.user, ...createInquiryNotification(input) });
    return "sent";
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown notification error." };
  }
}

// backend/routers/inquiries.ts
var contactInquiryInput = z3.object({
  fullName: z3.string().trim().min(2, "Please enter your full name.").max(255),
  email: z3.string().trim().email("Please enter a valid email address.").max(320),
  phone: z3.string().trim().min(8, "Please enter a valid phone number.").max(32).regex(/^[0-9+()\-\s]+$/, "Please use a valid phone number."),
  topic: z3.enum(INQUIRY_TOPICS),
  message: z3.string().trim().min(15, "Please share a little more detail so the Foundation can help.").max(2e3),
  privacyConsent: z3.literal(true, { error: "Please confirm that AASW may use these details to respond to your inquiry." }),
  website: z3.string().max(0).optional()
});
function createInquiryRef() {
  return `AASW-INQ-${nanoid2(12).toUpperCase()}`;
}
var inquiryRouter = router({
  submit: publicProcedure.input(contactInquiryInput).mutation(async ({ input }) => {
    if (input.website) throw new TRPCError4({ code: "BAD_REQUEST", message: "Unable to submit this inquiry." });
    const inquiryRef = createInquiryRef();
    await createContactInquiry({ inquiryRef, fullName: input.fullName, email: input.email, phone: input.phone, topic: input.topic, message: input.message, status: "submitted", notificationStatus: "pending" });
    const notification = await dispatchInquiryNotification({ inquiryRef, fullName: input.fullName, email: input.email, phone: input.phone, topic: input.topic, message: input.message });
    if (notification === "sent") await markContactInquiryNotification(inquiryRef, "sent");
    else await markContactInquiryNotification(inquiryRef, "failed", notification.error);
    return { inquiryRef, status: "submitted", notificationStatus: notification === "sent" ? "sent" : "failed" };
  })
});
var newsletterSubscribeInput = z3.object({
  email: z3.string().trim().email("Please enter a valid email address.").max(320),
  source: z3.enum(["footer", "updates_page"]).default("footer"),
  website: z3.string().max(0).optional()
});
var newsletterRouter = router({
  subscribe: publicProcedure.input(newsletterSubscribeInput).mutation(async ({ input }) => {
    if (input.website) throw new TRPCError4({ code: "BAD_REQUEST", message: "Unable to process this subscription." });
    const email = input.email.toLowerCase();
    const result = await subscribeNewsletterEmail({ email, source: input.source });
    return { email, status: "subscribed", alreadySubscribed: !result.created };
  })
});

// backend/routers/donations.ts
import { TRPCError as TRPCError5 } from "@trpc/server";
import { nanoid as nanoid3 } from "nanoid";
import { z as z4 } from "zod";

// backend/email/donationNotification.ts
import nodemailer4 from "nodemailer";
function escapeHtml4(value) {
  return value.replace(/[&<'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
function smtpConfig4() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!host || !port || !user || !pass) throw new Error("Foundation notification sender is not configured.");
  return { host, port, user, pass };
}
async function deliverWithFoundationGmail4(mail) {
  const smtp = smtpConfig4();
  const transport = nodemailer4.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: smtp.port !== 465, auth: { user: smtp.user, pass: smtp.pass } });
  return transport.sendMail({ from: { name: "AASW Foundation", address: smtp.user }, replyTo: smtp.user, ...mail });
}
function createDonationNotification(input) {
  const formattedAmount = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(input.amount);
  const text2 = `New donation details have been received.

Donation reference: ${input.donationRef}
Donor: ${input.fullName}
Email: ${input.email}
Phone: ${input.phone}
Amount selected: ${formattedAmount}
Location: ${input.city}, ${input.state}

PAN, date of birth and address are not included in this email. Review sensitive records only through the protected Foundation workspace.`;
  const safe = { donationRef: escapeHtml4(input.donationRef), fullName: escapeHtml4(input.fullName), email: escapeHtml4(input.email), phone: escapeHtml4(input.phone), amount: escapeHtml4(formattedAmount), location: escapeHtml4(`${input.city}, ${input.state}`) };
  return { subject: `New donation details \xB7 ${input.donationRef}`, text: text2, html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:620px;margin:0 auto;padding:30px 20px"><section style="border-top:6px solid #d4820a;background:#fffaf0;padding:30px"><p style="margin:0 0 14px;color:#d4820a;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">AASW Foundation \xB7 Donation detail alert</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:30px;font-weight:400">A new donation path has started.</h1><table role="presentation" style="width:100%;margin-top:24px;border-collapse:collapse"><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Reference</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right;font-weight:700">${safe.donationRef}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Donor</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.fullName}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Contact</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.email}<br/>${safe.phone}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Amount selected</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.amount}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Location</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.location}</td></tr></table><p style="margin:22px 0 0;color:#796966;font-size:12px;line-height:1.6">For privacy, PAN, date of birth and address are not included in this email. Review sensitive information only in the protected Foundation workspace.</p></section></main></body></html>` };
}
async function dispatchDonationNotification(input, dependencies = { deliver: deliverWithFoundationGmail4 }) {
  try {
    const smtp = smtpConfig4();
    await dependencies.deliver({ to: smtp.user, ...createDonationNotification(input) });
    return "sent";
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown notification error." };
  }
}

// backend/routers/donations.ts
var donationDetailsInput = z4.object({
  fullName: z4.string().trim().min(2).max(255),
  email: z4.string().trim().email().max(320),
  phone: z4.string().trim().min(8).max(32).regex(/^[0-9+()\-\s]+$/),
  dob: z4.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  panNumber: z4.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/),
  state: z4.string().trim().min(2).max(128),
  city: z4.string().trim().min(2).max(128),
  address: z4.string().trim().min(8).max(1500),
  pincode: z4.string().regex(/^\d{6}$/),
  amount: z4.number().int().min(10).max(1e7),
  privacyConsent: z4.literal(true),
  website: z4.string().max(0).optional()
});
function createDonationRef() {
  return `AASW-DON-${nanoid3(12).toUpperCase()}`;
}
var donationRouter = router({
  submitDetails: publicProcedure.input(donationDetailsInput).mutation(async ({ input }) => {
    if (input.website) throw new TRPCError5({ code: "BAD_REQUEST", message: "Unable to submit donation details." });
    if ((/* @__PURE__ */ new Date(`${input.dob}T00:00:00Z`)).getTime() > Date.now()) throw new TRPCError5({ code: "BAD_REQUEST", message: "Date of birth cannot be in the future." });
    const donationRef = createDonationRef();
    await createDonationIntent({ donationRef, fullName: input.fullName, email: input.email, phone: input.phone, dob: input.dob, panEncrypted: encryptSensitiveValue(input.panNumber), panLastFour: input.panNumber.slice(-4), country: "India", state: input.state, city: input.city, address: input.address, pincode: input.pincode, amount: input.amount, status: "details_submitted", notificationStatus: "pending" });
    const notification = await dispatchDonationNotification({ donationRef, fullName: input.fullName, email: input.email, phone: input.phone, amount: input.amount, state: input.state, city: input.city });
    if (notification === "sent") await markDonationIntentNotification(donationRef, "sent");
    else await markDonationIntentNotification(donationRef, "failed", notification.error);
    return { donationRef, status: "details_submitted", notificationStatus: notification === "sent" ? "sent" : "failed" };
  })
});

// backend/routers/volunteer.ts
import { TRPCError as TRPCError6 } from "@trpc/server";
import { nanoid as nanoid4 } from "nanoid";
import { z as z5 } from "zod";

// backend/email/volunteerNotification.ts
import nodemailer5 from "nodemailer";
function escapeHtml5(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
function smtpConfig5() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!host || !port || !user || !pass) throw new Error("Volunteer notification sender is not configured.");
  return { host, port, user, pass };
}
async function deliverWithFoundationGmail5(mail) {
  const smtp = smtpConfig5();
  const transport = nodemailer5.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: smtp.port !== 465, auth: { user: smtp.user, pass: smtp.pass } });
  return transport.sendMail({ from: { name: "AASW Foundation", address: smtp.user }, replyTo: smtp.user, ...mail });
}
function createVolunteerApplicationNotification(input) {
  const body = `A new volunteer application has been received.

Application reference: ${input.applicationRef}
Applicant: ${input.fullName}
Email: ${input.email}
Phone: ${input.phone}
Location: ${input.city}, ${input.state}
Skills: ${input.skills}
Availability: ${input.availability}
Interests: ${input.interests}

Review and decide through the protected Foundation workspace.`;
  const safe = { applicationRef: escapeHtml5(input.applicationRef), fullName: escapeHtml5(input.fullName), email: escapeHtml5(input.email), phone: escapeHtml5(input.phone), city: escapeHtml5(input.city), state: escapeHtml5(input.state), skills: escapeHtml5(input.skills), availability: escapeHtml5(input.availability), interests: escapeHtml5(input.interests) };
  return {
    subject: `New volunteer application \xB7 ${input.applicationRef}`,
    text: body,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:620px;margin:0 auto;padding:30px 20px"><section style="border-top:6px solid #2f6b52;background:#fffaf0;padding:30px"><p style="margin:0 0 14px;color:#2f6b52;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">AASW Foundation \xB7 Volunteer alert</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:30px;font-weight:400">New volunteer application received.</h1><table role="presentation" style="width:100%;margin-top:24px;border-collapse:collapse"><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Reference</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right;font-weight:700">${safe.applicationRef}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Applicant</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.fullName}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Contact</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.email}<br/>${safe.phone}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Location</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.city}, ${safe.state}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Skills</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.skills}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Availability</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.availability}</td></tr></table><p style="margin:22px 0 0;color:#796966;font-size:12px;line-height:1.6">Review and decide through the protected Foundation workspace. Volunteer interests: ${safe.interests}</p></section></main></body></html>`
  };
}
function createVolunteerDecisionMail(input) {
  const approved = input.status === "approved";
  const notes = input.reviewNotes?.trim();
  const safe = { fullName: escapeHtml5(input.fullName), applicationRef: escapeHtml5(input.applicationRef), notes: notes ? escapeHtml5(notes) : "" };
  return {
    to: input.email,
    subject: approved ? `AASW Foundation volunteer application approved \xB7 ${input.applicationRef}` : `AASW Foundation volunteer application update \xB7 ${input.applicationRef}`,
    text: approved ? `Dear ${input.fullName},

Thank you for offering your time to AASW Foundation. Your volunteer application (${input.applicationRef}) has been approved.

${notes ? `Notes from the Foundation: ${notes}

` : ""}Our team will reach out with your first volunteering opportunity and any onboarding steps.

AASW Foundation` : `Dear ${input.fullName},

Thank you for your interest in volunteering with AASW Foundation. After review, we are unable to proceed with your application (${input.applicationRef}) at this time.

${notes ? `Notes from the Foundation: ${notes}

` : ""}You are welcome to apply again in the future.

AASW Foundation`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:620px;margin:0 auto;padding:30px 20px"><section style="border-top:6px solid #2f6b52;background:#fffaf0;padding:30px"><p style="margin:0 0 14px;color:#2f6b52;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">AASW Foundation \xB7 Volunteer application</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:30px;font-weight:400">${approved ? "Welcome to the volunteer collective." : "An update on your application."}</h1><p style="margin:22px 0 0;color:#5c4b47;font-size:16px;line-height:1.7">Dear ${safe.fullName}, ${approved ? "your volunteer application has been approved. Our team will reach out with your first volunteering opportunity and any onboarding steps." : "after review, we are unable to proceed with your volunteer application at this time. You are welcome to apply again in the future."}</p><p style="margin:18px 0 0;color:#796966;font-size:12px">Reference: ${safe.applicationRef}</p>${safe.notes ? `<p style="margin:22px 0 0;padding:16px;border:1px solid #d8cfc4;background:#fffdf7;color:#5c4b47;font-size:14px;line-height:1.65"><strong>Notes from the Foundation:</strong><br/>${safe.notes}</p>` : ""}<p style="margin:22px 0 0;color:#5c4b47;font-size:14px;line-height:1.65">For any question, write to <a href="mailto:aaswfoundation06@gmail.com" style="color:#2f6b52">aaswfoundation06@gmail.com</a>.</p></section></main></body></html>`
  };
}
async function dispatchVolunteerApplicationNotification(input, dependencies = { deliver: deliverWithFoundationGmail5 }) {
  try {
    const smtp = smtpConfig5();
    await dependencies.deliver({ to: smtp.user, ...createVolunteerApplicationNotification(input) });
    return "sent";
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown volunteer notification error." };
  }
}
async function dispatchVolunteerDecisionEmail(input, dependencies = { deliver: deliverWithFoundationGmail5 }) {
  try {
    await dependencies.deliver(createVolunteerDecisionMail(input));
    return "sent";
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown volunteer decision error." };
  }
}

// backend/routers/volunteer.ts
var volunteerApplicationInput = z5.object({
  fullName: z5.string().trim().min(2, "Please enter your full name.").max(255),
  email: z5.string().trim().toLowerCase().email("Please enter a valid email address.").max(320),
  phone: z5.string().trim().min(8, "Please enter a valid phone number.").max(32).regex(/^[0-9+()\-\s]+$/, "Please use a valid phone number."),
  city: z5.string().trim().min(2, "Please enter your city.").max(128),
  state: z5.string().trim().min(2, "Please enter your state or region.").max(128),
  skills: z5.string().trim().min(3, "Please share the skills you can contribute.").max(2e3),
  availability: z5.string().trim().min(3, "Please share when you are available.").max(255),
  interests: z5.string().trim().min(3, "Please share where you would like to help.").max(2e3),
  message: z5.string().trim().max(1500).optional(),
  privacyConsent: z5.literal(true, { error: "Please confirm that AASW may use these details to follow up on your application." }),
  website: z5.string().max(0).optional()
});
function createVolunteerApplicationRef() {
  return `AASW-VOL-${nanoid4(12).toUpperCase()}`;
}
var volunteerRouter = router({
  submit: publicProcedure.input(volunteerApplicationInput).mutation(async ({ input }) => {
    if (input.website) throw new TRPCError6({ code: "BAD_REQUEST", message: "Unable to submit this application." });
    const applicationRef = createVolunteerApplicationRef();
    try {
      await createVolunteerApplication({
        applicationRef,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        city: input.city,
        state: input.state,
        skills: input.skills,
        availability: input.availability,
        interests: input.interests,
        message: input.message || null,
        status: "submitted",
        notificationStatus: "pending",
        decisionNotificationStatus: "pending"
      });
    } catch (error) {
      console.error("[Volunteer] Application submission failed", { applicationRef, error });
      throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Your volunteer application could not be saved. Please try again." });
    }
    const notification = await dispatchVolunteerApplicationNotification({ applicationRef, fullName: input.fullName, email: input.email, phone: input.phone, city: input.city, state: input.state, skills: input.skills, availability: input.availability, interests: input.interests });
    if (notification === "sent") await markVolunteerApplicationNotification(applicationRef, "sent");
    else await markVolunteerApplicationNotification(applicationRef, "failed", notification.error);
    return { applicationRef, status: "submitted", notificationStatus: notification === "sent" ? "sent" : "failed" };
  }),
  /** Public status lookup: requires both the unguessable reference and the applicant email. */
  myStatus: publicProcedure.input(z5.object({ applicationRef: z5.string().trim().min(6).max(40), email: z5.string().trim().toLowerCase().email().max(320) })).query(async ({ input }) => {
    const application = await getVolunteerApplicationByRef(input.applicationRef);
    if (!application || application.email !== input.email) return { found: false, status: null };
    return { found: true, status: application.status };
  })
});

// backend/routers/management.ts
import { TRPCError as TRPCError7 } from "@trpc/server";
import { nanoid as nanoid5 } from "nanoid";
import { z as z6 } from "zod";

// backend/email/memberPayoutNotification.ts
import nodemailer6 from "nodemailer";
function escapeHtml6(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
function formatRupees(amountInPaise) {
  return `\u20B9${(amountInPaise / 100).toLocaleString("en-IN")}`;
}
function smtpConfig6() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!host || !port || !user || !pass) throw new Error("Foundation member email sender is not configured.");
  return { host, port, user, pass };
}
async function deliverWithFoundationGmail6(mail) {
  const smtp = smtpConfig6();
  const transport = nodemailer6.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: smtp.port !== 465, auth: { user: smtp.user, pass: smtp.pass } });
  return transport.sendMail({ from: { name: "AASW Foundation", address: smtp.user }, replyTo: smtp.user, ...mail });
}
function emailCopy(status, input) {
  if (status === "verified") {
    return {
      subject: `Programme payout approved \xB7 ${input.completionRef}`,
      heading: "Your payout is approved.",
      intro: "Your programme completion report has been verified by the Foundation. The approved amount will be settled to the payout destination you shared with your report.",
      rows: [
        ["Completion reference", input.completionRef],
        ["Approved amount", formatRupees(input.amountInPaise)],
        ...input.payoutNote ? [["Foundation note", input.payoutNote]] : []
      ],
      footer: "You can review the payment details in the Member Portal. The settlement reference will be shared once the transfer completes."
    };
  }
  return {
    subject: `Programme payout settled \xB7 ${input.completionRef}`,
    heading: "Your payout has been settled.",
    intro: "The Foundation has recorded your programme payout as settled to the payout destination you shared with your completion report.",
    rows: [
      ["Completion reference", input.completionRef],
      ["Settled amount", formatRupees(input.amountInPaise)],
      ...input.payoutReference ? [["Settlement reference", input.payoutReference]] : []
    ],
    footer: "Download your payout receipt from the Membership history section of the Member Portal for your records."
  };
}
function createMemberPayoutStatusEmail(input) {
  const copy = emailCopy(input.status, input);
  const safe = {
    fullName: escapeHtml6(input.fullName),
    membershipNo: escapeHtml6(input.membershipNo),
    dashboardUrl: escapeHtml6(input.dashboardUrl),
    heading: escapeHtml6(copy.heading),
    intro: escapeHtml6(copy.intro),
    footer: escapeHtml6(copy.footer),
    rows: copy.rows.map(([label, value]) => [escapeHtml6(label), escapeHtml6(value)])
  };
  const textBody = `Dear ${input.fullName},

${copy.intro}

${copy.rows.map(([label, value]) => `${label}: ${value}`).join("\n")}

${copy.footer}

Open your Member Portal: ${input.dashboardUrl}

AASW Foundation
Do not reply to this email.`;
  const htmlBody = `<!doctype html><html lang="en"><body style="margin:0;background:#f6f0e6;color:#291d1d;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f0e6"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#fffdf7;border:1px solid #e5ddd4"><tr><td style="padding:22px 30px;background:#174c3c"><p style="margin:0;color:#eac06e;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase">AASW Foundation</p><p style="margin:4px 0 0;color:#ffffff;font-size:14px;font-weight:700;letter-spacing:.4px">Programme payout update</p></td></tr><tr><td style="padding:34px 30px 30px"><h1 style="margin:0 0 16px;color:#291d1d;font-family:Georgia,serif;font-size:32px;font-weight:400;line-height:1.15">${safe.heading}</h1><p style="margin:0 0 22px;color:#584744;font-size:15px;line-height:1.7">${safe.intro}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf0;border-left:4px solid #d4820a">${safe.rows.map(([label, value]) => `<tr><td style="padding:13px 18px;border-bottom:1px solid #eee3d3"><p style="margin:0;color:#796966;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">${label}</p><p style="margin:5px 0 0;color:#291d1d;font-size:17px;font-weight:700">${value}</p></td></tr>`).join("")}</table><p style="margin:22px 0 0;color:#796966;font-size:12px;line-height:1.65">${safe.footer}</p><table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px"><tr><td><a href="${safe.dashboardUrl}" style="display:inline-block;padding:14px 18px;background:#174c3c;color:#fffdf7;font-size:13px;font-weight:700;text-decoration:none">Open Member Portal</a></td></tr></table></td></tr><tr><td style="padding:22px 30px;background:#f0e7d8;border-top:1px solid #e2d7c8"><p style="margin:0;color:#5b4c47;font-size:11px;line-height:1.6">AASW Foundation \xB7 Rura, Kanpur Dehat, Uttar Pradesh 209303</p><p style="margin:10px 0 0;color:#796966;font-size:10px">This is an automated programme update; please do not reply.</p></td></tr></table></td></tr></table></body></html>`;
  return { subject: copy.subject, text: textBody, html: htmlBody };
}
async function dispatchMemberPayoutStatusEmail(input, dependencies = { deliver: deliverWithFoundationGmail6 }) {
  const message = createMemberPayoutStatusEmail(input);
  try {
    await dependencies.deliver({ to: input.email, ...message });
    return "sent";
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown notification error." };
  }
}

// backend/routers/management.ts
var limitInput = z6.object({ limit: z6.number().int().min(1).max(100).default(50) });
var membershipStatus = z6.enum(["submitted", "reviewing", "approved", "declined"]);
var inquiryStatus = z6.enum(["submitted", "reviewing", "responded", "closed"]);
var donationStatus = z6.enum(["details_submitted", "checkout_created", "verified", "captured", "failed", "closed"]);
var mediaStatus = z6.enum(["draft", "published", "archived"]);
var serviceRequestStatus = z6.enum(["submitted", "reviewing", "accepted", "not_available", "completed", "closed"]);
var supportMessageStatus = z6.enum(["submitted", "reviewing", "responded", "closed"]);
var volunteerStatus = z6.enum(["submitted", "reviewing", "approved", "rejected", "inactive"]);
var allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
var MAX_IMAGE_BYTES = 8 * 1024 * 1024;
function imageBuffer(dataBase64, mimeType) {
  if (!/^[A-Za-z0-9+/=]+$/.test(dataBase64)) throw new TRPCError7({ code: "BAD_REQUEST", message: "Image data could not be read." });
  const bytes = Buffer.from(dataBase64, "base64");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new TRPCError7({ code: "BAD_REQUEST", message: "Use a JPG, PNG or WebP image up to 8 MB." });
  if (mimeType === "image/jpeg" && !(bytes[0] === 255 && bytes[1] === 216)) throw new TRPCError7({ code: "BAD_REQUEST", message: "The selected file does not match its declared image type." });
  if (mimeType === "image/png" && !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new TRPCError7({ code: "BAD_REQUEST", message: "The selected file does not match its declared image type." });
  if (mimeType === "image/webp" && bytes.subarray(0, 4).toString("ascii") !== "RIFF") throw new TRPCError7({ code: "BAD_REQUEST", message: "The selected file does not match its declared image type." });
  return bytes;
}
function safeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "field-photo";
}
function driveFolderId(value) {
  const match = value.match(/(?:folders\/|id=)([a-zA-Z0-9_-]{10,})/) ?? value.match(/^([a-zA-Z0-9_-]{20,})$/);
  if (!match) throw new TRPCError7({ code: "BAD_REQUEST", message: "Provide a valid Google Drive folder link or folder ID." });
  return match[1];
}
function memberAppBaseUrl2(req) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = req.get?.("host");
  if (host) return `${req.protocol === "http" ? "http" : "https"}://${host}`;
  return "http://localhost:3000";
}
async function notifyMemberOfPayout(memberId, email, input, req) {
  if (!email?.email) return "skipped";
  return dispatchMemberPayoutStatusEmail({ fullName: email.fullName, email: email.email, membershipNo: email.membershipNo, completionRef: input.completionRef, status: input.status, amountInPaise: input.amountInPaise, payoutNote: input.payoutNote, payoutReference: input.payoutReference, dashboardUrl: `${memberAppBaseUrl2(req)}/member/dashboard` });
}
var managementRouter = router({
  summary: adminProcedure.query(() => getFoundationManagementSummary()),
  alerts: router({
    list: adminProcedure.input(limitInput).query(({ input }) => listFoundationAdminAlerts(input.limit)),
    markRead: adminProcedure.input(z6.object({ alertId: z6.number().int().positive() })).mutation(async ({ input }) => {
      await markFoundationAdminAlertRead(input.alertId);
      return { success: true };
    })
  }),
  memberships: router({
    list: adminProcedure.input(limitInput).query(({ input }) => listMembershipApplications(input.limit)),
    updateStatus: adminProcedure.input(z6.object({ applicationRef: z6.string().min(1), status: membershipStatus })).mutation(async ({ input }) => {
      await updateMembershipApplicationStatus(input.applicationRef, input.status);
      return { status: input.status };
    }),
    proofUrl: adminProcedure.input(z6.object({ applicationRef: z6.string().min(1) })).query(async ({ input }) => {
      const key = await getMembershipApplicationProofKey(input.applicationRef);
      if (!key) throw new TRPCError7({ code: "NOT_FOUND", message: "Membership proof was not found." });
      try {
        return { url: await storageGetSignedUrl(key) };
      } catch (error) {
        if (process.env.NODE_ENV === "production") throw error;
        return { url: storageLocalUploadDataUrl(key) };
      }
    })
  }),
  inquiries: router({ list: adminProcedure.input(limitInput).query(({ input }) => listContactInquiries(input.limit)), updateStatus: adminProcedure.input(z6.object({ inquiryRef: z6.string().min(1), status: inquiryStatus })).mutation(async ({ input }) => {
    await updateContactInquiryStatus(input.inquiryRef, input.status);
    return { status: input.status };
  }) }),
  volunteers: router({
    list: adminProcedure.input(z6.object({ limit: z6.number().int().min(1).max(100).default(50), status: volunteerStatus.optional() })).query(({ input }) => listVolunteerApplications(input.limit, input.status)),
    review: adminProcedure.input(z6.object({ applicationRef: z6.string().trim().min(6).max(40), status: volunteerStatus, reviewNotes: z6.string().trim().max(1500).optional() })).mutation(async ({ input, ctx }) => {
      const application = await getVolunteerApplicationByRef(input.applicationRef);
      if (!application) throw new TRPCError7({ code: "NOT_FOUND", message: "Volunteer application was not found." });
      if (application.status === input.status) return { applicationRef: input.applicationRef, status: input.status, unchanged: true };
      await updateVolunteerApplicationStatus({ applicationRef: input.applicationRef, status: input.status, reviewNotes: input.reviewNotes, reviewerOpenId: ctx.user.openId });
      if (input.status === "approved" || input.status === "rejected") {
        const decision = await dispatchVolunteerDecisionEmail({ applicationRef: input.applicationRef, fullName: application.fullName, email: application.email, status: input.status, reviewNotes: input.reviewNotes });
        await markVolunteerDecisionNotification(input.applicationRef, decision === "sent" ? "sent" : "failed", decision === "sent" ? void 0 : decision.error);
      }
      return { applicationRef: input.applicationRef, status: input.status };
    })
  }),
  donations: router({ list: adminProcedure.input(limitInput).query(({ input }) => listDonationIntents(input.limit)), updateStatus: adminProcedure.input(z6.object({ donationRef: z6.string().min(1), status: donationStatus })).mutation(async ({ input }) => {
    await updateDonationIntentStatus(input.donationRef, input.status);
    return { status: input.status };
  }) }),
  payments: router({ list: adminProcedure.input(limitInput).query(({ input }) => listPaymentTransactions(input.limit)) }),
  serviceRequests: router({
    list: adminProcedure.input(limitInput).query(({ input }) => listFoundationMemberServiceRequests(input.limit)),
    updateStatus: adminProcedure.input(z6.object({ requestRef: z6.string().min(1).max(40), status: serviceRequestStatus, adminNote: z6.string().trim().max(1200).optional() })).mutation(async ({ input, ctx }) => {
      await updateMemberServiceRequestStatus({ ...input, reviewedByOpenId: ctx.user.openId });
      return { requestRef: input.requestRef, status: input.status };
    })
  }),
  completions: router({
    list: adminProcedure.input(z6.object({ limit: z6.number().int().min(1).max(100).default(50), status: z6.enum(["submitted", "verified", "rejected", "paid"]).optional() })).query(({ input }) => listFoundationMemberServiceCompletions(input.limit, input.status)),
    // Live queue counts power the numbered status chips on the verification page.
    stats: adminProcedure.query(() => countMemberServiceCompletionsByStatus()),
    // Recent verification/settlement moves for the activity feed; refresh
    // rides the same invalidation as stats.
    activity: adminProcedure.input(z6.object({ limit: z6.number().int().min(1).max(30).default(12) }).default({ limit: 12 })).query(({ input }) => listMemberCompletionActivity(input.limit)),
    // Compliance export: one row per completion with payout outcome. Destinations
    // (UPI id / bank account) are deliberately excluded from the export.
    exportCsv: adminProcedure.input(z6.object({ status: z6.enum(["submitted", "verified", "rejected", "paid"]).optional() }).default({})).mutation(async ({ input, ctx }) => {
      const rows = await listFoundationMemberServiceCompletions(100, input.status);
      const escapeCsv = (value) => {
        const text2 = value == null ? "" : String(value);
        return /[",\n\r]/.test(text2) ? `"${text2.replaceAll('"', '""')}"` : text2;
      };
      const header = ["Completion ref", "Request ref", "Programme", "Member", "Membership no", "Status", "Payout amount (INR)", "Payout method", "Payout reference", "Verified at", "Paid at", "Reported at"];
      const lines = [header.join(",")];
      for (const row of rows) lines.push([row.completionRef, row.requestRef, row.serviceType, row.fullName, row.membershipNo, row.status, row.payoutAmount != null ? (row.payoutAmount / 100).toFixed(2) : "", row.payoutMethod ?? "", row.payoutReference ?? "", row.verifiedAt ? new Date(row.verifiedAt).toISOString() : "", row.paidAt ? new Date(row.paidAt).toISOString() : "", new Date(row.createdAt).toISOString()].map(escapeCsv).join(","));
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "completion.exported_csv", entityType: "member_service_completion", entityId: input.status ?? "all", details: { rows: rows.length, status: input.status ?? "all" } });
      return { filename: `AASW-completions-${input.status ?? "all"}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`, content: lines.join("\r\n") };
    }),
    proofUrl: adminProcedure.input(z6.object({ storageKey: z6.string().trim().min(10).max(512) })).mutation(async ({ input }) => {
      if (!input.storageKey.startsWith("member-completions/")) throw new TRPCError7({ code: "BAD_REQUEST", message: "Invalid proof key." });
      try {
        return { url: await storageGetSignedUrl(input.storageKey) };
      } catch (error) {
        if (process.env.NODE_ENV === "production") throw error;
        const local = storageGetLocalUpload(input.storageKey);
        return { url: `data:${local.mimeType};base64,${local.data.toString("base64")}` };
      }
    }),
    verify: adminProcedure.input(z6.object({ completionRef: z6.string().trim().min(6).max(40), payoutAmount: z6.number().int().min(1e4, "Enter a payout of at least \u20B9100.").max(100 * 100 * 1e3), payoutMethod: z6.enum(["upi", "bank_transfer", "other"]), payoutNote: z6.string().trim().max(2e3).optional() })).mutation(async ({ input, ctx }) => {
      const verified = await verifyMemberServiceCompletion({ completionRef: input.completionRef, payoutAmount: input.payoutAmount, payoutMethod: input.payoutMethod, payoutNote: input.payoutNote, verifiedByOpenId: ctx.user.openId });
      if (!verified) throw new TRPCError7({ code: "BAD_REQUEST", message: "This completion report was already processed." });
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "completion.verified", entityType: "member_service_completion", entityId: input.completionRef, details: { payoutAmount: input.payoutAmount, payoutMethod: input.payoutMethod } });
      const delivery = await notifyMemberOfPayout(verified.memberId, await getMemberById(verified.memberId), { completionRef: input.completionRef, status: "verified", amountInPaise: input.payoutAmount, payoutNote: input.payoutNote }, ctx.req);
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "completion.member_notified", entityType: "member_service_completion", entityId: input.completionRef, details: { emailKind: "payout_verified", delivery: delivery === "sent" ? "sent" : delivery === "skipped" ? "skipped_no_member_email" : "failed", error: typeof delivery === "object" ? delivery.error : void 0 } });
      return { completionRef: input.completionRef, status: "verified" };
    }),
    reject: adminProcedure.input(z6.object({ completionRef: z6.string().trim().min(6).max(40), rejectionReason: z6.string().trim().min(10, "Tell the member why the report was rejected (at least 10 characters).").max(2e3) })).mutation(async ({ input, ctx }) => {
      const rejected = await rejectMemberServiceCompletion({ completionRef: input.completionRef, rejectionReason: input.rejectionReason, verifiedByOpenId: ctx.user.openId });
      if (!rejected) throw new TRPCError7({ code: "BAD_REQUEST", message: "This completion report was already processed." });
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "completion.rejected", entityType: "member_service_completion", entityId: input.completionRef, details: { rejectionReason: input.rejectionReason } });
      return { completionRef: input.completionRef, status: "rejected" };
    }),
    markPaid: adminProcedure.input(z6.object({ completionRef: z6.string().trim().min(6).max(40), payoutReference: z6.string().trim().min(4, "Enter the UPI or bank transfer reference number.").max(120) })).mutation(async ({ input, ctx }) => {
      const settled = await payMemberServiceCompletion({ completionRef: input.completionRef, payoutReference: input.payoutReference, paidByOpenId: ctx.user.openId });
      if (!settled) throw new TRPCError7({ code: "BAD_REQUEST", message: "Only verified completions can be marked paid." });
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "completion.paid", entityType: "member_service_completion", entityId: input.completionRef, details: { payoutAmount: settled.payoutAmount, payoutMethod: settled.payoutMethod, payoutReference: input.payoutReference } });
      if (settled.payoutAmount != null) {
        const delivery = await notifyMemberOfPayout(settled.memberId, await getMemberById(settled.memberId), { completionRef: input.completionRef, status: "paid", amountInPaise: settled.payoutAmount, payoutNote: settled.payoutNote, payoutReference: input.payoutReference }, ctx.req);
        await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "completion.member_notified", entityType: "member_service_completion", entityId: input.completionRef, details: { emailKind: "payout_paid", delivery: delivery === "sent" ? "sent" : delivery === "skipped" ? "skipped_no_member_email" : "failed", error: typeof delivery === "object" ? delivery.error : void 0 } });
      }
      return { completionRef: input.completionRef, status: "paid" };
    })
  }),
  supportMessages: router({
    list: adminProcedure.input(limitInput).query(({ input }) => listFoundationMemberSupportMessages(input.limit)),
    respond: adminProcedure.input(z6.object({ messageRef: z6.string().min(1).max(40), status: supportMessageStatus, adminReply: z6.string().trim().max(3e3).optional() })).mutation(async ({ input, ctx }) => {
      await respondToMemberSupportMessage({ ...input, repliedByOpenId: ctx.user.openId });
      return { messageRef: input.messageRef, status: input.status };
    })
  }),
  media: router({
    list: adminProcedure.input(limitInput).query(({ input }) => listGalleryMedia(input.limit)),
    upload: adminProcedure.input(z6.object({ title: z6.string().trim().min(3).max(180), description: z6.string().trim().min(10).max(2e3), altText: z6.string().trim().min(10).max(500), quarter: z6.string().trim().min(2).max(80), displayOrder: z6.number().int().min(0).max(9999).default(0), status: mediaStatus.default("draft"), image: z6.object({ originalName: z6.string().min(1).max(255), mimeType: z6.enum(allowedImageTypes), dataBase64: z6.string().min(20) }) })).mutation(async ({ input, ctx }) => {
      const bytes = imageBuffer(input.image.dataBase64, input.image.mimeType);
      const mediaRef = `AASW-MEDIA-${nanoid5(12).toUpperCase()}`;
      const upload = await storagePut(`gallery-media/${mediaRef}/${safeFileName(input.image.originalName)}`, bytes, input.image.mimeType);
      await createGalleryMedia({ mediaRef, title: input.title, description: input.description, altText: input.altText, quarter: input.quarter, displayOrder: input.displayOrder, storageKey: upload.key, imageUrl: upload.url, originalName: input.image.originalName, mimeType: input.image.mimeType, fileSize: bytes.length, source: "manual_upload", status: input.status, uploadedByOpenId: ctx.user.openId, publishedAt: input.status === "published" ? /* @__PURE__ */ new Date() : null });
      return { mediaRef, imageUrl: upload.url, status: input.status };
    }),
    update: adminProcedure.input(z6.object({ mediaRef: z6.string().min(1), title: z6.string().trim().min(3).max(180).optional(), description: z6.string().trim().min(10).max(2e3).optional(), altText: z6.string().trim().min(10).max(500).optional(), quarter: z6.string().trim().min(2).max(80).optional(), displayOrder: z6.number().int().min(0).max(9999).optional(), status: mediaStatus.optional() })).mutation(async ({ input }) => {
      const { mediaRef, ...changes } = input;
      await updateGalleryMedia(mediaRef, changes);
      return { mediaRef, ...changes };
    })
  }),
  galleryDrive: router({
    configuration: adminProcedure.query(async () => await getGalleryDriveSyncConfig() ?? null),
    saveConfiguration: adminProcedure.input(z6.object({ folderUrl: z6.string().trim().min(10).max(1024), syncIntervalHours: z6.number().int().min(12).max(168).default(24) })).mutation(async ({ input, ctx }) => {
      const folderId = driveFolderId(input.folderUrl);
      const id = await saveGalleryDriveSyncConfig({ ...input, folderId, updatedByOpenId: ctx.user.openId });
      return { id, folderId, syncStatus: "needs_access" };
    })
  })
});
var publicMediaRouter = router({ list: publicProcedure.input(limitInput).query(({ input }) => listGalleryMedia(input.limit, true)) });

// backend/routers/assistant.ts
import { z as z7 } from "zod";

// backend/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage)
  };
  if (model) {
    payload.model = model;
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetchWithBackoff(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// shared/organisationContact.ts
var AASW_CONTACT = {
  email: "aaswfoundation06@gmail.com",
  emailHref: "mailto:aaswfoundation06@gmail.com",
  primaryPhoneDisplay: "+91 99841 56418",
  primaryPhoneHref: "tel:+919984156418",
  secondaryPhoneDisplay: "+91 70072 76735",
  secondaryPhoneHref: "tel:+917007276735",
  whatsappDisplay: "+91 99841 56418",
  whatsappHref: "https://wa.me/919984156418?text=Hello%20AASW%20Foundation%2C%20I%20want%20to%20know%20more%20about%20your%20initiatives.",
  officeHours: "Mon\u2013Sat: 10:00 AM\u20136:00 PM",
  locationShort: "Rura, Kanpur Dehat",
  address: "Ward No. 2, Ambedkar Nagar, Rura, Kanpur Dehat, Uttar Pradesh 209303, India",
  mapsUrl: "https://maps.app.goo.gl/jkWptd4CRqit7FbE9"
};

// backend/routers/assistant.ts
var SYSTEM_PROMPT = `You are the AASW Foundation website assistant. AASW Foundation is a registered NGO in Uttar Pradesh, India that fuels women's success through technology and enterprise: 800+ women trained, 300+ businesses launched or scaled, 30+ eco-friendly projects across 5 districts.

Answer general questions (programmes, membership, volunteering, donations, office details) briefly and warmly in the same language the visitor uses (English or Hindi/Hinglish are both fine). Format answers with short paragraphs, **bold** for key facts and bullet lines starting with "\u2022" where helpful; you may include site links as [label](/path). For anything involving payments, documents, personal data or a specific application, direct the visitor to the Foundation's contact channels instead of guessing. Never invent statistics, dates or policy details beyond the facts given here.

Foundation facts:
- Programmes: digital skill development, green entrepreneurship, mentorship & business support, workshops & seminars, building the community.
- Membership: apply on the website (/membership); annual membership with renewal; members get a dashboard, certificate and programme services.
- Volunteering: apply on /volunteer; roles are granted on top of member accounts, never automatically.
- Donations: secure checkout on /donate; receipts are emailed.
- Contact: email ${AASW_CONTACT.email}, phone ${AASW_CONTACT.primaryPhoneDisplay} or ${AASW_CONTACT.secondaryPhoneDisplay}, WhatsApp ${AASW_CONTACT.whatsappDisplay}, office hours ${AASW_CONTACT.officeHours}.
- Office: ${AASW_CONTACT.address}.`;
var FAQ_ENTRIES = [
  {
    keywords: [/membership/i, /member/i, /join/i, /apply/i, /fee/i, /sadasya/i, /sadasyata/i, /judo/i, /judne/i, /register/i, /registration/i, /kaise (le|bane)/i],
    answer: `Joining AASW Foundation is a simple three-step process:

\u2022 **Apply online** on the [Membership page](/membership) \u2014 your basic details, district and membership type.
\u2022 **Complete the payment** through the secure checkout; the team reviews every application.
\u2022 **Get activated** \u2014 you receive your membership number, a digital certificate and access to the [member dashboard](/member/dashboard).

Members can then join programme services, track requests and download receipts from the dashboard. For a specific application status, email **${AASW_CONTACT.email}** with your application reference.`
  },
  {
    keywords: [/volunteer/i, /volunteering/i, /intern/i, /swayamse?vak/i, /judaav/i],
    answer: `We'd love to have you! Volunteering with AASW Foundation starts on the [Volunteer page](/volunteer):

\u2022 Share your **skills, availability and interests** in the short form.
\u2022 The Foundation team reviews applications and reaches out for a conversation.
\u2022 Volunteer roles are granted **on top of existing member accounts**, so active members get priority.

Questions in the meantime? Email **${AASW_CONTACT.email}** or call ${AASW_CONTACT.primaryPhoneDisplay}.`
  },
  {
    keywords: [/donat/i, /contribution/i, /fund/i, /payment/i, /pay\b/i, /razorpay/i, /receipt/i, /refund/i, /support\b/i, /contribute/i, /daan/i, /paisa/i, /madad/i, /help\b/i],
    answer: `Your support goes directly to training and enterprise work with women in Uttar Pradesh. \u{1F49B}

\u2022 **Donate securely** on the [Donate page](/donate) \u2014 cards, UPI and net banking via the payment gateway.
\u2022 A **receipt is emailed** after every successful payment.
\u2022 For payment, receipt or refund questions, contact the team at **${AASW_CONTACT.email}** or ${AASW_CONTACT.primaryPhoneDisplay} with your donation reference.`
  },
  {
    keywords: [/program/i, /programme/i, /programmes/i, /course/i, /training/i, /workshop/i, /digital/i, /skill/i, /entrepreneur/i, /green/i, /mentor/i, /seminar/i, /service/i, /kaam/i, /shiksha/i, /prashikshan/i, /activity/i, /activities/i],
    answer: `AASW Foundation runs **five programme areas** focused on women's capability and enterprise:

\u2022 **Digital skill development** \u2014 hands-on technology training.
\u2022 **Green entrepreneurship** \u2014 eco-friendly business launch support.
\u2022 **Mentorship & business support** \u2014 one-to-one guidance for growing ventures.
\u2022 **Workshops & seminars** \u2014 community learning events.
\u2022 **Building the community** \u2014 local engagement and support work.

Members can join a service directly from their dashboard. Explore details on the [Programmes page](/programs).`
  },
  {
    keywords: [/contact/i, /phone/i, /call/i, /email/i, /whatsapp/i, /address/i, /location/i, /office/i, /reach/i, /where/i, /timing/i, /hours/i, /open/i, /map/i, /visit/i, /mobile/i, /number/i, /sampark/i, /pata/i, /kahan/i],
    answer: `Here's how to reach the Foundation team:

\u2022 **Email:** ${AASW_CONTACT.email}
\u2022 **Phone:** ${AASW_CONTACT.primaryPhoneDisplay} or ${AASW_CONTACT.secondaryPhoneDisplay}
\u2022 **WhatsApp:** ${AASW_CONTACT.whatsappDisplay}
\u2022 **Office hours:** ${AASW_CONTACT.officeHours}
\u2022 **Address:** ${AASW_CONTACT.address}

You can also send a message anytime from the [Contact page](/contact) \u2014 the team replies during office hours.`
  },
  {
    keywords: [/impact/i, /statistic/i, /result/i, /achievement/i, /outcome/i, /beneficiar/i, /how many/i, /women/i, /train/i, /work/i, /success/i, /achieve/i],
    answer: `The Foundation's work to date, in numbers:

\u2022 **800+ women trained** in digital and enterprise skills.
\u2022 **300+ businesses launched or scaled** by programme participants.
\u2022 **30+ eco-friendly projects** delivered with communities.
\u2022 **5 districts** covered across Uttar Pradesh.

Programme services and stories are on the [Programmes](/programs) and [Stories](/stories) pages.`
  },
  {
    keywords: [/certificate/i, /proof/i, /document/i, /praman/i],
    answer: `Membership certificates are issued digitally once your membership is approved:

\u2022 Download yours anytime from the [member dashboard](/member/dashboard).
\u2022 A shareable email-certificate link is also available from the dashboard.

If a certificate or document is missing, email **${AASW_CONTACT.email}** with your membership number and the team will help.`
  },
  {
    keywords: [/login/i, /password/i, /account/i, /dashboard/i, /sign ?in/i, /sign ?up/i, /portal/i],
    answer: `Member portal quick help:

\u2022 **Sign in** at the [member login](/member/login) with your registered email and password.
\u2022 The [dashboard](/member/dashboard) shows programme requests, completion reports, receipts and your certificate.
\u2022 **Forgot your password?** Use "Forgot password" on the login page, or email **${AASW_CONTACT.email}** and the team will reset it.`
  },
  {
    keywords: [/story/i, /news/i, /update/i, /gallery/i, /photo/i, /media/i, /report/i, /khabar/i],
    answer: `You can explore the Foundation's public work here:

\u2022 **Stories** \u2014 [participant journeys](/stories).
\u2022 **Field Gallery** \u2014 [verified field photographs](/field-gallery).
\u2022 **Updates** \u2014 [news and field notes](/updates) on the Media Centre.
\u2022 **Reports** \u2014 [governance and public documents](/reports).`
  }
];
var GREETING_RE = /^(hi+|hey+|hello+|hlo+|helo+|namaste+|namaskar+|prana?am+|ram\s*ram+|good\s*(morning|afternoon|evening)|salaam|assalamu.*|kaise\s*ho|kya\s*haal)[\s!.,]*$/i;
var THANKS_RE = /(thank|thanks|thankyou|thank you|dhanyav?ad|shukriya|thx|ty)/i;
function localAnswer(question) {
  const trimmed = question.trim();
  if (!trimmed) return "Hi! Ask me anything about AASW Foundation \u2014 programmes, membership, volunteering or donations.";
  if (GREETING_RE.test(trimmed)) return "**Namaste!** I'm the AASW Foundation assistant.\n\nAsk me about our programmes, membership, volunteering, donations or office details \u2014 pick a topic below or type your question.";
  if (THANKS_RE.test(trimmed)) return "You're most welcome! \u{1F49B}\n\nIf anything else comes up, I'm right here \u2014 and the team is always reachable at **" + AASW_CONTACT.email + "**.";
  const matches = FAQ_ENTRIES.filter((entry) => entry.keywords.some((pattern) => pattern.test(trimmed)));
  if (matches.length > 0) return matches.map((entry) => entry.answer).join("\n\n");
  return `I can help with **general questions** about AASW Foundation \u2014 programmes, membership, volunteering, donations and office details.

For anything specific, the team responds fastest at **${AASW_CONTACT.email}** or ${AASW_CONTACT.primaryPhoneDisplay} (${AASW_CONTACT.officeHours}). You can also send a message from the [Contact page](/contact).`;
}
var chatMessageSchema = z7.object({ role: z7.enum(["user", "assistant"]), content: z7.string().trim().min(1).max(2e3) });
var assistantRouter = router({
  chat: publicProcedure.input(z7.object({ messages: z7.array(chatMessageSchema).min(1).max(20) })).mutation(async ({ input }) => {
    const lastUserMessage = [...input.messages].reverse().find((message) => message.role === "user");
    const question = lastUserMessage?.content ?? "";
    const llmConfigured = ENV.forgeApiKey.trim().length > 0;
    if (llmConfigured) {
      try {
        const history = [
          { role: "system", content: SYSTEM_PROMPT },
          ...input.messages.map((message) => ({ role: message.role, content: message.content }))
        ];
        const result = await invokeLLM({ messages: history, maxTokens: 400 });
        const choice = result.choices[0];
        const text2 = typeof choice?.message?.content === "string" ? choice.message.content.trim() : "";
        if (text2) return { reply: text2, source: "llm" };
      } catch (error) {
        console.warn("[Assistant] LLM reply failed; using local FAQ answer:", error instanceof Error ? error.message : error);
      }
    }
    return { reply: localAnswer(question), source: "local" };
  })
});

// backend/routers/payments.ts
import { TRPCError as TRPCError8 } from "@trpc/server";
import { nanoid as nanoid6 } from "nanoid";
import { z as z9 } from "zod";

// backend/email/refundNotification.ts
import nodemailer7 from "nodemailer";
function escapeHtml7(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
function formatAmount(amountInPaise) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amountInPaise / 100);
}
function createRefundProcessedMail(input) {
  const { transaction, refund } = input;
  const label = transaction.kind === "membership" ? "membership contribution" : "donation";
  const refundedAmount = formatAmount(refund.amount);
  const originalAmount = formatAmount(transaction.amount);
  const safeName = escapeHtml7(transaction.supporterName);
  const safeReason = refund.reason ? escapeHtml7(refund.reason) : "at the Foundation's discretion";
  return {
    to: transaction.supporterEmail,
    subject: `AASW Foundation refund processed \xB7 ${refund.refundRef}`,
    text: `Dear ${transaction.supporterName},

A refund of ${refundedAmount} has been processed for your ${label} (receipt ${transaction.receipt}, original amount ${originalAmount}).

Refund reference: ${refund.refundRef}
Reason: ${refund.reason ?? "Not specified"}

The amount will be returned to the original payment method, usually within 5-7 working days depending on your bank.

AASW Foundation`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:640px;margin:0 auto;padding:32px 20px"><section style="border-top:7px solid #2f6b52;background:#fffaf0;padding:34px 32px"><p style="margin:0 0 22px;color:#2f6b52;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">AASW Foundation \xB7 refund confirmation</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:32px;font-weight:400;line-height:1.1">A refund has been processed.</h1><p style="margin:22px 0 0;color:#5c4b47;font-size:16px;line-height:1.7">Dear ${safeName}, a refund for your ${escapeHtml7(label)} has been processed and is on its way back to your original payment method.</p><div style="margin:28px 0;padding:20px;border:1px solid #d8cfc4;background:#fffdf7"><p style="margin:0 0 6px;color:#796966;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Refund reference</p><p style="margin:0;color:#2f6b52;font-family:Georgia,serif;font-size:22px">${escapeHtml7(refund.refundRef)}</p><table role="presentation" style="width:100%;margin-top:22px;border-collapse:collapse"><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966;font-size:13px">Original receipt</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#291d1d;font-size:13px;text-align:right">${escapeHtml7(transaction.receipt)}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966;font-size:13px">Original amount</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#291d1d;font-size:13px;text-align:right">${escapeHtml7(originalAmount)}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966;font-size:13px">Refunded amount</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#291d1d;font-size:16px;font-weight:700;text-align:right">${escapeHtml7(refundedAmount)}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966;font-size:13px">Reason</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#291d1d;font-size:13px;text-align:right">${safeReason}</td></tr></table></div><p style="margin:0;color:#5c4b47;font-size:14px;line-height:1.65">Bank settlement usually completes within 5-7 working days. For any question, reply to this email or write to <a href="mailto:aaswfoundation06@gmail.com" style="color:#2f6b52">aaswfoundation06@gmail.com</a>.</p></section><p style="margin:18px 0 0;color:#796966;font-size:12px;line-height:1.5">AASW Foundation \xB7 Aapka Apna Social Welfare Foundation</p></main></body></html>`
  };
}
function smtpConfig7() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!host || !port || !user || !pass) throw new Error("Refund notification sender is not configured.");
  return { host, port, user, pass };
}
async function deliverWithFoundationGmail7(mail) {
  const smtp = smtpConfig7();
  const transport = nodemailer7.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: smtp.port !== 465, auth: { user: smtp.user, pass: smtp.pass } });
  return transport.sendMail({ from: { name: "AASW Foundation", address: smtp.user }, replyTo: smtp.user, ...mail });
}
async function dispatchRefundProcessedEmail(input, dependencies = { deliver: deliverWithFoundationGmail7 }) {
  try {
    await dependencies.deliver(createRefundProcessedMail(input));
    return "sent";
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown refund notification error." };
  }
}

// backend/email/receipt.ts
import nodemailer8 from "nodemailer";
function escapeHtml8(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
function formatAmount2(amountInPaise) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amountInPaise / 100);
}
function isVerifiedTransaction(transaction) {
  return transaction.status === "verified" || transaction.status === "captured";
}
function isReceiptEligible(transaction) {
  return isVerifiedTransaction(transaction) && transaction.receiptDeliveryStatus === "pending";
}
function createDonationReceiptMail(transaction) {
  const label = transaction.kind === "membership" ? "membership contribution" : "donation";
  const amount2 = formatAmount2(transaction.amount);
  const createdOn = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(transaction.createdAt);
  const supporterName = escapeHtml8(transaction.supporterName);
  const receipt = escapeHtml8(transaction.receipt);
  const safeAmount = escapeHtml8(amount2);
  return {
    to: transaction.supporterEmail,
    subject: `AASW Foundation receipt \xB7 ${transaction.receipt}`,
    text: `Dear ${transaction.supporterName},

Thank you for your ${label} to AASW Foundation.

Receipt reference: ${transaction.receipt}
Amount received: ${amount2}
Date: ${createdOn}

This receipt confirms your verified payment. For support, reply to this email or write to aaswfoundation06@gmail.com.

AASW Foundation`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:640px;margin:0 auto;padding:32px 20px"><section style="border-top:7px solid #2f6b52;background:#fffaf0;padding:34px 32px"><p style="margin:0 0 22px;color:#2f6b52;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">AASW Foundation \xB7 verified payment receipt</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:34px;font-weight:400;line-height:1.05">Thank you for standing with AASW.</h1><p style="margin:22px 0 0;color:#5c4b47;font-size:16px;line-height:1.7">Dear ${supporterName}, your ${label} has been verified. This email is your payment receipt.</p><div style="margin:28px 0;padding:20px;border:1px solid #d8cfc4;background:#fffdf7"><p style="margin:0 0 6px;color:#796966;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Receipt reference</p><p style="margin:0;color:#2f6b52;font-family:Georgia,serif;font-size:24px">${receipt}</p><table role="presentation" style="width:100%;margin-top:22px;border-collapse:collapse"><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966;font-size:13px">Amount received</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#291d1d;font-size:16px;font-weight:700;text-align:right">${safeAmount}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966;font-size:13px">Payment date</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#291d1d;font-size:13px;text-align:right">${escapeHtml8(createdOn)}</td></tr></table></div><p style="margin:0;color:#5c4b47;font-size:14px;line-height:1.65">For a question about this receipt, reply to this email or write to <a href="mailto:aaswfoundation06@gmail.com" style="color:#2f6b52">aaswfoundation06@gmail.com</a>.</p></section><p style="margin:18px 0 0;color:#796966;font-size:12px;line-height:1.5">AASW Foundation \xB7 Aapka Apna Social Welfare Foundation</p></main></body></html>`
  };
}
function smtpConfig8() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!host || !port || !user || !pass) throw new Error("SMTP receipt sender is not configured.");
  return { host, port, user, pass };
}
async function deliverWithFoundationGmail8(mail) {
  const smtp = smtpConfig8();
  const transport = nodemailer8.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: smtp.port !== 465, auth: { user: smtp.user, pass: smtp.pass } });
  return transport.sendMail({ from: { name: "AASW Foundation", address: smtp.user }, replyTo: smtp.user, ...mail });
}
async function dispatchVerifiedPaymentReceipt(transaction, dependencies = {
  claim: claimPaymentReceiptDelivery,
  markSent: markPaymentReceiptSent,
  markFailed: markPaymentReceiptFailed,
  deliver: deliverWithFoundationGmail8
}) {
  if (!isReceiptEligible(transaction)) return "skipped";
  if (!await dependencies.claim(transaction.receipt)) return "skipped";
  try {
    const delivery = await dependencies.deliver(createDonationReceiptMail(transaction));
    await dependencies.markSent(transaction.receipt, delivery.messageId ?? "smtp-message-id-unavailable");
    return "sent";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown receipt delivery error.";
    await dependencies.markFailed(transaction.receipt, message);
    return "failed";
  }
}

// backend/payments/razorpay.ts
import { createHmac as createHmac2, timingSafeEqual } from "node:crypto";
import { z as z8 } from "zod";
var razorpayOrderSchema = z8.object({
  id: z8.string().min(1),
  amount: z8.number().int().positive(),
  currency: z8.string().length(3),
  status: z8.string()
});
var razorpayRefundSchema = z8.object({
  id: z8.string().min(1),
  amount: z8.number().int().nonnegative(),
  status: z8.string(),
  payment_id: z8.string().min(1)
});
function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return keyId && keySecret ? { keyId, keySecret } : null;
}
function secureEqual(left, right) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
function verifyRazorpayCheckoutSignature(orderId, paymentId, signature, secret) {
  const expected = createHmac2("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return secureEqual(expected, signature);
}
function verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret) {
  const expected = createHmac2("sha256", webhookSecret).update(rawBody).digest("hex");
  return secureEqual(expected, signature);
}
async function createRazorpayOrder(input) {
  const config = getRazorpayConfig();
  if (!config) throw new Error("Razorpay live credentials are not configured.");
  const authorization = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${authorization}` },
    body: JSON.stringify({
      amount: input.amount,
      currency: "INR",
      receipt: input.receipt,
      notes: { purpose: input.kind, source: "aasw-foundation-website" }
    })
  });
  if (!response.ok) {
    const text2 = await response.text();
    throw new Error(`Razorpay order creation failed (${response.status}): ${text2.slice(0, 300)}`);
  }
  return razorpayOrderSchema.parse(await response.json());
}
async function createRazorpayRefund(input) {
  const config = getRazorpayConfig();
  if (!config) throw new Error("Razorpay live credentials are not configured.");
  const authorization = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(input.paymentId)}/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${authorization}` },
    body: JSON.stringify({
      amount: input.amount,
      speed: "normal",
      notes: { source: "aasw-foundation-website", ...input.reason ? { reason: input.reason.slice(0, 200) } : {} }
    })
  });
  if (!response.ok) {
    const text2 = await response.text();
    throw new Error(`Razorpay refund creation failed (${response.status}): ${text2.slice(0, 300)}`);
  }
  return razorpayRefundSchema.parse(await response.json());
}

// shared/payment-demo.ts
var MEMBERSHIP_OPTIONS = [
  { amount: 1100, label: "Annual membership", detail: "One year of support" },
  { amount: 1e4, label: "Lifetime membership", detail: "A permanent commitment" }
];
var MINIMUM_PAYMENT_AMOUNT = 10;
function resolveDemoAmount(kind, requestedAmount) {
  if (!Number.isInteger(requestedAmount) || requestedAmount < MINIMUM_PAYMENT_AMOUNT) return null;
  if (kind === "membership") {
    return MEMBERSHIP_OPTIONS.some((option) => option.amount === requestedAmount) ? requestedAmount : null;
  }
  return requestedAmount;
}

// backend/routers/payments.ts
var checkoutInput = z9.object({
  kind: z9.enum(["donation", "membership"]),
  amount: z9.number().int(),
  supporterName: z9.string().trim().min(2).max(255),
  supporterEmail: z9.string().trim().toLowerCase().email().max(320),
  supporterPhone: z9.string().trim().max(32).optional()
});
function createReceipt(kind) {
  const prefix = kind === "membership" ? "MEM" : "DON";
  return `AASW-${prefix}-${nanoid6(16)}`;
}
var paymentRouter = router({
  liveStatus: publicProcedure.query(() => ({ configured: Boolean(getRazorpayConfig()) })),
  createOrder: publicProcedure.input(checkoutInput).mutation(async ({ input }) => {
    const validAmount = resolveDemoAmount(input.kind, input.amount);
    if (!validAmount) throw new TRPCError8({ code: "BAD_REQUEST", message: "Unsupported payment amount." });
    const config = getRazorpayConfig();
    if (!config) throw new TRPCError8({ code: "PRECONDITION_FAILED", message: "Live payment setup is not complete yet." });
    const receipt = createReceipt(input.kind);
    const order = await createRazorpayOrder({ amount: validAmount * 100, receipt, kind: input.kind });
    await createPaymentTransaction({
      receipt,
      kind: input.kind,
      amount: validAmount * 100,
      currency: "INR",
      supporterName: input.supporterName,
      supporterEmail: input.supporterEmail,
      supporterPhone: input.supporterPhone || null,
      gateway: "razorpay",
      gatewayOrderId: order.id,
      status: "created"
    });
    return { keyId: config.keyId, orderId: order.id, amount: order.amount, currency: order.currency, receipt };
  }),
  verifyCheckout: publicProcedure.input(z9.object({ razorpayOrderId: z9.string().min(1), razorpayPaymentId: z9.string().min(1), razorpaySignature: z9.string().min(1) })).mutation(async ({ input }) => {
    const transaction = await getPaymentTransactionByGatewayOrderId(input.razorpayOrderId);
    const config = getRazorpayConfig();
    if (!transaction || !config || transaction.gatewayOrderId !== input.razorpayOrderId) throw new TRPCError8({ code: "NOT_FOUND", message: "Payment order was not found." });
    if (!verifyRazorpayCheckoutSignature(transaction.gatewayOrderId, input.razorpayPaymentId, input.razorpaySignature, config.keySecret)) {
      throw new TRPCError8({ code: "BAD_REQUEST", message: "Payment verification failed." });
    }
    await markPaymentTransactionStatus(transaction.gatewayOrderId, "verified", input.razorpayPaymentId);
    const receiptDelivery = await dispatchVerifiedPaymentReceipt({ ...transaction, status: "verified", gatewayPaymentId: input.razorpayPaymentId });
    if (receiptDelivery === "failed") console.error("[Payments] Verified payment receipt could not be delivered.", { receipt: transaction.receipt });
    return { verified: true, receipt: transaction.receipt, receiptDelivery };
  }),
  admin: router({
    listRefunds: misFinanceProcedure.input(z9.object({ limit: z9.number().int().min(1).max(100).default(50) })).query(({ input }) => listPaymentRefunds(input.limit)),
    /**
     * Finance-role refund initiation. The payable amount is always derived from
     * the stored transaction; a partial amount is accepted only when the caller
     * explicitly opts in, and can never exceed the original charge.
     */
    refundPayment: misFinanceProcedure.input(z9.object({
      receipt: z9.string().trim().min(6).max(40),
      amount: z9.number().int().positive().optional(),
      allowPartial: z9.boolean().optional(),
      reason: z9.string().trim().max(500).optional()
    })).mutation(async ({ input, ctx }) => {
      const transaction = await getPaymentTransactionByReceipt(input.receipt);
      if (!transaction) throw new TRPCError8({ code: "NOT_FOUND", message: "No payment transaction was found for this receipt." });
      if (transaction.status !== "verified" && transaction.status !== "captured") {
        throw new TRPCError8({ code: "PRECONDITION_FAILED", message: "Only verified or captured payments can be refunded." });
      }
      if (!transaction.gatewayPaymentId) throw new TRPCError8({ code: "PRECONDITION_FAILED", message: "This transaction has no gateway payment id yet; wait for gateway confirmation." });
      const existingRefunds = await getPaymentRefundsByReceipt(transaction.receipt);
      if (existingRefunds.length > 0) {
        throw new TRPCError8({ code: "PRECONDITION_FAILED", message: `A refund is already ${existingRefunds[0].status === "processed" ? "processed" : "in progress"} for this receipt (${existingRefunds[0].refundRef}).` });
      }
      const refundAmount = input.amount ?? transaction.amount;
      if (input.amount && !input.allowPartial) throw new TRPCError8({ code: "BAD_REQUEST", message: "Partial refunds require an explicit partial-refund confirmation." });
      if (input.amount && input.allowPartial && (input.amount > transaction.amount || input.amount < 100)) {
        throw new TRPCError8({ code: "BAD_REQUEST", message: "A partial refund must be at least \u20B91 and cannot exceed the original amount." });
      }
      const config = getRazorpayConfig();
      if (!config) throw new TRPCError8({ code: "PRECONDITION_FAILED", message: "Live payment setup is not complete; refunds require configured Razorpay credentials." });
      try {
        const gatewayRefund = await createRazorpayRefund({ paymentId: transaction.gatewayPaymentId, amount: refundAmount, reason: input.reason });
        const existingRefund = await getPaymentRefundByGatewayRefundId(gatewayRefund.id);
        if (existingRefund) return { refundRef: existingRefund.refundRef, gatewayRefundId: gatewayRefund.id, duplicate: true };
        const refundRef = `AASW-RFD-${nanoid6(16)}`;
        await recordPaymentRefundInitiated({ refundRef, receipt: transaction.receipt, gatewayPaymentId: transaction.gatewayPaymentId, gatewayRefundId: gatewayRefund.id, amount: gatewayRefund.amount, reason: input.reason, initiatedByOpenId: ctx.user.openId });
        if (gatewayRefund.status === "processed") await markPaymentRefundProcessed(gatewayRefund.id);
        const refundRow = { refundRef, amount: gatewayRefund.amount, reason: input.reason || null };
        const notification = await dispatchRefundProcessedEmail({ transaction, refund: refundRow });
        await markPaymentRefundNotified(refundRef, notification === "sent" ? "sent" : "failed", notification === "sent" ? void 0 : notification.error);
        if (notification !== "sent") console.error("[Payments] Refund notification could not be delivered.", { refundRef });
        return { refundRef, gatewayRefundId: gatewayRefund.id, refundedAmount: gatewayRefund.amount, notificationStatus: notification === "sent" ? "sent" : "failed" };
      } catch (error) {
        console.error("[Payments] Refund could not be completed", { receipt: transaction.receipt, error });
        if (error instanceof TRPCError8) throw error;
        throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "The refund could not be created with the payment gateway. Please retry or contact support." });
      }
    })
  })
});

// backend/routers/projects.ts
import { TRPCError as TRPCError9 } from "@trpc/server";
import { z as z10 } from "zod";

// shared/mis.ts
var UN_SDG_GOALS = [
  "SDG 1: No Poverty",
  "SDG 2: Zero Hunger",
  "SDG 3: Good Health and Well-being",
  "SDG 4: Quality Education",
  "SDG 5: Gender Equality",
  "SDG 6: Clean Water and Sanitation",
  "SDG 7: Affordable and Clean Energy",
  "SDG 8: Decent Work and Economic Growth",
  "SDG 9: Industry Innovation and Infrastructure",
  "SDG 10: Reduced Inequalities",
  "SDG 11: Sustainable Cities and Communities",
  "SDG 12: Responsible Consumption",
  "SDG 13: Climate Action",
  "SDG 14: Life Below Water",
  "SDG 15: Life on Land",
  "SDG 16: Peace Justice and Strong Institutions",
  "SDG 17: Partnerships for the Goals"
];
function yearOf(date2) {
  return date2.getUTCFullYear();
}
function sequence(value, length) {
  if (!Number.isInteger(value) || value < 1) throw new Error("Sequence must be a positive whole number.");
  return String(value).padStart(length, "0");
}
function createBeneficiaryId(value, now = /* @__PURE__ */ new Date()) {
  return `BEN-${yearOf(now)}-${sequence(value, 4)}`;
}
function createFieldEventId(value, now = /* @__PURE__ */ new Date()) {
  return `EVT-${yearOf(now)}-${sequence(value, 4)}`;
}
function suggestProjectCode(value, now = /* @__PURE__ */ new Date()) {
  return `PRJ-${yearOf(now)}-${sequence(value, 3)}`;
}
var ALERT_CLASSES = { red: "bg-red-100 text-red-900 border-red-300", amber: "bg-amber-100 text-amber-950 border-amber-300", green: "bg-emerald-100 text-emerald-950 border-emerald-300", blue: "bg-blue-100 text-blue-950 border-blue-300" };
function misAlert(tone, label) {
  return { tone, label, className: ALERT_CLASSES[tone] };
}
function reportingAlert(dueDate, status, now = /* @__PURE__ */ new Date()) {
  const normalized = status?.toLowerCase();
  if (normalized === "draft" || normalized === "pending") return misAlert("blue", "Draft / Pending");
  if (normalized === "overdue") return misAlert("red", "Overdue");
  if (normalized === "approved" || normalized === "submitted" || normalized === "on track" || normalized === "completed") return misAlert("green", "On track");
  const days = Math.ceil((new Date(dueDate).getTime() - now.getTime()) / 864e5);
  if (days < 0) return misAlert("red", "Overdue");
  if (days <= 7) return misAlert("amber", "Due within 7 days");
  return misAlert("green", "On track");
}

// backend/routers/projects.ts
var dateString = z10.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
var projectStatus = z10.enum(["planned", "active", "on_hold", "completed", "closed", "cancelled"]);
var activityStatus = z10.enum(["planned", "ongoing", "completed", "delayed", "cancelled"]);
var projectInput = z10.object({ projectName: z10.string().trim().min(3).max(255), projectCode: z10.string().trim().regex(/^PRJ-\d{4}-\d{3,}$/).max(32).optional(), projectTheme: z10.string().trim().min(3).max(255), projectLocation: z10.string().trim().min(3).max(255), startDate: dateString, endDate: dateString, projectStatus: projectStatus.default("planned"), projectLead: z10.string().trim().min(2).max(255) }).superRefine((value, ctx) => {
  if (value.endDate <= value.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after start date." });
});
function asDate(value) {
  return /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
}
var projectRouter = router({
  list: misProjectReadProcedure.input(z10.object({ limit: z10.number().int().min(1).max(100).default(100) })).query(({ input }) => listMisProjects(input.limit)),
  suggestCode: misProjectWriteProcedure.query(async () => suggestProjectCode(await getNextProjectSequence())),
  get: misProjectReadProcedure.input(z10.object({ projectId: z10.number().int().positive() })).query(async ({ input }) => {
    const record = await getMisProject(input.projectId);
    if (!record) throw new TRPCError9({ code: "NOT_FOUND", message: "Project was not found." });
    return record;
  }),
  create: misProjectWriteProcedure.input(projectInput).mutation(async ({ input, ctx }) => {
    const projectCode = input.projectCode ?? suggestProjectCode(await getNextProjectSequence());
    try {
      const id = await createMisProject({ ...input, projectCode, startDate: asDate(input.startDate), endDate: asDate(input.endDate), createdByOpenId: ctx.user.openId });
      try {
        const assigned = await assignProjectToAllActiveMembers(id, ctx.user.openId);
        if (assigned > 0) console.log(`[projects] Auto-shared project ${projectCode} with ${assigned} active member(s).`);
      } catch (assignmentError) {
        console.error("[projects] Auto-share assignment failed:", assignmentError);
      }
      return { id, projectCode };
    } catch (error) {
      if (String(error).includes("Duplicate")) throw new TRPCError9({ code: "CONFLICT", message: "Project code already exists. Please use a different code." });
      throw error;
    }
  }),
  partners: router({
    create: misProjectWriteProcedure.input(z10.object({ projectId: z10.number().int().positive(), funderName: z10.string().trim().min(2).max(255), csrCompanyName: z10.string().trim().max(255).optional(), ngoPartnerName: z10.string().trim().max(255).optional(), mouDetails: z10.string().trim().max(5e3).optional(), contactPerson: z10.string().trim().max(255).optional(), contactNumber: z10.string().trim().regex(/^[0-9+\-() ]{7,32}$/).optional(), email: z10.string().email().optional(), partnershipDetails: z10.string().trim().max(5e3).optional(), reportingRequirements: z10.string().trim().max(5e3).optional(), mouDocumentPath: z10.string().trim().max(1024).optional() })).mutation(async ({ input, ctx }) => ({ id: await createMisFunderPartner({ ...input, createdByOpenId: ctx.user.openId }) }))
  }),
  objectives: router({
    create: misProjectWriteProcedure.input(z10.object({ projectId: z10.number().int().positive(), problemAddressed: z10.string().trim().min(10).max(5e3), projectObjectives: z10.string().trim().min(10).max(5e3), targetOutcomes: z10.string().trim().min(10).max(5e3), sdgLinkage: z10.array(z10.enum(UN_SDG_GOALS)).min(1).max(17) })).mutation(async ({ input, ctx }) => ({ id: await createMisObjective({ ...input, createdByOpenId: ctx.user.openId }) }))
  }),
  targetGroups: router({
    create: misProjectWriteProcedure.input(z10.object({ projectId: z10.number().int().positive(), beneficiaryType: z10.string().trim().min(2).max(180), gender: z10.string().trim().max(64).optional(), ageGroup: z10.string().trim().max(100).optional(), targetPopulation: z10.string().trim().max(5e3).optional(), targetNumber: z10.number().int().positive(), geographyLocation: z10.string().trim().min(2).max(255) })).mutation(async ({ input, ctx }) => ({ id: await createMisTargetGroup({ ...input, createdByOpenId: ctx.user.openId }) }))
  }),
  activities: router({
    create: misProjectWriteProcedure.input(z10.object({ projectId: z10.number().int().positive(), objectiveId: z10.number().int().positive().optional(), activityName: z10.string().trim().min(3).max(255), activityDescription: z10.string().trim().min(10).max(5e3), plannedFrequency: z10.string().trim().max(120).optional(), responsiblePerson: z10.string().trim().min(2).max(255), activityLocation: z10.string().trim().min(2).max(255), plannedStartDate: dateString, plannedEndDate: dateString, status: activityStatus.default("planned") }).superRefine((value, ctx) => {
      if (value.plannedEndDate < value.plannedStartDate) ctx.addIssue({ code: "custom", path: ["plannedEndDate"], message: "Activity end date cannot be before its start date." });
    })).mutation(async ({ input, ctx }) => ({ id: await createMisActivity({ ...input, objectiveId: input.objectiveId ?? null, plannedStartDate: asDate(input.plannedStartDate), plannedEndDate: asDate(input.plannedEndDate), createdByOpenId: ctx.user.openId }) }))
  })
});

// backend/routers/delivery.ts
import { TRPCError as TRPCError10 } from "@trpc/server";
import { z as z11 } from "zod";
var dateString2 = z11.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
var activityId = z11.number().int().positive().optional();
var projectId = z11.number().int().positive();
var numberValue = z11.number().finite().min(0);
var phone = z11.string().trim().regex(/^[0-9+\-() ]{7,32}$/, "Enter a valid phone number.");
var toDate = (value) => /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
var deliveryRouter = router({
  summary: misProjectReadProcedure.input(z11.object({ projectId })).query(({ input }) => getMisDeliverySummary(input.projectId)),
  beneficiaries: router({
    list: misProjectReadProcedure.input(z11.object({ projectId: projectId.optional(), limit: z11.number().int().min(1).max(500).default(100) })).query(({ input }) => listMisBeneficiaries(input.projectId, input.limit)),
    checkDuplicate: misFieldProcedure.input(z11.object({ name: z11.string().trim().min(2), phoneNumber: phone, village: z11.string().trim().min(2) })).query(({ input }) => findDuplicateBeneficiary(input)),
    create: misFieldProcedure.input(z11.object({ name: z11.string().trim().min(2).max(255), village: z11.string().trim().min(2).max(255), gender: z11.string().trim().min(1).max(64), age: z11.number().int().min(0).max(130), phoneNumber: phone, beneficiaryCategory: z11.string().trim().min(2).max(180), projectId, activityId, registrationDate: dateString2, status: z11.enum(["active", "inactive", "exited"]).default("active"), beneficiaryCode: z11.string().trim().max(80).optional(), duplicateOverrideReason: z11.string().trim().min(5).max(1e3).optional() })).mutation(async ({ input, ctx }) => {
      const duplicates = await findDuplicateBeneficiary(input);
      if (duplicates.length && !input.duplicateOverrideReason) throw new TRPCError10({ code: "CONFLICT", message: "A beneficiary with the same name, phone number and village already exists. Provide an override reason to continue." });
      const beneficiaryId = createBeneficiaryId(await getNextBeneficiarySequence());
      try {
        const id = await createMisBeneficiary({ ...input, beneficiaryId, activityId: input.activityId ?? null, registrationDate: toDate(input.registrationDate), duplicateFlag: duplicates.length ? 1 : 0, duplicateOverrideReason: input.duplicateOverrideReason ?? null, createdByOpenId: ctx.user.openId });
        return { id, beneficiaryId, duplicateFlag: Boolean(duplicates.length) };
      } catch (error) {
        if (String(error).includes("Duplicate")) throw new TRPCError10({ code: "CONFLICT", message: "Beneficiary ID already exists. Please retry." });
        throw error;
      }
    })
  }),
  targets: router({
    create: misMonitoringProcedure.input(z11.object({ projectId, activityId, indicator: z11.string().trim().min(2).max(255), reportingPeriod: z11.string().trim().min(2).max(100), periodType: z11.enum(["monthly", "quarterly"]), monthlyTarget: numberValue.default(0), quarterlyTarget: numberValue.default(0), actualAchievement: numberValue.default(0), cumulativeAchievement: numberValue.optional() })).mutation(async ({ input, ctx }) => {
      const target = input.periodType === "monthly" ? input.monthlyTarget : input.quarterlyTarget;
      const cumulative = input.cumulativeAchievement ?? input.actualAchievement;
      const percentage = target > 0 ? Number((input.actualAchievement / target * 100).toFixed(2)) : 0;
      return { id: await createMisTargetAchievement({ ...input, activityId: input.activityId ?? null, monthlyTarget: String(input.monthlyTarget), quarterlyTarget: String(input.quarterlyTarget), actualAchievement: String(input.actualAchievement), cumulativeAchievement: String(cumulative), percentageAchieved: percentage.toFixed(2), createdByOpenId: ctx.user.openId }), percentageAchieved: percentage, cumulativeAchievement: cumulative };
    })
  }),
  events: router({
    create: misFieldProcedure.input(z11.object({ projectId, activityId, eventDate: dateString2, village: z11.string().trim().min(2).max(255), locationDetails: z11.string().trim().min(5).max(5e3), numParticipants: z11.number().int().min(0), staffNames: z11.array(z11.string().trim().min(1).max(255)).default([]), volunteerNames: z11.array(z11.string().trim().min(1).max(255)).default([]), observations: z11.string().trim().max(5e3).optional(), attachmentPaths: z11.array(z11.string().trim().min(1).max(1024)).default([]) })).mutation(async ({ input, ctx }) => {
      const eventId = createFieldEventId(await getNextFieldEventSequence());
      try {
        const id = await createMisFieldEvent({ ...input, eventId, activityId: input.activityId ?? null, eventDate: toDate(input.eventDate), observations: input.observations ?? null, createdByOpenId: ctx.user.openId });
        return { id, eventId };
      } catch (error) {
        if (String(error).includes("Duplicate")) throw new TRPCError10({ code: "CONFLICT", message: "Field Event ID already exists. Please retry." });
        throw error;
      }
    })
  }),
  outputs: router({
    create: misFieldProcedure.input(z11.object({ projectId, activityId, outputType: z11.enum(["training", "camp", "kit_distribution", "session", "household", "referral", "other"]), indicator: z11.string().trim().min(2).max(255), targetValue: numberValue, actualValue: numberValue, reportingPeriod: z11.string().trim().min(2).max(100), notes: z11.string().trim().max(5e3).optional(), supportingEvidencePath: z11.string().trim().max(1024).optional() })).mutation(async ({ input, ctx }) => ({ id: await createMisOutput({ ...input, activityId: input.activityId ?? null, targetValue: String(input.targetValue), actualValue: String(input.actualValue), notes: input.notes ?? null, supportingEvidencePath: input.supportingEvidencePath ?? null, createdByOpenId: ctx.user.openId }) }))
  }),
  outcomes: router({
    create: misMonitoringProcedure.input(z11.object({ projectId, activityId, outcomeName: z11.string().trim().min(2).max(255), behaviourChange: z11.string().trim().max(5e3).optional(), knowledgeChange: z11.string().trim().max(5e3).optional(), skillChange: z11.string().trim().max(5e3).optional(), followUpStatus: z11.string().trim().max(180).optional(), successStories: z11.string().trim().max(5e3).optional(), outcomeIndicators: z11.string().trim().max(5e3).optional(), baselineValue: numberValue, currentValue: numberValue, targetValue: numberValue, measurementDate: dateString2, evidencePath: z11.string().trim().max(1024).optional() })).mutation(async ({ input, ctx }) => ({ id: await createMisOutcome({ ...input, activityId: input.activityId ?? null, behaviourChange: input.behaviourChange ?? null, knowledgeChange: input.knowledgeChange ?? null, skillChange: input.skillChange ?? null, followUpStatus: input.followUpStatus ?? null, successStories: input.successStories ?? null, outcomeIndicators: input.outcomeIndicators ?? null, baselineValue: String(input.baselineValue), currentValue: String(input.currentValue), targetValue: String(input.targetValue), measurementDate: toDate(input.measurementDate), evidencePath: input.evidencePath ?? null, createdByOpenId: ctx.user.openId }) }))
  })
});

// backend/routers/operations.ts
import { z as z12 } from "zod";
var projectId2 = z12.number().int().positive();
var dateString3 = z12.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
var amount = z12.number().finite().min(0);
var optionalText = (length) => z12.string().trim().max(length).optional();
var asDate2 = (value) => /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
var operationsRouter = router({
  team: router({
    create: misProjectWriteProcedure.input(z12.object({ projectId: projectId2, staffOpenId: optionalText(64), staffName: z12.string().trim().min(2).max(255), assignmentRole: z12.string().trim().min(2).max(180), responsibilities: z12.string().trim().min(5).max(5e3), contactNumber: optionalText(32), startDate: dateString3, endDate: dateString3.optional(), assignmentStatus: z12.enum(["active", "completed", "inactive"]).default("active") })).mutation(async ({ input, ctx }) => ({ id: await createMisTeamAssignment({ ...input, staffOpenId: input.staffOpenId ?? null, contactNumber: input.contactNumber ?? null, startDate: asDate2(input.startDate), endDate: input.endDate ? asDate2(input.endDate) : null, createdByOpenId: ctx.user.openId }) }))
  }),
  finance: router({
    addBudget: misFinanceProcedure.input(z12.object({ projectId: projectId2, fiscalYear: z12.string().trim().regex(/^\d{4}-\d{2}$/), budgetLine: z12.string().trim().min(2).max(255), allocatedAmount: amount, approvedAmount: amount.optional(), funderSource: optionalText(255), notes: optionalText(5e3) })).mutation(async ({ input, ctx }) => ({ id: await createMisBudgetAllocation({ ...input, allocatedAmount: String(input.allocatedAmount), approvedAmount: input.approvedAmount === void 0 ? null : String(input.approvedAmount), funderSource: input.funderSource ?? null, notes: input.notes ?? null, createdByOpenId: ctx.user.openId }) })),
    addExpense: misFinanceProcedure.input(z12.object({ projectId: projectId2, budgetAllocationId: z12.number().int().positive().optional(), expenseDate: dateString3, fiscalYear: z12.string().trim().regex(/^\d{4}-\d{2}$/), expenseCategory: z12.string().trim().min(2).max(255), amount, paymentMode: z12.enum(["cash", "bank_transfer", "upi", "cheque", "card", "other"]), vendorName: optionalText(255), invoiceNumber: optionalText(120), description: z12.string().trim().min(5).max(5e3), supportingDocumentPath: optionalText(1024) })).mutation(async ({ input, ctx }) => ({ id: await createMisFinanceRecord({ ...input, budgetAllocationId: input.budgetAllocationId ?? null, expenseDate: asDate2(input.expenseDate), amount: String(input.amount), vendorName: input.vendorName ?? null, invoiceNumber: input.invoiceNumber ?? null, supportingDocumentPath: input.supportingDocumentPath ?? null, createdByOpenId: ctx.user.openId }) })),
    approveExpense: misFinanceProcedure.input(z12.object({ id: z12.number().int().positive(), approvalStatus: z12.enum(["approved", "rejected", "pending"]) })).mutation(async ({ input, ctx }) => {
      await updateMisFinanceApproval(input.id, input.approvalStatus, ctx.user.openId);
      return { success: true };
    })
  }),
  documents: router({
    createMetadata: misOperationsProcedure.input(z12.object({ projectId: projectId2, documentType: z12.enum(["proposal", "mou", "plan", "budget", "invoice", "attendance", "report", "photo", "other"]), documentName: z12.string().trim().min(2).max(255), storageKey: z12.string().trim().min(3).max(1024), visibility: z12.enum(["internal", "management", "public"]).default("internal"), reviewStatus: z12.enum(["draft", "approved", "archived"]).default("draft") })).mutation(async ({ input, ctx }) => ({ id: await createMisDocument({ ...input, uploadedByOpenId: ctx.user.openId }) })),
    upload: misOperationsProcedure.input(z12.object({ projectId: projectId2, documentType: z12.enum(["proposal", "mou", "plan", "budget", "invoice", "attendance", "report", "photo", "other"]), documentName: z12.string().trim().min(2).max(255), fileName: z12.string().trim().min(1).max(255), mimeType: z12.enum(["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]), dataBase64: z12.string().min(4), visibility: z12.enum(["internal", "management", "public"]).default("internal") })).mutation(async ({ input, ctx }) => {
      const bytes = Buffer.from(input.dataBase64, "base64");
      if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error("Document must be between 1 byte and 10 MB.");
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const fileKey = `mis-documents/${ctx.user.openId}/${input.projectId}/${Date.now()}-${safeName}`;
      const stored = await storagePut(fileKey, bytes, input.mimeType);
      const id = await createMisDocument({ projectId: input.projectId, documentType: input.documentType, documentName: input.documentName, storageKey: stored.key, visibility: input.visibility, reviewStatus: "draft", uploadedByOpenId: ctx.user.openId });
      return { id, storageKey: stored.key, url: stored.url };
    })
  }),
  monitoring: router({
    create: misMonitoringProcedure.input(z12.object({ projectId: projectId2, activityId: z12.number().int().positive().optional(), indicatorType: z12.enum(["input", "output", "outcome"]), indicatorName: z12.string().trim().min(2).max(255), baselineValue: amount, targetValue: amount, currentValue: amount, measurementFrequency: z12.string().trim().min(2).max(100), dataSource: optionalText(255), ownerOpenId: optionalText(64), lastMeasuredAt: dateString3.optional() })).mutation(async ({ input, ctx }) => ({ id: await createMisMonitoringIndicator({ ...input, activityId: input.activityId ?? null, baselineValue: String(input.baselineValue), targetValue: String(input.targetValue), currentValue: String(input.currentValue), dataSource: input.dataSource ?? null, ownerOpenId: input.ownerOpenId ?? null, lastMeasuredAt: input.lastMeasuredAt ? asDate2(input.lastMeasuredAt) : null, createdByOpenId: ctx.user.openId }) }))
  }),
  risks: router({
    list: misProjectReadProcedure.input(z12.object({ limit: z12.number().int().min(1).max(200).default(100) })).query(async ({ input }) => (await listMisRisks(input.limit)).map((risk) => ({ ...risk, score: risk.severity * risk.likelihood }))),
    create: misProjectWriteProcedure.input(z12.object({ projectId: projectId2, riskTitle: z12.string().trim().min(2).max(255), riskDescription: z12.string().trim().min(5).max(5e3), riskCategory: z12.string().trim().min(2).max(180), severity: z12.number().int().min(1).max(5), likelihood: z12.number().int().min(1).max(5), mitigationPlan: z12.string().trim().min(5).max(5e3), ownerOpenId: optionalText(64), dueDate: dateString3.optional(), status: z12.enum(["open", "mitigating", "accepted", "closed"]).default("open") })).mutation(async ({ input, ctx }) => ({ id: await createMisRisk({ ...input, ownerOpenId: input.ownerOpenId ?? null, dueDate: input.dueDate ? asDate2(input.dueDate) : null, createdByOpenId: ctx.user.openId }) }))
  }),
  reports: router({
    list: misProjectReadProcedure.input(z12.object({ limit: z12.number().int().min(1).max(200).default(100) })).query(async ({ input }) => (await listMisReports(input.limit)).map((report) => ({ ...report, alert: reportingAlert(report.dueDate, report.status) }))),
    create: misProjectWriteProcedure.input(z12.object({ projectId: projectId2, reportType: z12.enum(["monthly", "quarterly", "annual", "donor", "field"]), reportingPeriod: z12.string().trim().min(2).max(100), dueDate: dateString3, status: z12.enum(["draft", "pending", "submitted", "approved", "overdue"]).default("draft"), narrative: optionalText(1e4), financeSummary: optionalText(1e4), documentPath: optionalText(1024) })).mutation(async ({ input, ctx }) => ({ id: await createMisReport({ ...input, dueDate: asDate2(input.dueDate), narrative: input.narrative ?? null, financeSummary: input.financeSummary ?? null, documentPath: input.documentPath ?? null, createdByOpenId: ctx.user.openId }) }))
  })
});

// backend/routers/governance.ts
import { TRPCError as TRPCError11 } from "@trpc/server";
import { z as z13 } from "zod";
var projectId3 = z13.number().int().positive();
var dateString4 = z13.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
var asDate3 = (value) => /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
var csvEscape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
var governanceRouter = router({
  impact: router({
    create: misOperationsProcedure.input(z13.object({ projectId: projectId3, evidenceType: z13.enum(["photo", "field_story", "case_study", "survey", "report", "other"]), title: z13.string().trim().min(2).max(255), description: z13.string().trim().min(10).max(5e3), storageKey: z13.string().trim().max(1024).optional(), consentConfirmed: z13.boolean(), visibility: z13.enum(["internal", "management", "public"]).default("internal") })).mutation(async ({ input, ctx }) => {
      if (input.visibility === "public" && !input.consentConfirmed) throw new TRPCError11({ code: "BAD_REQUEST", message: "Public impact evidence requires confirmed consent." });
      const id = await createMisImpactEvidence({ ...input, storageKey: input.storageKey ?? null, consentConfirmed: input.consentConfirmed ? 1 : 0, createdByOpenId: ctx.user.openId });
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "impact_evidence.created", entityType: "impact_evidence", entityId: String(id), projectId: input.projectId, details: { evidenceType: input.evidenceType, visibility: input.visibility } });
      return { id };
    })
  }),
  closure: router({
    save: misProjectWriteProcedure.input(z13.object({ projectId: projectId3, closureDate: dateString4, finalReportApproved: z13.boolean(), financeApproved: z13.boolean(), impactEvidenceAttached: z13.boolean(), lessonsLearned: z13.string().trim().min(10).max(1e4), closureStatus: z13.enum(["draft", "ready_for_review", "closed"]) })).mutation(async ({ input, ctx }) => {
      if (input.closureStatus === "closed" && (!input.finalReportApproved || !input.financeApproved || !input.impactEvidenceAttached)) throw new TRPCError11({ code: "BAD_REQUEST", message: "A project can close only after final report, finance and impact evidence checks are complete." });
      await upsertMisClosure({ ...input, closureDate: asDate3(input.closureDate), finalReportApproved: input.finalReportApproved ? 1 : 0, financeApproved: input.financeApproved ? 1 : 0, impactEvidenceAttached: input.impactEvidenceAttached ? 1 : 0, approvedByOpenId: input.closureStatus === "closed" ? ctx.user.openId : null, createdByOpenId: ctx.user.openId });
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: `project_closure.${input.closureStatus}`, entityType: "project", entityId: String(input.projectId), projectId: input.projectId, details: { finalReportApproved: input.finalReportApproved, financeApproved: input.financeApproved, impactEvidenceAttached: input.impactEvidenceAttached } });
      return { success: true };
    })
  }),
  audit: router({
    list: adminProcedure.input(z13.object({ limit: z13.number().int().min(1).max(500).default(100) })).query(({ input }) => listMisAuditLogs(input.limit))
  }),
  exports: router({
    projectSummaryCsv: misProjectReadProcedure.input(z13.object({ projectId: projectId3 })).mutation(async ({ input, ctx }) => {
      const record = await getMisProject(input.projectId);
      if (!record) throw new TRPCError11({ code: "NOT_FOUND", message: "Project was not found." });
      const delivery = await getMisDeliverySummary(input.projectId);
      const rows = [["Project code", record.project.projectCode], ["Project name", record.project.projectName], ["Theme", record.project.projectTheme], ["Location", record.project.projectLocation], ["Status", record.project.projectStatus], ["Project lead", record.project.projectLead], ["Partners", record.partners.length], ["Objectives", record.objectives.length], ["Target groups", record.targetGroups.length], ["Activities", record.activities.length], ["Beneficiaries", delivery.beneficiaries], ["Field events", delivery.fieldEvents], ["Target records", delivery.targetRecords], ["Outputs", delivery.outputs], ["Outcomes", delivery.outcomes]];
      await writeMisAuditLog({ actorOpenId: ctx.user.openId, action: "project_summary.exported", entityType: "project", entityId: String(input.projectId), projectId: input.projectId, details: { format: "csv" } });
      return { filename: `${record.project.projectCode}-summary.csv`, content: ["Metric,Value", ...rows.map(([key, value]) => `${csvEscape(key)},${csvEscape(value)}`)].join("\n") };
    })
  })
});

// backend/routers/dashboard.ts
import { z as z14 } from "zod";
var dashboardRouter = router({
  stats: misProjectReadProcedure.query(() => getMisDashboardSummary()),
  projectCommandCenter: misProjectReadProcedure.input(z14.object({ projectId: z14.number().int().positive() })).query(async ({ input }) => {
    const commandCenter = await getMisProjectCommandCenter(input.projectId);
    if (!commandCenter) throw new Error("Project was not found.");
    return commandCenter;
  })
});

// backend/routers/member.ts
import bcrypt from "bcryptjs";
import { TRPCError as TRPCError12 } from "@trpc/server";
import { z as z15 } from "zod";

// backend/security/memberSession.ts
import { SignJWT as SignJWT2, jwtVerify as jwtVerify2 } from "jose";
import { parse } from "cookie";
var MEMBER_SESSION_COOKIE = "aasw_member_session";
var MEMBER_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
function secretKey() {
  if (!ENV.cookieSecret) throw new Error("Member session secret is not configured.");
  return new TextEncoder().encode(ENV.cookieSecret);
}
async function createMemberSession(member) {
  return new SignJWT2({ memberId: member.id, membershipNo: member.membershipNo, role: member.role, name: member.fullName }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt().setExpirationTime(Math.floor((Date.now() + MEMBER_SESSION_TTL_MS) / 1e3)).sign(secretKey());
}
async function authenticateMemberRequest(req) {
  const token = parse(req.headers.cookie ?? "")[MEMBER_SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify2(token, secretKey(), { algorithms: ["HS256"] });
    const memberId = Number(payload.memberId);
    if (!Number.isInteger(memberId) || memberId <= 0) return null;
    const member = await getMemberById(memberId);
    if (!member) return null;
    if (await expireMemberIfDue(member)) return null;
    if (member.accountStatus !== "active" || member.status !== "active") return null;
    return { id: member.id, membershipNo: member.membershipNo, fullName: member.fullName, role: member.role, email: member.email };
  } catch {
    return null;
  }
}

// backend/routers/member.ts
import { nanoid as nanoid7 } from "nanoid";
var passwordInput = z15.string().min(8, "Password must be at least 8 characters.").max(128).regex(/[a-z]/, "Password must include a lowercase letter.").regex(/[A-Z]/, "Password must include an uppercase letter.").regex(/\d/, "Password must include a number.").regex(/[^A-Za-z0-9]/, "Password must include a special character.");
var profilePhotoMimeTypes = ["image/jpeg", "image/png", "image/webp"];
var MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;
var memberServiceTypes = ["digital_skill_development", "green_entrepreneurship", "mentorship_business_support", "workshops_seminars", "building_community"];
function decodeProfilePhoto(dataBase64, mimeType) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64) || dataBase64.length % 4 !== 0) throw new TRPCError12({ code: "BAD_REQUEST", message: "Profile photo data could not be read." });
  const bytes = Buffer.from(dataBase64, "base64");
  if (!bytes.length || bytes.length > MAX_PROFILE_PHOTO_BYTES) throw new TRPCError12({ code: "BAD_REQUEST", message: "Use a JPG, PNG or WebP photo up to 2 MB." });
  const jpeg = bytes[0] === 255 && bytes[1] === 216;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimeType === "image/jpeg" && !jpeg || mimeType === "image/png" && !png || mimeType === "image/webp" && !webp) throw new TRPCError12({ code: "BAD_REQUEST", message: "The selected file does not match its image type." });
  return bytes;
}
function profilePhotoExtension(mimeType) {
  return mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
}
var completionProofMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
var MAX_COMPLETION_PROOF_BYTES = 5 * 1024 * 1024;
var MAX_COMPLETION_PROOFS = 6;
function decodeCompletionProof(dataBase64, mimeType) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64) || dataBase64.length % 4 !== 0) throw new TRPCError12({ code: "BAD_REQUEST", message: "Proof file data could not be read." });
  const bytes = Buffer.from(dataBase64, "base64");
  if (!bytes.length || bytes.length > MAX_COMPLETION_PROOF_BYTES) throw new TRPCError12({ code: "BAD_REQUEST", message: "Keep each proof file under 5 MB." });
  const jpeg = bytes[0] === 255 && bytes[1] === 216;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  const pdf = bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/jpeg" && !jpeg || mimeType === "image/png" && !png || mimeType === "image/webp" && !webp || mimeType === "application/pdf" && !pdf) throw new TRPCError12({ code: "BAD_REQUEST", message: "The selected proof file does not match its declared type." });
  return bytes;
}
function safeProofFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "proof";
}
var completionDriveLinkInput = z15.string().trim().max(500).refine((value) => /^https:\/\/(drive|docs)\.google\.com\/\S+$/.test(value), "Share a valid Google Drive link starting with https://.");
var upiIdInput = z15.string().trim().max(120).refine((value) => /^[a-zA-Z0-9][a-zA-Z0-9.\-_]{1,63}@[a-zA-Z][a-zA-Z0-9]{1,32}$/.test(value), "Enter a valid UPI id like yourname@bank.");
var ifscInput = z15.string().trim().max(11).refine((value) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value), "Enter a valid 11-character IFSC code (e.g. HDFC0001234).");
var completionPayoutDetailsInput = z15.object({
  upiId: upiIdInput.optional(),
  accountName: z15.string().trim().min(2, "Enter the account holder name exactly as in the bank record.").max(140).optional(),
  accountNumber: z15.string().trim().regex(/^[0-9]{6,20}$/, "Enter a valid account number (6-20 digits).").optional(),
  ifsc: ifscInput.optional()
}).superRefine((value, ctx) => {
  const hasUpi = Boolean(value.upiId);
  const hasBank = Boolean(value.accountName || value.accountNumber || value.ifsc);
  if (!hasUpi && !hasBank) return ctx.addIssue({ code: "custom", message: "Share where the payout should reach \u2014 your UPI id or your bank account details." });
  if (hasBank && (!value.accountName || !value.accountNumber || !value.ifsc)) ctx.addIssue({ code: "custom", message: "For a bank transfer share the account holder name, account number and IFSC code together." });
});
function clearMemberSession(ctx) {
  ctx.res.clearCookie(MEMBER_SESSION_COOKIE, getSessionCookieOptions(ctx.req));
}
function setMemberSession(ctx, token) {
  ctx.res.cookie(MEMBER_SESSION_COOKIE, token, { ...getSessionCookieOptions(ctx.req), maxAge: 7 * 24 * 60 * 60 * 1e3 });
}
function memberAppBaseUrl3(req) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = req.get?.("host");
  if (host) return `${req.protocol === "http" ? "http" : "https"}://${host}`;
  return "http://localhost:3000";
}
var memberRouter = router({
  setupStatus: publicProcedure.input(z15.object({ token: z15.string().min(20).max(512) })).query(async ({ input }) => {
    const token = await getActiveMemberSetupToken(hashMemberSetupToken(input.token));
    return { valid: Boolean(token), membershipNo: token?.membershipNo ?? null, fullName: token?.fullName ?? null };
  }),
  emailCertificateStatus: publicProcedure.input(z15.object({ token: z15.string().min(20).max(512) })).query(async ({ input }) => {
    const member = await getActiveMemberCertificateEmailToken(hashMemberSetupToken(input.token));
    if (!member || member.status !== "active" || member.accountStatus !== "active") return { valid: false, certificate: null };
    const validity = getMembershipValidity(member.memberType, member.joiningDate);
    if (validity.portalAccessStatus === "expired") return { valid: false, certificate: null };
    return { valid: true, certificate: { fullName: member.fullName, membershipNo: member.membershipNo, membershipTypeLabel: validity.membershipTypeLabel, joiningDate: member.joiningDate, expiresOn: validity.expiresOn } };
  }),
  setupPassword: publicProcedure.input(z15.object({ token: z15.string().min(20).max(512), password: passwordInput })).mutation(async ({ input }) => {
    const passwordHash = await bcrypt.hash(input.password, 12);
    const completed = await setMemberPasswordFromSetupToken({ tokenHash: hashMemberSetupToken(input.token), passwordHash });
    if (!completed) throw new TRPCError12({ code: "BAD_REQUEST", message: "This setup link has expired or is invalid. Please contact AASW Foundation." });
    return { success: true };
  }),
  requestPasswordReset: publicProcedure.input(z15.object({ email: z15.string().trim().email().max(320) })).mutation(async ({ input, ctx }) => {
    const member = await getMemberByIdentifier(input.email);
    if (!member || member.email.toLowerCase() !== input.email.toLowerCase() || member.status !== "active" || member.accountStatus === "inactive") return { success: true };
    const reset = createMemberSetupToken();
    await createMemberPasswordResetToken(member.id, reset.tokenHash, reset.expiresAt);
    const resetUrl = `${memberAppBaseUrl3(ctx.req)}/member/reset-password?token=${encodeURIComponent(reset.token)}`;
    await dispatchMemberPasswordResetEmail({ fullName: member.fullName, email: member.email, membershipNo: member.membershipNo, setupUrl: resetUrl });
    return { success: true };
  }),
  resetStatus: publicProcedure.input(z15.object({ token: z15.string().min(20).max(512) })).query(async ({ input }) => {
    const token = await getActiveMemberPasswordResetToken(hashMemberSetupToken(input.token));
    return { valid: Boolean(token), membershipNo: token?.membershipNo ?? null, fullName: token?.fullName ?? null };
  }),
  resetPassword: publicProcedure.input(z15.object({ token: z15.string().min(20).max(512), password: passwordInput })).mutation(async ({ input }) => {
    const completed = await resetMemberPasswordFromToken({ tokenHash: hashMemberSetupToken(input.token), passwordHash: await bcrypt.hash(input.password, 12) });
    if (!completed) throw new TRPCError12({ code: "BAD_REQUEST", message: "This reset link has expired or is invalid. Please request a new password reset." });
    return { success: true };
  }),
  login: publicProcedure.input(z15.object({ identifier: z15.string().trim().min(3).max(320), password: z15.string().min(1).max(128) })).mutation(async ({ input, ctx }) => {
    const member = await getMemberByIdentifier(input.identifier);
    const genericError = () => new TRPCError12({ code: "UNAUTHORIZED", message: "Invalid membership number/email or password." });
    if (!member || !member.passwordHash) throw genericError();
    const now = /* @__PURE__ */ new Date();
    if (await expireMemberIfDue(member, now) || member.status === "expired" || member.accountStatus === "inactive") {
      throw new TRPCError12({ code: "FORBIDDEN", message: "Your annual membership has ended. Submit a new membership application with the same email and PAN to reactivate this Member Portal account." });
    }
    if (member.status !== "active") throw genericError();
    if (member.lockedUntil && member.lockedUntil > now) throw new TRPCError12({ code: "FORBIDDEN", message: `Your account is temporarily locked. Try again after ${member.lockedUntil.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} or contact AASW Foundation.` });
    const correctPassword = await bcrypt.compare(input.password, member.passwordHash);
    if (!correctPassword) {
      const lockedUntil = await recordMemberLoginFailure(member.id, member.loginAttempts, now);
      if (lockedUntil) throw new TRPCError12({ code: "FORBIDDEN", message: `Your account is temporarily locked. Try again after ${lockedUntil.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} or contact AASW Foundation.` });
      throw genericError();
    }
    await recordMemberLoginSuccess(member.id, now);
    const token = await createMemberSession({ id: member.id, membershipNo: member.membershipNo, fullName: member.fullName, role: member.role, email: member.email });
    setMemberSession(ctx, token);
    return { success: true, mustChangePassword: member.mustChangePassword, member: { membershipNo: member.membershipNo, fullName: member.fullName, role: member.role } };
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    clearMemberSession(ctx);
    return { success: true };
  }),
  // Session-state lookup is public so a signed-out member UI can render its
  // own Member Login route without triggering the Manus OAuth redirect hook.
  me: publicProcedure.query(({ ctx }) => ctx.member),
  dashboard: memberProcedure.query(async ({ ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member || member.status !== "active" || member.accountStatus !== "active") {
      throw new TRPCError12({ code: "FORBIDDEN", message: "This member account is not active. Please contact AASW Foundation." });
    }
    const validity = getMembershipValidity(member.memberType, member.joiningDate);
    let profilePhotoUrl = null;
    if (member.profilePhotoKey) {
      try {
        profilePhotoUrl = await storageGetSignedUrl(member.profilePhotoKey);
      } catch (error) {
        if (process.env.NODE_ENV === "production") {
          console.warn("[Member] Profile photo signed URL unavailable", { memberId: member.id, error: error instanceof Error ? error.message : "unknown" });
        } else if (isLocalUploadMode()) {
          try {
            profilePhotoUrl = storageLocalUploadDataUrl(member.profilePhotoKey);
          } catch (localError) {
            console.warn("[Member] Profile photo local read unavailable", { memberId: member.id, error: localError instanceof Error ? localError.message : "unknown" });
          }
        }
      }
    }
    return {
      fullName: member.fullName,
      membershipNo: member.membershipNo,
      email: member.email,
      memberType: member.memberType,
      membershipTypeLabel: validity.membershipTypeLabel,
      membershipStatus: validity.membershipStatus,
      portalAccessStatus: validity.portalAccessStatus,
      expiresOn: validity.expiresOn,
      graceEndsOn: validity.graceEndsOn,
      joiningDate: member.joiningDate,
      city: member.city,
      district: member.district,
      state: member.state,
      phone: member.phone,
      address: member.address,
      foundationUpdatesOptIn: member.foundationUpdatesOptIn,
      profilePhotoUrl,
      certificateEligible: validity.portalAccessStatus !== "expired",
      // Security transparency: lets members spot a sign-in they do not
      // recognise (updated on every successful login).
      lastLogin: member.lastLogin
    };
  }),
  myProjects: memberProcedure.query(({ ctx }) => listMemberProjectAssignments(ctx.member.id)),
  membershipHistory: memberProcedure.query(({ ctx }) => listMemberMembershipCycles(ctx.member.id)),
  /**
   * Receipt access is ownership-scoped server-side: the query is keyed to the
   * authenticated member's own email, so no receipt id or member id is ever
   * accepted from the client. A member can therefore never read another
   * supporter's receipts even by forging request ids.
   */
  myReceipts: memberProcedure.query(async ({ ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member) throw new TRPCError12({ code: "FORBIDDEN", message: "This member account is not active." });
    return listMemberPaymentReceiptsWithPayouts(member.email, member.id);
  }),
  /** Single-receipt lookup for PDF download; ownership is re-checked inside the query. */
  receiptStatus: memberProcedure.input(z15.object({ receipt: z15.string().trim().min(6).max(40) })).query(async ({ input, ctx }) => {
    const receipt = await getMemberPaymentReceipt(input.receipt, ctx.member.email);
    if (!receipt) throw new TRPCError12({ code: "NOT_FOUND", message: "No receipt was found for your member account." });
    return receipt;
  }),
  myServiceRequests: memberProcedure.query(({ ctx }) => listMemberServiceRequests(ctx.member.id)),
  /**
   * Completion reports stay ownership-scoped: the member's own requests are
   * the only ones a report can ever be filed against, and proof signed URLs
   * are minted fresh per read from storage.
   */
  myCompletions: memberProcedure.query(async ({ ctx }) => {
    const completions = await listMemberServiceCompletions(ctx.member.id);
    return completions.map((completion) => ({
      ...completion,
      proofs: completion.proofs.map((proof) => ({ originalName: proof.originalName, mimeType: proof.mimeType, fileSize: proof.fileSize }))
    }));
  }),
  uploadCompletionProof: memberProcedure.input(z15.object({ requestRef: z15.string().trim().min(6).max(40), originalName: z15.string().trim().min(1).max(255), mimeType: z15.enum(completionProofMimeTypes), dataBase64: z15.string().min(20) })).mutation(async ({ input, ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member || member.status !== "active" || member.accountStatus !== "active") throw new TRPCError12({ code: "FORBIDDEN", message: "This member account is not active." });
    const request = await getMemberServiceRequestByRefAndMember(input.requestRef, member.id);
    if (!request) throw new TRPCError12({ code: "NOT_FOUND", message: "No accepted service request was found for your account." });
    const existing = await getMemberServiceCompletionByRequest(request.id);
    if (existing && existing.status !== "rejected") throw new TRPCError12({ code: "BAD_REQUEST", message: "A completion report for this request is already with the Foundation." });
    const bytes = decodeCompletionProof(input.dataBase64, input.mimeType);
    const upload = await storagePut(`member-completions/${member.membershipNo}/${request.requestRef}/${nanoid7(8)}-${safeProofFileName(input.originalName)}`, bytes, input.mimeType);
    return { storageKey: upload.key, fileName: input.originalName, mimeType: input.mimeType, fileSize: bytes.length };
  }),
  submitCompletion: memberProcedure.input(z15.object({
    requestRef: z15.string().trim().min(6).max(40),
    details: z15.string().trim().min(30, "Describe your completed work in at least 30 characters.").max(4e3),
    driveLink: completionDriveLinkInput.optional(),
    payoutDetails: completionPayoutDetailsInput,
    proofs: z15.array(z15.object({ storageKey: z15.string().trim().min(10).max(512), originalName: z15.string().trim().min(1).max(255), mimeType: z15.enum(completionProofMimeTypes), fileSize: z15.number().int().min(1).max(MAX_COMPLETION_PROOF_BYTES) })).min(1, "Attach at least one proof file.").max(MAX_COMPLETION_PROOFS)
  })).mutation(async ({ input, ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member || member.status !== "active" || member.accountStatus !== "active") throw new TRPCError12({ code: "FORBIDDEN", message: "This member account is not active." });
    const request = await getMemberServiceRequestByRefAndMember(input.requestRef, member.id);
    if (!request) throw new TRPCError12({ code: "NOT_FOUND", message: "No service request was found for your account." });
    if (request.status !== "accepted") throw new TRPCError12({ code: "BAD_REQUEST", message: "Completion reports can only be filed for accepted programme requests." });
    const existing = await getMemberServiceCompletionByRequest(request.id);
    if (existing && existing.status !== "rejected") throw new TRPCError12({ code: "BAD_REQUEST", message: "A completion report for this request is already with the Foundation." });
    const proofPrefix = `member-completions/${member.membershipNo}/${request.requestRef}/`;
    const ownedProofs = [];
    for (const proof of input.proofs) {
      if (!proof.storageKey.startsWith(proofPrefix)) throw new TRPCError12({ code: "BAD_REQUEST", message: "One of the attached proof files was not recognised. Please upload it again." });
      if (!completionProofMimeTypes.includes(proof.mimeType)) throw new TRPCError12({ code: "BAD_REQUEST", message: "One of the attached proof files has an unsupported type." });
      ownedProofs.push({ storageKey: proof.storageKey, originalName: proof.originalName, mimeType: proof.mimeType, fileSize: proof.fileSize });
    }
    const result = await upsertMemberServiceCompletion({ completionRef: `AASW-CMP-${nanoid7(12).toUpperCase()}`, requestId: request.id, memberId: member.id, details: input.details, driveLink: input.driveLink, payoutUpiId: input.payoutDetails.upiId, payoutAccountName: input.payoutDetails.accountName, payoutAccountNumber: input.payoutDetails.accountNumber, payoutIfsc: input.payoutDetails.ifsc, proofs: ownedProofs });
    try {
      await createCompletionSubmittedAdminAlert({ completionRef: result.completion.completionRef, memberId: member.id, fullName: member.fullName, membershipNo: member.membershipNo, serviceType: request.serviceType });
    } catch (error) {
      console.error("[Completions] Admin alert failed:", error);
    }
    return { completion: result.completion, created: result.created };
  }),
  joinService: memberProcedure.input(z15.object({ serviceType: z15.enum(memberServiceTypes), projectId: z15.number().int().positive().optional(), message: z15.string().trim().max(1200).optional() })).mutation(async ({ input, ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member || member.status !== "active" || member.accountStatus !== "active") throw new TRPCError12({ code: "FORBIDDEN", message: "This member account is not active." });
    let projectId4 = null;
    if (input.projectId) {
      const assignments = await listMemberProjectAssignments(member.id);
      if (!assignments.some((assignment) => assignment.projectId === input.projectId)) {
        throw new TRPCError12({ code: "FORBIDDEN", message: "This project is not assigned to your member account." });
      }
      projectId4 = input.projectId;
    }
    const result = await createMemberServiceRequest({ requestRef: `AASW-SRV-${nanoid7(12).toUpperCase()}`, memberId: member.id, serviceType: input.serviceType, projectId: projectId4, message: input.message });
    return { request: result.request, created: result.created };
  }),
  mySupportMessages: memberProcedure.query(({ ctx }) => listMemberSupportMessages(ctx.member.id)),
  sendSupportMessage: memberProcedure.input(z15.object({ message: z15.string().trim().min(3, "Please enter at least 3 characters.").max(3e3, "Keep your support message within 3,000 characters.") })).mutation(async ({ input, ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member || member.status !== "active" || member.accountStatus !== "active") throw new TRPCError12({ code: "FORBIDDEN", message: "This member account is not active." });
    const message = await createMemberSupportMessage({ messageRef: `AASW-SUP-${nanoid7(12).toUpperCase()}`, memberId: member.id, message: input.message });
    return { message };
  }),
  changePassword: memberProcedure.input(z15.object({ currentPassword: z15.string().min(1).max(128), password: passwordInput })).mutation(async ({ input, ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member?.passwordHash || !await bcrypt.compare(input.currentPassword, member.passwordHash)) throw new TRPCError12({ code: "UNAUTHORIZED", message: "Your current password is incorrect." });
    await changeMemberPassword(member.id, await bcrypt.hash(input.password, 12));
    return { success: true };
  }),
  updateProfileSettings: memberProcedure.input(z15.object({
    phone: z15.string().trim().regex(/^\+?[0-9][0-9\s-]{7,19}$/, "Enter a valid contact number."),
    city: z15.string().trim().min(2, "Enter your city.").max(100),
    district: z15.string().trim().min(2, "Enter your district.").max(128),
    state: z15.string().trim().min(2, "Enter your state.").max(100),
    address: z15.string().trim().max(1e3),
    foundationUpdatesOptIn: z15.boolean()
  })).mutation(async ({ input, ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member || member.status !== "active" || member.accountStatus !== "active") throw new TRPCError12({ code: "FORBIDDEN", message: "This member account is not active." });
    await updateMemberProfileSettings(member.id, input);
    return { success: true };
  }),
  uploadProfilePhoto: memberProcedure.input(z15.object({ originalName: z15.string().trim().min(1).max(255), mimeType: z15.enum(profilePhotoMimeTypes), dataBase64: z15.string().min(20) })).mutation(async ({ input, ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member || member.status !== "active" || member.accountStatus !== "active") throw new TRPCError12({ code: "FORBIDDEN", message: "This member account is not active." });
    const bytes = decodeProfilePhoto(input.dataBase64, input.mimeType);
    let stored;
    try {
      stored = await storagePut(`member-profile-photos/${member.membershipNo}/avatar.${profilePhotoExtension(input.mimeType)}`, bytes, input.mimeType);
    } catch (error) {
      console.error("[Member] Profile photo upload failed", { memberId: member.id, error });
      throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR", message: "Your profile photo could not be securely uploaded. Please try again." });
    }
    await updateMemberProfilePhoto(member.id, stored);
    try {
      return { profilePhotoUrl: await storageGetSignedUrl(stored.key) };
    } catch (error) {
      if (process.env.NODE_ENV === "production" || !isLocalUploadMode()) throw error;
      return { profilePhotoUrl: storageLocalUploadDataUrl(stored.key) };
    }
  }),
  admin: router({
    listMembers: adminProcedure.query(() => listMembersForAdmin()),
    // 360° member view for the admin page: programme activity + settled money
    // per member. Payout destinations are never part of this payload.
    membersOverview: adminProcedure.query(() => listMembersWithProgrammeProfile()),
    listProjects: adminProcedure.query(() => listMisProjects(200)),
    assignProject: adminProcedure.input(z15.object({ memberId: z15.number().int().positive(), projectId: z15.number().int().positive(), projectRole: z15.string().trim().min(2).max(120) })).mutation(async ({ input, ctx }) => ({ id: await assignMemberToProject({ ...input, assignedByOpenId: ctx.user.openId }) }))
  })
});

// backend/routers.ts
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return {
        success: true
      };
    })
  }),
  payment: paymentRouter,
  membership: membershipRouter,
  inquiry: inquiryRouter,
  newsletter: newsletterRouter,
  donation: donationRouter,
  volunteer: volunteerRouter,
  management: managementRouter,
  media: publicMediaRouter,
  projects: projectRouter,
  delivery: deliveryRouter,
  operations: operationsRouter,
  governance: governanceRouter,
  dashboard: dashboardRouter,
  member: memberRouter,
  assistant: assistantRouter
  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

// backend/_core/context.ts
async function createContext(opts) {
  let user = null;
  let member = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
    if (opts.req.headers.cookie?.includes(COOKIE_NAME)) {
      try {
        opts.res.clearCookie(COOKIE_NAME, getSessionCookieOptions(opts.req));
      } catch {
      }
    }
  }
  try {
    member = await authenticateMemberRequest(opts.req);
  } catch {
    member = null;
    if (opts.req.headers.cookie?.includes(MEMBER_SESSION_COOKIE)) {
      try {
        opts.res.clearCookie(MEMBER_SESSION_COOKIE, getSessionCookieOptions(opts.req));
      } catch {
      }
    }
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
    member
  };
}

// backend/_core/vite.ts
import express from "express";
import fs4 from "fs";
import { nanoid as nanoid8 } from "nanoid";
import path4 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs3 from "node:fs";
import path3 from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path3.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs3.existsSync(LOG_DIR)) {
    fs3.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs3.existsSync(logPath) || fs3.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs3.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs3.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path3.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs3.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
function vitePluginAnalyticsPlaceholder() {
  return {
    name: "analytics-placeholder",
    transformIndexHtml(html) {
      const endpoint = process.env.VITE_ANALYTICS_ENDPOINT?.trim();
      const websiteId = process.env.VITE_ANALYTICS_WEBSITE_ID?.trim();
      if (endpoint && websiteId) {
        return html.replaceAll("%VITE_ANALYTICS_ENDPOINT%", endpoint).replaceAll("%VITE_ANALYTICS_WEBSITE_ID%", websiteId);
      }
      return html.replace(
        /\s*<script[^>]*src="(?:%VITE_ANALYTICS_ENDPOINT%|)\/umami"[^>]*>\s*<\/script>/g,
        ""
      );
    }
  };
}
var vite_config_default = defineConfig(({ mode }) => {
  const isDev = mode !== "production";
  const plugins = [
    react(),
    tailwindcss(),
    jsxLocPlugin(),
    ...isDev ? [vitePluginManusRuntime()] : [],
    vitePluginAnalyticsPlaceholder(),
    ...isDev ? [vitePluginManusDebugCollector()] : []
  ];
  return {
    plugins,
    resolve: {
      alias: {
        "@": path3.resolve(import.meta.dirname, "frontend", "src"),
        "@shared": path3.resolve(import.meta.dirname, "shared"),
        "@assets": path3.resolve(import.meta.dirname, "attached_assets")
      }
    },
    envDir: path3.resolve(import.meta.dirname),
    root: path3.resolve(import.meta.dirname, "frontend"),
    publicDir: path3.resolve(import.meta.dirname, "frontend", "public"),
    build: {
      outDir: path3.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return void 0;
            const normalizedId = id.replace(/\\/g, "/");
            if (id.includes("jspdf") || id.includes("html2canvas")) return "vendor-pdf";
            if (id.includes("@trpc") || id.includes("@tanstack/react-query") || id.includes("superjson")) return "vendor-data";
            if (normalizedId.includes("/node_modules/react/") || normalizedId.includes("/node_modules/react-dom/") || normalizedId.includes("/node_modules/scheduler/") || normalizedId.includes("/node_modules/wouter/")) return "vendor-react";
            if (normalizedId.includes("/node_modules/@radix/")) return "vendor-ui";
            if (id.includes("lucide-react")) return "vendor-icons";
            return void 0;
          }
        }
      }
    },
    server: {
      host: true,
      allowedHosts: [
        ".manuspre.computer",
        ".manus.computer",
        ".manus-asia.computer",
        ".manuscomputer.ai",
        ".manusvm.computer",
        "localhost",
        "127.0.0.1"
      ],
      fs: {
        strict: true,
        deny: ["**/.*"]
      }
    }
  };
});

// backend/_core/vite.ts
function resolveViteConfig() {
  const mode = process.env.NODE_ENV === "production" ? "production" : "development";
  return typeof vite_config_default === "function" ? vite_config_default({ mode }) : vite_config_default;
}
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...resolveViteConfig(),
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "../..",
        "frontend",
        "index.html"
      );
      let template = await fs4.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid8()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path4.resolve(import.meta.dirname, "../..", "dist", "public") : path4.resolve(import.meta.dirname, "public");
  if (!fs4.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(
    "/assets",
    express.static(path4.join(distPath, "assets"), {
      fallthrough: false,
      maxAge: "365d",
      immutable: true
    })
  );
  app.get("/favicon.ico", (_req, res) => {
    res.redirect(302, "/manus-storage/aasw-foundation-official-logo_41a4007d.png");
  });
  app.use(express.static(distPath));
  app.use("*", (req, res) => {
    const pathname = req.originalUrl?.split("?")[0] ?? "";
    if (path4.extname(pathname)) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// backend/payments/webhook.ts
import { createHash as createHash3 } from "node:crypto";
async function handleRazorpayWebhook(req, res) {
  const config = getRazorpayConfig();
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
  const signature = req.header("x-razorpay-signature");
  const eventId = req.header("x-razorpay-event-id");
  if (!config || !process.env.RAZORPAY_WEBHOOK_SECRET) {
    return res.status(503).json({ received: false, message: "Razorpay webhook is not configured." });
  }
  if (!rawBody || !signature || !eventId) {
    return res.status(400).json({ received: false, message: "Missing webhook signature, event id, or raw request body." });
  }
  if (!verifyRazorpayWebhookSignature(rawBody, signature, process.env.RAZORPAY_WEBHOOK_SECRET)) {
    return res.status(401).json({ received: false, message: "Invalid webhook signature." });
  }
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ received: false, message: "Invalid webhook JSON." });
  }
  if (!payload.event) return res.status(400).json({ received: false, message: "Missing webhook event type." });
  const payment = payload.payload?.payment?.entity;
  const order = payload.payload?.order?.entity;
  const refund = payload.payload?.refund?.entity;
  const gatewayOrderId = payment?.order_id ?? order?.id;
  const gatewayPaymentId = payment?.id;
  const payloadHash = createHash3("sha256").update(rawBody).digest("hex");
  const existing = await getPaymentWebhookEvent(eventId);
  if (existing?.status === "processed") return res.status(200).json({ received: true, duplicate: true });
  if (!existing) {
    await createPaymentWebhookEvent({ gatewayEventId: eventId, eventType: payload.event, gatewayOrderId, gatewayPaymentId, payloadHash });
  }
  if (payload.event === "refund.processed" || payload.event === "refund.failed") {
    if (!refund?.id) return res.status(400).json({ received: false, message: "Refund event is missing its refund entity." });
    if (payload.event === "refund.processed") {
      const outcome = await markPaymentRefundProcessed(refund.id);
      if (outcome.matched) {
      } else if (refund.payment_id) {
        await markPaymentTransactionRefundedByPaymentId(refund.payment_id, refund.id);
      } else {
        console.warn("[Payments] Refund webhook arrived without a payment id.", { gatewayRefundId: refund.id });
      }
    } else {
      await markPaymentRefundFailed(refund.id, refund.notes?.reason ?? "Gateway reported the refund as failed.");
    }
  } else if (gatewayOrderId) {
    if (payload.event === "payment.captured" || payload.event === "order.paid") {
      await markPaymentTransactionStatus(gatewayOrderId, "captured", gatewayPaymentId);
      const transaction = await getPaymentTransactionByGatewayOrderId(gatewayOrderId);
      if (transaction) {
        const receiptDelivery = await dispatchVerifiedPaymentReceipt({ ...transaction, status: "captured", gatewayPaymentId: gatewayPaymentId ?? transaction.gatewayPaymentId });
        if (receiptDelivery === "failed") console.error("[Payments] Webhook receipt delivery could not be completed.", { receipt: transaction.receipt });
      }
    } else if (payload.event === "payment.failed") {
      await markPaymentTransactionStatus(gatewayOrderId, "failed", gatewayPaymentId);
    }
  }
  await markPaymentWebhookEventProcessed(eventId);
  return res.status(200).json({ received: true });
}

// backend/scheduled/membershipExpiry.ts
async function handleMembershipExpirySchedule(req, res) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const config = await getMembershipExpiryAutomationByTaskUid(user.taskUid);
    if (!config) return res.json({ ok: true, skipped: "orphan" });
    const expiredCount = await expireDueMemberships();
    await recordMembershipExpiryAutomationRun(user.taskUid, { expiredCount });
    return res.json({ ok: true, expiredCount });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ error: error.message });
    const message = error instanceof Error ? error.message : "Unknown membership expiry error.";
    const taskUid = "unavailable";
    try {
      await recordMembershipExpiryAutomationRun(taskUid, { expiredCount: 0, error: message });
    } catch {
    }
    console.error("[MembershipExpiry] scheduled callback failed", { taskUid, error: message });
    return res.status(500).json({ error: "Membership expiry automation failed. Review the protected automation log." });
  }
}

// backend/scheduled/membershipReminder.ts
function memberPortalUrl(req) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return `${configured.replace(/\/$/, "")}/member/dashboard`;
  const host = req.get("host");
  return `${req.protocol === "http" ? "http" : "https"}://${host}/member/dashboard`;
}
async function handleMembershipReminderSchedule(req, res) {
  let taskUid = "unavailable";
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    taskUid = user.taskUid;
    const config = await getMembershipReminderAutomationByTaskUid(taskUid);
    if (!config) return res.json({ ok: true, skipped: "orphan" });
    const sevenDayCandidates = await claimSevenDayExpiryReminderCandidates();
    const postGraceCandidates = await claimPostGraceRenewalFollowUpCandidates();
    const candidates = [...sevenDayCandidates, ...postGraceCandidates];
    let sentCount = 0;
    let failedCount = 0;
    for (const candidate of candidates) {
      const delivery = candidate.reminderType === "post_grace" ? await dispatchMemberPostGraceFollowUpEmail({ ...candidate, portalUrl: memberPortalUrl(req) }) : await dispatchMemberExpiryReminderEmail({ ...candidate, portalUrl: memberPortalUrl(req) });
      if (delivery === "sent" || delivery === "mocked") {
        await markMembershipExpiryReminder(candidate.reminderId, { status: "sent" });
        sentCount += 1;
      } else {
        await markMembershipExpiryReminder(candidate.reminderId, { status: "failed", error: delivery.error });
        failedCount += 1;
      }
    }
    await recordMembershipReminderAutomationRun(taskUid, { eligibleCount: candidates.length });
    return res.json({ ok: true, eligibleCount: candidates.length, sevenDayEligibleCount: sevenDayCandidates.length, postGraceEligibleCount: postGraceCandidates.length, sentCount, failedCount });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ error: error.message });
    const message = error instanceof Error ? error.message : "Unknown membership reminder error.";
    if (taskUid !== "unavailable") {
      try {
        await recordMembershipReminderAutomationRun(taskUid, { eligibleCount: 0, error: message });
      } catch {
      }
    }
    console.error("[MembershipReminder] scheduled callback failed", { taskUid, error: message });
    return res.status(500).json({ error: "Membership reminder automation failed. Review the protected automation log." });
  }
}

// backend/_core/health.ts
function backendHealth() {
  return {
    ok: true,
    service: "aasw-foundation",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function backendReadiness() {
  const checks = {
    database: Boolean(ENV.databaseUrl),
    sessionSigning: Boolean(ENV.cookieSecret),
    adminOAuth: Boolean(ENV.appId && ENV.oAuthServerUrl),
    managedStorage: Boolean(ENV.forgeApiUrl && ENV.forgeApiKey)
  };
  return {
    ok: Object.values(checks).every(Boolean),
    service: "aasw-foundation",
    environment: ENV.isProduction ? "production" : "development",
    checks
  };
}

// backend/_core/httpSecurity.ts
import { randomUUID } from "node:crypto";
var trustedRequestId = /^[A-Za-z0-9_-]{8,128}$/;
function buildSecurityHeaders({ isHttps, isProduction }) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()"
  };
  if (isHttps) headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  if (isProduction) {
    headers["Content-Security-Policy"] = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self' https:;";
  }
  return headers;
}
function applyHttpSecurity(req, res, next) {
  const forwardedProto = req.get("x-forwarded-proto") ?? "";
  const isHttps = req.secure || forwardedProto.split(",").some((value) => value.trim() === "https");
  const requestId = req.get("x-request-id");
  const safeRequestId = requestId && trustedRequestId.test(requestId) ? requestId : randomUUID();
  res.setHeader("X-Request-Id", safeRequestId);
  for (const [name, value] of Object.entries(buildSecurityHeaders({ isHttps, isProduction: process.env.NODE_ENV === "production" }))) {
    res.setHeader(name, value);
  }
  next();
}

// backend/_core/rateLimit.ts
var rules = {
  "member.login": { id: "member.login", maxAttempts: 8, windowMs: 15 * 60 * 1e3 },
  "member.requestPasswordReset": { id: "member.requestPasswordReset", maxAttempts: 5, windowMs: 15 * 60 * 1e3 },
  "member.setupPassword": { id: "member.setupPassword", maxAttempts: 5, windowMs: 15 * 60 * 1e3 },
  "member.resetPassword": { id: "member.resetPassword", maxAttempts: 5, windowMs: 15 * 60 * 1e3 },
  "membership.submit": { id: "membership.submit", maxAttempts: 8, windowMs: 60 * 60 * 1e3 },
  "volunteer.submit": { id: "volunteer.submit", maxAttempts: 8, windowMs: 60 * 60 * 1e3 },
  "contact.submit": { id: "contact.submit", maxAttempts: 8, windowMs: 60 * 60 * 1e3 },
  "newsletter.subscribe": { id: "newsletter.subscribe", maxAttempts: 8, windowMs: 60 * 60 * 1e3 },
  "donation.submitDetails": { id: "donation.submitDetails", maxAttempts: 8, windowMs: 60 * 60 * 1e3 },
  "payment.createOrder": { id: "payment.createOrder", maxAttempts: 12, windowMs: 15 * 60 * 1e3 },
  "payment.verifyCheckout": { id: "payment.verifyCheckout", maxAttempts: 12, windowMs: 15 * 60 * 1e3 },
  "member.joinService": { id: "member.joinService", maxAttempts: 8, windowMs: 60 * 60 * 1e3 },
  "member.sendSupportMessage": { id: "member.sendSupportMessage", maxAttempts: 10, windowMs: 60 * 60 * 1e3 },
  "member.uploadCompletionProof": { id: "member.uploadCompletionProof", maxAttempts: 24, windowMs: 60 * 60 * 1e3 },
  "member.submitCompletion": { id: "member.submitCompletion", maxAttempts: 6, windowMs: 60 * 60 * 1e3 },
  "assistant.chat": { id: "assistant.chat", maxAttempts: 20, windowMs: 15 * 60 * 1e3 }
};
var attempts = /* @__PURE__ */ new Map();
function createMemoryRateLimitStore(store = /* @__PURE__ */ new Map()) {
  return {
    async consume(key, rule, now = Date.now()) {
      return consumeRateLimit(store, key, rule, now);
    }
  };
}
var runtimeImport = new Function("specifier", "return import(specifier)");
function createRedisRateLimitStore(url) {
  let clientPromise = null;
  async function getClient() {
    clientPromise ??= (async () => {
      let redisModule;
      try {
        redisModule = await runtimeImport("redis");
      } catch {
        throw new Error("REDIS_URL is set but the redis package is not installed. Run `pnpm add redis` or unset REDIS_URL to use the in-memory limiter.");
      }
      const createClient = redisModule.createClient;
      const client = createClient({ url });
      client.on("error", (error) => console.error("[RateLimit] Redis store error", { error: error.message }));
      await client.connect();
      return client;
    })().catch((error) => {
      clientPromise = null;
      throw error;
    });
    return clientPromise;
  }
  return {
    async consume(key, rule, now = Date.now()) {
      try {
        const client = await getClient();
        const redisKey = `ratelimit:${key}`;
        const windowSeconds = Math.ceil(rule.windowMs / 1e3);
        const count2 = await client.incr(redisKey);
        if (count2 === 1) await client.expire(redisKey, windowSeconds);
        if (count2 > rule.maxAttempts) {
          const retryAfterSeconds = Math.max(1, Math.ceil((now + rule.windowMs - Date.now()) / 1e3));
          return { allowed: false, retryAfterSeconds };
        }
        return { allowed: true, retryAfterSeconds: 0 };
      } catch (error) {
        console.error("[RateLimit] Redis consume failed; failing closed", { error: error instanceof Error ? error.message : "unknown" });
        return { allowed: false, retryAfterSeconds: 30 };
      }
    }
  };
}
var activeStore = null;
function resolveStore() {
  if (activeStore) return activeStore;
  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl) {
    const store = createRedisRateLimitStore(redisUrl);
    activeStore = store;
    return store;
  }
  const memoryStore = createMemoryRateLimitStore(attempts);
  activeStore = memoryStore;
  return memoryStore;
}
function sensitiveTrpcRule(method, originalUrl) {
  if (method !== "POST") return null;
  const path5 = originalUrl.split("?", 1)[0];
  for (const rule of Object.values(rules)) {
    if (path5.endsWith(`/${rule.id}`) || path5.includes(`/${rule.id},`)) return rule;
  }
  return null;
}
function trustedClientIp(req) {
  return req.ip || "unknown";
}
function consumeRateLimit(store, key, rule, now = Date.now()) {
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + rule.windowMs };
    store.set(key, next);
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= rule.maxAttempts) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1e3)) };
  }
  current.count += 1;
  store.set(key, current);
  return { allowed: true, retryAfterSeconds: 0 };
}
async function enforceSensitiveMutationRateLimit(req, res, next) {
  const rule = sensitiveTrpcRule(req.method, req.originalUrl);
  if (!rule) return next();
  try {
    const decision = await resolveStore().consume(`${rule.id}:${trustedClientIp(req)}`, rule);
    if (decision.allowed) return next();
    res.setHeader("Retry-After", String(decision.retryAfterSeconds));
    return res.status(429).json({ error: "Too many attempts. Please wait before trying again." });
  } catch (error) {
    console.error("[RateLimit] Store consume raised unexpectedly", { error: error instanceof Error ? error.message : "unknown" });
    return next();
  }
}

// backend/_core/sitemap.ts
var PUBLIC_SITEMAP_PATHS = [
  "/",
  "/about",
  "/who-we-are",
  "/vision-mission",
  "/what-we-do",
  "/programs",
  "/digital-skills",
  "/green-entrepreneurship",
  "/mentorship-community",
  "/team",
  "/stories",
  "/updates",
  "/reports",
  "/governance",
  "/membership",
  "/donate",
  "/contact",
  "/volunteer",
  "/media-centre",
  "/field-gallery",
  "/faq",
  "/privacy",
  "/refund"
];
function escapeXml(value) {
  return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] ?? character);
}
function buildPublicSitemap(baseUrl) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const urls = PUBLIC_SITEMAP_PATHS.map((path5) => `<url><loc>${escapeXml(`${normalizedBaseUrl}${path5}`)}</loc></url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}
function publicSiteOrigin({ protocol, host }) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${protocol === "http" ? "http" : "https"}://${host || "localhost:3000"}`;
}

// backend/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function ensureDatabaseRunning() {
  const isFree = await isPortAvailable(3306);
  if (!isFree) {
    console.log("[AutoDB] Local MySQL is active on 127.0.0.1:3306.");
    return;
  }
  console.log("[AutoDB] Local MySQL is not running on 3306. Auto-booting persistent database...");
  try {
    const { spawn } = await import("child_process");
    const path5 = await import("path");
    const scriptPath = path5.resolve(process.cwd(), "scripts/runPersistentDb.ts");
    const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const useShell = process.platform === "win32";
    const dbProc = spawn(
      useShell ? `"${pnpmCmd}"` : pnpmCmd,
      useShell ? ["exec", "tsx", `"${scriptPath}"`] : ["exec", "tsx", scriptPath],
      {
        cwd: process.cwd(),
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        shell: useShell
      }
    );
    dbProc.on("error", (spawnError) => {
      console.error("[AutoDB] Persistent database process could not start:", spawnError);
    });
    dbProc.unref();
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const free = await isPortAvailable(3306);
      if (!free) {
        console.log("[AutoDB] Local MySQL is UP on 127.0.0.1:3306.");
        return;
      }
    }
    console.warn("[AutoDB] Warning: MySQL did not respond on 3306 within 20s.");
  } catch (err) {
    console.error("[AutoDB] Failed to auto-start MySQL:", err);
  }
}
async function startServer() {
  await ensureDatabaseRunning();
  const app = express2();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(compression());
  app.use(applyHttpSecurity);
  app.get("/api/health", (_req, res) => res.json(backendHealth()));
  app.get("/api/ready", (_req, res) => {
    const readiness = backendReadiness();
    return res.status(readiness.ok ? 200 : 503).json(readiness);
  });
  app.get("/sitemap.xml", (req, res) => {
    res.type("application/xml").send(buildPublicSitemap(publicSiteOrigin({ protocol: req.protocol, host: req.get("host") })));
  });
  if (process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_PREVIEW_LOGIN === "true") {
    app.get("/api/dev-preview-login", async (_req, res) => {
      try {
        const token = await sdk.signSession({ openId: "local-dev-admin", appId: "local-dev", name: "Local Dev Admin" }, { expiresInMs: 365 * 24 * 60 * 60 * 1e3 });
        res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(_req), maxAge: 365 * 24 * 60 * 60 * 1e3 });
        res.redirect(302, "/foundation-admin");
      } catch {
        res.status(500).send("Dev preview login failed");
      }
    });
  }
  app.post("/api/razorpay/webhook", express2.raw({ type: "application/json", limit: "1mb" }), handleRazorpayWebhook);
  app.use(express2.json({ limit: "12mb" }));
  app.use(express2.urlencoded({ limit: "12mb", extended: true }));
  app.post("/api/scheduled/membership-expiry", handleMembershipExpirySchedule);
  app.post("/api/scheduled/membership-reminder", handleMembershipReminderSchedule);
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use("/api/trpc", enforceSensitiveMutationRateLimit);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path: path5, type }) => {
        console.error(`[tRPC] ${type} ${path5 ?? "<unknown>"}:`, error);
      }
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/ (or http://127.0.0.1:${port}/)`);
  });
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`
[Shutdown] ${signal} received \u2014 closing server gracefully\u2026`);
    server.close(() => {
      console.log("[Shutdown] Server closed.");
      process.exit(0);
    });
    setTimeout(() => {
      console.log("[Shutdown] Forcing exit after timeout.");
      process.exit(0);
    }, 1e4).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
process.on("unhandledRejection", (reason) => {
  console.error("[UnhandledRejection]", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[UncaughtException]", error);
});
startServer().catch(console.error);
