const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Annual membership is valid through the displayed expiry date, so the precise
 * countdown ends at the final millisecond of that UTC calendar day.
 */
export function membershipExpiryMoment(expiresOn: Date | string) {
  const expiryDate = new Date(expiresOn);
  return new Date(Date.UTC(
    expiryDate.getUTCFullYear(),
    expiryDate.getUTCMonth(),
    expiryDate.getUTCDate(),
    23,
    59,
    59,
    999,
  ));
}

export function membershipExpiryTimeRemaining(expiresOn: Date | string, now = new Date()) {
  const remainingMs = Math.max(0, membershipExpiryMoment(expiresOn).getTime() - now.getTime());
  const days = Math.floor(remainingMs / DAY_MS);
  const hours = Math.floor((remainingMs % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((remainingMs % HOUR_MS) / 60_000);
  const label = `${days} day${days === 1 ? "" : "s"}, ${hours} hour${hours === 1 ? "" : "s"} and ${minutes} minute${minutes === 1 ? "" : "s"} remaining`;

  return { days, hours, minutes, label };
}
