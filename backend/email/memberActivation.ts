import nodemailer from "nodemailer";

type MemberActivationInput = {
  fullName: string;
  email: string;
  membershipNo: string;
  setupUrl: string;
  certificateUrl?: string;
};

type DeliveryDependencies = {
  deliver: (mail: { to: string; subject: string; text: string; html: string }) => Promise<{ messageId?: string }>;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

const FOUNDATION_SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/share/19TMKDwzfi/",
  instagram: "https://www.instagram.com/aaswfoundation",
  linkedin: "https://www.linkedin.com/company/108100135/",
} as const;

function officialLogoUrl(actionUrl: string) {
  try {
    return new URL("/manus-storage/aasw-foundation-official-logo_41a4007d.png", new URL(actionUrl).origin).toString();
  } catch {
    return "/manus-storage/aasw-foundation-official-logo_41a4007d.png";
  }
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

export function createMemberActivationEmail(input: MemberActivationInput) {
  const safe = { fullName: escapeHtml(input.fullName), membershipNo: escapeHtml(input.membershipNo), setupUrl: escapeHtml(input.setupUrl), certificateUrl: escapeHtml(input.certificateUrl ?? ""), logoUrl: escapeHtml(officialLogoUrl(input.setupUrl)), facebook: FOUNDATION_SOCIAL_LINKS.facebook, instagram: FOUNDATION_SOCIAL_LINKS.instagram, linkedin: FOUNDATION_SOCIAL_LINKS.linkedin };
  return {
    subject: "Your AASW Foundation Membership Is Approved",
    text: `Dear ${input.fullName},\n\nCongratulations. Your AASW Foundation membership is approved and your member account is active.\n\nMembership ID: ${input.membershipNo}\n\nSet your password within 72 hours: ${input.setupUrl}\n\nView your membership certificate within 72 hours: ${input.certificateUrl}\n\nAfter setting your password, your certificate will remain available anytime in the secure Member Portal. For your security, do not forward this email or share either link. If you did not submit this membership application, please contact AASW Foundation.\n\nConnect with AASW Foundation:\nFacebook: ${FOUNDATION_SOCIAL_LINKS.facebook}\nInstagram: ${FOUNDATION_SOCIAL_LINKS.instagram}\nLinkedIn: ${FOUNDATION_SOCIAL_LINKS.linkedin}\n\nAASW Foundation\nRura, Kanpur Dehat, Uttar Pradesh 209303\nDo not reply to this email.`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f6f0e6;color:#291d1d;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f0e6"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#fffdf7;border:1px solid #e5ddd4"><tr><td style="padding:22px 30px;background:#174c3c"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle"><img src="${safe.logoUrl}" width="48" height="48" alt="AASW Foundation" style="display:block;background:#fffdf7;padding:3px" /></td><td style="padding-left:13px;vertical-align:middle"><p style="margin:0;color:#eac06e;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase">AASW Foundation</p><p style="margin:4px 0 0;color:#ffffff;font-size:14px;font-weight:700;letter-spacing:.4px">Membership approval</p></td></tr></table></td></tr><tr><td style="padding:34px 30px 30px"><p style="margin:0 0 12px;color:#9a5d03;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Your member account is ready</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:34px;font-weight:400;line-height:1.15">Welcome, ${safe.fullName}.</h1><p style="margin:18px 0 0;color:#584744;font-size:15px;line-height:1.7">Congratulations. Your AASW Foundation membership is approved and your member account is active. Use the Membership ID below and complete secure account setup.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#fffaf0;border-left:4px solid #d4820a"><tr><td style="padding:17px 18px"><p style="margin:0;color:#796966;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Your Membership ID</p><p style="margin:7px 0 0;color:#291d1d;font-size:22px;font-weight:700;letter-spacing:.5px">${safe.membershipNo}</p></td></tr></table><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding:0 8px 10px 0"><a href="${safe.setupUrl}" style="display:inline-block;padding:14px 18px;background:#174c3c;color:#fffdf7;font-size:13px;font-weight:700;text-decoration:none">Set your password</a></td><td style="padding:0 0 10px"><a href="${safe.certificateUrl}" style="display:inline-block;padding:13px 17px;border:1px solid #174c3c;color:#174c3c;font-size:13px;font-weight:700;text-decoration:none">View certificate</a></td></tr></table><p style="margin:16px 0 0;color:#796966;font-size:12px;line-height:1.65">Both secure links expire in 72 hours. After you set a password, your certificate remains available anytime in the protected Member Portal.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;border-top:1px solid #e5ddd4"><tr><td style="padding-top:20px"><p style="margin:0;color:#5b4c47;font-size:12px;line-height:1.6">For your security, do not forward this email or share either link. If you did not submit this membership application, contact AASW Foundation.</p></td></tr></table></td></tr><tr><td style="padding:22px 30px;background:#f0e7d8;border-top:1px solid #e2d7c8"><p style="margin:0;color:#5b4c47;font-size:11px;line-height:1.6">AASW Foundation · Rura, Kanpur Dehat, Uttar Pradesh 209303</p><p style="margin:10px 0 0;color:#796966;font-size:11px">Stay connected: <a href="${safe.facebook}" style="color:#174c3c;font-weight:700;text-decoration:none">Facebook</a><span style="color:#b29f88"> · </span><a href="${safe.instagram}" style="color:#174c3c;font-weight:700;text-decoration:none">Instagram</a><span style="color:#b29f88"> · </span><a href="${safe.linkedin}" style="color:#174c3c;font-weight:700;text-decoration:none">LinkedIn</a></p><p style="margin:10px 0 0;color:#796966;font-size:10px">This is an automated account message; please do not reply.</p></td></tr></table></td></tr></table></body></html>`,
  };
}

export async function dispatchMemberActivationEmail(input: MemberActivationInput, dependencies: DeliveryDependencies = { deliver: deliverWithFoundationGmail }) {
  const message = createMemberActivationEmail(input);
  try {
    await dependencies.deliver({ to: input.email, ...message });
    return "sent" as const;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.log("[EMAIL MOCK]", { to: input.email, subject: message.subject, body: message.text });
      return "mocked" as const;
    }
    return { status: "failed" as const, error: error instanceof Error ? error.message : "Unknown member activation email error." };
  }
}

