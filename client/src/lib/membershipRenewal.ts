export function isAnnualRenewalSearch(search: string) {
  return new URLSearchParams(search).get("renewal") === "annual";
}

export function membershipSubmissionErrorMessage(message: string, isRenewal: boolean) {
  const normalized = message.toLowerCase();

  if (isRenewal && (normalized.includes("renewal identity did not match") || normalized.includes("could not match an existing membership"))) {
    return "We could not match an existing AASW member account with this email address and PAN. Please enter the exact email address and PAN used for your current membership. Your renewal has not been submitted.";
  }

  if (isRenewal && normalized.includes("no existing membership")) {
    return "We could not find an AASW member account with this email address. Please use the email connected to your existing membership, or contact the Foundation for help.";
  }

  if (isRenewal && normalized.includes("active membership already exists")) {
    return "Your annual membership is already active. You do not need to renew right now—please continue through the Member Portal.";
  }

  if (normalized.includes("id proof could not be securely uploaded")) {
    return "Your ID proof could not be securely uploaded. Please check the file and try again. No renewal has been submitted.";
  }

  return isRenewal
    ? "We could not record your renewal right now. Please check your connection and try again. If the problem continues, contact AASW Foundation."
    : "We could not submit your membership application right now. Please check your connection and try again.";
}

export function formatPanInput(value: string) {
  return value.replace(/\s+/g, "").toUpperCase().slice(0, 10);
}

export const RENEWAL_PROGRESS_STORAGE_KEY = "aasw-renewal-progress-v1";

export type SafeRenewalProgress = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  district: string;
  idProofType: "" | "aadhaar" | "voter_id" | "passport" | "driving_licence" | "other";
  message: string;
  privacyConsent: boolean;
};

const safeProgressKeys: Array<keyof SafeRenewalProgress> = ["fullName", "email", "phone", "city", "state", "district", "idProofType", "message", "privacyConsent"];
const validProofTypes = new Set<SafeRenewalProgress["idProofType"]>(["", "aadhaar", "voter_id", "passport", "driving_licence", "other"]);

export function createSafeRenewalProgress(progress: SafeRenewalProgress): SafeRenewalProgress | null {
  const hasProgress = safeProgressKeys.some((key) => key === "privacyConsent" ? progress[key] : Boolean(String(progress[key]).trim()));
  return hasProgress ? progress : null;
}

export function parseSafeRenewalProgress(raw: string | null): SafeRenewalProgress | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const candidate = value as Record<string, unknown>;
    if (!safeProgressKeys.every((key) => key in candidate)) return null;
    if (safeProgressKeys.filter((key) => key !== "privacyConsent").some((key) => typeof candidate[key] !== "string")) return null;
    if (typeof candidate.privacyConsent !== "boolean" || !validProofTypes.has(candidate.idProofType as SafeRenewalProgress["idProofType"])) return null;
    return {
      fullName: candidate.fullName as string,
      email: candidate.email as string,
      phone: candidate.phone as string,
      city: candidate.city as string,
      state: candidate.state as string,
      district: candidate.district as string,
      idProofType: candidate.idProofType as SafeRenewalProgress["idProofType"],
      message: candidate.message as string,
      privacyConsent: candidate.privacyConsent,
    };
  } catch {
    return null;
  }
}
