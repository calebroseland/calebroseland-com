import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

/* Runs worker/**.test.ts inside workerd with the real wrangler config, so the handler under test is production code.
   Outbound fetches are answered by a scripted GitHub so the OAuth exchange is exercised end to end. */
const GITHUB_STUB = "https://github.stub";

async function fakeGitHub(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/login/oauth/access_token") {
    const body = (await request.json()) as {
      code: string;
      client_secret: string;
      code_verifier: string;
    };
    if (body.client_secret !== "test-secret")
      return Response.json({ error: "incorrect_client_credentials" }, { status: 200 });
    if (body.code === "explode") return new Response("boom", { status: 500 });
    if (body.code !== "good-code")
      return Response.json({
        error: "bad_verification_code",
        error_description: "The code passed is incorrect or expired.",
      });
    return Response.json({ access_token: "gho_test_token", token_type: "bearer", scope: "" });
  }
  return new Response("not found", { status: 404 });
}

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          ENVIRONMENT: "test",
          ALLOWED_ORIGINS: "https://example.com",
          GITHUB_CLIENT_ID: "Iv1.test",
          GITHUB_CLIENT_SECRET: "test-secret",
          GITHUB_OAUTH_ORIGIN: GITHUB_STUB,
        },
        outboundService: (request) =>
          request.url.startsWith(GITHUB_STUB)
            ? fakeGitHub(request)
            : new Response("blocked", { status: 502 }),
      },
    }),
  ],
  test: {
    name: "worker",
    include: ["worker/**/*.test.ts"],
  },
});
