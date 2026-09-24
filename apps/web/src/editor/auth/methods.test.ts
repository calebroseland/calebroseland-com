import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* signInMethods() asks the Worker once per page load, so each case loads the module fresh. */
async function load(config: { github: boolean; oauth: boolean } | "no worker") {
  vi.resetModules();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      config === "no worker"
        ? new Response("not found", { status: 404 })
        : Response.json({ ...config, clientId: config.oauth ? "id" : null }),
    ),
  );
  const methods = await import("./methods.ts");
  const { session } = await import("./store.ts");
  return { ...methods, session };
}

describe("sign-in methods", () => {
  beforeEach(() => vi.stubEnv("DEV", true));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("offers only the working tree in dev while GitHub editing is off", async () => {
    const { signInMethods, canSignIn } = await load({ github: false, oauth: false });
    const m = await signInMethods();
    expect(m).toEqual({ workingTree: true, github: false, oauth: false });
    expect(canSignIn(m)).toBe(true);
  });

  it("offers nothing on a built site without the flag, or without a Worker at all", async () => {
    vi.stubEnv("DEV", false);
    for (const config of [{ github: false, oauth: false }, "no worker"] as const) {
      const { signInMethods, canSignIn } = await load(config);
      expect(canSignIn(await signInMethods())).toBe(false);
    }
  });

  it("offers OAuth only when GitHub editing is on and the app is configured", async () => {
    const { signInMethods } = await load({ github: true, oauth: true });
    expect(await signInMethods()).toEqual({ workingTree: true, github: true, oauth: true });
  });

  it("ends a kept GitHub session once GitHub editing is off, and keeps a working-tree one", async () => {
    const { dropUnavailableSession, session } = await load({ github: false, oauth: false });
    session.signIn({ status: "authenticated", backend: "fake", token: "fake" });
    await dropUnavailableSession();
    expect(session.store.state.status).toBe("anonymous");
    session.signIn({ status: "authenticated", backend: "local", token: "local" });
    await dropUnavailableSession();
    expect(session.store.state.status).toBe("authenticated");
    session.signOut();
  });
});
