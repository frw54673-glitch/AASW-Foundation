// Mint a valid app_session_id JWT for the admin user (OWNER_OPEN_ID) so admin
// pages can be audited in a real browser. Uses the same secret as server.
import { SignJWT } from "jose";
import { readFileSync } from "node:fs";

const env = readFileSync(".env", "utf8");
const secret = env.match(/^JWT_SECRET=(.+)$/m)?.[1].trim();
const owner = env.match(/^OWNER_OPEN_ID=(.*)$/m)?.[1].trim() || "admin-local-audit";
const key = new TextEncoder().encode(secret);

const token = await new SignJWT({ openId: owner, appId: "local-audit", name: "Foundation Admin" })
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setIssuedAt()
  .setExpirationTime(Math.floor((Date.now() + 8 * 3600 * 1000) / 1000))
  .sign(key);
console.log(token);
