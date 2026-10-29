import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChangedOnDiskError, deleteDir, readBranch, readTree, writeFiles } from './workingTree.ts';

/* These talk to the dev server's local store; the store itself is exercised by the editor E2E against
   a real dev server and a scratch content directory. */

const tree = {
  headSha: 'abc123',
  files: [{ path: 'content/pages/about/index.md', content: '# about', encoding: 'utf-8' }],
};

const mockFetch = (handler: (url: string, init?: RequestInit) => Response | Promise<Response>) => {
  const spy = vi.fn(handler as typeof fetch);
  vi.stubGlobal('fetch', spy);
  return spy;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('working tree', () => {
  it('reads the tree and names the checked-out branch', async () => {
    mockFetch((url) => Response.json(url === '/@local/status' ? { branch: 'feat/thing' } : tree));
    expect(await readTree()).toEqual(tree);
    expect(await readBranch()).toBe('feat/thing');
  });

  it('streams an image as bytes and chains the tree hash into the text write', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    mockFetch((url, init) => {
      calls.push({ url, ...(init ? { init } : {}) });
      if (url.startsWith('/@local/upload')) {
        return Response.json({ headSha: 'after-image' });
      }
      return Response.json({ headSha: 'after-text' });
    });

    const result = await writeFiles({
      dir: 'content/posts/2026/09-18-one',
      files: [
        { path: 'index.md', content: '# hi' },
        { path: 'hero.png', content: new Blob([new Uint8Array([1, 2, 3])]) },
      ],
      expectedHeadSha: 'abc123',
    });

    const upload = calls.find((c) => c.url.startsWith('/@local/upload'));
    const uploadUrl = new URL(upload?.url ?? '', 'http://x');
    expect(uploadUrl.searchParams.get('path')).toBe('content/posts/2026/09-18-one/hero.png');
    expect(uploadUrl.searchParams.get('expectedHeadSha')).toBe('abc123');
    // The bytes go up as a body, never as a string in a JSON document.
    expect(upload?.init?.body).toBeInstanceOf(Blob);

    const write = calls.find((c) => c.url === '/@local/write');
    const body = JSON.parse(String(write?.init?.body)) as {
      files: Array<{ path: string }>;
      expectedHeadSha: string;
    };
    expect(body.files.map((f) => f.path)).toEqual(['content/posts/2026/09-18-one/index.md']);
    // Chained: the image moved the tree, so the text write carries the hash the upload returned.
    expect(body.expectedHeadSha).toBe('after-image');
    expect(result.headSha).toBe('after-text');
  });

  it('sends a large image byte for byte, with no encoding step to overflow', async () => {
    const bytes = new Uint8Array(300_000);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = i % 251;
    }
    let uploaded: Blob | null = null;
    mockFetch((_url, init) => {
      uploaded = init?.body as Blob;
      return Response.json({ headSha: 'def456' });
    });

    const result = await writeFiles({
      dir: 'content/posts/2026/09-19-one',
      files: [{ path: 'hero.jpg', content: new Blob([bytes]) }],
      expectedHeadSha: 'abc123',
    });

    expect(new Uint8Array(await (uploaded as unknown as Blob).arrayBuffer())).toEqual(bytes);
    expect(result.headSha).toBe('def456');
  });

  it('turns a changed-on-disk rejection into its own error', async () => {
    mockFetch(() => Response.json({ error: 'stale', headSha: 'moved' }, { status: 409 }));
    const write = writeFiles({
      dir: 'd',
      files: [{ path: 'index.md', content: '# hi' }],
      expectedHeadSha: 'abc123',
    });
    await expect(write).rejects.toBeInstanceOf(ChangedOnDiskError);
    await expect(write).rejects.toMatchObject({ headSha: 'moved' });
  });

  it('deletes an entry directory', async () => {
    const spy = mockFetch(() => Response.json({ headSha: 'x' }));
    await deleteDir('content/pages/about');
    expect(spy).toHaveBeenCalledWith('/@local/delete', expect.objectContaining({ method: 'POST' }));
    const init = spy.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(String(init?.body)).toContain('content/pages/about');
  });
});
