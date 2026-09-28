import nodemailer from "nodemailer";

type MembershipNotificationInput = {
  applicationRef: string;
  fullName: string;
  email: string;
  phone: string;
  district: string;
  state: string;
  membershipType: "annual" | "lifetime";
};

type NotificationDependencies = {
  deliver: (mail: { to: string; subject: string; text: string; html: string }) => Promise<{ messageId?: string }>;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!host || !port || !user || !pass) throw new Error("Foundation notification sender is not configured.");
  return { host, port, user, pass };
}

async function deliverWithFoundationGmail(mail: { to: string; subject: string; text: string; html: string }) {
  const smtp = smtpConfig();
  const transport = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: smtp.port !== 465, auth: { user: smtp.user, pass: smtp.pass } });
  return transport.sendMail({ from: { name: "AASW Foundation", address: smtp.user }, replyTo: smtp.user, ...mail });
}

export function createMembershipApplicationNotification(input: MembershipNotificationInput) {
  const membershipLabel = input.membershipType === "annual" ? "Annual membership" : "Lifetime membership";
  const body = `A new Membership application has been received.\n\nApplication reference: ${input.applicationRef}\nApplicant: ${input.fullName}\nEmail: ${input.email}\nPhone: ${input.phone}\nLocation: ${input.district}, ${input.state}\nMembership path: ${membershipLabel}\n\nSensitive identity details and uploaded proof are not included in this email. Review them only through the protected application records workflow.`;
  const safe = { applicationRef: escapeHtml(input.applicationRef), fullName: escapeHtml(input.fullName), email: escapeHtml(input.email), phone: escapeHtml(input.phone), district: escapeHtml(input.district), state: escapeHtml(input.state), membershipLabel: escapeHtml(membershipLabel) };
  return {
    subject: `New Membership application · ${input.applicationRef}`,
    text: body,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:620px;margin:0 auto;padding:30px 20px"><section style="border-top:6px solid #2f6b52;background:#fffaf0;padding:30px"><p style="margin:0 0 14px;color:#2f6b52;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">AASW Foundation · Membership alert</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:30px;font-weight:400">New application received.</h1><table role="presentation" style="width:100%;margin-top:24px;border-collapse:collapse"><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Reference</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right;font-weight:700">${safe.applicationRef}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Applicant</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.fullName}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Contact</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.email}<br/>${safe.phone}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Location</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.district}, ${safe.state}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Membership</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.membershipLabel}</td></tr></table><p style="margin:22px 0 0;color:#796966;font-size:12px;line-height:1.6">For privacy, PAN and ID-proof information are not included in this email. Review identity documents only through the protected application records workflow.</p></section></main></body></html>`,
  };
}

export async function dispatchMembershipApplicationNotification(input: MembershipNotificationInput, dependencies: NotificationDependencies = { deliver: deliverWithFoundationGmail }) {
  try {
    const smtp = smtpConfig();
    await dependencies.deliver({ to: smtp.user, ...createMembershipApplicationNotification(input) });
    return "sent" as const;
  } catch (error) {
    return { status: "failed" as const, error: error instanceof Error ? error.message : "Unknown notification error." };
  }
}
