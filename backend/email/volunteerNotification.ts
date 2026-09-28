import nodemailer from "nodemailer";

type VolunteerNotificationInput = {
  applicationRef: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  skills: string;
  availability: string;
  interests: string;
};

type VolunteerDecisionInput = {
  applicationRef: string;
  fullName: string;
  email: string;
  status: "approved" | "rejected";
  reviewNotes?: string;
};

type VolunteerMail = { to: string; subject: string; text: string; html: string };
type VolunteerDispatchDependencies = { deliver: (mail: VolunteerMail) => Promise<{ messageId?: string }> };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!host || !port || !user || !pass) throw new Error("Volunteer notification sender is not configured.");
  return { host, port, user, pass };
}

async function deliverWithFoundationGmail(mail: VolunteerMail) {
  const smtp = smtpConfig();
  const transport = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: smtp.port !== 465, auth: { user: smtp.user, pass: smtp.pass } });
  return transport.sendMail({ from: { name: "AASW Foundation", address: smtp.user }, replyTo: smtp.user, ...mail });
}

/** Foundation-side alert for a new volunteer application (mirrors the membership notification boundary). */
export function createVolunteerApplicationNotification(input: VolunteerNotificationInput): Omit<VolunteerMail, "to"> {
  const body = `A new volunteer application has been received.\n\nApplication reference: ${input.applicationRef}\nApplicant: ${input.fullName}\nEmail: ${input.email}\nPhone: ${input.phone}\nLocation: ${input.city}, ${input.state}\nSkills: ${input.skills}\nAvailability: ${input.availability}\nInterests: ${input.interests}\n\nReview and decide through the protected Foundation workspace.`;
  const safe = { applicationRef: escapeHtml(input.applicationRef), fullName: escapeHtml(input.fullName), email: escapeHtml(input.email), phone: escapeHtml(input.phone), city: escapeHtml(input.city), state: escapeHtml(input.state), skills: escapeHtml(input.skills), availability: escapeHtml(input.availability), interests: escapeHtml(input.interests) };
  return {
    subject: `New volunteer application · ${input.applicationRef}`,
    text: body,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:620px;margin:0 auto;padding:30px 20px"><section style="border-top:6px solid #2f6b52;background:#fffaf0;padding:30px"><p style="margin:0 0 14px;color:#2f6b52;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">AASW Foundation · Volunteer alert</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:30px;font-weight:400">New volunteer application received.</h1><table role="presentation" style="width:100%;margin-top:24px;border-collapse:collapse"><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Reference</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right;font-weight:700">${safe.applicationRef}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Applicant</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.fullName}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Contact</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.email}<br/>${safe.phone}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Location</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.city}, ${safe.state}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Skills</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.skills}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e5ddd4;color:#796966">Availability</td><td style="padding:10px 0;border-top:1px solid #e5ddd4;text-align:right">${safe.availability}</td></tr></table><p style="margin:22px 0 0;color:#796966;font-size:12px;line-height:1.6">Review and decide through the protected Foundation workspace. Volunteer interests: ${safe.interests}</p></section></main></body></html>`,
  };
}

/** Applicant-facing decision email. Review notes are optional and always HTML-escaped. */
export function createVolunteerDecisionMail(input: VolunteerDecisionInput): VolunteerMail {
  const approved = input.status === "approved";
  const notes = input.reviewNotes?.trim();
  const safe = { fullName: escapeHtml(input.fullName), applicationRef: escapeHtml(input.applicationRef), notes: notes ? escapeHtml(notes) : "" };
  return {
    to: input.email,
    subject: approved ? `AASW Foundation volunteer application approved · ${input.applicationRef}` : `AASW Foundation volunteer application update · ${input.applicationRef}`,
    text: approved
      ? `Dear ${input.fullName},\n\nThank you for offering your time to AASW Foundation. Your volunteer application (${input.applicationRef}) has been approved.\n\n${notes ? `Notes from the Foundation: ${notes}\n\n` : ""}Our team will reach out with your first volunteering opportunity and any onboarding steps.\n\nAASW Foundation`
      : `Dear ${input.fullName},\n\nThank you for your interest in volunteering with AASW Foundation. After review, we are unable to proceed with your application (${input.applicationRef}) at this time.\n\n${notes ? `Notes from the Foundation: ${notes}\n\n` : ""}You are welcome to apply again in the future.\n\nAASW Foundation`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:620px;margin:0 auto;padding:30px 20px"><section style="border-top:6px solid #2f6b52;background:#fffaf0;padding:30px"><p style="margin:0 0 14px;color:#2f6b52;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">AASW Foundation · Volunteer application</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:30px;font-weight:400">${approved ? "Welcome to the volunteer collective." : "An update on your application."}</h1><p style="margin:22px 0 0;color:#5c4b47;font-size:16px;line-height:1.7">Dear ${safe.fullName}, ${approved ? "your volunteer application has been approved. Our team will reach out with your first volunteering opportunity and any onboarding steps." : "after review, we are unable to proceed with your volunteer application at this time. You are welcome to apply again in the future."}</p><p style="margin:18px 0 0;color:#796966;font-size:12px">Reference: ${safe.applicationRef}</p>${safe.notes ? `<p style="margin:22px 0 0;padding:16px;border:1px solid #d8cfc4;background:#fffdf7;color:#5c4b47;font-size:14px;line-height:1.65"><strong>Notes from the Foundation:</strong><br/>${safe.notes}</p>` : ""}<p style="margin:22px 0 0;color:#5c4b47;font-size:14px;line-height:1.65">For any question, write to <a href="mailto:aaswfoundation06@gmail.com" style="color:#2f6b52">aaswfoundation06@gmail.com</a>.</p></section></main></body></html>`,
  };
}

export type VolunteerDispatchResult = "sent" | { status: "failed"; error: string };

export async function dispatchVolunteerApplicationNotification(input: VolunteerNotificationInput, dependencies: VolunteerDispatchDependencies = { deliver: deliverWithFoundationGmail }): Promise<VolunteerDispatchResult> {
  try {
    const smtp = smtpConfig();
    await dependencies.deliver({ to: smtp.user, ...createVolunteerApplicationNotification(input) });
    return "sent" as const;
  } catch (error) {
    return { status: "failed" as const, error: error instanceof Error ? error.message : "Unknown volunteer notification error." };
  }
}

export async function dispatchVolunteerDecisionEmail(input: VolunteerDecisionInput, dependencies: VolunteerDispatchDependencies = { deliver: deliverWithFoundationGmail }): Promise<VolunteerDispatchResult> {
  try {
    await dependencies.deliver(createVolunteerDecisionMail(input));
    return "sent" as const;
  } catch (error) {
    return { status: "failed" as const, error: error instanceof Error ? error.message : "Unknown volunteer decision error." };
  }
}
