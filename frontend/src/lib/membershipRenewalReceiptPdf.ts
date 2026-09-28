import { jsPDF } from "jspdf";

export type MembershipRenewalReceiptData = {
  membershipNo: string;
  applicationRef: string;
  recordedAt: Date | string;
};

export function membershipRenewalReceiptFileName(membershipNo: string) {
  return `AASW-Membership-Renewal-${membershipNo.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
}

export function downloadMembershipRenewalReceiptPdf(data: MembershipRenewalReceiptData) {
  const recordedAt = new Date(data.recordedAt);
  const dateLabel = Number.isNaN(recordedAt.getTime()) ? "Recorded by AASW" : recordedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  pdf.setFillColor(47, 107, 82);
  pdf.rect(0, 0, 210, 44, "F");
  pdf.setTextColor(255, 253, 247);
  pdf.setFont("times", "bold");
  pdf.setFontSize(24);
  pdf.text("AASW Foundation", 20, 23);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("MEMBERSHIP RENEWAL CONFIRMATION", 20, 32);

  pdf.setTextColor(41, 29, 29);
  pdf.setFont("times", "bold");
  pdf.setFontSize(23);
  pdf.text("Your membership renewal", 20, 68);
  pdf.text("has been recorded.", 20, 78);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10.5);
  pdf.setTextColor(91, 76, 71);
  pdf.text("This confirmation keeps a simple record of your successfully submitted annual membership renewal.", 20, 91, { maxWidth: 165 });

  pdf.setDrawColor(47, 107, 82);
  pdf.setFillColor(247, 243, 234);
  pdf.roundedRect(20, 106, 170, 55, 2, 2, "FD");
  pdf.setTextColor(47, 107, 82);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("MEMBERSHIP ID", 30, 122);
  pdf.text("APPLICATION REFERENCE", 30, 143);
  pdf.setTextColor(41, 29, 29);
  pdf.setFontSize(14);
  pdf.text(data.membershipNo, 30, 132);
  pdf.text(data.applicationRef, 30, 153);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(91, 76, 71);
  pdf.text(`Renewal recorded: ${dateLabel}`, 30, 173);

  pdf.setTextColor(47, 107, 82);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("What continues", 20, 192);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(91, 76, 71);
  pdf.setFontSize(9.5);
  pdf.text("Your existing Member ID, account password, profile, projects and membership history continue in the same secure Member Portal.", 20, 202, { maxWidth: 165 });

  pdf.setDrawColor(212, 130, 10);
  pdf.line(20, 228, 190, 228);
  pdf.setTextColor(91, 76, 71);
  pdf.setFontSize(7.5);
  pdf.text("This is a membership renewal confirmation, not a payment receipt. No PAN or identity-document information is included.", 20, 237, { maxWidth: 170 });
  pdf.save(membershipRenewalReceiptFileName(data.membershipNo));
}
