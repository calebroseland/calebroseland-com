import { describe, expect, it } from "vitest";
import type { Buffer } from "./buffer.ts";
import { previewSrc } from "./images.ts";

const buffer = {
  dir: "posts/2026/09-18-hello",
  assets: [{ name: "new.webp", objectUrl: "blob:pending" }],
} as unknown as Buffer;
const files = [
  {
    path: "posts/2026/09-18-hello/index.md",
    content: "# Hi",
    sha: "a",
    encoding: "utf-8" as const,
  },
  {
    path: "posts/2026/09-18-hello/hero.png",
    content: "iVBO",
    sha: "b",
    encoding: "base64" as const,
  },
];

describe("previewSrc", () => {
  it("shows a pending image from its object URL", () => {
    expect(previewSrc("new.webp", buffer, files)).toBe("blob:pending");
  });

  it("shows an image on the branch from the loaded bundle, with or without ./", () => {
    expect(previewSrc("hero.png", buffer, files)).toBe("data:image/png;base64,iVBO");
    expect(previewSrc("./hero.png", buffer, files)).toBe("data:image/png;base64,iVBO");
  });

  it("leaves absolute, remote and unknown sources as written", () => {
    for (const src of ["https://x.test/a.png", "/a.png", "data:image/png;base64,x", "gone.png"])
      expect(previewSrc(src, buffer, files)).toBe(src);
  });
});
