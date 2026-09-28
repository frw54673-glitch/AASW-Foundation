import { jsPDF } from "jspdf";

export type MemberPaymentReceiptData = {
  receipt: string;
  kind: "donation" | "membership" | "payout";
  amount: number;
  currency: string;
  status: string;
  supporterName: string;
  createdAt: Date | string;
  payoutMethod?: "upi" | "bank_transfer" | "other" | null;
  payoutDestination?: string | null;
  programme?: string | null;
  gatewayPaymentId?: string | null;
};

export function memberPaymentReceiptFileName(receipt: string) {
  return `AASW-Receipt-${receipt.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
}

export function memberPaymentReceiptTitle(kind: MemberPaymentReceiptData["kind"]) {
  if (kind === "membership") return "Membership contribution receipt";
  if (kind === "payout") return "Programme payout receipt";
  return "Donation receipt";
}

export function memberPaymentReceiptSubtitle(kind: MemberPaymentReceiptData["kind"]) {
  if (kind === "membership") return "Thank you for your";
  if (kind === "payout") return "Your programme payout";
  return "Thank you for your";
}

export function memberPaymentReceiptHeadline(kind: MemberPaymentReceiptData["kind"]) {
  if (kind === "membership") return "verified contribution.";
  if (kind === "payout") return "has been settled.";
  return "verified contribution.";
}

export function formatReceiptAmount(amountInPaise: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amountInPaise / 100);
}

export function downloadMemberPaymentReceiptPdf(data: MemberPaymentReceiptData) {
  const paidOn = new Date(data.createdAt);
  const dateLabel = Number.isNaN(paidOn.getTime()) ? "Recorded by AASW" : paidOn.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  pdf.setFillColor(47, 107, 82);
  pdf.rect(0, 0, 210, 44, "F");
  pdf.setTextColor(255, 253, 247);
  pdf.setFont("times", "bold");
  pdf.setFontSize(24);
  pdf.text("AASW Foundation", 20, 23);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text(memberPaymentReceiptTitle(data.kind).toUpperCase(), 20, 32);

  pdf.setTextColor(41, 29, 29);
  pdf.setFont("times", "bold");
  pdf.setFontSize(23);
  pdf.text(memberPaymentReceiptSubtitle(data.kind), 20, 68);
  pdf.text(memberPaymentReceiptHeadline(data.kind), 20, 78);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10.5);
  pdf.setTextColor(91, 76, 71);
  pdf.text(data.kind === "payout"
    ? "This receipt records a payout the Foundation settled to the destination you shared with your completion report."
    : "This receipt records a server-verified payment. Only payments your member account owns are available here.", 20, 91, { maxWidth: 165 });

  pdf.setDrawColor(47, 107, 82);
  pdf.setFillColor(247, 243, 234);
  pdf.roundedRect(20, 106, 170, 70, 2, 2, "FD");
  pdf.setTextColor(47, 107, 82);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("RECEIPT REFERENCE", 30, 122);
  pdf.text(data.kind === "payout" ? "AMOUNT SETTLED" : "AMOUNT RECEIVED", 30, 143);
  pdf.text("PAYMENT STATUS", 30, 164);
  pdf.setTextColor(41, 29, 29);
  pdf.setFontSize(14);
  pdf.text(data.receipt, 30, 132);
  pdf.text(formatReceiptAmount(data.amount, data.currency), 30, 153);
  pdf.setFontSize(12);
  pdf.text(data.status, 30, 174);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(91, 76, 71);
  pdf.text(data.kind === "payout" ? `Settled on: ${dateLabel}` : `Paid on: ${dateLabel}`, 30, 190);

  if (data.kind === "payout") {
    const methodLabel = data.payoutMethod === "upi" ? "UPI transfer" : data.payoutMethod === "bank_transfer" ? "Bank transfer" : data.payoutMethod === "other" ? "Foundation transfer" : "Foundation transfer";
    pdf.setTextColor(47, 107, 82);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("Payout settlement record", 20, 208);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(91, 76, 71);
    pdf.setFontSize(9.5);
    // The settlement block stacks rows dynamically so the programme line can
    // sit between method and destination without ever colliding on wrap.
    let payoutY = 218;
    pdf.text(`Method: ${methodLabel}${data.gatewayPaymentId ? `   ·   Reference: ${data.gatewayPaymentId}` : ""}`, 20, payoutY, { maxWidth: 170 });
    payoutY += 9;
    if (data.programme) {
      pdf.text(`Programme: ${data.programme.replace(/\b\w/g, character => character.toUpperCase())}`, 20, payoutY, { maxWidth: 170 });
      payoutY += 9;
    }
    if (data.payoutDestination) pdf.text(`Sent to: ${data.payoutDestination}`, 20, payoutY, { maxWidth: 170 });

    pdf.setDrawColor(212, 130, 10);
    pdf.line(20, payoutY + 8, 190, payoutY + 8);
    pdf.setTextColor(91, 76, 71);
    pdf.setFontSize(7.5);
    pdf.text("Payout destination is shown masked for your security. Quote the receipt reference for any settlement query.", 20, payoutY + 17, { maxWidth: 170 });
  } else {
    pdf.setTextColor(47, 107, 82);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("Questions about this receipt", 20, 208);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(91, 76, 71);
    pdf.setFontSize(9.5);
    pdf.text("Write to aaswfoundation06@gmail.com quoting the receipt reference above.", 20, 218, { maxWidth: 165 });

    pdf.setDrawColor(212, 130, 10);
    pdf.line(20, 232, 190, 232);
    pdf.setTextColor(91, 76, 71);
    pdf.setFontSize(7.5);
    pdf.text("This receipt is issued to the paying member account. No PAN or identity-document information is included.", 20, 241, { maxWidth: 170 });
  }
  pdf.save(memberPaymentReceiptFileName(data.receipt));
}
