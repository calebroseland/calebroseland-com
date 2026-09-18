import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("virtual:content/index", () => ({
  loaders: {},
  default: [
    {
      id: "a",
      dir: "a",
      kind: "post",
      title: "Alpha",
      slug: "alpha",
      date: "2026-09-19T00:00:00.000Z",
      draft: false,
      tags: ["one"],
      summary: "First",
      placeholder: true,
    },
    {
      id: "b",
      dir: "b",
      kind: "post",
      title: "Beta",
      slug: "beta",
      date: "2026-09-18T00:00:00.000Z",
      draft: false,
      tags: ["two"],
      placeholder: true,
    },
    {
      id: "p",
      dir: "p",
      kind: "page",
      title: "About",
      slug: "about",
      date: "2026-09-18T00:00:00.000Z",
      draft: false,
      tags: [],
      placeholder: true,
    },
  ],
}));
vi.mock("virtual:content/profile", () => ({
  default: {
    name: "Name",
    tagline: "Tag",
    tags: [],
    groups: [{ title: "g", links: [{ label: "L", url: "https://x.test", icon: "mdiGithub" }] }],
    placeholder: true,
  },
}));

import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen.ts";

async function renderAt(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 1 });
  return router;
}

describe("/posts", () => {
  it("lists posts newest first with dates and summaries", async () => {
    await renderAt("/posts");
    const items = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(items).toEqual(["Alpha", "Beta"]);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("September 19, 2026")).toBeInTheDocument();
  });

  it("filters by the typed tag search param and offers to clear", async () => {
    const router = await renderAt("/posts?tag=two");
    expect(router.state.location.search).toEqual({ tag: "two" });
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Beta",
    ]);
    expect(screen.getByRole("link", { name: "Clear filter" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Tags" })).getByRole("link", { name: "two" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("shows the filtered-empty state", async () => {
    await renderAt("/posts?tag=nope");
    expect(screen.getByRole("status")).toHaveTextContent("No posts tagged ‘nope’.");
  });
});
