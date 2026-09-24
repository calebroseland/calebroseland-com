import type { ParsedLocation } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pageTransition, typesFor } from "./pageTransition.ts";

const at = (pathname: string) => ({ pathname }) as ParsedLocation;
const nav = (from: string | undefined, to: string, pathChanged = from !== to) => ({
  ...(from ? { fromLocation: at(from) } : {}),
  toLocation: at(to),
  pathChanged,
});

describe("page transitions", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("slides forward going deeper, back coming up, and fades between siblings", () => {
    expect(typesFor(undefined, nav("/posts", "/posts/hello"))).toEqual([
      "page",
      "page-slide",
      "page-forward",
    ]);
    expect(typesFor(undefined, nav("/posts/hello", "/posts"))).toEqual([
      "page",
      "page-slide",
      "page-back",
    ]);
    expect(typesFor(undefined, nav("/posts", "/about"))).toEqual([
      "page",
      "page-fade",
      "page-across",
    ]);
  });

  it("uses a declared effect, keeping the direction", () => {
    expect(typesFor("fade", nav("/home", "/"))).toEqual(["page", "page-fade", "page-back"]);
  });

  it("skips the first load, search or hash changes, a declared false, and reduced motion", () => {
    expect(typesFor(undefined, nav(undefined, "/posts"))).toBe(false);
    expect(typesFor(undefined, nav("/posts", "/posts", false))).toBe(false);
    expect(typesFor(false, nav("/posts", "/about"))).toBe(false);
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(typesFor(undefined, nav("/posts", "/about"))).toBe(false);
  });

  it("lets a single link choose or turn off its transition", () => {
    expect(pageTransition(false)).toBe(false);
    const chosen = pageTransition("fade");
    expect(chosen && chosen.types(nav("/posts", "/posts/x"))).toEqual([
      "page",
      "page-fade",
      "page-forward",
    ]);
  });
});
