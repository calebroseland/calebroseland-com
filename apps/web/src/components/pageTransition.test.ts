import type { ParsedLocation } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pageEffect, pageViewTransition } from "./pageTransition.ts";

const at = (pathname: string) => ({ pathname }) as ParsedLocation;
const nav = (from: string | undefined, to: string, pathChanged = from !== to) => ({
  fromLocation: from ? at(from) : undefined,
  toLocation: at(to),
  pathChanged,
});

describe("page transitions", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("slides forward going deeper, back coming up, and fades between siblings", () => {
    expect(pageEffect(undefined, nav("/posts", "/posts/hello"))).toBe("slide forward");
    expect(pageEffect(undefined, nav("/posts/hello", "/posts"))).toBe("slide back");
    expect(pageEffect(undefined, nav("/posts", "/about"))).toBe("fade across");
  });

  it("uses a declared effect, keeping the direction", () => {
    expect(pageEffect("fade", nav("/home", "/"))).toBe("fade back");
  });

  it("gives none to the first load, search or hash changes, a declared false, and reduced motion", () => {
    expect(pageEffect(undefined, nav(undefined, "/posts"))).toBe("none");
    expect(pageEffect(undefined, nav("/posts", "/posts", false))).toBe("none");
    expect(pageEffect(false, nav("/posts", "/about"))).toBe("none");
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(pageEffect(undefined, nav("/posts", "/about"))).toBe("none");
  });

  it("skips the router's transition where there is nothing to animate", () => {
    const root = { dataset: { page: "none" } as Record<string, string> };
    vi.stubGlobal("document", { documentElement: root });
    expect(pageViewTransition.types()).toBe(false);
    root.dataset.page = "slide forward";
    expect(pageViewTransition.types()).toEqual(["page"]);
  });
});
