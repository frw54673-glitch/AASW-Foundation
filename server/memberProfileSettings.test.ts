import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMemberById, updateMemberProfileSettings } = vi.hoisted(() => ({ getMemberById: vi.fn(), updateMemberProfileSettings: vi.fn() }));
vi.mock("./db", async importOriginal => ({ ...(await importOriginal<typeof import("./db")>()), getMemberById, updateMemberProfileSettings }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function caller() {
  return appRouter.createCaller({ member: { id: 7, membershipNo: "AASW-2026-0007", fullName: "Member Test", role: "member", email: "member@example.com" }, req: {}, res: {} } as TrpcContext);
}

describe("member profile settings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getMemberById.mockResolvedValue({ id: 7, status: "active", accountStatus: "active" });
    updateMemberProfileSettings.mockResolvedValue(undefined);
  });

  it("updates only the signed-in active member's contact settings and optional Foundation updates preference", async () => {
    await expect(caller().member.updateProfileSettings({ phone: "+91 99841 56418", city: "Rura", district: "Kanpur Dehat", state: "Uttar Pradesh", address: "", foundationUpdatesOptIn: false })).resolves.toEqual({ success: true });
    expect(updateMemberProfileSettings).toHaveBeenCalledWith(7, expect.objectContaining({ foundationUpdatesOptIn: false, district: "Kanpur Dehat" }));
  });

  it("rejects invalid phone data before a member update is persisted", async () => {
    await expect(caller().member.updateProfileSettings({ phone: "bad", city: "Rura", district: "Kanpur Dehat", state: "Uttar Pradesh", address: "", foundationUpdatesOptIn: true })).rejects.toBeDefined();
    expect(updateMemberProfileSettings).not.toHaveBeenCalled();
  });
});
