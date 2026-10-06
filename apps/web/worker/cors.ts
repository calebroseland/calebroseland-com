/* CORS for /api/*. The allowlist is an env var so each environment names its own origins (and the Pages backup). */
const allowedOrigins = (env: Env): Set<string> => {
  return new Set(
    (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
};

export const corsHeaders = (request: Request, env: Env): Record<string, string> => {
  const origin = request.headers.get('origin');
  if (!origin || !allowedOrigins(env).has(origin)) {
    return {};
  }
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '600',
    vary: 'origin',
  };
};

/** Same-origin requests carry no Origin header on GET; cross-origin ones must be on the allowlist. */
export const originAllowed = (request: Request, env: Env): boolean => {
  const origin = request.headers.get('origin');
  if (!origin) {
    return true;
  }
  return allowedOrigins(env).has(origin);
};

export const withCors = (res: Response, request: Request, env: Env): Response => {
  const headers = corsHeaders(request, env);
  if (Object.keys(headers).length === 0) {
    return res;
  }
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(headers)) {
    out.headers.set(k, v);
  }
  return out;
};
