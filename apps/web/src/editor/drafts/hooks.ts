import type { Bundle } from '@crc/github-client';
import { useStore } from '@tanstack/react-store';
import { useCallback, useEffect, useState } from 'react';
import { useLatest } from '../../hooks/useLatest.ts';
import {
  type Buffer,
  type BufferController,
  browserStorage,
  createBufferStore,
  readLocalBuffer,
  writeLocalBuffer,
} from './buffer.ts';
import { previewSrc } from './images.ts';
import { bufferFromBundle } from './load.ts';

/** The working copy of one draft: built once per branch from the bundle, or from unsaved work kept on
    this device, and mirrored back to the device as it changes. */
export function useDraftBuffer(bundle: Bundle, slug: string) {
  const [controller] = useState(() => {
    const initial = bufferFromBundle(bundle, slug);
    const local = readLocalBuffer(initial.ref, browserStorage());
    // Unsaved work always wins on load, even when the source moved underneath it: it keeps its own
    // base, so saving is refused with the conflict dialog rather than the edit being thrown away here.
    return createBufferStore(
      local ? { ...local, existingAssets: initial.existingAssets } : initial,
    );
  });
  const buffer = useStore(controller.store);
  useLocalAutosave(buffer);
  useFlushOnUnmount(controller);
  useFlushBeforeLeaving(controller, buffer.dirty);
  return { buffer, controller, previewSrc: usePreviewSrc(bundle, controller) };
}

/** Resolves an image in the document to something the browser can show. Reads the store, not React
    state, because an image is inserted in the same tick its file is added. */
function usePreviewSrc(bundle: Bundle, controller: BufferController) {
  const files = useLatest(bundle.files);
  return useCallback(
    (src: string) => previewSrc(src, controller.store.state, files.current),
    [controller, files],
  );
}

/** Keeps the working copy on this device, debounced; never commits. */
function useLocalAutosave(buffer: Buffer) {
  useEffect(() => {
    const t = setTimeout(() => writeLocalBuffer(buffer, browserStorage()), 500);
    return () => clearTimeout(t);
  }, [buffer]);
}

/** Writes the working copy down when the editor closes, so an edit inside the autosave debounce is
    not lost to an in-app navigation. */
function useFlushOnUnmount(controller: BufferController) {
  useEffect(() => () => writeLocalBuffer(controller.store.state, browserStorage()), [controller]);
}

/** Asks before leaving with unsaved changes, and writes them down first: a reload inside the autosave
    debounce would otherwise lose the edit, and the dev server reloads whenever content changes. */
function useFlushBeforeLeaving(controller: BufferController, dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent) => {
      writeLocalBuffer(controller.store.state, browserStorage());
      e.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty, controller]);
}
