export type MembershipValidity = {
  membershipTypeLabel: string;
  expiresOn: Date | null;
  graceEndsOn: Date | null;
  membershipStatus: "active" | "expired";
  portalAccessStatus: "active" | "grace" | "expired";
};

export const ANNUAL_MEMBERSHIP_GRACE_DAYS = 3;

function parseMembershipDate(value: Date | string) {
  if (value instanceof Date) return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) throw new Error("A valid membership joining date is required.");
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Annual plans are valid through the day before the next anniversary. Lifetime
 * plans intentionally have no calculated expiry date.
 */
export function getMembershipValidity(memberType: string, joiningDate: Date | string, now = new Date()): MembershipValidity {
  const normalizedType = memberType.trim().toLowerCase();
  if (normalizedType === "lifetime") return { membershipTypeLabel: "Lifetime Membership", expiresOn: null, graceEndsOn: null, membershipStatus: "active", portalAccessStatus: "active" };

  const joined = parseMembershipDate(joiningDate);
  const expiresOn = new Date(Date.UTC(joined.getUTCFullYear() + 1, joined.getUTCMonth(), joined.getUTCDate() - 1));
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const graceEndsOn = new Date(Date.UTC(expiresOn.getUTCFullYear(), expiresOn.getUTCMonth(), expiresOn.getUTCDate() + ANNUAL_MEMBERSHIP_GRACE_DAYS));
  const membershipStatus = today > expiresOn ? "expired" as const : "active" as const;
  const portalAccessStatus = today > graceEndsOn ? "expired" as const : membershipStatus === "expired" ? "grace" as const : "active" as const;
  return { membershipTypeLabel: "Annual Membership", expiresOn, graceEndsOn, membershipStatus, portalAccessStatus };
}
