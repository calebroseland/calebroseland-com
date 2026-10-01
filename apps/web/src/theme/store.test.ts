import { describe, expect, it, vi } from "vitest";
import { defaultTheme } from "./custom.ts";
import { createThemeStore, resolveTheme } from "./store.ts";

function fakeEnv(
  opts: { stored?: Record<string, string>; systemDark?: boolean; throwing?: boolean } = {},
) {
  const data = new Map<string, string>(Object.entries(opts.stored ?? {}));
  const blocked = () => {
    throw new Error("blocked");
  };
  const storage = opts.throwing
    ? { getItem: blocked, setItem: blocked, removeItem: blocked }
    : {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => void data.set(k, v),
        removeItem: (k: string) => void data.delete(k),
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
  const props = new Map<string, string>();
  const root = {
    dataset: {} as DOMStringMap,
    style: {
      setProperty: (n: string, v: string | null) => void props.set(n, v ?? ""),
      removeProperty: (n: string) => {
        props.delete(n);
        return "";
      },
    },
  };
  return { storage, media, root, data, props };
}

const ocean = { ...defaultTheme("dark", "abc", "Ocean"), accent: "#0ca678" };

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

describe("createThemeStore", () => {
  it("reads a stored preference and applies the resolved theme to the root", () => {
    const env = fakeEnv({ stored: { theme: "dark" } });
    const t = createThemeStore(env);
    expect(t.store.state.preference).toBe("dark");
    expect(env.root.dataset.theme).toBe("dark");
  });

  it("falls back to auto on junk, an unknown custom theme, or missing storage", () => {
    expect(createThemeStore(fakeEnv({ stored: { theme: "purple" } })).store.state.preference).toBe(
      "auto",
    );
    expect(
      createThemeStore(fakeEnv({ stored: { theme: "custom:gone" } })).store.state.preference,
    ).toBe("auto");
    expect(createThemeStore(fakeEnv({ throwing: true })).store.state.preference).toBe("auto");
  });

  it("persists a chosen preference and updates the root", () => {
    const env = fakeEnv();
    const t = createThemeStore(env);
    t.setPreference("dark");
    expect(env.data.get("theme")).toBe("dark");
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
    expect(() => t.setPreference("dark")).not.toThrow();
    expect(() => t.saveCustom(ocean)).not.toThrow();
    expect(env.root.dataset.theme).toBe("dark");
  });

  it("removes its media listener on dispose", () => {
    const env = fakeEnv();
    createThemeStore(env).dispose();
    expect(env.media.removeEventListener).toHaveBeenCalledOnce();
  });
});

describe("custom themes", () => {
  it("saving selects the theme, applies its base and variables, and stores them for first paint", () => {
    const env = fakeEnv();
    const t = createThemeStore(env);
    t.saveCustom(ocean);

    expect(t.store.state.preference).toBe("custom:abc");
    expect(env.root.dataset.theme).toBe("dark");
    expect(env.props.get("--accent-600")).toContain("#0ca678");
    expect(JSON.parse(env.data.get("theme-custom") ?? "[]")).toHaveLength(1);
    const forFirstPaint = JSON.parse(env.data.get("theme-vars") ?? "{}");
    expect(forFirstPaint.base).toBe("dark");
    expect(forFirstPaint.vars["--accent-600"]).toContain("#0ca678");
  });

  it("switching back to a built-in theme clears every variable the custom theme set", () => {
    const env = fakeEnv();
    const t = createThemeStore(env);
    t.saveCustom(ocean);
    t.setPreference("light");
    expect(env.props.size).toBe(0);
    expect(env.data.has("theme-vars")).toBe(false);
  });

  it("restores a saved custom theme on the next load", () => {
    const env = fakeEnv();
    createThemeStore(env).saveCustom(ocean);
    const again = fakeEnv({ stored: Object.fromEntries(env.data) });
    const t = createThemeStore(again);
    expect(t.store.state.customThemes.map((c) => c.name)).toEqual(["Ocean"]);
    expect(again.root.dataset.theme).toBe("dark");
    expect(again.props.get("--accent-600")).toContain("#0ca678");
  });

  it("previews without saving, and a null preview returns to the preference", () => {
    const env = fakeEnv({ stored: { theme: "light" } });
    const t = createThemeStore(env);
    t.preview(ocean);
    expect(env.root.dataset.theme).toBe("dark");
    expect(env.data.has("theme-custom")).toBe(false);
    expect(env.data.has("theme-vars")).toBe(false);
    t.preview(null);
    expect(env.root.dataset.theme).toBe("light");
    expect(env.props.size).toBe(0);
  });

  it("editing replaces the theme in place; deleting the selected one falls back to auto", () => {
    const env = fakeEnv();
    const t = createThemeStore(env);
    t.saveCustom(ocean);
    t.saveCustom({ ...defaultTheme("light", "def", "Paper") });
    t.saveCustom({ ...ocean, name: "Deep ocean" });
    expect(t.store.state.customThemes.map((c) => c.name)).toEqual(["Deep ocean", "Paper"]);

    t.deleteCustom("abc");
    expect(t.store.state.preference).toBe("auto");
    expect(t.store.state.customThemes.map((c) => c.id)).toEqual(["def"]);
    expect(env.props.size).toBe(0);
  });

  it("drops a stored theme that no longer parses without losing the others", () => {
    const stored = JSON.stringify([ocean, { ...ocean, id: "bad", accent: "not a colour" }]);
    const t = createThemeStore(fakeEnv({ stored: { "theme-custom": stored } }));
    expect(t.store.state.customThemes.map((c) => c.id)).toEqual(["abc"]);
  });
});

describe("the Adobe Fonts kit", () => {
  const withKit = (byDefault: boolean, stored: Record<string, string> = {}) => {
    const env = { ...fakeEnv({ stored }), adobeFonts: { byDefault, load: vi.fn() } };
    return { env, t: createThemeStore(env) };
  };
  const plain = { ...ocean, fontText: "system" as const, fontName: "text" as const };

  it("loads only when the default theme names one of its faces", () => {
    expect(withKit(true).env.adobeFonts.load).toHaveBeenCalled();
    expect(withKit(false).env.adobeFonts.load).not.toHaveBeenCalled();
  });

  it("follows a custom theme's faces, and records the answer for theme-init.js", () => {
    const { env, t } = withKit(true, { "theme-custom": JSON.stringify([plain]) });
    env.adobeFonts.load.mockClear();
    t.setPreference("custom:abc");
    expect(env.adobeFonts.load).not.toHaveBeenCalled();
    expect(JSON.parse(env.data.get("theme-vars") ?? "{}").adobe).toBe(false);

    t.preview({ ...plain, fontText: "proxima" });
    expect(env.adobeFonts.load).toHaveBeenCalled();
  });
});
