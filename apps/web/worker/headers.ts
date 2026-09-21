/* Applied to every response. CSP is intentionally tight; loosen per-directive with a reason when a phase needs it. */
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  // Adobe Fonts: the kit stylesheet on use.typekit.net imports a licence-counting stylesheet from p.typekit.net.
  "style-src 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net",
  "img-src 'self' data:",
  "font-src 'self' https://use.typekit.net",
  "connect-src 'self' https://api.github.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export function securityHeaders(res: Response): Response {
  const out = new Response(res.body, res);
  out.headers.set("x-content-type-options", "nosniff");
  out.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  out.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  out.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  if (!out.headers.has("content-security-policy-report-only")) {
    // Report-only until Phase 6 confirms zero violations across a week (spec §13).
    out.headers.set("content-security-policy-report-only", csp);
  }
  return out;
}
