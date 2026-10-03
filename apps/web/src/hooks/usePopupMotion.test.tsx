import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enterPopup, leavePopup } from "../components/motion/presets.ts";
import { usePopupMotion } from "./usePopupMotion.ts";
import { useReduceMotion } from "./useReduceMotion.ts";

vi.mock("../components/motion/presets.ts", () => ({
  canAnimate: true,
  enterPopup: vi.fn(() => [{ stop: vi.fn() }]),
  leavePopup: vi.fn(() => [{ stop: vi.fn() }]),
}));
vi.mock("./useReduceMotion.ts", () => ({ useReduceMotion: vi.fn(() => false) }));

function popup(attrs: Record<string, string> = {}) {
  const el = document.createElement("div");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

describe("usePopupMotion", () => {
  beforeEach(() => {
    vi.mocked(enterPopup).mockClear();
    vi.mocked(leavePopup).mockClear();
    vi.mocked(useReduceMotion).mockReturnValue(false);
  });

  it("springs a popup in on mount and out on close", () => {
    const { result } = renderHook(() => usePopupMotion("menu"));
    const el = popup();
    act(() => result.current.ref(el));
    expect(enterPopup).toHaveBeenCalledWith(el, "menu");
    act(() => result.current.onOpenChange(false));
    expect(leavePopup).toHaveBeenCalledWith(el, "menu");
  });

  it("animates a click-opened menu, which Base UI also marks data-instant", () => {
    const { result } = renderHook(() => usePopupMotion("menu"));
    act(() => result.current.ref(popup({ "data-instant": "click" })));
    expect(enterPopup).toHaveBeenCalledTimes(1);
  });

  it("swaps a tooltip at once when moving along a group", () => {
    const { result } = renderHook(() => usePopupMotion("tip"));
    act(() => result.current.ref(popup({ "data-instant": "delay" })));
    expect(enterPopup).not.toHaveBeenCalled();
  });

  it("does nothing with reduced motion", () => {
    vi.mocked(useReduceMotion).mockReturnValue(true);
    const { result } = renderHook(() => usePopupMotion("tip"));
    act(() => result.current.ref(popup()));
    act(() => result.current.onOpenChange(false));
    expect(enterPopup).not.toHaveBeenCalled();
    expect(leavePopup).not.toHaveBeenCalled();
  });

  it("keeps one ref across renders, so an open popup never replays its entrance", () => {
    const { result, rerender } = renderHook(() => usePopupMotion("menu"));
    const first = result.current.ref;
    rerender();
    expect(result.current.ref).toBe(first);
  });
});
