import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { dropIndex, moveIndex, reorder } from "./reorder.ts";

describe("reorder", () => {
  it("moves an item and keeps every element", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 12 }),
        fc.nat(),
        fc.nat(),
        (items, a, b) => {
          const from = a % items.length;
          const to = b % items.length;
          const out = reorder(items, from, to);
          expect([...out].sort()).toEqual([...items].sort());
          expect(out[to]).toBe(items[from]);
        },
      ),
    );
  });

  it("returns a copy when indices are out of range", () => {
    expect(reorder(["a", "b"], 5, 0)).toEqual(["a", "b"]);
  });
});

describe("dropIndex", () => {
  it.each([
    [0, 2, "bottom", 2],
    [0, 2, "top", 1],
    [2, 0, "top", 0],
    [2, 0, "bottom", 1],
    [1, 1, "top", 1],
  ] as const)("from %i onto %i at %s → %i", (from, target, edge, expected) => {
    expect(dropIndex(from, target, edge)).toBe(expected);
  });
});

describe("moveIndex", () => {
  it("clamps at the ends", () => {
    expect(moveIndex(0, 3, "up")).toBe(0);
    expect(moveIndex(2, 3, "down")).toBe(2);
    expect(moveIndex(1, 3, "top")).toBe(0);
    expect(moveIndex(1, 3, "bottom")).toBe(2);
  });
});
