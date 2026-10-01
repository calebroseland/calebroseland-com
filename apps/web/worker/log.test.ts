import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const site = "https://example.com";
const post = (body: unknown, init: RequestInit = {}) =>
  SELF.fetch(`${site}/api/log`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: site },
    body: typeof body === "string" ? body : JSON.stringify(body),
    ...init,
  });

const valid = { message: "boom", url: `${site}/posts/a`, kind: "error" as const };

describe("POST /api/log", () => {
  it("accepts a valid report and answers 204 with no body", async () => {
    const res = await post(valid);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });

  it("rejects an invalid body with field-level problem details", async () => {
    const res = await post({ message: "", url: "not-a-url" });
    expect(res.status).toBe(400);
    const body = await res.json<{ errors: Array<{ path: string }> }>();
    expect(body.errors.map((e) => e.path).sort()).toEqual(["message", "url"]);
  });

  it("rejects malformed JSON", async () => {
    expect((await post("{")).status).toBe(400);
  });

  it("caps the payload size", async () => {
    const res = await post({ ...valid, stack: "s".repeat(5000) });
    expect(res.status).toBe(413);
  });

  it("denies unlisted origins like every other /api route", async () => {
    const res = await SELF.fetch(`${site}/api/log`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.example" },
      body: JSON.stringify(valid),
    });
    expect(res.status).toBe(403);
  });
});