export function createMemberExpiryReminderEmail(input: { fullName: string; email: string; membershipNo: string; expiresOn: Date; portalUrl: string }) {
  const expiry = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(input.expiresOn);
  const safe = { fullName: escapeHtml(input.fullName), membershipNo: escapeHtml(input.membershipNo), expiry: escapeHtml(expiry), portalUrl: escapeHtml(input.portalUrl), logoUrl: escapeHtml(officialLogoUrl(input.portalUrl)) };
  return {
    subject: "AASW Foundation — Your Membership Expires in 7 Days",
    text: `Dear ${input.fullName},\n\nThis is a reminder that your AASW Foundation annual membership (${input.membershipNo}) is valid through ${expiry} and will expire in 7 days.\n\nTo continue with the same Member ID, password, profile, projects and activity history, submit a new membership application with the same email address and PAN after expiry.\n\nOpen Member Portal: ${input.portalUrl}\n\nAASW Foundation\nThis is an automated membership reminder; please do not reply to this email.`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f6f0e6;color:#291d1d;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#fffdf7;border:1px solid #e5ddd4"><tr><td style="padding:22px 30px;background:#174c3c"><img src="${safe.logoUrl}" width="46" height="46" alt="AASW Foundation" style="display:block;background:#fffdf7;padding:3px" /><p style="margin:10px 0 0;color:#eac06e;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">AASW Foundation · Membership reminder</p></td></tr><tr><td style="padding:34px 30px"><p style="margin:0;color:#a45e08;font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase">7 days remaining</p><h1 style="margin:12px 0 0;color:#291d1d;font-family:Georgia,serif;font-size:32px;font-weight:400">Your membership is nearing expiry.</h1><p style="margin:18px 0 0;color:#584744;font-size:15px;line-height:1.7">Dear ${safe.fullName}, your AASW Foundation annual membership remains active through <strong>${safe.expiry}</strong>.</p><div style="margin:24px 0;background:#fff7e6;border-left:4px solid #d4820a;padding:17px"><p style="margin:0;color:#796966;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Membership ID</p><p style="margin:7px 0 0;color:#291d1d;font-size:22px;font-weight:700">${safe.membershipNo}</p></div><p style="margin:0;color:#584744;font-size:14px;line-height:1.65">After expiry, you can submit a new membership application using the same email address and PAN. Your Member ID, password, profile, projects and history will continue in the same account.</p><a href="${safe.portalUrl}" style="display:inline-block;margin-top:22px;padding:13px 18px;background:#174c3c;color:#fffdf7;font-size:13px;font-weight:700;text-decoration:none">Open Member Portal</a><p style="margin:25px 0 0;padding-top:16px;border-top:1px solid #e5ddd4;color:#796966;font-size:11px;line-height:1.55">AASW Foundation · Rura, Kanpur Dehat, Uttar Pradesh 209303<br/>This is an automated membership reminder; please do not reply.</p></td></tr></table></td></tr></table></body></html>`,
  };
}

