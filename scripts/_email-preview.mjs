import { createMemberActivationEmail } from "../backend/email/memberActivation.ts";
import { generateMemberPassword } from "../backend/security/memberAccount.ts";
import bcrypt from "bcryptjs";

const samplePassword = generateMemberPassword();
const email = createMemberActivationEmail({
  fullName: "Login Chain Test Member",
  email: "login.chain.test@example.com",
  membershipNo: "AASW-2026-0004",
  loginPassword: samplePassword,
  loginUrl: "http://localhost:3000/member/login",
  certificateUrl: "https://example.org/member/email-certificate?token=x",
});
console.log("=== EMAIL SUBJECT ===");
console.log(email.subject);
console.log("=== EMAIL TEXT (jo member ko jati hai) ===");
console.log(email.text);
console.log("=== PASSWORD GENERATOR (5 samples) ===");
for (let i = 0; i < 5; i++) {
  const p = generateMemberPassword();
  const valid = /^Aasw@[A-Za-z0-9]{9}$/.test(p) && !/[0O1lI]/.test(p.slice(5));
  console.log(p, valid ? "OK" : "FORMAT FAIL");
}
const chainPassword = generateMemberPassword();
const chainHash = await bcrypt.hash(chainPassword, 12);
console.log("=== LOGIN CHAIN ===");
console.log("generated:", chainPassword);
console.log("hash format:", chainHash.slice(0, 7), "(bcrypt round 12 — router jaisa hi)");
console.log("verify compareSync:", bcrypt.compareSync(chainPassword, chainHash) ? "TRUE" : "FALSE");
console.log("CHAIN_PASSWORD_FOR_LOGIN=" + chainPassword);
