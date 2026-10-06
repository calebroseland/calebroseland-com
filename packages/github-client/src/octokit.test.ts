import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOctokitClient } from './octokit.ts';
import { StaleRefError } from './types.ts';

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('octokit client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports a branch moved by a racing save as stale, not as a failure', async () => {
    let refReads = 0;
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      const path = decodeURIComponent(new URL(url).pathname);
      if (path.endsWith('/git/ref/heads/draft/x'))
        return reply(200, { object: { sha: refReads++ === 0 ? 'a' : 'b' } });
      if (path.includes('/git/commits/a')) return reply(200, { tree: { sha: 't0' } });
      if (path.endsWith('/git/blobs')) return reply(201, { sha: 'blob' });
      if (path.endsWith('/git/trees')) return reply(201, { sha: 't1' });
      if (path.endsWith('/git/commits')) return reply(201, { sha: 'c', html_url: 'u' });
      if (path.endsWith('/git/refs/heads/draft/x') && init.method === 'PATCH')
        return reply(422, { message: 'Update is not a fast forward' });
      return reply(404, { message: `unexpected ${init.method} ${path}` });
    });
    const gh = createOctokitClient('token', { owner: 'o', repo: 'r', defaultBranch: 'master' });
    const save = gh.saveBundle({
      ref: 'draft/x',
      dir: 'content/posts/x',
      files: [{ path: 'index.md', content: '# X' }],
      message: 'm',
      expectedHeadSha: 'a',
    });
    await expect(save).rejects.toBeInstanceOf(StaleRefError);
    await expect(save).rejects.toMatchObject({ expected: 'a', actual: 'b' });
  });
});