export async function dispatchMemberExpiryReminderEmail(input: { fullName: string; email: string; membershipNo: string; expiresOn: Date; portalUrl: string }, dependencies: DeliveryDependencies = { deliver: deliverWithFoundationGmail }) {
  const message = createMemberExpiryReminderEmail(input);
  try {
    await dependencies.deliver({ to: input.email, ...message });
    return "sent" as const;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.log("[EMAIL MOCK]", { to: input.email, subject: message.subject, body: message.text });
      return "mocked" as const;
    }
    return { status: "failed" as const, error: error instanceof Error ? error.message : "Unknown membership reminder email error." };
  }
}

export function createMemberPostGraceFollowUpEmail(input: { fullName: string; email: string; membershipNo: string; expiresOn: Date; portalUrl: string }) {
  const expiry = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(input.expiresOn);
  const safe = { fullName: escapeHtml(input.fullName), membershipNo: escapeHtml(input.membershipNo), expiry: escapeHtml(expiry), portalUrl: escapeHtml(input.portalUrl), logoUrl: escapeHtml(officialLogoUrl(input.portalUrl)) };
  return {
    subject: "AASW Foundation — Renew Your Membership to Restore Portal Access",
    text: `Dear ${input.fullName},\n\nYour AASW Foundation annual membership (${input.membershipNo}) ended on ${expiry}, and the three-day renewal grace period has now concluded.\n\nTo restore Member Portal access while keeping the same Member ID, password, profile, projects and activity history, submit a new membership application with the same email address and PAN.\n\nOpen Member Portal: ${input.portalUrl}\n\nAASW Foundation\nThis is an automated membership follow-up; please do not reply to this email.`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f6f0e6;color:#291d1d;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#fffdf7;border:1px solid #e5ddd4"><tr><td style="padding:22px 30px;background:#174c3c"><img src="${safe.logoUrl}" width="46" height="46" alt="AASW Foundation" style="display:block;background:#fffdf7;padding:3px" /><p style="margin:10px 0 0;color:#eac06e;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">AASW Foundation · Renewal follow-up</p></td></tr><tr><td style="padding:34px 30px"><p style="margin:0;color:#a45e08;font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase">Renewal grace period concluded</p><h1 style="margin:12px 0 0;color:#291d1d;font-family:Georgia,serif;font-size:32px;font-weight:400">Restore your member access.</h1><p style="margin:18px 0 0;color:#584744;font-size:15px;line-height:1.7">Dear ${safe.fullName}, your annual membership ended on <strong>${safe.expiry}</strong>, and the three-day renewal grace period has concluded.</p><div style="margin:24px 0;background:#fff7e6;border-left:4px solid #d4820a;padding:17px"><p style="margin:0;color:#796966;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Membership ID</p><p style="margin:7px 0 0;color:#291d1d;font-size:22px;font-weight:700">${safe.membershipNo}</p></div><p style="margin:0;color:#584744;font-size:14px;line-height:1.65">Submit a new membership application using the same email address and PAN to restore access. Your Member ID, password, profile, projects and history will continue in the same account after renewal.</p><a href="${safe.portalUrl}" style="display:inline-block;margin-top:22px;padding:13px 18px;background:#174c3c;color:#fffdf7;font-size:13px;font-weight:700;text-decoration:none">Open Member Portal</a><p style="margin:25px 0 0;padding-top:16px;border-top:1px solid #e5ddd4;color:#796966;font-size:11px;line-height:1.55">AASW Foundation · Rura, Kanpur Dehat, Uttar Pradesh 209303<br/>This is an automated membership follow-up; please do not reply.</p></td></tr></table></td></tr></table></body></html>`,
  };
}

