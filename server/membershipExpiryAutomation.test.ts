import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const database = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const memberRouter = readFileSync(resolve(process.cwd(), "server/routers/member.ts"), "utf8");
const membershipRouter = readFileSync(resolve(process.cwd(), "server/routers/membership.ts"), "utf8");
const memberSession = readFileSync(resolve(process.cwd(), "server/security/memberSession.ts"), "utf8");
const scheduler = readFileSync(resolve(process.cwd(), "server/scheduled/membershipExpiry.ts"), "utf8");
const reminderScheduler = readFileSync(resolve(process.cwd(), "server/scheduled/membershipReminder.ts"), "utf8");
const reminderEmail = readFileSync(resolve(process.cwd(), "server/email/memberActivation.ts"), "utf8");
const server = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");
const memberPortal = readFileSync(resolve(process.cwd(), "client/src/pages/MemberSidebarDashboard.tsx"), "utf8");

describe("membership expiry automation", () => {
  it("stores private membership-cycle history and the schedule configuration separately", () => {
    expect(schema).toContain('mysqlTable("member_membership_cycles"');
    expect(schema).toContain('mysqlTable("membership_expiry_automation"');
    expect(schema).toContain('scheduleCronTaskUid');
    expect(schema).toContain('member_membership_cycles_member_cycle_unique');
  });

  it("expires active annual memberships idempotently and preserves history", () => {
    expect(database).toContain("expireMemberIfDue");
    expect(database).toContain("expireDueMemberships");
    expect(database).toContain('status: "expired", accountStatus: "inactive"');
    expect(database).toContain("listMemberMembershipCycles");
    expect(memberSession).toContain("await expireMemberIfDue(member)");
  });

  it("reactivates the matching expired account rather than allocating a duplicate", () => {
    expect(database).toContain("Membership renewal identity did not match.");
    expect(database).toContain("verifiedPanHash !== input.application.panHash");
    expect(schema).toContain('panHash: varchar("panHash", { length: 64 })');
    expect(database).toContain("isRenewal: true");
    expect(database).toContain("has started a renewed membership cycle.");
    expect(membershipRouter).toContain("activation.isRenewal");
    expect(membershipRouter).toContain('activationEmailStatus: "not_required"');
  });

  it("keeps history member-scoped and mounts a cron-only daily handler", () => {
    expect(memberRouter).toContain("membershipHistory: memberProcedure");
    expect(memberPortal).toContain("Membership & activity history");
    expect(memberPortal).toContain("Your AASW journey, in one place.");
    expect(scheduler).toContain('if (!user.isCron || !user.taskUid)');
    expect(scheduler).toContain("expireDueMemberships");
    expect(server).toContain('app.post("/api/scheduled/membership-expiry", handleMembershipExpirySchedule)');
  });

  it("adds a separate idempotent seven-day reminder path and member-visible expiry/activity UI", () => {
    expect(schema).toContain('mysqlTable("member_expiry_reminders"');
    expect(schema).toContain('mysqlTable("membership_reminder_automation"');
    expect(database).toContain("claimSevenDayExpiryReminderCandidates");
    expect(schema).toContain("member_expiry_reminders_cycle_type_unique");
    expect(database).toContain("existing.deliveryStatus === \"sent\" || existing.attempts >= 3");
    expect(reminderEmail).toContain("Your Membership Expires in 7 Days");
    expect(reminderScheduler).toContain("getMembershipReminderAutomationByTaskUid");
    expect(reminderScheduler).toContain("dispatchMemberExpiryReminderEmail");
    expect(server).toContain('app.post("/api/scheduled/membership-reminder", handleMembershipReminderSchedule)');
    expect(memberPortal).toContain("MEMBERSHIP COUNTDOWN");
    expect(memberPortal).toContain("Membership & activity history");
    expect(memberPortal).toContain("Your AASW journey, in one place.");
  });

  it("adds one idempotent post-grace follow-up email after annual renewal grace concludes", () => {
    expect(schema).toContain('["seven_day", "post_grace"]');
    expect(database).toContain("claimPostGraceRenewalFollowUpCandidates");
    expect(database).toContain('eq(memberMembershipCycles.status, "expired")');
    expect(database).toContain("daysSinceExpiry < 3");
    expect(reminderEmail).toContain("Renew Your Membership to Restore Portal Access");
    expect(reminderScheduler).toContain("dispatchMemberPostGraceFollowUpEmail");
    expect(reminderScheduler).toContain("postGraceEligibleCount");
  });

  it("defers annual membership deactivation until the three-day renewal grace window has ended", () => {
    expect(database).toContain("validity.portalAccessStatus !== \"expired\"");
    expect(memberRouter).toContain("portalAccessStatus");
    expect(memberRouter).toContain("graceEndsOn");
  });
});
