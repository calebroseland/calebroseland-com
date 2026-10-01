import { describe, expect, it } from "vitest";
import { headersFile, SECURITY_HEADERS } from "../worker/headers.ts";

describe("_headers", () => {
  it("applies every security header the Worker sets to every static path", () => {
    const [rule, ...lines] = headersFile().trim().split("\n");
    expect(rule).toBe("/*");
    expect(lines).toEqual(
      Object.entries(SECURITY_HEADERS).map(([name, value]) => `  ${name}: ${value}`),
    );
    expect(lines.some((l) => l.startsWith("  strict-transport-security: max-age="))).toBe(true);
  });
});
