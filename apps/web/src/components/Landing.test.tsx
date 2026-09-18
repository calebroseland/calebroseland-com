import type { Profile } from "@crc/content-schema";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Landing } from "./Landing.tsx";
import { MotionProvider } from "./MotionProvider.tsx";

const profile: Profile = {
  name: "Placeholder Name",
  tagline: "Placeholder tagline",
  tags: ["One", "Two"],
  placeholder: true,
  groups: [
    { title: "Code", links: [{ label: "GitHub", url: "https://github.com/x", icon: "mdiGithub" }] },
    {
      title: "Social",
      links: [
        { label: "LinkedIn", url: "https://linkedin.com/in/x", icon: "mdiLinkedin" },
        { label: "Unknown icon", url: "https://example.com", icon: "mdiDoesNotExist" },
      ],
    },
  ],
};

const renderLanding = () =>
  render(
    <MotionProvider>
      <Landing profile={profile} />
    </MotionProvider>,
  );

describe("Landing", () => {
  it("renders the name as the page heading and the tagline", () => {
    renderLanding();
    expect(screen.getByRole("heading", { level: 1, name: "Placeholder Name" })).toBeInTheDocument();
    expect(screen.getByText("Placeholder tagline")).toBeInTheDocument();
  });

  it("renders every link with its target, grouped under a heading, opening in a new tab", () => {
    renderLanding();
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

  it("falls back to a generic icon for an unknown icon name instead of crashing", () => {
    renderLanding();
    expect(screen.getByRole("link", { name: /Unknown icon/ })).toBeInTheDocument();
  });

  it("lists focus-area tags", () => {
    renderLanding();
    const list = screen.getByRole("list", { name: "Focus areas" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("exposes the theme control with its current state", () => {
    renderLanding();
    expect(screen.getByRole("button", { name: /Theme: Auto/ })).toBeInTheDocument();
  });
});
