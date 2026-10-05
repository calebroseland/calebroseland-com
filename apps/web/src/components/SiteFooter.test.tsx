import type { Profile } from "@crc/content-schema";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { detailsExpanded } from "./detailsState.ts";
import { SiteFooter } from "./SiteFooter.tsx";

const profile = {
  name: "Name",
  tagline: "Tag",
  tags: [],
  groups: [
    {
      title: "Code",
      links: [{ label: "GitHub", url: "https://github.test", icon: "simple-icons:github" }],
    },
    { title: "Writings", links: [{ label: "Posts", url: "/posts", icon: "lucide:pencil" }] },
    {
      title: "Social",
      inline: true,
      links: [{ label: "Bluesky", url: "https://bsky.test", icon: "simple-icons:npm" }],
    },
  ],
  contact: { email: "name@example.com" },
} as unknown as Profile;

function renderFooter() {
  const routeTree = createRootRoute({ component: () => <SiteFooter profile={profile} /> });
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("SiteFooter", () => {
  beforeEach(() => detailsExpanded.setState(() => false));

  it("starts collapsed, one line of named links, and the copyright", async () => {
    renderFooter();
    const toggle = await screen.findByRole("button", { name: "Expand the footer" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const links = screen.getByRole("navigation", { name: "Profiles and writing" });
    expect(within(links).getByRole("link", { name: /GitHub/ })).toBeInTheDocument();
    expect(within(links).getByRole("link", { name: "Posts" })).toHaveAttribute("href", "/posts");
    expect(screen.getByText(/© \d{4} Name/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
  });

  it("a held Enter toggles the footer once, as Space does", async () => {
    renderFooter();
    const toggle = await screen.findByRole("button", { name: "Expand the footer" });
    // fireEvent returns false when the handler prevented the default, here the button's click.
    expect(fireEvent.keyDown(toggle, { key: "Enter" })).toBe(true);
    expect(fireEvent.keyDown(toggle, { key: "Enter", repeat: true })).toBe(false);
  });

  it("expanded, an inline group stays a row of icons while the others show labels", async () => {
    renderFooter();
    fireEvent.click(await screen.findByRole("button", { name: "Expand the footer" }));
    const social = screen.getByRole("region", { name: "Social" });
    const code = screen.getByRole("region", { name: "Code" });
    expect(social).toHaveAttribute("data-icons");
    expect(code).not.toHaveAttribute("data-icons");
    expect(within(social).getByRole("link", { name: /Bluesky/ })).toBeInTheDocument();
  });

  it("the copyright line links the site's own pages, the same collapsed or expanded", async () => {
    renderFooter();
    const names = async () =>
      within(await screen.findByRole("navigation", { name: "Fine print" }))
        .getAllByRole("link")
        .map((l) => l.textContent);
    // No privacy page in the fixture, so no link to one.
    expect(await names()).toEqual(["About", "Contact"]);
    fireEvent.click(await screen.findByRole("button", { name: "Expand the footer" }));
    expect(await names()).toEqual(["About", "Contact"]);
  });

  it("expands and collapses, and keeps the choice when it remounts on the next page", async () => {
    const first = renderFooter();
    fireEvent.click(await screen.findByRole("button", { name: "Expand the footer" }));
    expect(screen.getByRole("button", { name: "Collapse the footer" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    first.unmount();
    renderFooter();
    fireEvent.click(await screen.findByRole("button", { name: "Collapse the footer" }));
    expect(screen.getByRole("button", { name: "Expand the footer" })).toBeInTheDocument();
  });
});