export async function dispatchMemberPostGraceFollowUpEmail(input: { fullName: string; email: string; membershipNo: string; expiresOn: Date; portalUrl: string }, dependencies: DeliveryDependencies = { deliver: deliverWithFoundationGmail }) {
  const message = createMemberPostGraceFollowUpEmail(input);
  try {
    await dependencies.deliver({ to: input.email, ...message });
    return "sent" as const;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.log("[EMAIL MOCK]", { to: input.email, subject: message.subject, body: message.text });
      return "mocked" as const;
    }
    return { status: "failed" as const, error: error instanceof Error ? error.message : "Unknown post-grace renewal follow-up email error." };
  }
}

export function createMemberPasswordResetEmail(input: MemberActivationInput) {
  const safe = { membershipNo: escapeHtml(input.membershipNo), setupUrl: escapeHtml(input.setupUrl) };
  return {
    subject: "AASW Foundation — Reset Your Member Password",
    text: `Dear ${input.fullName},\n\nA password reset was requested for your AASW Foundation member account.\n\nMembership ID: ${input.membershipNo}\n\nReset your password within 72 hours: ${input.setupUrl}\n\nIf you did not request this, you can ignore this email. Your existing password will remain unchanged. Do not forward this link.\n\nAASW Foundation\nDo not reply to this email.`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#fffdf7;color:#291d1d;font-family:Arial,sans-serif"><main style="max-width:620px;margin:0 auto;padding:30px 20px"><section style="border-top:6px solid #2f6b52;background:#fffaf0;padding:30px"><p style="margin:0 0 14px;color:#2f6b52;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">AASW Foundation · Member account</p><h1 style="margin:0;color:#291d1d;font-family:Georgia,serif;font-size:30px;font-weight:400">Reset your password.</h1><p style="margin:18px 0 0;color:#584744;line-height:1.65">A password reset was requested for your member account.</p><div style="margin:24px 0;padding:16px;background:#ffffff;border-left:3px solid #d4820a"><p style="margin:0;color:#796966;font-size:12px;letter-spacing:1px;text-transform:uppercase">Membership ID</p><p style="margin:7px 0 0;color:#291d1d;font-size:20px;font-weight:700">${safe.membershipNo}</p></div><a href="${safe.setupUrl}" style="display:inline-block;padding:13px 18px;background:#2f6b52;color:#fffdf7;font-size:13px;font-weight:700;text-decoration:none">Reset password</a><p style="margin:22px 0 0;color:#796966;font-size:12px;line-height:1.65">This secure link expires in 72 hours and can be used once. If you did not request a reset, ignore this email. Your existing password remains unchanged.</p><p style="margin:22px 0 0;padding-top:16px;border-top:1px solid #e5ddd4;color:#796966;font-size:11px;line-height:1.55">AASW Foundation · Rura, Kanpur Dehat, Uttar Pradesh 209303<br/>Do not reply to this email.</p></section></main></body></html>`,
  };
}

export async function dispatchMemberPasswordResetEmail(input: MemberActivationInput, dependencies: DeliveryDependencies = { deliver: deliverWithFoundationGmail }) {
  const message = createMemberPasswordResetEmail(input);
  try {
    await dependencies.deliver({ to: input.email, ...message });
    return "sent" as const;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.log("[EMAIL MOCK]", { to: input.email, subject: message.subject, body: message.text });
      return "mocked" as const;
    }
    return { status: "failed" as const, error: error instanceof Error ? error.message : "Unknown member password reset email error." };
  }
}
