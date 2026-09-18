import { Store } from "@tanstack/store";

const themePreferences = ["auto", "light", "dark"] as const;
export type ThemePreference = (typeof themePreferences)[number];
export type ResolvedTheme = "light" | "dark";

const KEY = "theme";

function isThemePreference(v: unknown): v is ThemePreference {
  return typeof v === "string" && (themePreferences as readonly string[]).includes(v);
}

function readStored(storage: Pick<Storage, "getItem"> | undefined): ThemePreference {
  try {
    const v = storage?.getItem(KEY);
    return isThemePreference(v) ? v : "auto";
  } catch {
    return "auto";
  }
}

export function resolveTheme(pref: ThemePreference, systemDark: boolean): ResolvedTheme {
  return pref === "auto" ? (systemDark ? "dark" : "light") : pref;
}

export function nextPreference(pref: ThemePreference): ThemePreference {
  const i = themePreferences.indexOf(pref);
  return themePreferences[(i + 1) % themePreferences.length] as ThemePreference;
}

export type ThemeEnv = {
  storage?: Pick<Storage, "getItem" | "setItem">;
  media?: Pick<MediaQueryList, "matches" | "addEventListener" | "removeEventListener">;
  root?: Pick<HTMLElement, "dataset">;
};

/** Holds the user's preference; the resolved value lives on <html data-theme>. */
export function createThemeStore(env: ThemeEnv) {
  const store = new Store<{ preference: ThemePreference; resolved: ResolvedTheme }>({
    preference: readStored(env.storage),
    resolved: "light",
  });

  const apply = () => {
    const resolved = resolveTheme(store.state.preference, env.media?.matches ?? false);
    store.setState((s) => (s.resolved === resolved ? s : { ...s, resolved }));
    if (env.root) env.root.dataset.theme = resolved;
  };
  apply();

  const onChange = () => {
    if (store.state.preference === "auto") apply();
  };
  env.media?.addEventListener("change", onChange);

  return {
    store,
    setPreference(pref: ThemePreference) {
      store.setState((s) => ({ ...s, preference: pref }));
      try {
        env.storage?.setItem(KEY, pref);
      } catch {
        // storage unavailable (private mode); preference lives for the session only
      }
      apply();
    },
    cycle() {
      this.setPreference(nextPreference(store.state.preference));
    },
    dispose() {
      env.media?.removeEventListener("change", onChange);
    },
  };
}

export type ThemeController = ReturnType<typeof createThemeStore>;

function browserEnv(): ThemeEnv {
  if (typeof window === "undefined") return {};
  const env: ThemeEnv = { root: document.documentElement };
  try {
    env.storage = window.localStorage;
  } catch {
    // access can throw under strict privacy settings; theme then lives for the session only
  }
  // jsdom and very old browsers lack matchMedia; auto then resolves to light
  if (typeof window.matchMedia === "function")
    env.media = window.matchMedia("(prefers-color-scheme: dark)");
  return env;
}

export const themeController: ThemeController = createThemeStore(browserEnv());
