import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assignMemberToProject, changeMemberPassword, createCompletionSubmittedAdminAlert, createMemberPasswordResetToken, createMemberServiceRequest, createMemberSupportMessage, expireMemberIfDue, getActiveMemberCertificateEmailToken, getActiveMemberPasswordResetToken, getActiveMemberSetupToken, getMemberById, getMemberByIdentifier, getMemberPaymentReceipt, getMemberServiceCompletionByRequest, getMemberServiceRequestByRefAndMember, listMemberMembershipCycles, listMemberPaymentReceiptsWithPayouts, listMemberProjectAssignments, listMemberServiceCompletions, listMemberServiceRequests, listMemberSupportMessages, listMembersForAdmin, listMembersWithProgrammeProfile, listMisProjects, recordMemberLoginFailure, recordMemberLoginSuccess, resetMemberPasswordFromToken, setMemberPasswordFromSetupToken, upsertMemberServiceCompletion, updateMemberProfilePhoto, updateMemberProfileSettings } from "../db";
import { dispatchMemberPasswordResetEmail } from "../email/memberActivation";
import { getSessionCookieOptions } from "../_core/cookies";
import { adminProcedure, memberProcedure, publicProcedure, router } from "../_core/trpc";
import { createMemberSetupToken, hashMemberSetupToken } from "../security/memberAccount";
import { createMemberSession, MEMBER_SESSION_COOKIE } from "../security/memberSession";
import { getMembershipValidity } from "@shared/memberMembership";
import { storageGetSignedUrl, isLocalUploadMode, storageLocalUploadDataUrl, storagePut } from "../storage";
import { nanoid } from "nanoid";

const passwordInput = z.string().min(8, "Password must be at least 8 characters.").max(128).regex(/[a-z]/, "Password must include a lowercase letter.").regex(/[A-Z]/, "Password must include an uppercase letter.").regex(/\d/, "Password must include a number.").regex(/[^A-Za-z0-9]/, "Password must include a special character.");
const profilePhotoMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;
const memberServiceTypes = ["digital_skill_development", "green_entrepreneurship", "mentorship_business_support", "workshops_seminars", "building_community"] as const;

export function decodeProfilePhoto(dataBase64: string, mimeType: (typeof profilePhotoMimeTypes)[number]) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64) || dataBase64.length % 4 !== 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Profile photo data could not be read." });
  const bytes = Buffer.from(dataBase64, "base64");
  if (!bytes.length || bytes.length > MAX_PROFILE_PHOTO_BYTES) throw new TRPCError({ code: "BAD_REQUEST", message: "Use a JPG, PNG or WebP photo up to 2 MB." });
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const png = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if ((mimeType === "image/jpeg" && !jpeg) || (mimeType === "image/png" && !png) || (mimeType === "image/webp" && !webp)) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected file does not match its image type." });
  return bytes;
}

function profilePhotoExtension(mimeType: (typeof profilePhotoMimeTypes)[number]) { return mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg"; }

const completionProofMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
const MAX_COMPLETION_PROOF_BYTES = 5 * 1024 * 1024;
const MAX_COMPLETION_PROOFS = 6;

export function decodeCompletionProof(dataBase64: string, mimeType: (typeof completionProofMimeTypes)[number]) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64) || dataBase64.length % 4 !== 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Proof file data could not be read." });
  const bytes = Buffer.from(dataBase64, "base64");
  if (!bytes.length || bytes.length > MAX_COMPLETION_PROOF_BYTES) throw new TRPCError({ code: "BAD_REQUEST", message: "Keep each proof file under 5 MB." });
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const png = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  const pdf = bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if ((mimeType === "image/jpeg" && !jpeg) || (mimeType === "image/png" && !png) || (mimeType === "image/webp" && !webp) || (mimeType === "application/pdf" && !pdf)) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected proof file does not match its declared type." });
  return bytes;
}

function safeProofFileName(name: string) { return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "proof"; }

// Only https links to Drive are accepted so a proof link can never smuggle in
// an arbitrary scheme or an off-site phishing page.
const completionDriveLinkInput = z.string().trim().max(500).refine(value => /^https:\/\/(drive|docs)\.google\.com\/\S+$/.test(value), "Share a valid Google Drive link starting with https://.");

