import nodemailer from "nodemailer";
import type { PaymentRefund, PaymentTransaction } from "../../drizzle/schema";

type RefundNotificationInput = {
  transaction: Pick<PaymentTransaction, "receipt" | "supporterName" | "supporterEmail" | "amount" | "kind">;
  refund: Pick<PaymentRefund, "refundRef" | "amount" | "reason">;
};

type RefundMail = { to: string; subject: string; text: string; html: string };
type RefundDispatchDependencies = { deliver: (mail: RefundMail) => Promise<{ messageId?: string }> };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function formatAmount(amountInPaise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amountInPaise / 100);
}

export function createRefundProcessedMail(input: RefundNotificationInput): RefundMail {
  const { transaction, refund } = input;
  const label = transaction.kind === "membership" ? "membership contribution" : "donation";
  const refundedAmount = formatAmount(refund.amount);
  const originalAmount = formatAmount(transaction.amount);
  const safeName = escapeHtml(transaction.supporterName);
  const safeReason = refund.reason ? escapeHtml(refund.reason) : "at the Foundation's discretion";

  return {
    to: transaction.supporterEmail,
    subject: `AASW Foundation refund processed · ${refund.refundRef}`,
    text: `Dear ${transaction.supporterName},\n\nA refund of ${refundedAmount} has been processed for your ${label} (receipt ${transaction.receipt}, original amount ${originalAmount}).\n\nRefund reference: ${refund.refundRef}\nReason: ${refund.reason ?? "Not specified"}\n\nThe amount will be returned to the original payment method, usually within 5-7 working days depending on your bank.\n\nAASW Foundation`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:640px;margin:0 auto;padding:32px 20px"><section style="border-top:7px solid #2f6b52;background:#fffaf0;padding:34px 32px"><p style="margin:0 0 22px;color:#2f6b52;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">AASW Foundation · refund confirmation</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:32px;font-weight:400;line-height:1.1">A refund has been processed.</h1><p style="margin:22px 0 0;color:#5c4b47;font-size:16px;line-height:1.7">Dear ${safeName}, a refund for your ${escapeHtml(label)} has been processed and is on its way back to your original payment method.</p><div style="margin:28px 0;padding:20px;border:1px solid #d8cfc4;background:#fffdf7"><p style="margin:0 0 6px;color:#796966;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Refund reference</p><p style="margin:0;color:#2f6b52;font-family:Georgia,serif;font-size:22px">${escapeHtml(refund.refundRef)}</p><table role="presentation" style="width:100%;margin-top:22px;border-collapse:collapse"><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966;font-size:13px">Original receipt</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#291d1d;font-size:13px;text-align:right">${escapeHtml(transaction.receipt)}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966;font-size:13px">Original amount</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#291d1d;font-size:13px;text-align:right">${escapeHtml(originalAmount)}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966;font-size:13px">Refunded amount</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#291d1d;font-size:16px;font-weight:700;text-align:right">${escapeHtml(refundedAmount)}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966;font-size:13px">Reason</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#291d1d;font-size:13px;text-align:right">${safeReason}</td></tr></table></div><p style="margin:0;color:#5c4b47;font-size:14px;line-height:1.65">Bank settlement usually completes within 5-7 working days. For any question, reply to this email or write to <a href="mailto:aaswfoundation06@gmail.com" style="color:#2f6b52">aaswfoundation06@gmail.com</a>.</p></section><p style="margin:18px 0 0;color:#796966;font-size:12px;line-height:1.5">AASW Foundation · Aapka Apna Social Welfare Foundation</p></main></body></html>`,
  };
}

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!host || !port || !user || !pass) throw new Error("Refund notification sender is not configured.");
  return { host, port, user, pass };
}

async function deliverWithFoundationGmail(mail: RefundMail) {
  const smtp = smtpConfig();
  const transport = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: smtp.port !== 465, auth: { user: smtp.user, pass: smtp.pass } });
  return transport.sendMail({ from: { name: "AASW Foundation", address: smtp.user }, replyTo: smtp.user, ...mail });
}

export type RefundNotificationResult = "sent" | { status: "failed"; error: string };

export async function dispatchRefundProcessedEmail(input: RefundNotificationInput, dependencies: RefundDispatchDependencies = { deliver: deliverWithFoundationGmail }): Promise<RefundNotificationResult> {
  try {
    await dependencies.deliver(createRefundProcessedMail(input));
    return "sent" as const;
  } catch (error) {
    return { status: "failed" as const, error: error instanceof Error ? error.message : "Unknown refund notification error." };
  }
}
