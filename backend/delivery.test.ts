import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMisBeneficiary, createMisFieldEvent, createMisOutcome, createMisOutput, createMisTargetAchievement, findDuplicateBeneficiary, getMisDeliverySummary, getNextBeneficiarySequence, getNextFieldEventSequence, listMisBeneficiaries } = vi.hoisted(() => ({ createMisBeneficiary: vi.fn(), createMisFieldEvent: vi.fn(), createMisOutcome: vi.fn(), createMisOutput: vi.fn(), createMisTargetAchievement: vi.fn(), findDuplicateBeneficiary: vi.fn(), getMisDeliverySummary: vi.fn(), getNextBeneficiarySequence: vi.fn(), getNextFieldEventSequence: vi.fn(), listMisBeneficiaries: vi.fn() }));
vi.mock("./db", () => ({ createMisBeneficiary, createMisFieldEvent, createMisOutcome, createMisOutput, createMisTargetAchievement, findDuplicateBeneficiary, getMisDeliverySummary, getNextBeneficiarySequence, getNextFieldEventSequence, listMisBeneficiaries }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "project_manager" | "field_staff" | "monitoring" | "user" | null): TrpcContext { return { user: role ? { id: 1, openId: `${role}-id`, role, name: "MIS user", email: "mis@example.org", loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } : null, req: {}, res: {} } as TrpcContext; }
const beneficiary = { name: "Aditi Sharma", village: "Sadar", gender: "Female", age: 28, phoneNumber: "+91 9999999999", beneficiaryCategory: "Women entrepreneur", projectId: 1, registrationDate: "2026-04-01", status: "active" as const };

describe("MIS Phase 2 delivery router", () => {
  beforeEach(() => { vi.resetAllMocks(); getNextBeneficiarySequence.mockResolvedValue(1); getNextFieldEventSequence.mockResolvedValue(2); findDuplicateBeneficiary.mockResolvedValue([]); createMisBeneficiary.mockResolvedValue(11); createMisFieldEvent.mockResolvedValue(12); createMisTargetAchievement.mockResolvedValue(13); });
  it("creates a persistent-format beneficiary ID and blocks accidental duplicate records", async () => {
    const caller = appRouter.createCaller(context("field_staff"));
    await expect(caller.delivery.beneficiaries.create(beneficiary)).resolves.toMatchObject({ beneficiaryId: expect.stringMatching(/^BEN-\d{4}-0001$/), duplicateFlag: false });
    expect(createMisBeneficiary).toHaveBeenCalledWith(expect.objectContaining({ beneficiaryId: expect.stringMatching(/^BEN-\d{4}-0001$/), createdByOpenId: "field_staff-id", duplicateFlag: 0 }));
    findDuplicateBeneficiary.mockResolvedValue([{ id: 1, beneficiaryId: "BEN-2026-0001", projectId: 1 }]);
    await expect(caller.delivery.beneficiaries.create(beneficiary)).rejects.toBeDefined();
    await expect(caller.delivery.beneficiaries.create({ ...beneficiary, duplicateOverrideReason: "Confirmed different household after field verification." })).resolves.toMatchObject({ duplicateFlag: true });
  });
  it("uses requested roles and calculates achievement percentage server-side", async () => {
    const monitoring = appRouter.createCaller(context("monitoring"));
    await expect(monitoring.delivery.targets.create({ projectId: 1, indicator: "Participants trained", reportingPeriod: "2026 Q1", periodType: "quarterly", monthlyTarget: 0, quarterlyTarget: 100, actualAchievement: 75 })).resolves.toMatchObject({ percentageAchieved: 75, cumulativeAchievement: 75 });
    expect(createMisTargetAchievement).toHaveBeenCalledWith(expect.objectContaining({ percentageAchieved: "75.00", cumulativeAchievement: "75" }));
    await expect(appRouter.createCaller(context("field_staff")).delivery.targets.create({ projectId: 1, indicator: "Participants trained", reportingPeriod: "2026 Q1", periodType: "quarterly", monthlyTarget: 0, quarterlyTarget: 100, actualAchievement: 75 })).rejects.toBeDefined();
  });
  it("creates field events using persistent-format IDs and keeps ordinary users out of delivery APIs", async () => {
    const caller = appRouter.createCaller(context("field_staff"));
    await expect(caller.delivery.events.create({ projectId: 1, eventDate: "2026-04-05", village: "Sadar", locationDetails: "Community resource centre", numParticipants: 25, staffNames: ["Field Lead"], volunteerNames: [], attachmentPaths: [] })).resolves.toMatchObject({ eventId: expect.stringMatching(/^EVT-\d{4}-0002$/) });
    await expect(appRouter.createCaller(context("user")).delivery.beneficiaries.list({ limit: 20 })).rejects.toBeDefined();
  });
});
