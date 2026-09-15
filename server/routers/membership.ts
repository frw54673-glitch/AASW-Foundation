import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createMemberCertificateEmailToken, createMembershipApplicationWithActivation, markMembershipApplicationNotification } from "../db";
import { dispatchMemberActivationEmail } from "../email/memberActivation";
import { dispatchMembershipApplicationNotification } from "../email/membershipNotification";
import { createMemberSetupToken } from "../security/memberAccount";
import { encryptSensitiveValue, hashSensitiveMatchValue } from "../security/sensitive";
import { storagePut } from "../storage";
import { publicProcedure, router } from "../_core/trpc";

const MAX_ID_PROOF_BYTES = 5 * 1024 * 1024;
const ID_PROOF_TYPES = ["aadhaar", "voter_id", "passport", "driving_licence", "other"] as const;
const ID_PROOF_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;

export const membershipApplicationInput = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(255),
  email: z.string().trim().email("Please enter a valid email address.").max(320),
  phone: z.string().trim().min(8, "Please enter a valid phone number.").max(32).regex(/^[0-9+()\-\s]+$/, "Please use a valid phone number."),
  city: z.string().trim().min(2, "Please enter your city.").max(128),
  state: z.string().trim().min(2, "Please enter your state or region.").max(128),
  district: z.string().trim().min(2, "Please enter your district.").max(128),
  membershipType: z.enum(["annual", "lifetime"]),
  panNumber: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Please enter a valid PAN number."),
  idProof: z.object({
    type: z.enum(ID_PROOF_TYPES),
    originalName: z.string().trim().min(1, "Please select an ID-proof file.").max(255),
    mimeType: z.enum(ID_PROOF_MIME_TYPES),
    dataBase64: z.string().min(8, "Please upload your ID proof."),
  }),
  message: z.string().trim().max(1500).optional(),
  privacyConsent: z.literal(true, { error: "Please confirm that AASW may use these details to follow up on your application." }),
  renewalIntent: z.boolean().optional(),
  website: z.string().max(0).optional(),
});

function createApplicationRef() {
  return `AASW-MEM-${nanoid(12).toUpperCase()}`;
}

function decodeIdProof(dataBase64: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64) || dataBase64.length % 4 !== 0) throw new TRPCError({ code: "BAD_REQUEST", message: "The ID-proof file could not be read." });
  const file = Buffer.from(dataBase64, "base64");
  if (file.length === 0 || file.length > MAX_ID_PROOF_BYTES) throw new TRPCError({ code: "BAD_REQUEST", message: "ID proof must be an image or PDF up to 5 MB." });
  return file;
}

function proofExtension(mimeType: (typeof ID_PROOF_MIME_TYPES)[number]) {
  return mimeType === "application/pdf" ? "pdf" : mimeType === "image/png" ? "png" : "jpg";
}

function memberAppBaseUrl(req: { protocol?: string; get?: (header: string) => string | undefined }) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = req.get?.("host");
  if (host) return `${req.protocol === "http" ? "http" : "https"}://${host}`;
  return "http://localhost:3000";
}

export const membershipRouter = router({
  submit: publicProcedure.input(membershipApplicationInput).mutation(async ({ input, ctx }) => {
    if (input.website) throw new TRPCError({ code: "BAD_REQUEST", message: "Unable to submit this application." });
    const applicationRef = createApplicationRef();
    const proofBuffer = decodeIdProof(input.idProof.dataBase64);

    let storedProof: { key: string };
    try {
      storedProof = await storagePut(`membership-applications/${applicationRef}/id-proof.${proofExtension(input.idProof.mimeType)}`, proofBuffer, input.idProof.mimeType);
    } catch (error) {
      console.error("[Membership] ID-proof upload failed", { applicationRef, error });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Your ID proof could not be securely uploaded. Please try again." });
    }

    const setup = createMemberSetupToken();
    let activation: { memberId: number; membershipNo: string; isRenewal: boolean };
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
          notificationStatus: "pending",
        },
        setupTokenHash: setup.tokenHash,
        setupTokenExpiresAt: setup.expiresAt,
        renewalIntent: input.renewalIntent,
      });
    } catch (error) {
      console.error("[Membership] Member activation failed", { applicationRef, error });
      const reason = error instanceof Error ? error.message : "";
      if (input.renewalIntent && reason === "Membership renewal identity did not match.") throw new TRPCError({ code: "CONFLICT", message: "Membership renewal identity did not match." });
      if (input.renewalIntent && reason === "No existing membership found for this renewal email.") throw new TRPCError({ code: "NOT_FOUND", message: "No existing membership found for this renewal email." });
      if (input.renewalIntent && reason === "An active membership already exists for this email.") throw new TRPCError({ code: "CONFLICT", message: "An active membership already exists for this email." });
      throw new TRPCError({ code: "CONFLICT", message: "We could not activate this membership account. Please contact AASW Foundation for assistance." });
    }

    const notification = await dispatchMembershipApplicationNotification({ applicationRef, fullName: input.fullName, email: input.email, phone: input.phone, district: input.district, state: input.state, membershipType: input.membershipType });
    if (notification === "sent") await markMembershipApplicationNotification(applicationRef, "sent");
    else await markMembershipApplicationNotification(applicationRef, "failed", notification.error);

    if (activation.isRenewal) {
      return { applicationRef, membershipNo: activation.membershipNo, status: "approved" as const, renewal: true as const, notificationStatus: notification === "sent" ? "sent" as const : "failed" as const, activationEmailStatus: "not_required" as const };
    }

    const setupUrl = `${memberAppBaseUrl(ctx.req)}/member/setup-password?token=${encodeURIComponent(setup.token)}`;
    const certificateEmailToken = createMemberSetupToken();
    await createMemberCertificateEmailToken(activation.memberId, certificateEmailToken.tokenHash, certificateEmailToken.expiresAt);
    const certificateUrl = `${memberAppBaseUrl(ctx.req)}/member/email-certificate?token=${encodeURIComponent(certificateEmailToken.token)}`;
    const activationEmail = await dispatchMemberActivationEmail({ fullName: input.fullName, email: input.email, membershipNo: activation.membershipNo, setupUrl, certificateUrl });

    return { applicationRef, membershipNo: activation.membershipNo, status: "approved" as const, renewal: false as const, notificationStatus: notification === "sent" ? "sent" as const : "failed" as const, activationEmailStatus: activationEmail === "sent" || activationEmail === "mocked" ? activationEmail : "failed" as const };
  }),
});
