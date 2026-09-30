import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sameOrigin, within } from "./content-dir.ts";

describe("within", () => {
  const dir = resolve("/repo/content");
  it("admits the directory and what is inside it", () => {
    expect(within(dir, dir)).toBe(true);
    expect(within(dir, join(dir, "posts/a.md"))).toBe(true);
  });
  it("refuses a sibling that shares the prefix, and a path that climbs out", () => {
    expect(within(dir, resolve("/repo/content-backup/a.md"))).toBe(false);
    expect(within(dir, resolve(dir, "../package.json"))).toBe(false);
  });
});

describe("sameOrigin", () => {
  const req = (headers: Record<string, string>) => ({
    headers: { host: "localhost:5173", ...headers },
  });
  it("admits this site's pages and requests without browser headers", () => {
    expect(
      sameOrigin(req({ "sec-fetch-site": "same-origin", origin: "http://localhost:5173" })),
    ).toBe(true);
    expect(sameOrigin(req({}))).toBe(true);
  });
  it("refuses another site's page", () => {
    expect(sameOrigin(req({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(sameOrigin(req({ origin: "https://evil.test" }))).toBe(false);
    expect(
      sameOrigin(req({ "sec-fetch-site": "same-site", origin: "http://localhost:3000" })),
    ).toBe(false);
  });
});
