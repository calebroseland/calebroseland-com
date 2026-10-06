declare const __BUILD_SHA__: string | undefined;

export function health(env: Env): Response {
  const sha = typeof __BUILD_SHA__ === 'string' ? __BUILD_SHA__ : 'dev';
  return Response.json(
    { ok: true, sha, env: env.ENVIRONMENT, time: new Date().toISOString() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
