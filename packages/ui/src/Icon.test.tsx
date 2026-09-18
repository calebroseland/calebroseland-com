import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon.tsx";
import { mdiGithub } from "./icons.ts";

describe("Icon", () => {
  it("is announced when labelled", () => {
    render(<Icon path={mdiGithub} label="GitHub" />);
    expect(screen.getByRole("img", { name: "GitHub" })).toBeInTheDocument();
  });

  it("is hidden when unlabelled", () => {
    const { container } = render(<Icon path={mdiGithub} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("binds size to the icon token", () => {
    const { container } = render(<Icon path={mdiGithub} size="xl" />);
    expect(container.querySelector("svg")?.getAttribute("style")).toContain("--icon-xl");
  });
});
