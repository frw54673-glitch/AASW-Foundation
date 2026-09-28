import { describe, expect, it, vi } from "vitest";

const { getMemberById, getMemberPaymentReceipt, listMemberPaymentReceiptsWithPayouts } = vi.hoisted(() => ({
  getMemberById: vi.fn(),
  getMemberPaymentReceipt: vi.fn(),
  listMemberPaymentReceiptsWithPayouts: vi.fn(),
}));

vi.mock("./db", () => ({ getMemberById, getMemberPaymentReceipt, listMemberPaymentReceiptsWithPayouts }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function caller(member: unknown) {
  return appRouter.createCaller({ user: null, member, req: {}, res: {} } as TrpcContext);
}

const memberA = { id: 101, membershipNo: "AASW-2026-0001", fullName: "Member A", role: "member" as const, email: "member-a@example.com" };
const memberB = { id: 202, membershipNo: "AASW-2026-0002", fullName: "Member B", role: "member" as const, email: "member-b@example.com" };

describe("member payment receipt ownership", () => {
  it("scopes the receipt list to the authenticated member's own email, never a client-supplied id", async () => {
    getMemberById.mockResolvedValue({ id: memberA.id, email: "member-a@example.com" });
    listMemberPaymentReceiptsWithPayouts.mockResolvedValue([{ receipt: "AASW-DON-AAAA1111BBBB22", status: "captured" }]);

    // The tRPC input is empty: there is no member id or receipt filter to forge.
    await caller(memberA).member.myReceipts();

    // Both scoping keys come from the server-side member record: the email
    // owns gateway payments and the id owns settled programme payouts.
    expect(listMemberPaymentReceiptsWithPayouts).toHaveBeenCalledTimes(1);
    expect(listMemberPaymentReceiptsWithPayouts).toHaveBeenCalledWith("member-a@example.com", memberA.id);
  });

  it("re-checks ownership inside the single-receipt lookup query", async () => {
    getMemberPaymentReceipt.mockResolvedValue(undefined);
    // Member B asks for a receipt that exists, but belongs to member A.
    await expect(caller(memberB).member.receiptStatus({ receipt: "AASW-DON-AAAA1111BBBB22" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(getMemberPaymentReceipt).toHaveBeenCalledWith("AASW-DON-AAAA1111BBBB22", "member-b@example.com");

    getMemberPaymentReceipt.mockResolvedValue({ receipt: "AASW-DON-BBBB3333CCCC44", status: "captured" });
    const own = await caller(memberB).member.receiptStatus({ receipt: "AASW-DON-BBBB3333CCCC44" });
    expect(own).toMatchObject({ receipt: "AASW-DON-BBBB3333CCCC44" });
  });

  it("requires a member session before any receipt access", async () => {
    await expect(caller(null).member.myReceipts()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller(null).member.receiptStatus({ receipt: "AASW-DON-AAAA1111BBBB22" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
