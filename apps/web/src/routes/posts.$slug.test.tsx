import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { meta } = vi.hoisted(() => ({
  meta: {
    id: "posts/x",
    dir: "posts/x",
    kind: "post" as const,
    title: "Alpha",
    slug: "alpha",
    date: "2026-09-19T00:00:00.000Z",
    draft: false,
    tags: ["one"],
    placeholder: true,
  },
}));
vi.mock("virtual:content/index", () => ({ default: [meta], loaders: {} }));
vi.mock("virtual:content/profile", () => ({
  default: {
    name: "Name",
    tagline: "Tag",
    tags: [],
    groups: [{ title: "g", links: [{ label: "L", url: "https://x.test", icon: "mdiGithub" }] }],
    placeholder: true,
  },
}));
vi.mock("../content/entries.ts", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../content/entries.ts")>();
  return {
    ...mod,
    loadEntry: vi.fn(async () => ({
      meta,
      headings: [],
      html: '<h2 id="h">Section</h2><p>Body text</p>',
    })),
  };
});

import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen.ts";

async function renderAt(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

describe("/posts/$slug", () => {
  it("renders the entry with title, date, tags, and body html", async () => {
    await renderAt("/posts/alpha");
    expect(await screen.findByRole("heading", { level: 1, name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByText("September 19, 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "one" })).toHaveAttribute("href", "/posts?tag=one");
    expect(screen.getByRole("heading", { level: 2, name: "Section" })).toBeInTheDocument();
  });

  it("shows the not-found state for an unknown slug", async () => {
    await renderAt("/posts/nope");
    expect(
      await screen.findByRole("heading", { level: 1, name: "That post isn't here." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All posts" })).toBeInTheDocument();
  });
});
