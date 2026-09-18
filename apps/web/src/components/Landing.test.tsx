import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("virtual:content/profile", () => ({
  default: {
    name: "Placeholder Name",
    tagline: "Placeholder tagline",
    tags: ["One", "Two"],
    placeholder: true,
    groups: [
      {
        title: "Code",
        links: [{ label: "GitHub", url: "https://github.com/x", icon: "mdiGithub" }],
      },
      {
        title: "Social",
        links: [
          { label: "LinkedIn", url: "https://linkedin.com/in/x", icon: "mdiLinkedin" },
          { label: "Unknown icon", url: "https://example.com", icon: "mdiDoesNotExist" },
        ],
      },
    ],
  },
}));
vi.mock("virtual:content/index", () => ({ default: [], loaders: {} }));

import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen.ts";

async function renderLanding() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 1 });
}

describe("Landing", () => {
  it("renders the name as the page heading and the tagline", async () => {
    await renderLanding();
    expect(screen.getByRole("heading", { level: 1, name: "Placeholder Name" })).toBeInTheDocument();
    expect(screen.getByText("Placeholder tagline")).toBeInTheDocument();
  });

  it("renders every link with its target, grouped under a heading, opening in a new tab", async () => {
    await renderLanding();
    const nav = screen.getByRole("navigation", { name: "Profiles and links" });
    expect(
      within(nav)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(["Code", "Social"]);
    const github = within(nav).getByRole("link", { name: /GitHub/ });
    expect(github).toHaveAttribute("href", "https://github.com/x");
    expect(github).toHaveAttribute("target", "_blank");
    expect(github).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(github).toHaveAccessibleName(/opens in new tab/);
    expect(within(nav).getAllByRole("link")).toHaveLength(3);
  });

  it("falls back to a generic icon for an unknown icon name instead of crashing", async () => {
    await renderLanding();
    expect(screen.getByRole("link", { name: /Unknown icon/ })).toBeInTheDocument();
  });

  it("lists focus-area tags", async () => {
    await renderLanding();
    expect(
      within(screen.getByRole("list", { name: "Focus areas" })).getAllByRole("listitem"),
    ).toHaveLength(2);
  });

  it("exposes the theme control and a link to posts", async () => {
    await renderLanding();
    expect(screen.getByRole("button", { name: /Theme: Auto/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Posts" })).toHaveAttribute("href", "/posts");
  });
});
