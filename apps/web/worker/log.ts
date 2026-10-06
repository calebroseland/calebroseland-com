import { z } from 'zod';
import type { WorkerEnv } from './env.ts';
import { problem } from './problem.ts';

/* Client error sink. Deliberately small: a bounded, validated payload logged as structured JSON to
   Workers Logs. No vendor, no storage, no personal data. The client samples before sending. */

const MAX_BYTES = 4 * 1024;

const clientError = z.object({
  message: z.string().min(1).max(500),
  stack: z.string().max(2000).optional(),
  url: z.url().max(500),
  userAgent: z.string().max(300).optional(),
  kind: z.enum(['error', 'unhandledrejection']).default('error'),
});

export async function logClientError(
  request: Request,
  env: WorkerEnv,
  requestId: string,
): Promise<Response> {
  const size = Number(request.headers.get('content-length') ?? 0);
  if (size > MAX_BYTES)
    return problem(
      413,
      'Payload too large',
      `Client error reports are capped at ${MAX_BYTES} bytes.`,
    );

  const raw = await request.text();
  if (raw.length > MAX_BYTES) return problem(413, 'Payload too large');

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return problem(400, 'Invalid JSON');
  }

  const parsed = clientError.safeParse(parsedJson);
  if (!parsed.success) {
    return problem(400, 'Invalid request body', undefined, {
      errors: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  const { message, stack, url, userAgent, kind } = parsed.data;
  console.error(
    JSON.stringify({
      requestId,
      event: 'client.error',
      kind,
      env: env.ENVIRONMENT,
      message,
      url,
      ...(userAgent ? { userAgent } : {}),
      ...(stack ? { stack } : {}),
    }),
  );
  // 204 so the beacon never retries and the client never branches on a body.
  return new Response(null, { status: 204 });
}
