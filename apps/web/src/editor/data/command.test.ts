import { AuthError, StaleRefError } from "@crc/github-client";
import { describe, expect, it } from "vitest";
import { type Failure, toFailure } from "./command.ts";

describe("toFailure", () => {
  it("names the failures a screen answers differently", () => {
    const stale = new StaleRefError("drafts/x", "a", "b");
    const expired = new AuthError();
    const other = new Error("network");
    expect(toFailure(stale)).toEqual<Failure>({ ok: false, reason: "conflict", error: stale });
    expect(toFailure(expired)).toEqual<Failure>({ ok: false, reason: "expired", error: expired });
    expect(toFailure(other)).toEqual<Failure>({ ok: false, reason: "failed", error: other });
  });
});
