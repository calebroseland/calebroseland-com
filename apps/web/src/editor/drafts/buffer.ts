import type { Entry } from '@crc/content-schema';
import { Store } from '@tanstack/store';

/* The editor's working copy for one draft. Mirrored to localStorage (debounced by the caller) so a
   reload or a lost session restores unsaved work. Nothing here commits; explicit save does. */

/* A pending image is held as the file itself, not as a base64 string: it goes to disk or to a commit
   as bytes, and the preview is an object URL rather than a copy of the image inside the document. */
export type BufferAsset = {
  name: string;
  type: string;
  blob: Blob;
  objectUrl: string;
  alt: string;
  width: number;
  height: number;
};

/** Entry frontmatter with the date as a string. Distributes over the union so `kind` stays a discriminant. */
type EntryDraftMeta = Entry extends infer T
  ? T extends { date: Date }
    ? Omit<T, 'date'> & { date: string }
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
  /** Set when a restored copy had pending images, which cannot be kept in local storage. */
  imagesDropped: boolean;
  updatedAt: string;
};

const key = (ref: string) => `crc:buffer:${ref}`;

/** Local storage when there is a browser that allows it; the buffer works without it. */
export function browserStorage(): BufferStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export type BufferStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readLocalBuffer(ref: string, storage: BufferStorage | undefined): Buffer | null {
  try {
    const raw = storage?.getItem(key(ref));
    if (!raw) {
      return null;
    }
    const b = JSON.parse(raw) as Buffer & { assetCount?: number };
    if (typeof b.markdown !== 'string' || typeof b.baseHeadSha !== 'string') {
      return null;
    }
    // Images are files, not JSON: a restored copy carries the text and says the images went.
    return {
      ...b,
      assets: [],
      imagesDropped: (b.assetCount ?? 0) > 0,
      restoredFromLocal: true,
    };
  } catch {
    return null;
  }
}

export function writeLocalBuffer(b: Buffer, storage: BufferStorage | undefined): void {
  try {
    if (b.dirty) {
      // Only the text is kept. Serialising images here would blow the storage quota and take the
      // text with it, which is the part that cannot be recovered from anywhere else.
      const { assets, ...rest } = b;
      storage?.setItem(
        key(b.ref),
        JSON.stringify({
          ...rest,
          assets: [],
          assetCount: assets.length,
          restoredFromLocal: false,
        }),
      );
    } else {
      storage?.removeItem(key(b.ref));
    }
  } catch {
    // storage full or blocked: the in-memory buffer still works
  }
}

export type BufferController = {
  store: Store<Buffer>;
  setMarkdown: (markdown: string) => void;
  setMeta: (meta: Partial<Buffer['meta']>) => void;
  addAsset: (asset: BufferAsset) => void;
  setAlt: (name: string, alt: string) => void;
  removeAsset: (name: string) => void;
  markSaved: (headSha: string) => void;
  rebase: (headSha: string) => void;
  /** Drop everything local and start again from a freshly loaded buffer. */
  replace: (next: Buffer) => void;
};

export function createBufferStore(initial: Buffer): BufferController {
  const store = new Store<Buffer>(initial);
  const touch = (patch: Partial<Buffer>) =>
    store.setState((s) => ({
      ...s,
      ...patch,
      dirty: true,
      restoredFromLocal: false,
      imagesDropped: false,
      updatedAt: new Date().toISOString(),
    }));

  const release = (assets: readonly BufferAsset[]) => {
    for (const a of assets) {
      try {
        URL.revokeObjectURL(a.objectUrl);
      } catch {
        // No object URLs outside a browser; nothing to release.
      }
    }
  };
  return {
    store,
    setMarkdown: (markdown: string) => {
      if (markdown !== store.state.markdown) {
        touch({ markdown });
      }
    },
    setMeta: (meta: Partial<Buffer['meta']>) => touch({ meta: { ...store.state.meta, ...meta } }),
    addAsset: (asset: BufferAsset) =>
      touch({ assets: [...store.state.assets.filter((a) => a.name !== asset.name), asset] }),
    setAlt: (name: string, alt: string) =>
      touch({ assets: store.state.assets.map((a) => (a.name === name ? { ...a, alt } : a)) }),
    removeAsset: (name: string) => {
      release(store.state.assets.filter((a) => a.name === name));
      touch({ assets: store.state.assets.filter((a) => a.name !== name) });
    },
    markSaved: (headSha: string) => {
      release(store.state.assets);
      store.setState((s) => ({
        ...s,
        baseHeadSha: headSha,
        dirty: false,
        restoredFromLocal: false,
        existingAssets: [...new Set([...s.existingAssets, ...s.assets.map((a) => a.name)])],
        assets: [],
        imagesDropped: false,
        updatedAt: new Date().toISOString(),
      }));
    },
    rebase: (headSha: string) => store.setState((s) => ({ ...s, baseHeadSha: headSha })),
    replace: (next: Buffer) =>
      store.setState(() => ({ ...next, dirty: false, restoredFromLocal: false })),
  };
}

/** Alt text is required for every new image before save. */
export function missingAlt(b: Buffer): BufferAsset[] {
  return b.assets.filter((a) => !a.alt.trim());
}
