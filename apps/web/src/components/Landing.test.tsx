import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("virtual:content/profile", () => ({
  default: {
    name: "Placeholder Name",
    tagline: "Placeholder tagline",
    tags: ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"],
    placeholder: true,
    groups: [
      {
        title: "Code",
        links: [{ label: "GitHub", url: "https://github.com/x", icon: "mdiGithub" }],
      },
      {
        title: "Writings",
        links: [{ label: "Posts", url: "/posts", icon: "mdiPencil" }],
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
import { session } from "../studio/auth/store.ts";

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
      "/posts",
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
    ).toEqual(["Code", "Writings", "Social"]);
    expect(within(nav()).getAllByRole("link")).toHaveLength(4);
    expect(
      within(screen.getByRole("list", { name: "Focus areas" })).getAllByRole("listitem"),
    ).toHaveLength(6);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await vi.waitFor(() => expect(within(nav()).getAllByRole("link")).toHaveLength(3));
  });

  it("links each focus area to its posts, and shows the rest behind +N more", async () => {
    await renderLanding();
    fireEvent.click(screen.getByRole("button", { name: "show more" }));
    const areas = screen.getByRole("list", { name: "Focus areas" });
    expect(within(areas).getByRole("link", { name: "Posts tagged One" })).toHaveAttribute(
      "href",
      "/posts?tag=One",
    );
    const more = screen.getByRole("button", { name: "+2 more focus areas" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(more).toHaveAttribute("aria-controls", areas.id);

    fireEvent.click(more);
    expect(within(areas).getAllByRole("link")).toHaveLength(8);
    expect(screen.getByRole("button", { name: "Show fewer focus areas" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
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

  it("exposes the theme control, and links a site page in place rather than in a new tab", async () => {
    await renderLanding();
    expect(screen.getByRole("button", { name: /Theme: Auto/ })).toBeInTheDocument();
    const posts = within(nav()).getByRole("link", { name: "Posts" });
    expect(posts).toHaveAttribute("href", "/posts");
    expect(posts).not.toHaveAttribute("target");
  });

  it("enter leaves the card for the site, with its nav, and moves focus to the page heading", async () => {
    await renderLanding();
    expect(screen.queryByRole("navigation", { name: "Site" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));

    const heading = await screen.findByRole("heading", { level: 1, name: "Latest writing" });
    await vi.waitFor(() => expect(heading).toHaveFocus());
    expect(
      screen.queryByRole("navigation", { name: "Profiles and links" }),
    ).not.toBeInTheDocument();
    const site = screen.getByRole("navigation", { name: "Site" });
    expect(within(site).getByRole("link", { name: "Posts" })).toHaveAttribute("href", "/posts");
    expect(screen.getByRole("link", { name: "Placeholder Name" })).toHaveAttribute("href", "/");
  });

  it("a click on the empty background toggles between the card and the site", async () => {
    await renderLanding();
    // A click on the card itself, or a modified click on the background, stays put.
    fireEvent.click(screen.getByRole("heading", { level: 1 }));
    fireEvent.click(screen.getByRole("main"), { metaKey: true });
    expect(screen.getByRole("button", { name: "Enter" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("main"));
    await screen.findByRole("heading", { level: 1, name: "Latest writing" });

    fireEvent.click(screen.getByRole("heading", { level: 1 }));
    expect(screen.getByRole("navigation", { name: "Site" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("main"));
    await screen.findByRole("button", { name: "Enter" });
  });

  it("the bar's business card button returns to the card, with focus on its heading", async () => {
    await renderLanding();
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));
    const back = await screen.findByRole("link", { name: "Back to business card" });
    expect(back).toHaveAttribute("href", "/");

    fireEvent.click(back);
    const heading = await screen.findByRole("heading", { level: 1, name: "Placeholder Name" });
    await vi.waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByRole("navigation", { name: "Profiles and links" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Site" })).not.toBeInTheDocument();
  });

  it("offers no editing to readers", async () => {
    await renderLanding();
    expect(screen.queryByRole("button", { name: "Edit card" })).not.toBeInTheDocument();
  });

  it("lets a signed-in editor change the card and save it as profile.yaml on drafts/profile", async () => {
    localStorage.clear();
    session.signIn({ status: "authenticated", backend: "fake", token: "fake" });
    try {
      await renderLanding();
      fireEvent.click(screen.getByRole("button", { name: "Edit card" }));
      const form = await screen.findByRole("form", { name: "Edit card" }, { timeout: 5000 });

      fireEvent.change(within(form).getByRole("textbox", { name: "Tagline" }), {
        target: { value: "A better tagline" },
      });
      fireEvent.change(within(form).getByRole("textbox", { name: "New focus area" }), {
        target: { value: "Nine" },
      });
      fireEvent.keyDown(within(form).getByRole("textbox", { name: "New focus area" }), {
        key: "Enter",
      });
      fireEvent.click(within(form).getByRole("button", { name: "Remove One" }));

      // An invalid address blocks saving and says why, on the field.
      const address = within(form).getByRole("textbox", { name: /Address for GitHub/ });
      fireEvent.change(address, { target: { value: "not a url" } });
      expect(address).toHaveAttribute("aria-invalid", "true");
      expect(address).toHaveAccessibleDescription(/full address/);
      expect(within(form).getByRole("button", { name: "Save card" })).toBeDisabled();
      fireEvent.change(address, { target: { value: "https://github.com/x" } });

      fireEvent.click(within(form).getByRole("button", { name: "Save card" }));
      await waitFor(
        () => expect(screen.queryByRole("form", { name: "Edit card" })).not.toBeInTheDocument(),
        { timeout: 5000 },
      );
      const fake = JSON.parse(localStorage.getItem("crc:fake-github") ?? "{}");
      const yaml: string = fake.branches["drafts/profile"].files["content/profile.yaml"].content;
      expect(yaml).toContain("tagline: A better tagline");
      expect(yaml).toMatch(/tags: \[ Two, .*Nine ]/);
      await waitFor(() => expect(screen.getByRole("button", { name: "Edit card" })).toHaveFocus());
    } finally {
      session.signOut();
      localStorage.clear();
    }
  });
});
