import { describe, expect, it, vi } from "vitest";
import { createMemberPayoutStatusEmail, dispatchMemberPayoutStatusEmail } from "./memberPayoutNotification";

const baseInput = {
  fullName: "Sunita Verma",
  email: "sunita.verma@example.com",
  membershipNo: "AASW-2026-0007",
  completionRef: "AASW-CMP-TESTREF99",
  amountInPaise: 450000,
  dashboardUrl: "http://localhost:3000/member/dashboard",
};

describe("createMemberPayoutStatusEmail", () => {
  it("announces a verified payout with the approved amount and reference", () => {
    const mail = createMemberPayoutStatusEmail({ ...baseInput, status: "verified", payoutNote: "Verified after field review." });
    expect(mail.subject).toBe("Programme payout approved · AASW-CMP-TESTREF99");
    expect(mail.text).toContain("Sunita Verma");
    expect(mail.text).toContain("Completion reference: AASW-CMP-TESTREF99");
    expect(mail.text).toContain("Approved amount: ₹4,500");
    expect(mail.text).toContain("Verified after field review.");
    expect(mail.html).toContain("Your payout is approved.");
    expect(mail.html).toContain("₹4,500");
  });

  it("announces a settled payout with the settlement reference", () => {
    const mail = createMemberPayoutStatusEmail({ ...baseInput, status: "paid", payoutReference: "NEFT-SBIN-556677" });
    expect(mail.subject).toBe("Programme payout settled · AASW-CMP-TESTREF99");
    expect(mail.text).toContain("Settled amount: ₹4,500");
    expect(mail.text).toContain("Settlement reference: NEFT-SBIN-556677");
    expect(mail.html).toContain("Your payout has been settled.");
  });

  it("never embeds payout destinations — no UPI handles, account numbers or IFSC codes appear in either body", () => {
    // The module takes no destination fields at all; even if one slipped into
    // an admin note, both bodies must stay free of UPI/IFSC-shaped values.
    for (const status of ["verified", "paid"] as const) {
      const mail = createMemberPayoutStatusEmail({ ...baseInput, status, payoutNote: "Approved after field review.", payoutReference: "NEFT-REF-9911" });
      expect(mail.text).not.toMatch(/[a-z0-9._-]+@[a-z]{2,}/i);
      expect(mail.html).not.toMatch(/[a-z0-9._-]+@[a-z]{2,}/i);
      expect(mail.text).not.toMatch(/\b[A-Z]{4}0[A-Z0-9]{6}\b/);
      expect(mail.html).not.toMatch(/\b[A-Z]{4}0[A-Z0-9]{6}\b/);
      expect(mail.text).not.toMatch(/\b\d{9,20}\b/);
      expect(mail.html).not.toMatch(/\b\d{9,20}\b/);
    }
  });

  it("escapes admin-controlled values before rendering them in the email", () => {
    const mail = createMemberPayoutStatusEmail({ ...baseInput, status: "verified", payoutNote: "<script>bad()</script>" });
    expect(mail.html).toContain("&lt;script&gt;bad()&lt;/script&gt;");
    expect(mail.html).not.toContain("<script>bad()</script>");
  });
});

describe("dispatchMemberPayoutStatusEmail", () => {
  it("delivers through the injected transport and reports success", async () => {
    const deliver = vi.fn().mockResolvedValue({ messageId: "queued-1" });
    const result = await dispatchMemberPayoutStatusEmail({ ...baseInput, status: "paid", payoutReference: "UPI-998877" }, { deliver });
    expect(result).toBe("sent");
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({ to: "sunita.verma@example.com", subject: "Programme payout settled · AASW-CMP-TESTREF99" }));
  });

  it("never throws when delivery fails — the admin mutation must survive", async () => {
    const deliver = vi.fn().mockRejectedValue(new Error("SMTP offline in local dev"));
    const result = await dispatchMemberPayoutStatusEmail({ ...baseInput, status: "verified" }, { deliver });
    expect(result).toEqual({ status: "failed", error: "SMTP offline in local dev" });
  });
});
