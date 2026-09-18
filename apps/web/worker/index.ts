import { securityHeaders } from "./headers.ts";
import { health } from "./health.ts";

/* Everything static is served by the ASSETS binding. The Worker owns only /api/*. */
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return securityHeaders(await api(request, url, env));
    }
    return securityHeaders(await env.ASSETS.fetch(request));
  },
} satisfies ExportedHandler<Env>;

async function api(request: Request, url: URL, env: Env): Promise<Response> {
  if (url.pathname === "/api/health" && request.method === "GET") return health(env);
  return problem(404, "Not Found", `No route for ${request.method} ${url.pathname}`);
}

/** RFC 9457 Problem Details; every /api error uses this shape. */
export function problem(status: number, title: string, detail?: string): Response {
  return Response.json(
    { type: "about:blank", title, status, ...(detail ? { detail } : {}) },
    {
      status,
      headers: { "content-type": "application/problem+json" },
    },
  );
}
