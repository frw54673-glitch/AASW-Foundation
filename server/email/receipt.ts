import nodemailer from "nodemailer";
import type { PaymentTransaction } from "../../drizzle/schema";
import { claimPaymentReceiptDelivery, markPaymentReceiptFailed, markPaymentReceiptSent } from "../db";

type ReceiptDeliveryResult = "sent" | "skipped" | "failed";

type ReceiptMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type ReceiptDispatchDependencies = {
  claim: (receipt: string) => Promise<boolean>;
  markSent: (receipt: string, messageId: string) => Promise<void>;
  markFailed: (receipt: string, message: string) => Promise<void>;
  deliver: (mail: ReceiptMail) => Promise<{ messageId?: string }>;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function formatAmount(amountInPaise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amountInPaise / 100);
}

function isVerifiedTransaction(transaction: PaymentTransaction) {
  return transaction.status === "verified" || transaction.status === "captured";
}

export function isReceiptEligible(transaction: PaymentTransaction) {
  return isVerifiedTransaction(transaction) && transaction.receiptDeliveryStatus === "pending";
}

export function createDonationReceiptMail(transaction: PaymentTransaction): ReceiptMail {
  const label = transaction.kind === "membership" ? "membership contribution" : "donation";
  const amount = formatAmount(transaction.amount);
  const createdOn = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(transaction.createdAt);
  const supporterName = escapeHtml(transaction.supporterName);
  const receipt = escapeHtml(transaction.receipt);
  const safeAmount = escapeHtml(amount);

  return {
    to: transaction.supporterEmail,
    subject: `AASW Foundation receipt · ${transaction.receipt}`,
    text: `Dear ${transaction.supporterName},\n\nThank you for your ${label} to AASW Foundation.\n\nReceipt reference: ${transaction.receipt}\nAmount received: ${amount}\nDate: ${createdOn}\n\nThis receipt confirms your verified payment. For support, reply to this email or write to aaswfoundation06@gmail.com.\n\nAASW Foundation`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:640px;margin:0 auto;padding:32px 20px"><section style="border-top:7px solid #2f6b52;background:#fffaf0;padding:34px 32px"><p style="margin:0 0 22px;color:#2f6b52;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">AASW Foundation · verified payment receipt</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:34px;font-weight:400;line-height:1.05">Thank you for standing with AASW.</h1><p style="margin:22px 0 0;color:#5c4b47;font-size:16px;line-height:1.7">Dear ${supporterName}, your ${label} has been verified. This email is your payment receipt.</p><div style="margin:28px 0;padding:20px;border:1px solid #d8cfc4;background:#fffdf7"><p style="margin:0 0 6px;color:#796966;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Receipt reference</p><p style="margin:0;color:#2f6b52;font-family:Georgia,serif;font-size:24px">${receipt}</p><table role="presentation" style="width:100%;margin-top:22px;border-collapse:collapse"><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966;font-size:13px">Amount received</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#291d1d;font-size:16px;font-weight:700;text-align:right">${safeAmount}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966;font-size:13px">Payment date</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#291d1d;font-size:13px;text-align:right">${escapeHtml(createdOn)}</td></tr></table></div><p style="margin:0;color:#5c4b47;font-size:14px;line-height:1.65">For a question about this receipt, reply to this email or write to <a href="mailto:aaswfoundation06@gmail.com" style="color:#2f6b52">aaswfoundation06@gmail.com</a>.</p></section><p style="margin:18px 0 0;color:#796966;font-size:12px;line-height:1.5">AASW Foundation · Aapka Apna Social Welfare Foundation</p></main></body></html>`,
  };
}

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!host || !port || !user || !pass) throw new Error("SMTP receipt sender is not configured.");
  return { host, port, user, pass };
}

async function deliverWithFoundationGmail(mail: ReceiptMail) {
  const smtp = smtpConfig();
  const transport = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: smtp.port !== 465, auth: { user: smtp.user, pass: smtp.pass } });
  return transport.sendMail({ from: { name: "AASW Foundation", address: smtp.user }, replyTo: smtp.user, ...mail });
}

export async function dispatchVerifiedPaymentReceipt(transaction: PaymentTransaction, dependencies: ReceiptDispatchDependencies = {
  claim: claimPaymentReceiptDelivery,
  markSent: markPaymentReceiptSent,
  markFailed: markPaymentReceiptFailed,
  deliver: deliverWithFoundationGmail,
}): Promise<ReceiptDeliveryResult> {
  if (!isReceiptEligible(transaction)) return "skipped";
  if (!await dependencies.claim(transaction.receipt)) return "skipped";

  try {
    const delivery = await dependencies.deliver(createDonationReceiptMail(transaction));
    await dependencies.markSent(transaction.receipt, delivery.messageId ?? "smtp-message-id-unavailable");
    return "sent";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown receipt delivery error.";
    await dependencies.markFailed(transaction.receipt, message);
    return "failed";
  }
}
