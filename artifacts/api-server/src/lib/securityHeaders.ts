import type { RequestHandler } from "express";

// Dependency-free equivalent of the headers `helmet` would set for a JSON API.
// Kept minimal and API-appropriate (no CSP for HTML pages here — the storefront
// is served separately; these headers protect the API responses and the admin
// panel from framing/sniffing).
export const securityHeaders: RequestHandler = (_req, res, next) => {
  // Clickjacking: the admin panel must never be embeddable.
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
  // MIME sniffing.
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Limit referrer leakage.
  res.setHeader("Referrer-Policy", "no-referrer");
  // HSTS — safe to always send; browsers ignore it over plain HTTP.
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  // Remove the framework fingerprint.
  res.removeHeader("X-Powered-By");
  next();
};
