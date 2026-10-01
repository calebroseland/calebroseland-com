import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tip, TipProvider } from "./Tip.tsx";

describe("Tip", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows on touch and hold, and the press that ends the hold does not activate the control", () => {
    const onClick = vi.fn();
    render(
      <TipProvider>
        <Tip label="RSS feed">
          <button type="button" aria-label="RSS" onClick={onClick} />
        </Tip>
      </TipProvider>,
    );
    const button = screen.getByRole("button", { name: "RSS" });
    fireEvent.pointerDown(button, { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByText("RSS feed")).toBeInTheDocument();

    fireEvent.pointerUp(button, { pointerType: "touch" });
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();

    // A quick tap afterwards is an ordinary press.
    fireEvent.pointerDown(button, { pointerType: "touch" });
    fireEvent.pointerUp(button, { pointerType: "touch" });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
