import { describe, expect, it } from "vitest";
import { formatReceiptAmount, memberPaymentReceiptFileName, memberPaymentReceiptTitle } from "../client/src/lib/memberPaymentReceiptPdf";

describe("member payment receipt PDF download", () => {
  it("creates a safe, receipt-specific filename", () => {
    expect(memberPaymentReceiptFileName("AASW-DON-ABCD1234EFGH56")).toBe("AASW-Receipt-AASW-DON-ABCD1234EFGH56.pdf");
    expect(memberPaymentReceiptFileName("AASW/2026 BAD")).toBe("AASW-Receipt-AASW2026BAD.pdf");
  });

  it("labels the receipt by contribution kind", () => {
    expect(memberPaymentReceiptTitle("donation")).toBe("Donation receipt");
    expect(memberPaymentReceiptTitle("membership")).toBe("Membership contribution receipt");
  });

  it("formats paise amounts as rupees", () => {
    expect(formatReceiptAmount(110_000)).toBe("₹1,100");
    expect(formatReceiptAmount(200_000, "INR")).toBe("₹2,000");
  });
});