// Payout destination the member shares with their completion report. Either a
// UPI id or full bank details are required so a verified payout can be settled
// without a follow-up email round-trip.
const upiIdInput = z.string().trim().max(120).refine(value => /^[a-zA-Z0-9][a-zA-Z0-9.\-_]{1,63}@[a-zA-Z][a-zA-Z0-9]{1,32}$/.test(value), "Enter a valid UPI id like yourname@bank.");
const ifscInput = z.string().trim().max(11).refine(value => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value), "Enter a valid 11-character IFSC code (e.g. HDFC0001234).");
const completionPayoutDetailsInput = z.object({
  upiId: upiIdInput.optional(),
  accountName: z.string().trim().min(2, "Enter the account holder name exactly as in the bank record.").max(140).optional(),
  accountNumber: z.string().trim().regex(/^[0-9]{6,20}$/, "Enter a valid account number (6-20 digits).").optional(),
  ifsc: ifscInput.optional(),
}).superRefine((value, ctx) => {
  const hasUpi = Boolean(value.upiId);
  const hasBank = Boolean(value.accountName || value.accountNumber || value.ifsc);
  if (!hasUpi && !hasBank) return ctx.addIssue({ code: "custom", message: "Share where the payout should reach — your UPI id or your bank account details." });
  if (hasBank && (!value.accountName || !value.accountNumber || !value.ifsc)) ctx.addIssue({ code: "custom", message: "For a bank transfer share the account holder name, account number and IFSC code together." });
});

function clearMemberSession(ctx: { req: Parameters<typeof getSessionCookieOptions>[0]; res: { clearCookie: (name: string, options: Record<string, unknown>) => void } }) {
  ctx.res.clearCookie(MEMBER_SESSION_COOKIE, getSessionCookieOptions(ctx.req));
}

