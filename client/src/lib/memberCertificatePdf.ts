import { jsPDF } from "jspdf";
import { formatIndianDate } from "@shared/mis";

export const officialCertificateTemplateUrl = "/manus-storage/aasw-membership-certificate-template_2b60e51a.png";

export type MemberCertificatePdfData = {
  fullName: string;
  membershipNo: string;
  membershipTypeLabel: string;
  joiningDate: Date | string;
  expiresOn: Date | string | null;
};

export function memberCertificateFileName(membershipNo: string) {
  return `AASW-Membership-Certificate-${membershipNo.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
}

export function certificateMembershipTerm(membershipTypeLabel: string) {
  return membershipTypeLabel.toLowerCase().includes("lifetime") ? "(Lifetime)" : "(1 Year)";
}

export function certificateIssueDate(joiningDate: Date | string) {
  return formatIndianDate(joiningDate).replaceAll("/", "-");
}

async function templateDataUrl() {
  const response = await fetch(officialCertificateTemplateUrl);
  if (!response.ok) throw new Error("Official certificate template could not be loaded.");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Official certificate template could not be read."));
    reader.readAsDataURL(blob);
  });
}

export async function downloadMemberCertificatePdf(data: MemberCertificatePdfData) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  pdf.addImage(await templateDataUrl(), "PNG", 0, 0, 297, 210, undefined, "FAST");
  pdf.setFillColor(253, 252, 247);
  pdf.rect(24, 69, 48, 15, "F");
  pdf.rect(241, 65, 37, 11, "F");
  pdf.rect(86, 91, 126, 13, "F");
  pdf.setTextColor(41, 41, 41);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text(data.membershipNo, 25, 73.5);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5.5);
  pdf.text(certificateMembershipTerm(data.membershipTypeLabel), 34, 78);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.2);
  pdf.text(certificateIssueDate(data.joiningDate), 274, 73.5, { align: "right" });
  pdf.setFont("times", "italic");
  const nameSize = data.fullName.length > 32 ? 13 : data.fullName.length > 24 ? 16 : 19;
  pdf.setFontSize(nameSize);
  pdf.text(data.fullName, 148.5, 100.5, { align: "center", maxWidth: 120 });
  pdf.save(memberCertificateFileName(data.membershipNo));
}
