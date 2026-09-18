import { Store } from "@tanstack/store";

/* Who is signed in and how the studio talks to GitHub. Lives in memory, mirrored to sessionStorage
   so a reload keeps the session but closing the tab ends it. */

type Backend = "octokit" | "fake";

export type Session =
  | { status: "anonymous" }
  | { status: "authenticated"; backend: Backend; token: string; expiresAt?: string };

const KEY = "crc:session";

export type SessionEnv = {
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | undefined;
};

function read(storage: SessionEnv["storage"]): Session {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return { status: "anonymous" };
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as Session).status === "authenticated" &&
      typeof (parsed as { token?: unknown }).token === "string" &&
      ((parsed as { backend?: unknown }).backend === "octokit" ||
        (parsed as { backend?: unknown }).backend === "fake")
    ) {
      return parsed as Session;
    }
  } catch {
    // unreadable storage: start anonymous
  }
  return { status: "anonymous" };
}

export function createSessionStore(env: SessionEnv) {
  const store = new Store<Session>(read(env.storage));
  const persist = () => {
    try {
      if (store.state.status === "authenticated")
        env.storage?.setItem(KEY, JSON.stringify(store.state));
      else env.storage?.removeItem(KEY);
    } catch {
      // storage unavailable; session lives in memory only
    }
  };
  return {
    store,
    signIn(session: Extract<Session, { status: "authenticated" }>) {
      store.setState(() => session);
      persist();
    },
    signOut() {
      store.setState(() => ({ status: "anonymous" }));
      persist();
    },
  };
}

export type SessionController = ReturnType<typeof createSessionStore>;

export const session: SessionController = createSessionStore(
  typeof window === "undefined" ? {} : { storage: safeSessionStorage() },
);

function safeSessionStorage(): SessionEnv["storage"] {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

/* PKCE handshake state also lives in sessionStorage, keyed separately so it can be cleared on completion. */
const HANDSHAKE = "crc:oauth-handshake";
export type Handshake = { verifier: string; state: string; returnTo: string };

export function saveHandshake(h: Handshake, storage: SessionEnv["storage"] = safeSessionStorage()) {
  storage?.setItem(HANDSHAKE, JSON.stringify(h));
}
export function takeHandshake(
  storage: SessionEnv["storage"] = safeSessionStorage(),
): Handshake | null {
  try {
    const raw = storage?.getItem(HANDSHAKE);
    storage?.removeItem(HANDSHAKE);
    if (!raw) return null;
    const h = JSON.parse(raw) as Partial<Handshake>;
    return typeof h.verifier === "string" && typeof h.state === "string"
      ? {
          verifier: h.verifier,
          state: h.state,
          returnTo: typeof h.returnTo === "string" ? h.returnTo : "/studio",
        }
      : null;
  } catch {
    return null;
  }
}
