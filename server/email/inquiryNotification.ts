import nodemailer from "nodemailer";

export const INQUIRY_TOPICS = ["programmes", "membership", "donation", "partnership", "media", "other"] as const;
type InquiryTopic = (typeof INQUIRY_TOPICS)[number];

type InquiryNotificationInput = { inquiryRef: string; fullName: string; email: string; phone: string; topic: InquiryTopic; message: string };
type NotificationDependencies = { deliver: (mail: { to: string; subject: string; text: string; html: string }) => Promise<{ messageId?: string }> };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function topicLabel(topic: InquiryTopic) {
  return ({ programmes: "Programmes", membership: "Membership", donation: "Donation", partnership: "Partnership", media: "Media or information", other: "Other" })[topic];
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

export function createInquiryNotification(input: InquiryNotificationInput) {
  const label = topicLabel(input.topic);
  const body = `A new website inquiry has been received.\n\nInquiry reference: ${input.inquiryRef}\nName: ${input.fullName}\nEmail: ${input.email}\nPhone: ${input.phone}\nTopic: ${label}\n\nMessage:\n${input.message}`;
  const safe = { inquiryRef: escapeHtml(input.inquiryRef), fullName: escapeHtml(input.fullName), email: escapeHtml(input.email), phone: escapeHtml(input.phone), topic: escapeHtml(label), message: escapeHtml(input.message).replace(/\n/g, "<br/>") };
  return {
    subject: `New website inquiry · ${input.inquiryRef}`,
    text: body,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:620px;margin:0 auto;padding:30px 20px"><section style="border-top:6px solid #2f6b52;background:#fffaf0;padding:30px"><p style="margin:0 0 14px;color:#2f6b52;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">AASW Foundation · Website inquiry</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:30px;font-weight:400">A new message has arrived.</h1><table role="presentation" style="width:100%;margin-top:24px;border-collapse:collapse"><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Reference</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right;font-weight:700">${safe.inquiryRef}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">From</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.fullName}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Contact</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.email}<br/>${safe.phone}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Topic</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.topic}</td></tr></table><div style="margin-top:22px;padding:16px;background:#f7f3ea"><p style="margin:0 0 8px;color:#796966;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Message</p><p style="margin:0;color:#291d1d;font-size:14px;line-height:1.7">${safe.message}</p></div></section></main></body></html>`,
  };
}

export async function dispatchInquiryNotification(input: InquiryNotificationInput, dependencies: NotificationDependencies = { deliver: deliverWithFoundationGmail }) {
  try {
    const smtp = smtpConfig();
    await dependencies.deliver({ to: smtp.user, ...createInquiryNotification(input) });
    return "sent" as const;
  } catch (error) {
    return { status: "failed" as const, error: error instanceof Error ? error.message : "Unknown notification error." };
  }
}
