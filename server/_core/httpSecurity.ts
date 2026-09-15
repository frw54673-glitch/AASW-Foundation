import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const trustedRequestId = /^[A-Za-z0-9_-]{8,128}$/;

export function buildSecurityHeaders({ isHttps, isProduction }: { isHttps: boolean; isProduction: boolean }) {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  };

  if (isHttps) headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";

  // This CSP intentionally permits managed image redirects and the hosted font sources
  // already used by the public editorial site while blocking object/embed execution.
  if (isProduction) {
    headers["Content-Security-Policy"] = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self' https:;";
  }

  return headers;
}

export function applyHttpSecurity(req: Request, res: Response, next: NextFunction) {
  const forwardedProto = req.get("x-forwarded-proto") ?? "";
  const isHttps = req.secure || forwardedProto.split(",").some(value => value.trim() === "https");
  const requestId = req.get("x-request-id");
  const safeRequestId = requestId && trustedRequestId.test(requestId) ? requestId : randomUUID();

  res.setHeader("X-Request-Id", safeRequestId);
  for (const [name, value] of Object.entries(buildSecurityHeaders({ isHttps, isProduction: process.env.NODE_ENV === "production" }))) {
    res.setHeader(name, value);
  }
  next();
}
