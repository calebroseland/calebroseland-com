import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { themeController } from "../theme/store.ts";
import { ThemeMenu } from "./ThemeMenu.tsx";

const root = document.documentElement;

beforeEach(() => {
  for (const t of themeController.store.state.customThemes) themeController.deleteCustom(t.id);
  themeController.preview(null);
  themeController.setPreference("auto");
  localStorage.clear();
});

async function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: /^Theme:/ }));
  return screen.findByRole("menu");
}

async function newTheme() {
  fireEvent.click(within(await openMenu()).getByRole("menuitem", { name: /New custom theme/ }));
  return screen.findByRole("dialog", { name: "New theme" });
}

describe("ThemeMenu", () => {
  it("lists the built-in themes with the current one checked, and switches on choice", async () => {
    render(<ThemeMenu />);
    const menu = await openMenu();
    expect(within(menu).getByRole("menuitemradio", { name: "Auto" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(within(menu).getByRole("menuitemradio", { name: "Dark" }));

    expect(root.dataset.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /^Theme: Dark/ })).toBeInTheDocument();
  });

  it("creates a custom theme that previews live, saves, and appears checked in the menu", async () => {
    render(<ThemeMenu />);
    const dialog = await newTheme();

    fireEvent.change(within(dialog).getByRole("textbox", { name: "Name" }), {
      target: { value: "Ember" },
    });
    fireEvent.click(within(dialog).getByRole("radio", { name: "Dark" }));
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Accent" }), {
      target: { value: "e8590c" },
    });

    // The page behind the sheet is the preview; nothing is stored yet.
    await waitFor(() => expect(root.style.getPropertyValue("--accent-600")).toContain("#e8590c"));
    expect(root.dataset.theme).toBe("dark");
    expect(localStorage.getItem("theme-custom")).toBeNull();

    fireEvent.click(within(dialog).getByRole("button", { name: "Save theme" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(localStorage.getItem("theme")).toMatch(/^custom:/);
    expect(screen.getByRole("button", { name: /^Theme: Ember/ })).toBeInTheDocument();

    const menu = await openMenu();
    expect(within(menu).getByRole("menuitemradio", { name: "Ember" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(within(menu).getByRole("menuitem", { name: "Edit Ember…" })).toBeInTheDocument();
  });

  it("cancel puts back what was showing", async () => {
    themeController.setPreference("light");
    render(<ThemeMenu />);
    const dialog = await newTheme();
    fireEvent.click(within(dialog).getByRole("radio", { name: "Dark" }));
    await waitFor(() => expect(root.dataset.theme).toBe("dark"));

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(root.dataset.theme).toBe("light");
    expect(root.style.getPropertyValue("--accent-600")).toBe("");
    expect(themeController.store.state.customThemes).toHaveLength(0);
  });

  it("sliders are labelled, show their value, and reset to the default", async () => {
    render(<ThemeMenu />);
    const dialog = await newTheme();
    const size = within(dialog).getByRole("slider", { name: "Text size" });
    expect(size).toHaveAttribute("aria-valuetext", "100%");
    fireEvent.keyDown(size, { key: "ArrowRight" });
    await waitFor(() => expect(size).toHaveAttribute("aria-valuetext", "102.5%"));
    await waitFor(() =>
      expect(root.style.getPropertyValue("--font-size-base")).toBe("calc(1rem * 1.025)"),
    );

    fireEvent.click(within(dialog).getByRole("button", { name: "Reset text size to 100%" }));
    await waitFor(() => expect(size).toHaveAttribute("aria-valuetext", "100%"));
  });

  it("deleting the selected custom theme asks once more, then falls back to auto", async () => {
    render(<ThemeMenu />);
    fireEvent.click(within(await newTheme()).getByRole("button", { name: "Save theme" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(within(await openMenu()).getByRole("menuitem", { name: /^Edit / }));
    const dialog = await screen.findByRole("dialog", { name: "Edit theme" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(themeController.store.state.customThemes).toHaveLength(1);
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete for good" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(themeController.store.state.customThemes).toHaveLength(0);
    expect(themeController.store.state.preference).toBe("auto");
    expect(root.style.getPropertyValue("--accent-600")).toBe("");
  });
});
