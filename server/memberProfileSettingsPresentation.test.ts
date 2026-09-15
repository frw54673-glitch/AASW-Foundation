import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/MemberSidebarDashboard.tsx"), "utf8");
const styles = readFileSync(resolve(process.cwd(), "client/src/pages/member-dashboard.css"), "utf8");
const urgencyStyles = readFileSync(resolve(process.cwd(), "client/src/pages/member-dashboard-urgency.css"), "utf8");

describe("member profile settings and term progress presentation", () => {
  it("renders an accessible annual-term progressbar and clear term timing", () => {
    expect(source).toContain('className="member-term-progress-track" role="progressbar"');
    expect(source).toContain("MEMBERSHIP TERM PROGRESS");
    expect(source).toContain("aria-valuetext={`${elapsed}% elapsed; ${exactExpiryTimeRemaining?.label");
    expect(styles).toContain(".member-term-progress");
  });

  it("switches the progress indicator to an accessible red urgency state within 30 days", () => {
    expect(source).toContain('remaining < 30 ? "soon" : "active"');
    expect(source).toContain('import "./member-dashboard-urgency.css"');
    expect(urgencyStyles).toContain(".member-term-progress.soon,");
    expect(urgencyStyles).toContain(".member-term-progress.urgent");
    expect(urgencyStyles).toContain("#b42318");
  });

  it("adds exact expiry timing help, subtle urgency motion and a protected under-30-day renewal action", () => {
    expect(source).toContain('membershipExpiryTimeRemaining(expires, countdownNow)');
    expect(source).toContain('aria-describedby="member-term-progress-exact-time"');
    expect(source).toContain('role="tooltip"');
    expect(source).toContain("isTermRenewalUrgent");
    expect(source).toContain("Renew Now");
    expect(source).toContain('notifyInfo("Renewal opens after your current term"');
    expect(urgencyStyles).toContain("@keyframes member-term-urgency-pulse");
    expect(urgencyStyles).toContain("prefers-reduced-motion: no-preference");
    expect(urgencyStyles).toContain(".member-term-progress-tooltip");
  });

  it("keeps renewal benefits, live countdown and early-renewal policy help available without bypassing the guard", () => {
    expect(source).toContain("const renewalBenefits = [");
    expect(source).toContain("Benefits of renewing");
    expect(source).toContain("Dialog open={renewalBenefitsOpen}");
    expect(source).toContain("setCountdownNow(new Date())");
    expect(source).toContain("Live countdown:");
    expect(source).toContain("Early renewal is protected.");
    expect(urgencyStyles).toContain("@keyframes member-term-renew-entrance");
    expect(urgencyStyles).toContain(".member-term-benefits-link");
    expect(urgencyStyles).toContain(".member-renewal-benefits-dialog");
  });

  it("keeps profile contact and optional Foundation updates in a protected settings form", () => {
    expect(source).toContain("trpc.member.updateProfileSettings.useMutation");
    expect(source).toContain("Save profile settings");
    expect(source).toContain("Foundation updates");
    expect(source).toContain("Your login email stays protected");
    expect(styles).toContain(".member-profile-settings");
  });
});
