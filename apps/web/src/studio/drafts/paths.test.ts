import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { bundleDirFor, findBundleDir, slugify } from "./paths.ts";

describe("bundleDirFor", () => {
  it("is date-prefixed in UTC", () => {
    expect(bundleDirFor(new Date("2026-09-18T23:59:00Z"), "hello")).toBe(
      "content/posts/2026/09-18-hello",
    );
  });
});

describe("findBundleDir", () => {
  it("finds the directory by slug suffix and ignores other slugs", () => {
    const paths = [
      "content/posts/2026/09-18-hello/index.md",
      "content/posts/2026/09-18-hello/hero.png",
      "content/posts/2026/09-19-hello-again/index.md",
    ];
    expect(findBundleDir(paths, "hello")).toBe("content/posts/2026/09-18-hello");
    expect(findBundleDir(paths, "hello-again")).toBe("content/posts/2026/09-19-hello-again");
    expect(findBundleDir(paths, "nope")).toBeNull();
  });
});

describe("slugify", () => {
  it("produces slugs the content schema accepts, idempotently", () => {
    const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 40 }), (s) => {
        const out = slugify(s);
        if (out.length > 0) {
          expect(out).toMatch(valid);
          expect(slugify(out)).toBe(out);
        }
      }),
    );
  });

  it("handles accents and punctuation", () => {
    expect(slugify("Héllo, Wörld!  It's  2026")).toBe("hello-world-it-s-2026");
  });
});
