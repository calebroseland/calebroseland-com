import { describe, expect, it, vi } from "vitest";
import { createThemeStore, nextPreference, resolveTheme } from "./store.ts";

function fakeEnv(opts: { stored?: string | null; systemDark?: boolean; throwing?: boolean } = {}) {
  const data = new Map<string, string>();
  if (opts.stored) data.set("theme", opts.stored);
  const storage = opts.throwing
    ? {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      }
    : {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => void data.set(k, v),
      };
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const media = {
    matches: opts.systemDark ?? false,
    addEventListener: vi.fn(
      (_: string, fn: (e: MediaQueryListEvent) => void) => void listeners.add(fn),
    ),
    removeEventListener: vi.fn(
      (_: string, fn: (e: MediaQueryListEvent) => void) => void listeners.delete(fn),
    ),
    flip(dark: boolean) {
      media.matches = dark;
      for (const fn of listeners) fn({} as MediaQueryListEvent);
    },
  };
  const root = { dataset: {} as DOMStringMap };
  return { storage, media, root, data };
}

describe("resolveTheme", () => {
  it.each([
    ["auto", true, "dark"],
    ["auto", false, "light"],
    ["light", true, "light"],
    ["dark", false, "dark"],
  ] as const)("%s with systemDark=%s → %s", (pref, dark, expected) => {
    expect(resolveTheme(pref, dark)).toBe(expected);
  });
});

describe("nextPreference cycles auto → light → dark → auto", () => {
  it("wraps", () => {
    expect(nextPreference("auto")).toBe("light");
    expect(nextPreference("light")).toBe("dark");
    expect(nextPreference("dark")).toBe("auto");
  });
});

describe("createThemeStore", () => {
  it("reads a stored preference and applies the resolved theme to the root", () => {
    const env = fakeEnv({ stored: "dark" });
    const t = createThemeStore(env);
    expect(t.store.state.preference).toBe("dark");
    expect(env.root.dataset.theme).toBe("dark");
  });

  it("falls back to auto on junk or missing storage", () => {
    expect(createThemeStore(fakeEnv({ stored: "purple" })).store.state.preference).toBe("auto");
    expect(createThemeStore(fakeEnv({ throwing: true })).store.state.preference).toBe("auto");
  });

  it("persists on cycle and updates the root", () => {
    const env = fakeEnv();
    const t = createThemeStore(env);
    t.cycle();
    expect(env.data.get("theme")).toBe("light");
    expect(env.root.dataset.theme).toBe("light");
    t.cycle();
    expect(env.root.dataset.theme).toBe("dark");
  });

  it("follows the OS only while preference is auto", () => {
    const env = fakeEnv({ systemDark: false });
    const t = createThemeStore(env);
    env.media.flip(true);
    expect(env.root.dataset.theme).toBe("dark");
    t.setPreference("light");
    env.media.flip(false);
    env.media.flip(true);
    expect(env.root.dataset.theme).toBe("light");
  });

  it("survives a storage that throws on write", () => {
    const env = fakeEnv({ throwing: true });
    const t = createThemeStore(env);
    expect(() => t.cycle()).not.toThrow();
    expect(env.root.dataset.theme).toBe("light");
  });

  it("removes its media listener on dispose", () => {
    const env = fakeEnv();
    createThemeStore(env).dispose();
    expect(env.media.removeEventListener).toHaveBeenCalledOnce();
  });
});
