import nodemailer from "nodemailer";

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!host || !port || !user || !pass) return null;
  return { host, port, user, pass };
}

export async function dispatchNewsletterWelcomeEmail(email: string): Promise<"sent" | "skipped" | "failed"> {
  const smtp = smtpConfig();
  if (!smtp) return "skipped";
  try {
    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      requireTLS: smtp.port !== 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await transport.sendMail({
      from: { name: "AASW Foundation", address: smtp.user },
      replyTo: smtp.user,
      to: email,
      subject: "Welcome to AASW Foundation Updates",
      text: "Thank you for subscribing to AASW Foundation updates.\n\nWe will share field stories, programme updates, and community milestones directly to your inbox.\n\nAASW Foundation\nRura, Kanpur Dehat, Uttar Pradesh 209303",
      html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:620px;margin:0 auto;padding:30px 20px"><section style="border-top:6px solid #2f6b52;background:#fffaf0;padding:30px"><p style="margin:0 0 14px;color:#2f6b52;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">AASW Foundation · Newsletter</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:28px;font-weight:400">You’re subscribed.</h1><p style="margin:18px 0 0;color:#584744;font-size:15px;line-height:1.7">Thank you for subscribing to AASW Foundation updates. We will share field updates, women-led enterprise stories, and community milestones with you.</p><p style="margin:22px 0 0;color:#796966;font-size:12px">AASW Foundation · Rura, Kanpur Dehat, Uttar Pradesh 209303</p></section></main></body></html>`,
    });
    return "sent";
  } catch (error) {
    console.warn("[Newsletter] Welcome email failed:", error);
    return "failed";
  }
}
