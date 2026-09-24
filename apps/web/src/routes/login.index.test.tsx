import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/* The login page offers what the environment allows. Each case loads the app fresh, since the
   methods are asked of the Worker once per page load. */
async function renderLogin(github: boolean) {
  vi.resetModules();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ github, oauth: false, clientId: null })),
  );
  const { createMemoryHistory, createRouter, RouterProvider } = await import(
    "@tanstack/react-router"
  );
  const { routeTree } = await import("../routeTree.gen.ts");
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/login"] }),
  });
  render(<RouterProvider router={router} />);
}

describe("/login", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("leads with the working tree in dev while GitHub editing is off", async () => {
    vi.stubEnv("DEV", true);
    await renderLogin(false);
    expect(await screen.findByRole("button", { name: "Edit files on this branch" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Sign in with GitHub" })).not.toBeInTheDocument();
    expect(screen.queryByText("Developer options")).not.toBeInTheDocument();
  });

  it("says editing is not available when there is no way to sign in", async () => {
    vi.stubEnv("DEV", false);
    await renderLogin(false);
    expect(await screen.findByText("Editing isn't available on this site.")).toBeVisible();
    expect(within(screen.getByRole("main")).queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers GitHub first, and the rest as developer options, when the flag is on", async () => {
    vi.stubEnv("DEV", true);
    await renderLogin(true);
    expect(await screen.findByRole("button", { name: "Sign in with GitHub" })).toBeDisabled();
    expect(screen.getByText("Developer options")).toBeInTheDocument();
  });
});
