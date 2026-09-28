import type { ParsedLocation } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pageTransition, pageTypes } from "./pageTransition.ts";

const at = (pathname: string) => ({ pathname }) as ParsedLocation;
const nav = (from: string | undefined, to: string, pathChanged = from !== to) => ({
  fromLocation: from ? at(from) : undefined,
  toLocation: at(to),
  pathChanged,
});

describe("page transitions", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("zooms in going deeper, out coming up, and fades between siblings", () => {
    expect(pageTypes(undefined, nav("/posts", "/posts/hello"))).toEqual([
      "page",
      "page-zoom",
      "page-forward",
    ]);
    expect(pageTypes(undefined, nav("/posts/hello", "/posts"))).toEqual([
      "page",
      "page-zoom",
      "page-back",
    ]);
    expect(pageTypes(undefined, nav("/posts", "/about"))).toEqual([
      "page",
      "page-fade",
      "page-across",
    ]);
  });

  it("uses a declared effect, keeping the direction", () => {
    expect(pageTypes("fade", nav("/home", "/"))).toEqual(["page", "page-fade", "page-back"]);
  });

  it("skips the first load, search or hash changes, a declared false, and reduced motion", () => {
    expect(pageTypes(undefined, nav(undefined, "/posts"))).toBe(false);
    expect(pageTypes(undefined, nav("/posts", "/posts", false))).toBe(false);
    expect(pageTypes(false, nav("/posts", "/about"))).toBe(false);
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(pageTypes(undefined, nav("/posts", "/about"))).toBe(false);
  });

  it("lets one link choose or turn off its transition", () => {
    expect(pageTransition(false)).toBe(false);
    const chosen = pageTransition("fade");
    expect(chosen && chosen.types(nav("/posts", "/posts/x"))).toEqual([
      "page",
      "page-fade",
      "page-forward",
    ]);
  });
});
