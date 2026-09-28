import nodemailer from "nodemailer";

// Payout status emails keep the member in the loop when their completion
// report moves through the Foundation's verification pipeline: verified
// (payment details shared) and paid (settlement recorded with a reference).
// Sensitive payout destinations (UPI id, bank account) are never included in
// the email body — the member portal is the only place they are displayed.

type PayoutStatus = "verified" | "paid";

type MemberPayoutEmailInput = {
  fullName: string;
  email: string;
  membershipNo: string;
  completionRef: string;
  status: PayoutStatus;
  amountInPaise: number;
  payoutNote?: string | null;
  payoutReference?: string | null;
  dashboardUrl: string;
};

type DeliveryDependencies = {
  deliver: (mail: { to: string; subject: string; text: string; html: string }) => Promise<{ messageId?: string }>;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function formatRupees(amountInPaise: number) {
  return `₹${(amountInPaise / 100).toLocaleString("en-IN")}`;
}

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!host || !port || !user || !pass) throw new Error("Foundation member email sender is not configured.");
  return { host, port, user, pass };
}

async function deliverWithFoundationGmail(mail: { to: string; subject: string; text: string; html: string }) {
  const smtp = smtpConfig();
  const transport = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: smtp.port !== 465, auth: { user: smtp.user, pass: smtp.pass } });
  return transport.sendMail({ from: { name: "AASW Foundation", address: smtp.user }, replyTo: smtp.user, ...mail });
}

function emailCopy(status: PayoutStatus, input: MemberPayoutEmailInput) {
  if (status === "verified") {
    return {
      subject: `Programme payout approved · ${input.completionRef}`,
      heading: "Your payout is approved.",
      intro: "Your programme completion report has been verified by the Foundation. The approved amount will be settled to the payout destination you shared with your report.",
      rows: [
        ["Completion reference", input.completionRef],
        ["Approved amount", formatRupees(input.amountInPaise)],
        ...(input.payoutNote ? [["Foundation note", input.payoutNote]] : []),
      ],
      footer: "You can review the payment details in the Member Portal. The settlement reference will be shared once the transfer completes.",
    };
  }
  return {
    subject: `Programme payout settled · ${input.completionRef}`,
    heading: "Your payout has been settled.",
    intro: "The Foundation has recorded your programme payout as settled to the payout destination you shared with your completion report.",
    rows: [
      ["Completion reference", input.completionRef],
      ["Settled amount", formatRupees(input.amountInPaise)],
      ...(input.payoutReference ? [["Settlement reference", input.payoutReference]] : []),
    ],
    footer: "Download your payout receipt from the Membership history section of the Member Portal for your records.",
  };
}

export function createMemberPayoutStatusEmail(input: MemberPayoutEmailInput) {
  const copy = emailCopy(input.status, input);
  const safe = {
    fullName: escapeHtml(input.fullName),
    membershipNo: escapeHtml(input.membershipNo),
    dashboardUrl: escapeHtml(input.dashboardUrl),
    heading: escapeHtml(copy.heading),
    intro: escapeHtml(copy.intro),
    footer: escapeHtml(copy.footer),
    rows: copy.rows.map(([label, value]) => [escapeHtml(label), escapeHtml(value)] as const),
  };
  const textBody = `Dear ${input.fullName},\n\n${copy.intro}\n\n${copy.rows.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\n${copy.footer}\n\nOpen your Member Portal: ${input.dashboardUrl}\n\nAASW Foundation\nDo not reply to this email.`;
  const htmlBody = `<!doctype html><html lang="en"><body style="margin:0;background:#f6f0e6;color:#291d1d;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f0e6"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#fffdf7;border:1px solid #e5ddd4"><tr><td style="padding:22px 30px;background:#174c3c"><p style="margin:0;color:#eac06e;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase">AASW Foundation</p><p style="margin:4px 0 0;color:#ffffff;font-size:14px;font-weight:700;letter-spacing:.4px">Programme payout update</p></td></tr><tr><td style="padding:34px 30px 30px"><h1 style="margin:0 0 16px;color:#291d1d;font-family:Georgia,serif;font-size:32px;font-weight:400;line-height:1.15">${safe.heading}</h1><p style="margin:0 0 22px;color:#584744;font-size:15px;line-height:1.7">${safe.intro}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf0;border-left:4px solid #d4820a">${safe.rows.map(([label, value]) => `<tr><td style="padding:13px 18px;border-bottom:1px solid #eee3d3"><p style="margin:0;color:#796966;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">${label}</p><p style="margin:5px 0 0;color:#291d1d;font-size:17px;font-weight:700">${value}</p></td></tr>`).join("")}</table><p style="margin:22px 0 0;color:#796966;font-size:12px;line-height:1.65">${safe.footer}</p><table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px"><tr><td><a href="${safe.dashboardUrl}" style="display:inline-block;padding:14px 18px;background:#174c3c;color:#fffdf7;font-size:13px;font-weight:700;text-decoration:none">Open Member Portal</a></td></tr></table></td></tr><tr><td style="padding:22px 30px;background:#f0e7d8;border-top:1px solid #e2d7c8"><p style="margin:0;color:#5b4c47;font-size:11px;line-height:1.6">AASW Foundation · Rura, Kanpur Dehat, Uttar Pradesh 209303</p><p style="margin:10px 0 0;color:#796966;font-size:10px">This is an automated programme update; please do not reply.</p></td></tr></table></td></tr></table></body></html>`;
  return { subject: copy.subject, text: textBody, html: htmlBody };
}

export async function dispatchMemberPayoutStatusEmail(input: MemberPayoutEmailInput, dependencies: DeliveryDependencies = { deliver: deliverWithFoundationGmail }) {
  const message = createMemberPayoutStatusEmail(input);
  try {
    await dependencies.deliver({ to: input.email, ...message });
    return "sent" as const;
  } catch (error) {
    return { status: "failed" as const, error: error instanceof Error ? error.message : "Unknown notification error." };
  }
}
