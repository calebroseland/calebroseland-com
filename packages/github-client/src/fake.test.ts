import { describe, expect, it } from 'vitest';
import { fromBase64 } from './base64.ts';
import { createFakeClient } from './fake.ts';
import { StaleRefError } from './types.ts';

describe('fake GitHub client', () => {
  it('seeds a fresh default branch once, and ignores the seed once the default branch has files', async () => {
    const about = {
      path: 'content/pages/about/index.md',
      content: '# About',
      sha: 's',
      encoding: 'utf-8' as const,
    };
    let calls = 0;
    const seed = async () => {
      calls += 1;
      return [about];
    };
    const gh = createFakeClient({ seed });
    const [one, two] = await Promise.all([
      gh.readBundle('master', 'content'),
      gh.readBundle('master', 'content'),
    ]);
    expect(one.files.map((f) => f.path)).toEqual([about.path]);
    expect(two.files).toEqual(one.files);
    expect(calls).toBe(1);

    const resumed = createFakeClient({ state: gh.state, seed });
    await resumed.listDrafts();
    expect(calls).toBe(1);
  });

  it('creates a draft from the default branch tip and lists it', async () => {
    const gh = createFakeClient();
    const d = await gh.createDraft('hello');
    expect(d.ref).toBe('drafts/hello');
    expect(d.headSha).toBe(gh.state.branches.master?.headSha);
    expect(await gh.listDrafts()).toEqual([d]);
  });

  it('saves a bundle atomically, advances the head, and reads it back', async () => {
    const gh = createFakeClient();
    const d = await gh.createDraft('hello');
    const saved = await gh.saveBundle({
      ref: d.ref,
      dir: 'content/posts/2026/09-18-hello',
      files: [
        { path: 'index.md', content: '# hi' },
        { path: 'hero.png', content: new Uint8Array([1, 2, 3]) },
      ],
      message: 'save',
      expectedHeadSha: d.headSha,
    });
    expect(saved.headSha).not.toBe(d.headSha);
    const bundle = await gh.readBundle(d.ref, 'content/posts/2026/09-18-hello');
    expect(bundle.headSha).toBe(saved.headSha);
    expect(bundle.files.map((f) => f.path).sort()).toEqual([
      'content/posts/2026/09-18-hello/hero.png',
      'content/posts/2026/09-18-hello/index.md',
    ]);
    expect(bundle.files.find((f) => f.path.endsWith('hero.png'))?.encoding).toBe('base64');
  });

  it('rejects a stale head with StaleRefError and does not write', async () => {
    const gh = createFakeClient();
    const d = await gh.createDraft('hello');
    await expect(
      gh.saveBundle({
        ref: d.ref,
        dir: 'x',
        files: [{ path: 'a', content: '1' }],
        message: 'm',
        expectedHeadSha: '0000',
      }),
    ).rejects.toBeInstanceOf(StaleRefError);
    expect((await gh.readBundle(d.ref, 'x')).files).toEqual([]);
  });

  it('simulates one conflict when asked', async () => {
    const gh = createFakeClient();
    const d = await gh.createDraft('hello');
    gh.state.conflictOnce = true;
    await expect(
      gh.saveBundle({ ref: d.ref, dir: 'x', files: [], message: 'm', expectedHeadSha: d.headSha }),
    ).rejects.toBeInstanceOf(StaleRefError);
    const fresh = await gh.readBundle(d.ref, 'x');
    await expect(
      gh.saveBundle({
        ref: d.ref,
        dir: 'x',
        files: [],
        message: 'm',
        expectedHeadSha: fresh.headSha,
      }),
    ).resolves.toBeTruthy();
  });

  it('opens, reports, and squash-merges a pull request into the default branch', async () => {
    const gh = createFakeClient();
    const d = await gh.createDraft('hello');
    await gh.saveBundle({
      ref: d.ref,
      dir: 'content/posts/x',
      files: [{ path: 'index.md', content: '# hi' }],
      message: 'm',
      expectedHeadSha: d.headSha,
    });
    const pr = await gh.openPullRequest({ ref: d.ref, title: 'Hello', body: '' });
    expect(pr.state).toBe('open');
    expect(await gh.getPullRequest(d.ref)).toEqual(pr);
    expect((await gh.listDrafts())[0]?.pr?.number).toBe(pr.number);
    const merged = await gh.mergePullRequest(pr.number);
    expect(gh.state.branches.master?.headSha).toBe(merged.sha);
    expect(gh.state.branches.master?.files['content/posts/x/index.md']?.content).toBe('# hi');
    expect(await gh.getPullRequest(d.ref)).toBeNull();
    await gh.deleteDraft(d.ref);
    expect(await gh.listDrafts()).toEqual([]);
  });

  it('persists through a storage adapter', async () => {
    let saved: string | null = null;
    const storage = {
      load: () => (saved ? JSON.parse(saved) : null),
      save: (s: unknown) => {
        saved = JSON.stringify(s);
      },
    };
    const a = createFakeClient({ storage });
    await a.createDraft('persisted');
    const b = createFakeClient({ storage });
    expect((await b.listDrafts()).map((d) => d.slug)).toEqual(['persisted']);
  });
});

describe('binary content', () => {
  it('round-trips an image larger than the argument-stack limit', async () => {
    // A photo resized for the web is a few hundred kB; encoding it in one spread call used to throw.
    const bytes = new Uint8Array(300_000);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = i % 251;
    }

    const gh = createFakeClient();
    const draft = await gh.createDraft('with-image');
    await gh.saveBundle({
      ref: draft.ref,
      dir: 'content/posts/2026/09-19-with-image',
      files: [
        { path: 'index.md', content: '# hi' },
        { path: 'hero.jpg', content: bytes },
      ],
      message: 'save',
      expectedHeadSha: draft.headSha,
    });

    const bundle = await gh.readBundle(draft.ref, 'content/posts/2026/09-19-with-image');
    const hero = bundle.files.find((f) => f.path.endsWith('hero.jpg'));
    expect(hero?.encoding).toBe('base64');
    expect(fromBase64(hero?.content ?? '')).toEqual(bytes);
  });
});
