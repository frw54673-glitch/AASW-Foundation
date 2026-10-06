import nodemailer from "nodemailer";
import { createMemberActivationEmail } from "../backend/email/memberActivation.ts";
import { aaswLogoAttachment } from "../backend/email/logo.ts";

const email = createMemberActivationEmail({
  fullName: "MIME Proof Member",
  email: "mime.proof@example.com",
  membershipNo: "AASW-2026-0004",
  loginPassword: "Aasw@Proof123",
  loginUrl: "http://localhost:3000/member/login",
  certificateUrl: "https://example.org/cert",
});

// streamTransport = email bhejne ke bajaye raw MIME output deta hai
const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
const info = await transport.sendMail({
  from: { name: "AASW Foundation", address: "aaswfoundation06@gmail.com" },
  to: "mime.proof@example.com",
  subject: email.subject,
  text: email.text,
  html: email.html,
  attachments: [aaswLogoAttachment()],
});

const mime = info.message.toString();
console.log("MIME contains cid reference:", mime.includes("cid:aasw-foundation-logo") ? "YES ✓" : "NO ✗");
console.log("MIME contains inline image/png attachment:", /Content-Type: image\/png/.test(mime) ? "YES ✓" : "NO ✗");
console.log("MIME contains Content-ID header:", /Content-ID: <aasw-foundation-logo>/.test(mime) ? "YES ✓" : "NO ✗");
console.log("MIME contains base64 logo data:", mime.includes("Content-Transfer-Encoding: base64") ? "YES ✓" : "NO ✗");
console.log("No localhost image URLs left:", mime.includes("src=\"http://localhost") ? "STILL THERE ✗" : "CLEAN ✓");
