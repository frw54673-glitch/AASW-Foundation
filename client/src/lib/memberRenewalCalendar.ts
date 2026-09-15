function asUtcDate(value: Date | string) {
  if (value instanceof Date) return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function icsDate(value: Date) {
  return value.toISOString().slice(0, 10).replaceAll("-", "");
}

export function nextRenewalEligibilityDate(expiresOn: Date | string) {
  const eligibility = asUtcDate(expiresOn);
  eligibility.setUTCDate(eligibility.getUTCDate() + 1);
  return eligibility;
}

export function createNextRenewalCalendarEvent(expiresOn: Date | string, portalUrl: string) {
  const eligibility = nextRenewalEligibilityDate(expiresOn);
  const nextDay = new Date(eligibility);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const created = new Date();
  const stamp = `${created.getUTCFullYear()}${String(created.getUTCMonth() + 1).padStart(2, "0")}${String(created.getUTCDate()).padStart(2, "0")}T${String(created.getUTCHours()).padStart(2, "0")}${String(created.getUTCMinutes()).padStart(2, "0")}${String(created.getUTCSeconds()).padStart(2, "0")}Z`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AASW Foundation//Membership Reminder//EN",
    "BEGIN:VEVENT",
    `UID:aasw-membership-renewal-${icsDate(eligibility)}@aaswfoundation.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(eligibility)}`,
    `DTEND;VALUE=DATE:${icsDate(nextDay)}`,
    "SUMMARY:AASW membership renewal is now available",
    "DESCRIPTION:Your annual AASW membership renewal is now available in the Member Portal.",
    `URL:${portalUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadNextRenewalCalendarEvent(expiresOn: Date | string, portalUrl: string) {
  const event = createNextRenewalCalendarEvent(expiresOn, portalUrl);
  const blob = new Blob([event], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "aasw-membership-renewal-reminder.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
