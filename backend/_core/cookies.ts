import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);

  return {
    httpOnly: true,
    path: "/",
    // Chrome rejects SameSite=None cookies that are not marked Secure, so on
    // plain HTTP (local development, non-HTTPS deployments) fall back to the
    // default Lax policy. Same-origin XHR still carries the session cookie,
    // and HTTPS requests keep the cross-site-capable None; Secure pair.
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
