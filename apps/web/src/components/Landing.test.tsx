import { fireEvent, render, screen, within } from "@testing-library/react";
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
    contact: {
      email: "someone@example.com",
      phone: "+1 555 010 0000",
      location: { label: "Somewhere, USA", url: "https://maps.example.com/?q=Somewhere" },
    },
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

const nav = () => screen.getByRole("navigation", { name: "Profiles and links" });

describe("Landing", () => {
  it("renders the name as the page heading and the tagline", async () => {
    await renderLanding();
    expect(screen.getByRole("heading", { level: 1, name: "Placeholder Name" })).toBeInTheDocument();
    expect(screen.getByText("Placeholder tagline")).toBeInTheDocument();
  });

  it("collapsed, shows only each group's first link, opening in a new tab", async () => {
    await renderLanding();
    const links = within(nav()).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "https://github.com/x",
      "https://linkedin.com/in/x",
    ]);
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[0]).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(links[0]).toHaveAccessibleName(/GitHub.*opens in new tab/);
    // Headings and tags belong to the expanded card; hidden rows are unmounted, not just invisible.
    expect(within(nav()).queryAllByRole("heading")).toHaveLength(0);
    expect(screen.queryByRole("list", { name: "Focus areas" })).not.toBeInTheDocument();
  });

  it("show more reveals every link under its group heading, and show less folds them away", async () => {
    await renderLanding();
    const toggle = screen.getByRole("button", { name: "show more" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", nav().id);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAccessibleName("show less");
    expect(
      within(nav())
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(["Code", "Social"]);
    expect(within(nav()).getAllByRole("link")).toHaveLength(3);
    expect(
      within(screen.getByRole("list", { name: "Focus areas" })).getAllByRole("listitem"),
    ).toHaveLength(2);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await vi.waitFor(() => expect(within(nav()).getAllByRole("link")).toHaveLength(2));
  });

  it("falls back to a generic icon for an unknown icon name instead of crashing", async () => {
    await renderLanding();
    fireEvent.click(screen.getByRole("button", { name: "show more" }));
    expect(screen.getByRole("link", { name: /Unknown icon/ })).toBeInTheDocument();
  });

  it("turns over to the contact side and back, moving focus with the card", async () => {
    await renderLanding();
    fireEvent.click(screen.getByRole("button", { name: "Contact information" }));

    const close = await screen.findByRole("button", { name: "Back to links" });
    await vi.waitFor(() => expect(close).toHaveFocus());
    const contact = screen.getByRole("list", { name: "Contact" });
    expect(within(contact).getByRole("link", { name: /\+1 555 010 0000/ })).toHaveAttribute(
      "href",
      "tel:+15550100000",
    );
    expect(within(contact).getByRole("link", { name: /someone@example.com/ })).toHaveAttribute(
      "href",
      "mailto:someone@example.com",
    );
    expect(within(contact).getByRole("link", { name: /Somewhere, USA/ })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(screen.getByRole("heading", { level: 1, name: "Placeholder Name" })).toBeInTheDocument();

    fireEvent.keyDown(close, { key: "Escape" });
    const flip = await screen.findByRole("button", { name: "Contact information" });
    await vi.waitFor(() => expect(flip).toHaveFocus());
    expect(screen.queryByRole("list", { name: "Contact" })).not.toBeInTheDocument();
  });

  it("exposes the theme control and a link to posts", async () => {
    await renderLanding();
    expect(screen.getByRole("button", { name: /Theme: Auto/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Posts" })).toHaveAttribute("href", "/posts");
  });
});
