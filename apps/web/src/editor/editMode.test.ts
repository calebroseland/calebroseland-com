import { isNotFound } from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEditMode } from './editMode.ts';

const mem = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
};

describe('edit mode', () => {
  it('starts off, turns on, and stays on for the next load of the tab', () => {
    const storage = mem();
    const mode = createEditMode({ available: true, storage });
    expect(mode.store.state).toBe(false);
    mode.set(true);
    expect(mode.store.state).toBe(true);
    expect(createEditMode({ available: true, storage }).store.state).toBe(true);
    mode.set(false);
    expect(createEditMode({ available: true, storage }).store.state).toBe(false);
  });

  it('cannot turn on where there is nothing to edit with', () => {
    const storage = mem();
    storage.setItem('crc:edit-mode', 'on');
    const mode = createEditMode({ available: false, storage });
    expect(mode.store.state).toBe(false);
    mode.set(true);
    expect(mode.store.state).toBe(false);
  });

  it('works without storage', () => {
    const mode = createEditMode({ available: true, storage: undefined });
    mode.set(true);
    expect(mode.store.state).toBe(true);
  });
});

/* Whether the site can edit is fixed when the module loads, so each case loads it fresh. */
const load = async (dev: boolean) => {
  vi.resetModules();
  vi.stubEnv('DEV', dev);
  return import('./editMode.ts');
};

describe('requireEditor', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('answers not-found in a built site', async () => {
    const { requireEditor } = await load(false);
    let thrown: unknown;
    try {
      requireEditor();
    } catch (e) {
      thrown = e;
    }
    expect(isNotFound(thrown)).toBe(true);
  });

  it('turns edit mode on under the dev server, since the address asks for the editor', async () => {
    const { requireEditor, editMode } = await load(true);
    expect(editMode.store.state).toBe(false);
    requireEditor();
    expect(editMode.store.state).toBe(true);
  });
});
