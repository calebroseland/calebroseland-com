/** RFC 9457 Problem Details; every /api error uses this shape. */
export function problem(
  status: number,
  title: string,
  detail?: string,
  extra?: Record<string, unknown>,
): Response {
  return Response.json(
    { type: 'about:blank', title, status, ...(detail ? { detail } : {}), ...extra },
    { status, headers: { 'content-type': 'application/problem+json' } },
  );
}
