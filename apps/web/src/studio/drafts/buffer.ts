import type { Entry } from "@crc/content-schema";
import { Store } from "@tanstack/store";

/* The editor's working copy for one draft. Mirrored to localStorage (debounced by the caller) so a
   reload or a lost session restores unsaved work. Nothing here commits; explicit save does. */

export type BufferAsset = {
  name: string;
  type: string;
  dataUrl: string;
  alt: string;
  width: number;
  height: number;
};

/** Entry frontmatter with the date as a string. Distributes over the union so `kind` stays a discriminant. */
type EntryDraftMeta = Entry extends infer T
  ? T extends { date: Date }
    ? Omit<T, "date"> & { date: string }
    : never
  : never;

export type Buffer = {
  ref: string;
  dir: string;
  /** Head sha the buffer was loaded from; saveBundle sends it as the optimistic lock. */
  baseHeadSha: string;
  markdown: string;
  meta: EntryDraftMeta;
  assets: BufferAsset[];
  /** Assets that exist on the branch already (not re-uploaded on save). */
  existingAssets: string[];
  dirty: boolean;
  restoredFromLocal: boolean;
  updatedAt: string;
};

const key = (ref: string) => `crc:buffer:${ref}`;

export type BufferStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readLocalBuffer(ref: string, storage: BufferStorage | undefined): Buffer | null {
  try {
    const raw = storage?.getItem(key(ref));
    if (!raw) return null;
    const b = JSON.parse(raw) as Buffer;
    return typeof b.markdown === "string" && typeof b.baseHeadSha === "string"
      ? { ...b, restoredFromLocal: true }
      : null;
  } catch {
    return null;
  }
}

export function writeLocalBuffer(b: Buffer, storage: BufferStorage | undefined) {
  try {
    if (b.dirty) storage?.setItem(key(b.ref), JSON.stringify({ ...b, restoredFromLocal: false }));
    else storage?.removeItem(key(b.ref));
  } catch {
    // storage full or blocked: the in-memory buffer still works
  }
}

export function createBufferStore(initial: Buffer) {
  const store = new Store<Buffer>(initial);
  const touch = (patch: Partial<Buffer>) =>
    store.setState((s) => ({
      ...s,
      ...patch,
      dirty: true,
      restoredFromLocal: false,
      updatedAt: new Date().toISOString(),
    }));
  return {
    store,
    setMarkdown: (markdown: string) => {
      if (markdown !== store.state.markdown) touch({ markdown });
    },
    setMeta: (meta: Partial<Buffer["meta"]>) => touch({ meta: { ...store.state.meta, ...meta } }),
    addAsset: (asset: BufferAsset) =>
      touch({ assets: [...store.state.assets.filter((a) => a.name !== asset.name), asset] }),
    setAlt: (name: string, alt: string) =>
      touch({ assets: store.state.assets.map((a) => (a.name === name ? { ...a, alt } : a)) }),
    removeAsset: (name: string) =>
      touch({ assets: store.state.assets.filter((a) => a.name !== name) }),
    markSaved: (headSha: string) =>
      store.setState((s) => ({
        ...s,
        baseHeadSha: headSha,
        dirty: false,
        restoredFromLocal: false,
        existingAssets: [...new Set([...s.existingAssets, ...s.assets.map((a) => a.name)])],
        assets: [],
        updatedAt: new Date().toISOString(),
      })),
    rebase: (headSha: string) => store.setState((s) => ({ ...s, baseHeadSha: headSha })),
    /** Drop everything local and start again from a freshly loaded buffer. */
    replace: (next: Buffer) =>
      store.setState(() => ({ ...next, dirty: false, restoredFromLocal: false })),
  };
}

export type BufferController = ReturnType<typeof createBufferStore>;

/** Alt text is required for every new image before save. */
export function missingAlt(b: Buffer): BufferAsset[] {
  return b.assets.filter((a) => !a.alt.trim());
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const bin = atob(dataUrl.slice(comma + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
