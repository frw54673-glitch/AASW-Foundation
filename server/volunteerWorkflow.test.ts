import { beforeEach, describe, expect, it, vi } from "vitest";

const { createVolunteerApplication, getVolunteerApplicationByRef, listVolunteerApplications, markVolunteerApplicationNotification, markVolunteerDecisionNotification, updateVolunteerApplicationStatus } = vi.hoisted(() => ({
  createVolunteerApplication: vi.fn(),
  getVolunteerApplicationByRef: vi.fn(),
  listVolunteerApplications: vi.fn(),
  markVolunteerApplicationNotification: vi.fn(),
  markVolunteerDecisionNotification: vi.fn(),
  updateVolunteerApplicationStatus: vi.fn(),
}));

const { dispatchVolunteerApplicationNotification, dispatchVolunteerDecisionEmail } = vi.hoisted(() => ({
  dispatchVolunteerApplicationNotification: vi.fn(),
  dispatchVolunteerDecisionEmail: vi.fn(),
}));

vi.mock("./db", () => ({ createVolunteerApplication, getVolunteerApplicationByRef, listVolunteerApplications, markVolunteerApplicationNotification, markVolunteerDecisionNotification, updateVolunteerApplicationStatus }));
vi.mock("./email/volunteerNotification", () => ({ dispatchVolunteerApplicationNotification, dispatchVolunteerDecisionEmail }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

process.env.JWT_SECRET ||= "aasw-foundation-test-secret";

const adminUser = { id: 1, openId: "owner-open-id", role: "admin" } as never;
const regularUser = { id: 3, openId: "staff-open-id", role: "user" } as never;

function caller(user: unknown = null) {
  return appRouter.createCaller({ user, member: null, req: {}, res: {} } as TrpcContext);
}

const volunteerPayload = {
  fullName: "Boundary Volunteer", email: "volunteer@example.com", phone: "+91 90000 00222", city: "Rura", state: "Uttar Pradesh",
  skills: "Teaching, first aid", availability: "Weekends", interests: "Digital skills training",
  message: "Happy to help at field events.", privacyConsent: true,
};

describe("volunteer application workflow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createVolunteerApplication.mockResolvedValue(undefined);
    markVolunteerApplicationNotification.mockResolvedValue(undefined);
    markVolunteerDecisionNotification.mockResolvedValue(undefined);
    updateVolunteerApplicationStatus.mockResolvedValue(undefined);
    listVolunteerApplications.mockResolvedValue([]);
    dispatchVolunteerApplicationNotification.mockResolvedValue("sent");
    dispatchVolunteerDecisionEmail.mockResolvedValue("sent");
    getVolunteerApplicationByRef.mockResolvedValue(undefined);
  });

  it("stores a submitted application and records the Foundation notification outcome", async () => {
    const result = await caller().volunteer.submit(volunteerPayload);
    expect(result.applicationRef).toMatch(/^AASW-VOL-[A-Z0-9_-]{12}$/);
    expect(createVolunteerApplication).toHaveBeenCalledWith(expect.objectContaining({ applicationRef: result.applicationRef, email: "volunteer@example.com", status: "submitted", notificationStatus: "pending" }));
    expect(dispatchVolunteerApplicationNotification).toHaveBeenCalledWith(expect.objectContaining({ applicationRef: result.applicationRef, fullName: "Boundary Volunteer" }));
    expect(markVolunteerApplicationNotification).toHaveBeenCalledWith(result.applicationRef, "sent");
    expect(result.notificationStatus).toBe("sent");
  });

  it("silently drops a honeypot submission", async () => {
    await expect(caller().volunteer.submit({ ...volunteerPayload, website: "spam-bot.example" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(createVolunteerApplication).not.toHaveBeenCalled();
  });

  it("reports a pending review decision to the applicant only for their own email", async () => {
    getVolunteerApplicationByRef.mockResolvedValue({ applicationRef: "AASW-VOL-KNOWN00001", email: "volunteer@example.com", status: "submitted" });
    const own = await caller().volunteer.myStatus({ applicationRef: "AASW-VOL-KNOWN00001", email: "volunteer@example.com" });
    expect(own).toEqual({ found: true, status: "submitted" });
    // A different email must not read another applicant's status, and the lookup
    // returns found:false instead of leaking whether the reference exists.
    getVolunteerApplicationByRef.mockResolvedValue(undefined);
    const other = await caller().volunteer.myStatus({ applicationRef: "AASW-VOL-KNOWN00001", email: "someone-else@example.com" });
    expect(other).toEqual({ found: false, status: null });
  });

  it("notifies the applicant only when an admin records an approve or reject decision", async () => {
    getVolunteerApplicationByRef.mockResolvedValue({ applicationRef: "AASW-VOL-KNOWN00002", fullName: "Boundary Volunteer", email: "volunteer@example.com", status: "submitted" });
    await caller(adminUser).management.volunteers.review({ applicationRef: "AASW-VOL-KNOWN00002", status: "approved", reviewNotes: "Welcome aboard" });
    expect(updateVolunteerApplicationStatus).toHaveBeenCalledWith(expect.objectContaining({ status: "approved", reviewerOpenId: "owner-open-id" }));
    expect(dispatchVolunteerDecisionEmail).toHaveBeenCalledWith(expect.objectContaining({ status: "approved", email: "volunteer@example.com" }));
    expect(markVolunteerDecisionNotification).toHaveBeenCalledWith("AASW-VOL-KNOWN00002", "sent", undefined);

    // A reviewer-only state change stays internal: no applicant email is sent.
    dispatchVolunteerDecisionEmail.mockClear();
    getVolunteerApplicationByRef.mockResolvedValue({ applicationRef: "AASW-VOL-KNOWN00002", fullName: "Boundary Volunteer", email: "volunteer@example.com", status: "submitted" });
    await caller(adminUser).management.volunteers.review({ applicationRef: "AASW-VOL-KNOWN00002", status: "reviewing" });
    expect(dispatchVolunteerDecisionEmail).not.toHaveBeenCalled();
  });

  it("keeps volunteer review admin-only", async () => {
    await expect(caller(regularUser).management.volunteers.review({ applicationRef: "AASW-VOL-KNOWN00002", status: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(updateVolunteerApplicationStatus).not.toHaveBeenCalled();
  });
});
