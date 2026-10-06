import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Email clients (Gmail in particular) proxy and block images served from the
 * app origin — a localhost URL is unreachable from any recipient's mail
 * client, so the official logo is embedded into every email as a CID
 * attachment instead of a remote URL. */
export const AASW_LOGO_CID = "aasw-foundation-logo";

const LOGO_CANDIDATES = [
  resolve(process.cwd(), "frontend/public/manus-storage/aasw-foundation-official-logo_41a4007d.png"),
  resolve(process.cwd(), "dist/public/manus-storage/aasw-foundation-official-logo_41a4007d.png"),
];

/** Nodemailer attachment carrying the official logo for inline (cid:) use. */
export function aaswLogoAttachment() {
  const logoPath = LOGO_CANDIDATES.find(candidate => existsSync(candidate)) ?? LOGO_CANDIDATES[0];
  return {
    filename: "aasw-foundation-logo.png",
    content: readFileSync(logoPath),
    cid: AASW_LOGO_CID,
    contentType: "image/png",
  };
}
