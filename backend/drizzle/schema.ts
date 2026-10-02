import { boolean, date, decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
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
  /** Optional local credential for the Foundation owner login. Only the seeded
   * owner account (aaswfoundation06@gmail.com) carries a hash; everyone else
   * signs in through the platform OAuth flow. */
  passwordHash: varchar("passwordHash", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Payment lifecycle is server-owned. Customer-facing checkout never receives a gateway secret.
export const paymentTransactions = mysqlTable("payment_transactions", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Refund lifecycle for verified/captured gateway payments. Only authorized
// finance roles can initiate one; webhook events drive the processed state.
export const paymentRefunds = mysqlTable("payment_refunds", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Donation details are captured before any checkout attempt so Foundation follow-up does not depend on gateway configuration.
export const donationIntents = mysqlTable("donation_intents", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const paymentWebhookEvents = mysqlTable("payment_webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  gatewayEventId: varchar("gatewayEventId", { length: 255 }).notNull().unique(),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  gatewayOrderId: varchar("gatewayOrderId", { length: 255 }),
  gatewayPaymentId: varchar("gatewayPaymentId", { length: 255 }),
  payloadHash: varchar("payloadHash", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["received", "processed", "ignored"]).notNull().default("received"),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
});

// Public membership interest records. The form intentionally stores only the details needed for Foundation follow-up.
export const membershipApplications = mysqlTable("membership_applications", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Public member credentials remain separate from Manus OAuth users so member
// access can coexist with the established Foundation admin and MIS workflow.
export const members = mysqlTable("members", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Each membership term is retained after expiry or renewal. This lets one
// member account keep its original Member ID, projects and activity history.
export const memberMembershipCycles = mysqlTable("member_membership_cycles", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  memberCycleUnique: uniqueIndex("member_membership_cycles_member_cycle_unique").on(table.memberId, table.cycleNumber),
}));

// A single owner-controlled scheduler configuration. The task UID is stored
// only after the deployed daily expiry job is created by the platform.
export const membershipExpiryAutomation = mysqlTable("membership_expiry_automation", {
  id: int("id").autoincrement().primaryKey(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).unique(),
  lastRanAt: timestamp("lastRanAt"),
  lastExpiredCount: int("lastExpiredCount").notNull().default(0),
  lastError: varchar("lastError", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Exactly one seven-day reminder can be delivered for each annual membership
// cycle. Delivery state is retained for auditability and retry safety.
export const memberExpiryReminders = mysqlTable("member_expiry_reminders", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  membershipCycleId: int("membershipCycleId").notNull().references(() => memberMembershipCycles.id, { onDelete: "cascade" }),
  reminderType: mysqlEnum("reminderType", ["seven_day", "post_grace"]).notNull().default("seven_day"),
  deliveryStatus: mysqlEnum("deliveryStatus", ["pending", "sent", "failed"]).notNull().default("pending"),
  attempts: int("attempts").notNull().default(0),
  sentAt: timestamp("sentAt"),
  lastError: varchar("lastError", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  cycleReminderUnique: uniqueIndex("member_expiry_reminders_cycle_type_unique").on(table.membershipCycleId, table.reminderType),
}));

export const membershipReminderAutomation = mysqlTable("membership_reminder_automation", {
  id: int("id").autoincrement().primaryKey(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).unique(),
  lastRanAt: timestamp("lastRanAt"),
  lastEligibleCount: int("lastEligibleCount").notNull().default(0),
  lastError: varchar("lastError", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Member-facing requests stay scoped to the authenticated member account.
// One request per programme area prevents accidental duplicate submissions.
export const memberServiceRequests = mysqlTable("member_service_requests", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  // Plain index keeps the memberId FK efficient without blocking repeat
  // programme requests after a previous one was completed or closed.
  memberIdIdx: index("member_service_requests_member_id_idx").on(table.memberId),
}));

// A member's completion report for an accepted service request: what they
// did, optional proof files and an optional Drive link. Verified reports
// carry the payout details the Foundation shares back with the member;
// paying out records the reference and timestamps the settlement.
export const memberServiceCompletions = mysqlTable("member_service_completions", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  // One completion record per service request; a rejected report is resubmitted
  // by updating the same row so the member's history stays coherent.
  completionRequestUnique: uniqueIndex("member_service_completions_request_unique").on(table.requestId),
}));

// Proof files attached to a completion report. Storage keys are member-scoped
// and only ever dereferenced through ownership-checked queries.
export const memberServiceCompletionProofs = mysqlTable("member_service_completion_proofs", {
  id: int("id").autoincrement().primaryKey(),
  completionId: int("completionId").notNull().references(() => memberServiceCompletions.id, { onDelete: "cascade" }),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  proofUnique: uniqueIndex("member_service_completion_proofs_unique").on(table.completionId, table.storageKey),
}));

// Private support conversations. Members only retrieve their own messages;
// Foundation replies remain within the same protected conversation record.
export const memberSupportMessages = mysqlTable("member_support_messages", {
  id: int("id").autoincrement().primaryKey(),
  messageRef: varchar("messageRef", { length: 40 }).notNull().unique(),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["submitted", "reviewing", "responded", "closed"]).notNull().default("submitted"),
  adminReply: text("adminReply"),
  repliedByOpenId: varchar("repliedByOpenId", { length: 64 }),
  repliedAt: timestamp("repliedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Only hashed setup tokens are persisted. The email contains the one-time
// plaintext token and expires after 72 hours.
export const accountSetupTokens = mysqlTable("account_setup_tokens", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const memberPasswordResetTokens = mysqlTable("member_password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// A short-lived link included in the membership approval email. Only its hash
// is stored, and an older unused email link is invalidated when a new one is issued.
export const memberCertificateEmailTokens = mysqlTable("member_certificate_email_tokens", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Protected workspace notices intentionally omit PAN, identity-proof, address
// and date-of-birth data. The unique application reference prevents duplicate
// member-approval alerts if a submission is retried.
export const foundationAdminAlerts = mysqlTable("foundation_admin_alerts", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Public contact records. The Foundation receives a notification but messages stay in the application database for reliable follow-up.
export const contactInquiries = mysqlTable("contact_inquiries", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Public volunteer interest records. Review decisions stay in the Foundation
// workspace; no member portal account is created automatically because a
// volunteer role is granted on top of existing member accounts only.
// Public newsletter subscribers captured from the site footer. These are
// consent-captured records only - no account is created and no sensitive
// data is collected beyond the subscribing email address.
export const newsletterSubscribers = mysqlTable("newsletter_subscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  source: mysqlEnum("source", ["footer", "updates_page"]).notNull().default("footer"),
  status: mysqlEnum("status", ["subscribed", "unsubscribed"]).notNull().default("subscribed"),
  consentAt: timestamp("consentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").onUpdateNow().notNull(),
});

export const volunteerApplications = mysqlTable("volunteer_applications", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// A managed gallery feed. Future Drive sync can add records using the same safe public media model.
export const galleryMedia = mysqlTable("gallery_media", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// One Foundation-controlled Drive configuration. Imports remain disabled until
// the owner shares a folder and provides an authorised server-side credential.
export const galleryDriveSync = mysqlTable("gallery_drive_sync", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// MIS Phase 1: Project identity and the foundation planning records connected to it.
export const projects = mysqlTable("projects", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Member portal access is explicit and per-project. Existing MIS staff
// assignments remain unchanged because they use Manus OAuth OpenIDs.
export const memberProjectAssignments = mysqlTable("member_project_assignments", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull().references(() => members.id, { onDelete: "cascade" }),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  projectRole: varchar("projectRole", { length: 120 }).notNull().default("Member"),
  assignmentStatus: mysqlEnum("assignmentStatus", ["active", "inactive"]).notNull().default("active"),
  assignedByOpenId: varchar("assignedByOpenId", { length: 64 }).notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const fundersPartners = mysqlTable("funders_partners", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectObjectives = mysqlTable("project_objectives", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  problemAddressed: text("problemAddressed").notNull(),
  projectObjectives: text("projectObjectives").notNull(),
  targetOutcomes: text("targetOutcomes").notNull(),
  sdgLinkage: json("sdgLinkage").$type<string[]>().notNull(),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectTargetGroups = mysqlTable("project_target_groups", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectActivities = mysqlTable("project_activities", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// MIS Phase 2: delivery records connected to the project workplan.
export const beneficiaries = mysqlTable("beneficiaries", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const targetsAchievement = mysqlTable("targets_achievement", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const fieldEvents = mysqlTable("field_events", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 32 }).notNull().unique(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  activityId: int("activityId").references(() => projectActivities.id, { onDelete: "set null" }),
  eventDate: date("eventDate").notNull(),
  village: varchar("village", { length: 255 }).notNull(),
  locationDetails: text("locationDetails").notNull(),
  numParticipants: int("numParticipants").notNull(),
  staffNames: json("staffNames").$type<string[]>().notNull(),
  volunteerNames: json("volunteerNames").$type<string[]>().notNull(),
  observations: text("observations"),
  attachmentPaths: json("attachmentPaths").$type<string[]>().notNull(),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectOutputs = mysqlTable("project_outputs", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectOutcomes = mysqlTable("project_outcomes", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// MIS Phase 3 and 4: operational controls, finance, monitoring, risks and reporting.
export const projectTeamAssignments = mysqlTable("project_team_assignments", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectBudgetAllocations = mysqlTable("project_budget_allocations", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectFinanceRecords = mysqlTable("project_finance_records", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectDocuments = mysqlTable("project_documents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  documentType: mysqlEnum("documentType", ["proposal", "mou", "plan", "budget", "invoice", "attendance", "report", "photo", "other"]).notNull(),
  documentName: varchar("documentName", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 1024 }).notNull(),
  visibility: mysqlEnum("visibility", ["internal", "management", "public"]).notNull().default("internal"),
  reviewStatus: mysqlEnum("reviewStatus", ["draft", "approved", "archived"]).notNull().default("draft"),
  uploadedByOpenId: varchar("uploadedByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const monitoringIndicators = mysqlTable("monitoring_indicators", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectRisks = mysqlTable("project_risks", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectReports = mysqlTable("project_reports", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// MIS Phase 5: impact proof, closure governance and accountability history.
export const impactEvidence = mysqlTable("impact_evidence", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectClosures = mysqlTable("project_closures", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const misAuditLogs = mysqlTable("mis_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorOpenId: varchar("actorOpenId", { length: 64 }).notNull(),
  action: varchar("action", { length: 180 }).notNull(),
  entityType: varchar("entityType", { length: 120 }).notNull(),
  entityId: varchar("entityId", { length: 80 }).notNull(),
  projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
  details: json("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactions.$inferInsert;
export type PaymentRefund = typeof paymentRefunds.$inferSelect;
export type InsertPaymentRefund = typeof paymentRefunds.$inferInsert;
export type PaymentWebhookEvent = typeof paymentWebhookEvents.$inferSelect;
export type VolunteerApplication = typeof volunteerApplications.$inferSelect;
export type InsertVolunteerApplication = typeof volunteerApplications.$inferInsert;
export type DonationIntent = typeof donationIntents.$inferSelect;
export type InsertDonationIntent = typeof donationIntents.$inferInsert;
export type MembershipApplication = typeof membershipApplications.$inferSelect;
export type InsertMembershipApplication = typeof membershipApplications.$inferInsert;
export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;
export type MemberServiceRequest = typeof memberServiceRequests.$inferSelect;
export type MemberServiceCompletion = typeof memberServiceCompletions.$inferSelect;
export type MemberServiceCompletionProof = typeof memberServiceCompletionProofs.$inferSelect;
export type MemberSupportMessage = typeof memberSupportMessages.$inferSelect;
export type AccountSetupToken = typeof accountSetupTokens.$inferSelect;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;
export type ContactInquiry = typeof contactInquiries.$inferSelect;
export type InsertContactInquiry = typeof contactInquiries.$inferInsert;
export type GalleryMedia = typeof galleryMedia.$inferSelect;
export type InsertGalleryMedia = typeof galleryMedia.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type FunderPartner = typeof fundersPartners.$inferSelect;
export type ProjectObjective = typeof projectObjectives.$inferSelect;
export type ProjectTargetGroup = typeof projectTargetGroups.$inferSelect;
export type ProjectActivity = typeof projectActivities.$inferSelect;
export type Beneficiary = typeof beneficiaries.$inferSelect;
export type TargetAchievement = typeof targetsAchievement.$inferSelect;
export type FieldEvent = typeof fieldEvents.$inferSelect;
export type ProjectOutput = typeof projectOutputs.$inferSelect;
export type ProjectOutcome = typeof projectOutcomes.$inferSelect;
export type ProjectTeamAssignment = typeof projectTeamAssignments.$inferSelect;
export type ProjectBudgetAllocation = typeof projectBudgetAllocations.$inferSelect;
export type ProjectFinanceRecord = typeof projectFinanceRecords.$inferSelect;
export type ProjectDocument = typeof projectDocuments.$inferSelect;
export type MonitoringIndicator = typeof monitoringIndicators.$inferSelect;
export type ProjectRisk = typeof projectRisks.$inferSelect;
export type ProjectReport = typeof projectReports.$inferSelect;
export type ImpactEvidence = typeof impactEvidence.$inferSelect;
export type ProjectClosure = typeof projectClosures.$inferSelect;
export type MisAuditLog = typeof misAuditLogs.$inferSelect;
