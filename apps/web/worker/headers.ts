/* One list of security headers for every response: the Worker sets them on /api/*, and the build writes
   them to _headers for the static assets, which Cloudflare serves without running the Worker.
   CSP is intentionally tight; loosen per-directive with a reason when a phase needs it. */
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

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  // Report-only until Phase 6 confirms zero violations across a week (spec §13).
  "content-security-policy-report-only": csp,
};

export function securityHeaders(res: Response): Response {
  const out = new Response(res.body, res);
  for (const [name, value] of Object.entries(SECURITY_HEADERS))
    if (!out.headers.has(name)) out.headers.set(name, value);
  return out;
}

/** The same headers in Cloudflare's static-assets `_headers` format, for every path. */
export function headersFile(): string {
  const lines = Object.entries(SECURITY_HEADERS).map(([name, value]) => `  ${name}: ${value}`);
  return `/*\n${lines.join("\n")}\n`;
}
