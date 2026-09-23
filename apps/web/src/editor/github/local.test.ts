import { StaleRefError } from "@crc/github-client";
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

  it("streams a binary as bytes and chains the tree hash into the text write", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    mockFetch((url, init) => {
      calls.push({ url, ...(init ? { init } : {}) });
      if (url.startsWith("/@local/upload")) return Response.json({ headSha: "after-image" });
      if (url === "/@local/write") return Response.json({ headSha: "after-text" });
      return Response.json(tree);
    });

    const result = await createLocalClient().saveBundle({
      ref: "working tree",
      dir: "content/posts/2026/09-18-one",
      files: [
        { path: "index.md", content: "# hi" },
        { path: "hero.png", content: new Blob([new Uint8Array([1, 2, 3])]) },
      ],
      message: "ignored",
      expectedHeadSha: "abc123",
    });

    const upload = calls.find((c) => c.url.startsWith("/@local/upload"));
    const uploadUrl = new URL(upload?.url ?? "", "http://x");
    expect(uploadUrl.searchParams.get("path")).toBe("content/posts/2026/09-18-one/hero.png");
    expect(uploadUrl.searchParams.get("expectedHeadSha")).toBe("abc123");
    // The bytes go up as a body, never as a string in a JSON document.
    expect(upload?.init?.body).toBeInstanceOf(Blob);

    const write = calls.find((c) => c.url === "/@local/write");
    const body = JSON.parse(String(write?.init?.body)) as {
      files: Array<{ path: string }>;
      expectedHeadSha: string;
    };
    expect(body.files.map((f) => f.path)).toEqual(["content/posts/2026/09-18-one/index.md"]);
    // Chained: the image moved the tree, so the text write carries the hash the upload returned.
    expect(body.expectedHeadSha).toBe("after-image");
    expect(result.headSha).toBe("after-text");
  });

  it("sends a large image byte for byte, with no encoding step to overflow", async () => {
    const bytes = new Uint8Array(300_000);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
    let uploaded: Blob | null = null;
    mockFetch((url, init) => {
      if (url.startsWith("/@local/upload")) {
        uploaded = init?.body as Blob;
        return Response.json({ headSha: "def456" });
      }
      return Response.json(tree);
    });

    await createLocalClient().saveBundle({
      ref: "working tree",
      dir: "content/posts/2026/09-19-one",
      files: [{ path: "hero.jpg", content: new Blob([bytes]) }],
      message: "m",
      expectedHeadSha: "abc123",
    });

    expect(uploaded).toBeInstanceOf(Blob);
    expect(new Uint8Array(await (uploaded as unknown as Blob).arrayBuffer())).toEqual(bytes);
  });

  it("turns a changed-on-disk rejection into a stale-ref error", async () => {
    mockFetch(() => Response.json({ error: "stale", headSha: "moved" }, { status: 409 }));
    await expect(
      createLocalClient().saveBundle({
        ref: "working tree",
        dir: "d",
        files: [{ path: "index.md", content: "# hi" }],
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
