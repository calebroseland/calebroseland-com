import { Store } from "@tanstack/store";
import { type CustomTheme, customTheme, needsAdobeFonts, themeVars } from "./custom.ts";

const builtInThemes = ["auto", "light", "dark"] as const;
type BuiltInTheme = (typeof builtInThemes)[number];
export type ThemePreference = BuiltInTheme | `custom:${string}`;
export type ResolvedTheme = "light" | "dark";

/* localStorage keys. `theme-vars` holds the active custom theme already resolved to CSS variables, so
   theme-init.js can paint it before the app loads without knowing how themes are built. */
const KEY = "theme";
const CUSTOM_KEY = "theme-custom";
const VARS_KEY = "theme-vars";

export const customPreference = (id: string): ThemePreference => `custom:${id}`;
const customId = (pref: ThemePreference) =>
  pref.startsWith("custom:") ? pref.slice("custom:".length) : null;

function read(storage: ThemeEnv["storage"], key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(storage: ThemeEnv["storage"], key: string, value: string | null) {
  try {
    if (value === null) storage?.removeItem(key);
    else storage?.setItem(key, value);
  } catch {
    // storage unavailable (private mode); the theme lives for the session only
  }
}

/** Stored themes that fail to parse are dropped one by one, not all at once. */
function readCustomThemes(storage: ThemeEnv["storage"]): CustomTheme[] {
  try {
    const raw: unknown = JSON.parse(read(storage, CUSTOM_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((t) => {
      const parsed = customTheme.safeParse(t);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

function readPreference(storage: ThemeEnv["storage"], themes: CustomTheme[]): ThemePreference {
  const v = read(storage, KEY);
  if ((builtInThemes as readonly (string | null)[]).includes(v)) return v as BuiltInTheme;
  const id = v && customId(v as ThemePreference);
  return id && themes.some((t) => t.id === id) ? (v as ThemePreference) : "auto";
}

export function resolveTheme(pref: BuiltInTheme, systemDark: boolean): ResolvedTheme {
  return pref === "auto" ? (systemDark ? "dark" : "light") : pref;
}

export type ThemeEnv = {
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  media?: Pick<MediaQueryList, "matches" | "addEventListener" | "removeEventListener">;
  root?: {
    dataset: DOMStringMap;
    style: Pick<CSSStyleDeclaration, "setProperty" | "removeProperty">;
  };
  /** The Adobe Fonts kit: whether the default theme needs it, and how to load it once one does. */
  adobeFonts?: { byDefault: boolean; load: () => void };
};

type ThemeState = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  customThemes: CustomTheme[];
};

/** Holds the preference and saved custom themes; the result lives on <html> (data-theme + variables). */
export function createThemeStore(env: ThemeEnv) {
  const themes = readCustomThemes(env.storage);
  const store = new Store<ThemeState>({
    preference: readPreference(env.storage, themes),
    resolved: "light",
    customThemes: themes,
  });
  let preview: CustomTheme | null = null;
  let applied: string[] = [];

  const activeCustom = (): CustomTheme | null => {
    if (preview) return preview;
    const id = customId(store.state.preference);
    return store.state.customThemes.find((t) => t.id === id) ?? null;
  };

  const apply = () => {
    const custom = activeCustom();
    const pref = store.state.preference;
    const resolved = custom
      ? custom.base
      : resolveTheme(customId(pref) ? "auto" : (pref as BuiltInTheme), env.media?.matches ?? false);
    store.setState((s) => (s.resolved === resolved ? s : { ...s, resolved }));

    const vars = custom ? themeVars(custom) : {};
    if (env.root) {
      env.root.dataset.theme = resolved;
      for (const name of applied) if (!(name in vars)) env.root.style.removeProperty(name);
      for (const [name, value] of Object.entries(vars)) env.root.style.setProperty(name, value);
    }
    applied = Object.keys(vars);
    const adobe = custom ? needsAdobeFonts(custom) : (env.adobeFonts?.byDefault ?? false);
    if (adobe) env.adobeFonts?.load();
    if (!preview)
      write(env.storage, VARS_KEY, custom ? JSON.stringify({ base: resolved, vars, adobe }) : null);
  };
  apply();

  const onChange = () => {
    if (store.state.preference === "auto" && !preview) apply();
  };
  env.media?.addEventListener("change", onChange);

  const saveThemes = (customThemes: CustomTheme[]) => {
    store.setState((s) => ({ ...s, customThemes }));
    write(env.storage, CUSTOM_KEY, JSON.stringify(customThemes));
  };

  return {
    store,
    setPreference(pref: ThemePreference) {
      store.setState((s) => ({ ...s, preference: pref }));
      write(env.storage, KEY, pref);
      apply();
    },
    /** Shows a theme without saving it (the editor's live preview); null returns to the preference. */
    preview(theme: CustomTheme | null) {
      preview = theme;
      apply();
    },
    /** Adds or replaces a theme and selects it. */
    saveCustom(theme: CustomTheme) {
      const themes = store.state.customThemes;
      saveThemes(
        themes.some((t) => t.id === theme.id)
          ? themes.map((t) => (t.id === theme.id ? theme : t))
          : [...themes, theme],
      );
      preview = null;
      this.setPreference(customPreference(theme.id));
    },
    /** Removes a theme; if it was selected, the preference falls back to auto. */
    deleteCustom(id: string) {
      saveThemes(store.state.customThemes.filter((t) => t.id !== id));
      preview = null;
      if (customId(store.state.preference) === id) this.setPreference("auto");
      else apply();
    },
    dispose() {
      env.media?.removeEventListener("change", onChange);
    },
  };
}

export type ThemeController = ReturnType<typeof createThemeStore>;

export const newThemeId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Date.now().toString(36);

function browserEnv(): ThemeEnv {
  if (typeof window === "undefined") return {};
  const env: ThemeEnv = { root: document.documentElement };
  try {
    env.storage = window.localStorage;
  } catch {
    // access can throw under strict privacy settings; theme then lives for the session only
  }
  // Written by the content plugin into index.html; theme-init.js has linked the kit already if needed.
  const kit = document.querySelector<HTMLMetaElement>('meta[name="adobe-fonts"]');
  if (kit)
    env.adobeFonts = {
      byDefault: kit.dataset.default === "on",
      load: () => {
        if (document.getElementById("adobe-fonts")) return;
        const link = Object.assign(document.createElement("link"), {
          id: "adobe-fonts",
          rel: "stylesheet",
          href: kit.content,
        });
        document.head.append(link);
      },
    };
  // jsdom and very old browsers lack matchMedia; auto then resolves to light
  if (typeof window.matchMedia === "function")
    env.media = window.matchMedia("(prefers-color-scheme: dark)");
  return env;
}

export const themeController: ThemeController = createThemeStore(browserEnv());
