import { fromBase64, StaleRefError } from "@crc/github-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalClient, deleteLocalEntry } from "./local.ts";

/* The working-tree client talks to the dev server's local store; the store itself is exercised by the
   local-mode E2E against a real dev server and a scratch content directory. */

const md = (slug: string) =>
  `---\nkind: post\ntitle: T\nslug: ${slug}\ndate: 2026-09-18\ndraft: false\ntags: []\n---\n\nbody\n`;

const tree = {
  headSha: "abc123",
  files: [
    {
      path: "content/posts/2026/09-18-one/index.md",
      content: md("one"),
      sha: "",
      encoding: "utf-8",
    },
    { path: "content/posts/2026/09-18-one/hero.png", content: "AAA", sha: "", encoding: "base64" },
    { path: "content/pages/about/index.md", content: md("about"), sha: "", encoding: "utf-8" },
    { path: "content/profile.yaml", content: "name: x", sha: "", encoding: "utf-8" },
    {
      path: "content/posts/2026/09-18-bad/index.md",
      content: "---\nkind: post\n---\n",
      sha: "",
      encoding: "utf-8",
    },
  ],
};

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const spy = vi.fn(handler as typeof fetch);
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("working-tree client", () => {
  it("names the checked-out branch as the viewer", async () => {
    mockFetch(() => Response.json({ branch: "feat/thing" }));
    const viewer = await createLocalClient().getViewer();
    expect(viewer).toMatchObject({ login: "feat/thing", name: "working tree" });
  });

  it("offers every readable entry for editing and skips malformed ones", async () => {
    mockFetch(() => Response.json(tree));
    const drafts = await createLocalClient().listDrafts();
    expect(drafts.map((d) => d.slug).sort()).toEqual(["about", "one"]);
    expect(drafts.every((d) => d.ref === "working tree" && d.pr === null)).toBe(true);
    expect(drafts[0]?.headSha).toBe("abc123");
  });

  it("reads a bundle scoped to its directory", async () => {
    mockFetch(() => Response.json(tree));
    const bundle = await createLocalClient().readBundle("ignored", "content/posts/2026/09-18-one");
    expect(bundle.files.map((f) => f.path)).toEqual([
      "content/posts/2026/09-18-one/index.md",
      "content/posts/2026/09-18-one/hero.png",
    ]);
    expect(bundle.headSha).toBe("abc123");
  });

  it("writes files under the entry directory, encoding binaries", async () => {
    let sent: { files: Array<{ path: string; encoding: string }>; expectedHeadSha: string } | null =
      null;
    mockFetch((url, init) => {
      if (url === "/@local/write") {
        sent = JSON.parse(String(init?.body));
        return Response.json({ headSha: "def456" });
      }
      return Response.json(tree);
    });
    const result = await createLocalClient().saveBundle({
      ref: "working tree",
      dir: "content/posts/2026/09-18-one",
      files: [
        { path: "index.md", content: "# hi" },
        { path: "hero.png", content: new Uint8Array([1, 2, 3]) },
      ],
      message: "ignored",
      expectedHeadSha: "abc123",
    });
    expect(result.headSha).toBe("def456");
    expect(sent).toMatchObject({ expectedHeadSha: "abc123" });
    expect(sent?.files.map((f) => f.path)).toEqual([
      "content/posts/2026/09-18-one/index.md",
      "content/posts/2026/09-18-one/hero.png",
    ]);
    expect(sent?.files[1]?.encoding).toBe("base64");
  });

  it("writes an image larger than the argument-stack limit", async () => {
    // A photo resized for the web is a few hundred kB; encoding it in one spread call used to throw.
    const bytes = new Uint8Array(300_000);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
    let sent: { files: Array<{ path: string; content: string; encoding: string }> } | null = null;
    mockFetch((url, init) => {
      if (url === "/@local/write") {
        sent = JSON.parse(String(init?.body));
        return Response.json({ headSha: "def456" });
      }
      return Response.json(tree);
    });

    await createLocalClient().saveBundle({
      ref: "working tree",
      dir: "content/posts/2026/09-19-one",
      files: [{ path: "hero.jpg", content: bytes }],
      message: "m",
      expectedHeadSha: "abc123",
    });

    const file = sent?.files[0];
    expect(file?.encoding).toBe("base64");
    expect(fromBase64(file?.content ?? "")).toEqual(bytes);
  });

  it("turns a changed-on-disk rejection into a stale-ref error", async () => {
    mockFetch(() => Response.json({ error: "stale", headSha: "moved" }, { status: 409 }));
    await expect(
      createLocalClient().saveBundle({
        ref: "working tree",
        dir: "d",
        files: [],
        message: "m",
        expectedHeadSha: "abc123",
      }),
    ).rejects.toBeInstanceOf(StaleRefError);
  });

  it("has no pull requests and refuses to merge", async () => {
    mockFetch(() => Response.json(tree));
    const gh = createLocalClient();
    expect(await gh.getPullRequest("working tree")).toBeNull();
    expect(() => gh.mergePullRequest(1)).toThrow(/not available/);
  });

  it("deletes an entry directory", async () => {
    const spy = mockFetch(() => Response.json({ headSha: "x" }));
    await deleteLocalEntry("content/pages/about");
    expect(spy).toHaveBeenCalledWith("/@local/delete", expect.objectContaining({ method: "POST" }));
    const init = spy.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(String(init?.body)).toContain("content/pages/about");
  });
});
