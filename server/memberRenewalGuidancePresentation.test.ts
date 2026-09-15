import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dashboardSource = readFileSync(resolve(process.cwd(), "client/src/pages/MemberSidebarDashboard.tsx"), "utf8");
const dashboardStyles = readFileSync(resolve(process.cwd(), "client/src/pages/member-dashboard.css"), "utf8");

describe("member renewal guidance presentation", () => {
  it("shows active annual members their exact renewal opening date instead of an early renewal link", () => {
    expect(dashboardSource).toContain("const renewalEligibleOn = expires ? nextRenewalEligibilityDate(expires) : null");
    expect(dashboardSource).toContain("Renewal opens ${formatIndianDate(renewalEligibleOn!)}");
    expect(dashboardSource).toContain('profile.data.memberType === "annual" && !active');
  });

  it("provides a private calendar reminder and history summary with responsive styling", () => {
    expect(dashboardSource).toContain("downloadNextRenewalCalendarEvent");
    expect(dashboardSource).toContain("Add to calendar");
    expect(dashboardSource).toContain("member-membership-summary");
    expect(dashboardSource).toContain("View history");
    expect(dashboardStyles).toContain(".member-membership-summary");
    expect(dashboardStyles).toContain(".member-calendar-reminder");
  });
});
