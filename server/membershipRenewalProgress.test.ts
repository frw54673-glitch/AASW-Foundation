import { describe, expect, it } from "vitest";
import { createSafeRenewalProgress, parseSafeRenewalProgress } from "../client/src/lib/membershipRenewal";

const safeProgress = {
  fullName: "Aviral Trivedi",
  email: "member@example.org",
  phone: "9984156418",
  city: "Rura",
  state: "Uttar Pradesh",
  district: "Kanpur Dehat",
  idProofType: "aadhaar" as const,
  message: "Continuing my membership.",
  privacyConsent: true,
};

describe("safe renewal progress", () => {
  it("keeps recoverable form progress while excluding PAN and private ID-proof data", () => {
    expect(createSafeRenewalProgress(safeProgress)).toEqual(safeProgress);
    expect(JSON.stringify(createSafeRenewalProgress(safeProgress))).not.toContain("pan");
    expect(JSON.stringify(createSafeRenewalProgress(safeProgress))).not.toContain("idProofFile");
  });

  it("restores only a complete, safely shaped browser-tab draft", () => {
    expect(parseSafeRenewalProgress(JSON.stringify(safeProgress))).toEqual(safeProgress);
    expect(parseSafeRenewalProgress(JSON.stringify({ ...safeProgress, idProofType: "unknown" }))).toBeNull();
    expect(parseSafeRenewalProgress("not-json")).toBeNull();
  });
});
