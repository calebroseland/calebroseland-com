import { animate } from "motion/mini";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hoverUnderline } from "./presets.ts";

vi.mock("motion/mini", () => ({ animate: vi.fn(() => Promise.resolve()) }));

function navLink(status?: "active") {
  const link = document.createElement("a");
  if (status) link.dataset.status = status;
  const line = document.createElement("span");
  line.dataset.hover = "underline";
  link.append(line);
  return { link, line };
}

describe("hoverUnderline", () => {
  beforeEach(() => vi.mocked(animate).mockClear());

  it("draws in on hover and hides again on leave", () => {
    const { link, line } = navLink();
    hoverUnderline(link, true);
    expect(animate).toHaveBeenLastCalledWith(line, { scale: "1 1" }, expect.anything());
    hoverUnderline(link, false);
    expect(animate).toHaveBeenLastCalledWith(line, { scale: "0 1" }, expect.anything());
  });

  it("stays drawn on leave for the current page", () => {
    const { link, line } = navLink("active");
    hoverUnderline(link, false);
    expect(animate).toHaveBeenLastCalledWith(line, { scale: "1 1" }, expect.anything());
  });

  it("hands the line back to the stylesheet once it settles, so a route change still moves it", async () => {
    const { link, line } = navLink();
    line.style.setProperty("scale", "1 1");
    hoverUnderline(link, false);
    await Promise.resolve();
    await Promise.resolve();
    expect(line.style.getPropertyValue("scale")).toBe("");
  });
});
