import { createFakeClient } from "@crc/github-client";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import {
  mergeAndCleanUp,
  openPr,
  publishState,
  pullRequestBody,
  waitForDeploy,
} from "./publish.ts";

describe("publishState", () => {
  const pr = {
    number: 1,
    url: "u",
    state: "open" as const,
    merged: false,
    mergeable: true,
    headRef: "drafts/x",
  };
  it.each([
    [null, "none"],
    [pr, "open"],
    [{ ...pr, mergeable: false }, "conflict"],
    [{ ...pr, state: "closed" as const, merged: true }, "merged"],
    [{ ...pr, state: "closed" as const, merged: false }, "none"],
  ])("%j → %s", (input, kind) => {
    expect(publishState(input).kind).toBe(kind);
  });
});

describe("pullRequestBody", () => {
  it("uses the summary when present and names slug and branch", () => {
    const body = pullRequestBody({ title: "T", summary: "S", slug: "t", ref: "drafts/t" });
    expect(body.startsWith("S\n")).toBe(true);
    expect(body).toContain("`drafts/t`");
    expect(pullRequestBody({ title: "T", slug: "t", ref: "drafts/t" })).toContain("Publish “T”.");
  });
});

describe("openPr and mergeAndCleanUp against the fake", () => {
  it("opens, merges, deletes the branch, and invalidates queries", async () => {
    const gh = createFakeClient();
    const qc = new QueryClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const draft = await gh.createDraft("t");
    await gh.saveBundle({
      ref: draft.ref,
      dir: "content/posts/x",
      files: [{ path: "index.md", content: "# t" }],
      message: "m",
      expectedHeadSha: draft.headSha,
    });
    const pr = await openPr(gh, qc, { ref: draft.ref, title: "T", slug: "t" });
    expect(qc.getQueryData(["studio", "pull", draft.ref])).toEqual(pr);
    const merged = await mergeAndCleanUp(gh, qc, { ref: draft.ref, number: pr.number });
    expect(gh.state.branches.master?.headSha).toBe(merged.sha);
    expect(await gh.listDrafts()).toEqual([]);
    expect(invalidate).toHaveBeenCalled();
  });
});

describe("waitForDeploy", () => {
  it("resolves true once the health sha matches and false on timeout", async () => {
    let t = 0;
    const now = () => t;
    const sleep = async (ms: number) => {
      t += ms;
    };
    const responses = ["old", "old", "new"];
    const fetchImpl = (async () =>
      Response.json({ sha: responses.shift() ?? "new" })) as unknown as typeof fetch;
    expect(
      await waitForDeploy({
        healthUrl: "h",
        sha: "new",
        fetchImpl,
        now,
        sleep,
        intervalMs: 10,
        timeoutMs: 1000,
      }),
    ).toBe(true);
    t = 0;
    const never = (async () => Response.json({ sha: "old" })) as unknown as typeof fetch;
    expect(
      await waitForDeploy({
        healthUrl: "h",
        sha: "new",
        fetchImpl: never,
        now,
        sleep,
        intervalMs: 10,
        timeoutMs: 50,
      }),
    ).toBe(false);
  });
});
