import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enterPopup, leavePopup, resetPopup } from "../components/motion/presets.ts";
import { usePopupMotion } from "./usePopupMotion.ts";
import { useReduceMotion } from "./useReduceMotion.ts";

vi.mock("../components/motion/presets.ts", () => ({
  canAnimate: true,
  enterPopup: vi.fn(() => [{ cancel: vi.fn() }]),
  leavePopup: vi.fn(() => [{ cancel: vi.fn() }]),
  resetPopup: vi.fn(),
}));
vi.mock("./useReduceMotion.ts", () => ({ useReduceMotion: vi.fn(() => false) }));

/** A popup element; `shown` stands in for layout, which jsdom does not do. */
function popup(attrs: Record<string, string> = {}, shown = true) {
  const el = document.createElement("div");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  const state = { shown };
  el.checkVisibility = () => state.shown;
  return { el, state };
}

describe("usePopupMotion", () => {
  beforeEach(() => {
    vi.mocked(enterPopup).mockClear();
    vi.mocked(leavePopup).mockClear();
    vi.mocked(useReduceMotion).mockReturnValue(false);
  });

  it("springs a popup in on mount and out on close", () => {
    const { result } = renderHook(() => usePopupMotion("dropdown"));
    const { el } = popup();
    act(() => result.current.ref(el));
    expect(enterPopup).toHaveBeenCalledWith(el, "dropdown");
    act(() => result.current.onOpenChange(false));
    expect(leavePopup).toHaveBeenCalledWith(el, "dropdown");
  });

  it("animates a click-opened menu, which Base UI also marks data-instant", () => {
    const { result } = renderHook(() => usePopupMotion("dropdown"));
    act(() => result.current.ref(popup({ "data-instant": "click" }).el));
    expect(enterPopup).toHaveBeenCalledTimes(1);
  });

  it("swaps a tooltip at once when moving along a group", () => {
    const { result } = renderHook(() => usePopupMotion("tip"));
    act(() => result.current.ref(popup({ "data-instant": "delay" }).el));
    expect(enterPopup).not.toHaveBeenCalled();
  });

  it("drops a tooltip at once when a sibling in its group opens, without its exit", () => {
    const { result } = renderHook(() => usePopupMotion("tip"));
    act(() => result.current.ref(popup().el));
    const [entrance] = vi.mocked(enterPopup).mock.results[0]?.value ?? [];
    act(() => result.current.onOpenChange(false, { reason: "none" }));
    expect(leavePopup).not.toHaveBeenCalled();
    expect(entrance?.cancel).toHaveBeenCalled();
    act(() => result.current.onOpenChange(false, { reason: "trigger-hover" }));
    expect(leavePopup).toHaveBeenCalledTimes(1);
  });

  it("follows an open flag for a popup closed from outside its root, entering once", () => {
    const { result, rerender } = renderHook(({ open }) => usePopupMotion("dialog", open), {
      initialProps: { open: false },
    });
    const { el } = popup();
    rerender({ open: true });
    act(() => result.current.ref(el));
    rerender({ open: true });
    expect(enterPopup).toHaveBeenCalledTimes(1);
    rerender({ open: false });
    expect(leavePopup).toHaveBeenCalledWith(el, "dialog");
    // Reopened while its exit still runs, the same element springs back in.
    rerender({ open: true });
    expect(enterPopup).toHaveBeenCalledTimes(2);
  });

  it("does nothing with reduced motion", () => {
    vi.mocked(useReduceMotion).mockReturnValue(true);
    const { result } = renderHook(() => usePopupMotion("tip"));
    act(() => result.current.ref(popup().el));
    act(() => result.current.onOpenChange(false));
    expect(enterPopup).not.toHaveBeenCalled();
    expect(leavePopup).not.toHaveBeenCalled();
  });

  it("keeps one ref across renders, so an open popup never replays its entrance", () => {
    const { result, rerender } = renderHook(() => usePopupMotion("dropdown"));
    const first = result.current.ref;
    rerender();
    expect(result.current.ref).toBe(first);
  });

  it("does not replay the entrance when Base UI re-attaches the same element", () => {
    const { result } = renderHook(() => usePopupMotion("dropdown"));
    const { el } = popup();
    act(() => result.current.ref(el));
    act(() => result.current.ref(null));
    act(() => result.current.ref(el));
    expect(enterPopup).toHaveBeenCalledTimes(1);
  });

  it("leaves a hidden, kept-mounted popup alone, and springs it in once it shows", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame"] });
    const { result } = renderHook(() => usePopupMotion("dropdown"));
    const { el, state } = popup({}, false);
    act(() => result.current.ref(el));
    act(() => result.current.onOpenChange(false));
    expect(enterPopup).not.toHaveBeenCalled();
    expect(leavePopup).not.toHaveBeenCalled();

    act(() => result.current.onOpenChange(true));
    state.shown = true;
    act(() => vi.advanceTimersToNextFrame());
    expect(enterPopup).toHaveBeenCalledWith(el, "dropdown");
    vi.useRealTimers();
  });

  it("drops a pending entrance when the popup closes within the frame", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
    const { result } = renderHook(() => usePopupMotion("dropdown"));
    const { el, state } = popup({}, false);
    act(() => result.current.ref(el));
    act(() => vi.advanceTimersToNextFrame());
    act(() => result.current.onOpenChange(true));
    act(() => result.current.onOpenChange(false));
    state.shown = true;
    act(() => vi.advanceTimersToNextFrame());
    expect(enterPopup).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("shows a popup that stays hidden past a frame plainly, without its last exit's fade", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame"] });
    vi.mocked(resetPopup).mockClear();
    const { result } = renderHook(() => usePopupMotion("dropdown"));
    const { el } = popup({}, false);
    act(() => result.current.ref(el));
    act(() => vi.advanceTimersToNextFrame());
    expect(enterPopup).not.toHaveBeenCalled();
    expect(resetPopup).toHaveBeenCalledWith(el);
    vi.useRealTimers();
  });
});
