import * as z from "zod/mini";

/* Client for the Worker's /api/auth routes. Same-origin in production; the Pages backup points at the production Worker. */

export const apiOrigin = (): string => (typeof __API_ORIGIN__ === "string" && __API_ORIGIN__) || "";

const configSchema = z.object({ enabled: z.boolean(), clientId: z.nullable(z.string()) });
const tokenSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string(),
  scope: z.string(),
  expiresAt: z.optional(z.string()),
  refreshToken: z.optional(z.string()),
});
const problemSchema = z.object({
  title: z.string(),
  status: z.number(),
  detail: z.optional(z.string()),
  code: z.optional(z.string()),
});

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail?: string,
    public readonly code?: string,
  ) {
    super(detail ? `${title}: ${detail}` : title);
    this.name = "ApiError";
  }
}

async function readProblem(res: Response): Promise<ApiError> {
  const parsed = problemSchema.safeParse(await res.json().catch(() => null));
  return parsed.success
    ? new ApiError(parsed.data.status, parsed.data.title, parsed.data.detail, parsed.data.code)
    : new ApiError(res.status, `HTTP ${res.status}`);
}

export async function fetchAuthConfig(fetchImpl: typeof fetch = fetch) {
  const res = await fetchImpl(`${apiOrigin()}/api/auth/config`);
  if (!res.ok) throw await readProblem(res);
  return configSchema.parse(await res.json());
}

export async function exchangeCode(
  input: { code: string; codeVerifier: string; redirectUri: string },
  fetchImpl: typeof fetch = fetch,
) {
  const res = await fetchImpl(`${apiOrigin()}/api/auth/callback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await readProblem(res);
  return tokenSchema.parse(await res.json());
}
