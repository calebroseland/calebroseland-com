import { describe, expect, it } from "vitest";
import {
  type Buffer,
  createBufferStore,
  dataUrlToBytes,
  missingAlt,
  readLocalBuffer,
  writeLocalBuffer,
} from "./buffer.ts";

const base: Buffer = {
  ref: "drafts/x",
  dir: "content/posts/2026/09-18-x",
  baseHeadSha: "abc",
  markdown: "# x",
  meta: {
    kind: "post",
    title: "X",
    slug: "x",
    date: "2026-09-18",
    draft: true,
    tags: [],
    placeholder: false,
  },
  assets: [],
  existingAssets: [],
  dirty: false,
  restoredFromLocal: false,
  updatedAt: "2026-09-18T00:00:00.000Z",
};

function mem() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}

describe("buffer store", () => {
  it("marks dirty on edits and clean on save, moving new assets to existing", () => {
    const b = createBufferStore(base);
    b.setMarkdown("# y");
    b.addAsset({
      name: "a.jpg",
      type: "image/jpeg",
      dataUrl: "data:image/jpeg;base64,AA==",
      alt: "",
      width: 1,
      height: 1,
    });
    expect(b.store.state.dirty).toBe(true);
    expect(missingAlt(b.store.state).map((a) => a.name)).toEqual(["a.jpg"]);
    b.setAlt("a.jpg", "An image");
    expect(missingAlt(b.store.state)).toEqual([]);
    b.markSaved("def");
    expect(b.store.state).toMatchObject({
      dirty: false,
      baseHeadSha: "def",
      assets: [],
      existingAssets: ["a.jpg"],
    });
  });

  it("does not dirty on a no-op markdown set", () => {
    const b = createBufferStore(base);
    b.setMarkdown("# x");
    expect(b.store.state.dirty).toBe(false);
  });

  it("persists only while dirty and restores with the restored flag", () => {
    const storage = mem();
    const b = createBufferStore(base);
    writeLocalBuffer(b.store.state, storage);
    expect(storage.m.size).toBe(0);
    b.setMarkdown("# edited");
    writeLocalBuffer(b.store.state, storage);
    expect(readLocalBuffer("drafts/x", storage)).toMatchObject({
      markdown: "# edited",
      restoredFromLocal: true,
    });
    b.markSaved("def");
    writeLocalBuffer(b.store.state, storage);
    expect(readLocalBuffer("drafts/x", storage)).toBeNull();
  });

  it("decodes data urls", () => {
    expect([...dataUrlToBytes("data:image/png;base64,AQID")]).toEqual([1, 2, 3]);
  });
});
