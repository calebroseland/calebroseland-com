import { describe, expect, it } from "vitest";
import { createSessionStore, saveHandshake, takeHandshake } from "./store.ts";

function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}

describe("session store", () => {
  it("starts anonymous and persists a sign-in", () => {
    const storage = memStorage();
    const s = createSessionStore({ storage });
    expect(s.store.state).toEqual({ status: "anonymous" });
    s.signIn({ status: "authenticated", backend: "fake", token: "t" });
    expect(createSessionStore({ storage }).store.state).toMatchObject({
      status: "authenticated",
      token: "t",
    });
  });

  it("clears storage on sign-out", () => {
    const storage = memStorage();
    const s = createSessionStore({ storage });
    s.signIn({ status: "authenticated", backend: "octokit", token: "t" });
    s.signOut();
    expect(storage.m.size).toBe(0);
    expect(s.store.state.status).toBe("anonymous");
  });

  it("ignores junk in storage", () => {
    const storage = memStorage();
    storage.setItem("crc:session", '{"status":"authenticated","backend":"evil"}');
    expect(createSessionStore({ storage }).store.state.status).toBe("anonymous");
    storage.setItem("crc:session", "not json");
    expect(createSessionStore({ storage }).store.state.status).toBe("anonymous");
  });

  it("survives a throwing storage", () => {
    const throwing = {
      getItem: () => {
        throw new Error("no");
      },
      setItem: () => {
        throw new Error("no");
      },
      removeItem: () => {
        throw new Error("no");
      },
    };
    const s = createSessionStore({ storage: throwing });
    expect(() => s.signIn({ status: "authenticated", backend: "fake", token: "t" })).not.toThrow();
    expect(s.store.state.status).toBe("authenticated");
  });
});

describe("handshake", () => {
  it("is single-use", () => {
    const storage = memStorage();
    saveHandshake({ verifier: "v", state: "s", returnTo: "/editor/x" }, storage);
    expect(takeHandshake(storage)).toEqual({ verifier: "v", state: "s", returnTo: "/editor/x" });
    expect(takeHandshake(storage)).toBeNull();
  });
});
