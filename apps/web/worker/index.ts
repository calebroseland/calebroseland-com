import { authCallback, authConfig } from './auth.ts';
import { corsHeaders, originAllowed, withCors } from './cors.ts';
import { securityHeaders } from './headers.ts';
import { health } from './health.ts';
import { logClientError } from './log.ts';
import { problem } from './problem.ts';

export { problem };

/* Everything static is served by the ASSETS binding. The Worker owns only /api/*. */
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const res = await api(request, url, env);
      // HEAD answers as GET does, without the body (uptime checks and curl -I use it).
      const out = request.method === 'HEAD' ? new Response(null, res) : res;
      return securityHeaders(withCors(out, request, env));
    }
    return securityHeaders(await env.ASSETS.fetch(request));
  },
} satisfies ExportedHandler<Env>;

const api = async (request: Request, url: URL, env: Env): Promise<Response> => {
  const requestId = crypto.randomUUID();
  if (request.method === 'OPTIONS') {
    const headers = corsHeaders(request, env);
    return new Response(null, { status: Object.keys(headers).length > 0 ? 204 : 403, headers });
  }
  if (!originAllowed(request, env)) {
    return problem(403, 'Origin not allowed');
  }

  const method = request.method === 'HEAD' ? 'GET' : request.method;
  switch (`${method} ${url.pathname}`) {
    case 'GET /api/health':
      return health(env);
    case 'GET /api/auth/config':
      return authConfig(env);
    case 'POST /api/auth/callback':
      return authCallback(request, env, requestId);
    case 'POST /api/log':
      return logClientError(request, env, requestId);
    default:
      return problem(404, 'Not Found', `No route for ${request.method} ${url.pathname}`);
  }
};