function setMemberSession(ctx: { req: Parameters<typeof getSessionCookieOptions>[0]; res: { cookie: (name: string, value: string, options: Record<string, unknown>) => void } }, token: string) {
  ctx.res.cookie(MEMBER_SESSION_COOKIE, token, { ...getSessionCookieOptions(ctx.req), maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function memberAppBaseUrl(req: { protocol?: string; get?: (header: string) => string | undefined }) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = req.get?.("host");
  if (host) return `${req.protocol === "http" ? "http" : "https"}://${host}`;
  return "http://localhost:3000";
}

export const memberRouter = router({
  setupStatus: publicProcedure.input(z.object({ token: z.string().min(20).max(512) })).query(async ({ input }) => {
    const token = await getActiveMemberSetupToken(hashMemberSetupToken(input.token));
    return { valid: Boolean(token), membershipNo: token?.membershipNo ?? null, fullName: token?.fullName ?? null };
  }),

  emailCertificateStatus: publicProcedure.input(z.object({ token: z.string().min(20).max(512) })).query(async ({ input }) => {
    const member = await getActiveMemberCertificateEmailToken(hashMemberSetupToken(input.token));
    if (!member || member.status !== "active" || member.accountStatus !== "active") return { valid: false as const, certificate: null };
    const validity = getMembershipValidity(member.memberType, member.joiningDate);
    if (validity.portalAccessStatus === "expired") return { valid: false as const, certificate: null };
    return { valid: true as const, certificate: { fullName: member.fullName, membershipNo: member.membershipNo, membershipTypeLabel: validity.membershipTypeLabel, joiningDate: member.joiningDate, expiresOn: validity.expiresOn } };
  }),

  setupPassword: publicProcedure.input(z.object({ token: z.string().min(20).max(512), password: passwordInput })).mutation(async ({ input }) => {
    const passwordHash = await bcrypt.hash(input.password, 12);
    const completed = await setMemberPasswordFromSetupToken({ tokenHash: hashMemberSetupToken(input.token), passwordHash });
    if (!completed) throw new TRPCError({ code: "BAD_REQUEST", message: "This setup link has expired or is invalid. Please contact AASW Foundation." });
    return { success: true } as const;
  }),

  requestPasswordReset: publicProcedure.input(z.object({ email: z.string().trim().email().max(320) })).mutation(async ({ input, ctx }) => {
    const member = await getMemberByIdentifier(input.email);
    // Preserve a generic response so callers cannot discover registered emails.
    if (!member || member.email.toLowerCase() !== input.email.toLowerCase() || member.status !== "active" || member.accountStatus === "inactive") return { success: true } as const;
    const reset = createMemberSetupToken();
    await createMemberPasswordResetToken(member.id, reset.tokenHash, reset.expiresAt);
    const resetUrl = `${memberAppBaseUrl(ctx.req)}/member/reset-password?token=${encodeURIComponent(reset.token)}`;
    await dispatchMemberPasswordResetEmail({ fullName: member.fullName, email: member.email, membershipNo: member.membershipNo, setupUrl: resetUrl });
    return { success: true } as const;
  }),

  resetStatus: publicProcedure.input(z.object({ token: z.string().min(20).max(512) })).query(async ({ input }) => {
    const token = await getActiveMemberPasswordResetToken(hashMemberSetupToken(input.token));
    return { valid: Boolean(token), membershipNo: token?.membershipNo ?? null, fullName: token?.fullName ?? null };
  }),

  resetPassword: publicProcedure.input(z.object({ token: z.string().min(20).max(512), password: passwordInput })).mutation(async ({ input }) => {
    const completed = await resetMemberPasswordFromToken({ tokenHash: hashMemberSetupToken(input.token), passwordHash: await bcrypt.hash(input.password, 12) });
    if (!completed) throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link has expired or is invalid. Please request a new password reset." });
    return { success: true } as const;
  }),

  login: publicProcedure.input(z.object({ identifier: z.string().trim().min(3).max(320), password: z.string().min(1).max(128) })).mutation(async ({ input, ctx }) => {
    const member = await getMemberByIdentifier(input.identifier);
    const genericError = () => new TRPCError({ code: "UNAUTHORIZED", message: "Invalid membership number/email or password." });
    if (!member || !member.passwordHash) throw genericError();
    const now = new Date();
    if (await expireMemberIfDue(member, now) || member.status === "expired" || member.accountStatus === "inactive") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Your annual membership has ended. Submit a new membership application with the same email and PAN to reactivate this Member Portal account." });
    }
    if (member.status !== "active") throw genericError();
    if (member.lockedUntil && member.lockedUntil > now) throw new TRPCError({ code: "FORBIDDEN", message: `Your account is temporarily locked. Try again after ${member.lockedUntil.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} or contact AASW Foundation.` });
    const correctPassword = await bcrypt.compare(input.password, member.passwordHash);
    if (!correctPassword) {
      const lockedUntil = await recordMemberLoginFailure(member.id, member.loginAttempts, now);
      if (lockedUntil) throw new TRPCError({ code: "FORBIDDEN", message: `Your account is temporarily locked. Try again after ${lockedUntil.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} or contact AASW Foundation.` });
      throw genericError();
    }
    await recordMemberLoginSuccess(member.id, now);
    const token = await createMemberSession({ id: member.id, membershipNo: member.membershipNo, fullName: member.fullName, role: member.role, email: member.email });
    setMemberSession(ctx, token);
    return { success: true, mustChangePassword: member.mustChangePassword, member: { membershipNo: member.membershipNo, fullName: member.fullName, role: member.role } };
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    clearMemberSession(ctx);
    return { success: true } as const;
  }),

  // Session-state lookup is public so a signed-out member UI can render its
  // own Member Login route without triggering the Manus OAuth redirect hook.
  me: publicProcedure.query(({ ctx }) => ctx.member),

  dashboard: memberProcedure.query(async ({ ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member || member.status !== "active" || member.accountStatus !== "active") {
      throw new TRPCError({ code: "FORBIDDEN", message: "This member account is not active. Please contact AASW Foundation." });
    }
    const validity = getMembershipValidity(member.memberType, member.joiningDate);
    let profilePhotoUrl: string | null = null;
    if (member.profilePhotoKey) {
      try {
        profilePhotoUrl = await storageGetSignedUrl(member.profilePhotoKey);
      } catch (error) {
        // Local dev has no Forge credentials, so signed URLs cannot be minted.
        // Inline the locally stored photo instead; production always signs.
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
      lastLogin: member.lastLogin,
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
    if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "This member account is not active." });
    return listMemberPaymentReceiptsWithPayouts(member.email, member.id);
  }),

  /** Single-receipt lookup for PDF download; ownership is re-checked inside the query. */
  receiptStatus: memberProcedure.input(z.object({ receipt: z.string().trim().min(6).max(40) })).query(async ({ input, ctx }) => {
    const receipt = await getMemberPaymentReceipt(input.receipt, ctx.member.email);
    if (!receipt) throw new TRPCError({ code: "NOT_FOUND", message: "No receipt was found for your member account." });
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
    return completions.map(completion => ({
      ...completion,
      proofs: completion.proofs.map(proof => ({ originalName: proof.originalName, mimeType: proof.mimeType, fileSize: proof.fileSize })),
    }));
  }),

  uploadCompletionProof: memberProcedure.input(z.object({ requestRef: z.string().trim().min(6).max(40), originalName: z.string().trim().min(1).max(255), mimeType: z.enum(completionProofMimeTypes), dataBase64: z.string().min(20) })).mutation(async ({ input, ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member || member.status !== "active" || member.accountStatus !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "This member account is not active." });
    const request = await getMemberServiceRequestByRefAndMember(input.requestRef, member.id);
    if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "No accepted service request was found for your account." });
    const existing = await getMemberServiceCompletionByRequest(request.id);
    if (existing && existing.status !== "rejected") throw new TRPCError({ code: "BAD_REQUEST", message: "A completion report for this request is already with the Foundation." });
    const bytes = decodeCompletionProof(input.dataBase64, input.mimeType);
    const upload = await storagePut(`member-completions/${member.membershipNo}/${request.requestRef}/${nanoid(8)}-${safeProofFileName(input.originalName)}`, bytes, input.mimeType);
    return { storageKey: upload.key, fileName: input.originalName, mimeType: input.mimeType, fileSize: bytes.length };
  }),

  submitCompletion: memberProcedure.input(z.object({
    requestRef: z.string().trim().min(6).max(40),
    details: z.string().trim().min(30, "Describe your completed work in at least 30 characters.").max(4000),
    driveLink: completionDriveLinkInput.optional(),
    payoutDetails: completionPayoutDetailsInput,
    proofs: z.array(z.object({ storageKey: z.string().trim().min(10).max(512), originalName: z.string().trim().min(1).max(255), mimeType: z.enum(completionProofMimeTypes), fileSize: z.number().int().min(1).max(MAX_COMPLETION_PROOF_BYTES) })).min(1, "Attach at least one proof file.").max(MAX_COMPLETION_PROOFS),
  })).mutation(async ({ input, ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member || member.status !== "active" || member.accountStatus !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "This member account is not active." });
    const request = await getMemberServiceRequestByRefAndMember(input.requestRef, member.id);
    if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "No service request was found for your account." });
    if (request.status !== "accepted") throw new TRPCError({ code: "BAD_REQUEST", message: "Completion reports can only be filed for accepted programme requests." });
    const existing = await getMemberServiceCompletionByRequest(request.id);
    if (existing && existing.status !== "rejected") throw new TRPCError({ code: "BAD_REQUEST", message: "A completion report for this request is already with the Foundation." });
    // Every submitted proof key must live under this member's own
    // membership-scoped folder for this exact request — keys uploaded for
    // another request or member simply fail the prefix check.
    const proofPrefix = `member-completions/${member.membershipNo}/${request.requestRef}/`;
    const ownedProofs: { storageKey: string; originalName: string; mimeType: string; fileSize: number }[] = [];
    for (const proof of input.proofs) {
      if (!proof.storageKey.startsWith(proofPrefix)) throw new TRPCError({ code: "BAD_REQUEST", message: "One of the attached proof files was not recognised. Please upload it again." });
      if (!completionProofMimeTypes.includes(proof.mimeType as (typeof completionProofMimeTypes)[number])) throw new TRPCError({ code: "BAD_REQUEST", message: "One of the attached proof files has an unsupported type." });
      ownedProofs.push({ storageKey: proof.storageKey, originalName: proof.originalName, mimeType: proof.mimeType, fileSize: proof.fileSize });
    }
    const result = await upsertMemberServiceCompletion({ completionRef: `AASW-CMP-${nanoid(12).toUpperCase()}`, requestId: request.id, memberId: member.id, details: input.details, driveLink: input.driveLink, payoutUpiId: input.payoutDetails.upiId, payoutAccountName: input.payoutDetails.accountName, payoutAccountNumber: input.payoutDetails.accountNumber, payoutIfsc: input.payoutDetails.ifsc, proofs: ownedProofs });
    // Surface the report on the admin dashboard; best-effort — a failed alert
    // insert must never roll back the member's submitted report.
    try {
      await createCompletionSubmittedAdminAlert({ completionRef: result.completion.completionRef, memberId: member.id, fullName: member.fullName, membershipNo: member.membershipNo, serviceType: request.serviceType });
    } catch (error) {
      console.error("[Completions] Admin alert failed:", error);
    }
    return { completion: result.completion, created: result.created };
  }),

  joinService: memberProcedure.input(z.object({ serviceType: z.enum(memberServiceTypes), projectId: z.number().int().positive().optional(), message: z.string().trim().max(1200).optional() })).mutation(async ({ input, ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member || member.status !== "active" || member.accountStatus !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "This member account is not active." });
    // A request may point at one of the member's own assigned projects only —
    // the member portal project selector is the source of these ids.
    let projectId: number | null = null;
    if (input.projectId) {
      const assignments = await listMemberProjectAssignments(member.id);
      if (!assignments.some(assignment => assignment.projectId === input.projectId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This project is not assigned to your member account." });
      }
      projectId = input.projectId;
    }
    const result = await createMemberServiceRequest({ requestRef: `AASW-SRV-${nanoid(12).toUpperCase()}`, memberId: member.id, serviceType: input.serviceType, projectId, message: input.message });
    return { request: result.request, created: result.created };
  }),

  mySupportMessages: memberProcedure.query(({ ctx }) => listMemberSupportMessages(ctx.member.id)),

  sendSupportMessage: memberProcedure.input(z.object({ message: z.string().trim().min(3, "Please enter at least 3 characters.").max(3000, "Keep your support message within 3,000 characters.") })).mutation(async ({ input, ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member || member.status !== "active" || member.accountStatus !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "This member account is not active." });
    const message = await createMemberSupportMessage({ messageRef: `AASW-SUP-${nanoid(12).toUpperCase()}`, memberId: member.id, message: input.message });
    return { message };
  }),

  changePassword: memberProcedure.input(z.object({ currentPassword: z.string().min(1).max(128), password: passwordInput })).mutation(async ({ input, ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member?.passwordHash || !(await bcrypt.compare(input.currentPassword, member.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your current password is incorrect." });
    await changeMemberPassword(member.id, await bcrypt.hash(input.password, 12));
    return { success: true } as const;
  }),

  updateProfileSettings: memberProcedure.input(z.object({
    phone: z.string().trim().regex(/^\+?[0-9][0-9\s-]{7,19}$/, "Enter a valid contact number."),
    city: z.string().trim().min(2, "Enter your city.").max(100),
    district: z.string().trim().min(2, "Enter your district.").max(128),
    state: z.string().trim().min(2, "Enter your state.").max(100),
    address: z.string().trim().max(1000),
    foundationUpdatesOptIn: z.boolean(),
  })).mutation(async ({ input, ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member || member.status !== "active" || member.accountStatus !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "This member account is not active." });
    await updateMemberProfileSettings(member.id, input);
    return { success: true } as const;
  }),

  uploadProfilePhoto: memberProcedure.input(z.object({ originalName: z.string().trim().min(1).max(255), mimeType: z.enum(profilePhotoMimeTypes), dataBase64: z.string().min(20) })).mutation(async ({ input, ctx }) => {
    const member = await getMemberById(ctx.member.id);
    if (!member || member.status !== "active" || member.accountStatus !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "This member account is not active." });
    const bytes = decodeProfilePhoto(input.dataBase64, input.mimeType);
    let stored: { key: string; url: string };
    try {
      stored = await storagePut(`member-profile-photos/${member.membershipNo}/avatar.${profilePhotoExtension(input.mimeType)}`, bytes, input.mimeType);
    } catch (error) {
      console.error("[Member] Profile photo upload failed", { memberId: member.id, error });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Your profile photo could not be securely uploaded. Please try again." });
    }
    await updateMemberProfilePhoto(member.id, stored);
    try {
      return { profilePhotoUrl: await storageGetSignedUrl(stored.key) };
    } catch (error) {
      // The photo is already saved; only the display URL is missing. Local dev
      // has no Forge credentials, so inline the local upload instead of
      // reporting a failure for a photo that stored fine.
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
    assignProject: adminProcedure.input(z.object({ memberId: z.number().int().positive(), projectId: z.number().int().positive(), projectRole: z.string().trim().min(2).max(120) })).mutation(async ({ input, ctx }) => ({ id: await assignMemberToProject({ ...input, assignedByOpenId: ctx.user.openId }) })),
  }),
});
