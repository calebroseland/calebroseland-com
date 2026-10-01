import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("/api/health", () => {
  it("reports ok with env and a sha", async () => {
    const res = await SELF.fetch("https://example.com/api/health");
    expect(res.status).toBe(200);
    const body = await res.json<{ ok: boolean; sha: string; env: string; time: string }>();
    expect(body.ok).toBe(true);
    expect(body.env).toBe(env.ENVIRONMENT);
    expect(typeof body.sha).toBe("string");
    expect(() => new Date(body.time).toISOString()).not.toThrow();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("carries security headers", async () => {
    const res = await SELF.fetch("https://example.com/api/health");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy-report-only")).toContain("default-src 'self'");
  });
});

describe("HEAD on an /api route", () => {
  it("answers as GET does, with headers and no body", async () => {
    const res = await SELF.fetch("https://example.com/api/health", { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(res.headers.get("strict-transport-security")).toMatch(/^max-age=/);
    expect(await res.text()).toBe("");
  });
});

describe("unknown /api route", () => {
  it("returns an RFC 9457 problem", async () => {
    const res = await SELF.fetch("https://example.com/api/nope");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toBe("application/problem+json");
    const body = await res.json<{ title: string; status: number }>();
    expect(body).toMatchObject({ title: "Not Found", status: 404 });
  });
});
