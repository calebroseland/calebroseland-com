import { toBase64 } from './base64.ts';
import {
  type Bundle,
  DRAFT_PREFIX,
  type Draft,
  draftRef,
  type GitHubClient,
  isBinaryContent,
  type PullRequest,
  StaleRefError,
  slugFromRef,
  toBytes,
  type Viewer,
} from './types.ts';

/* In-memory GitHub with just enough git semantics for the editor: branches with a head sha, a flat
   file map per branch, pull requests, and squash merges into the default branch. Used by tests and by
   local development when no GitHub App exists. State can be persisted through a storage adapter. */

type Branch = {
  headSha: string;
  files: Map<string, { content: string; encoding: 'utf-8' | 'base64'; sha: string }>;
};

export type FakeState = {
  viewer: Viewer;
  defaultBranch: string;
  branches: Record<
    string,
    {
      headSha: string;
      files: Record<string, { content: string; encoding: 'utf-8' | 'base64'; sha: string }>;
    }
  >;
  pulls: Array<PullRequest & { base: string; title: string; body: string }>;
  nextPr: number;
  /** When set, saveBundle throws StaleRefError once: simulates another writer. */
  conflictOnce?: boolean;
};

export type FakeStorage = { load(): FakeState | null; save(state: FakeState): void };

let counter = 0;
const sha = (seed: string) => {
  counter += 1;
  let h = 2166136261;
  for (const c of `${seed}:${counter}`) {
    h = (h ^ c.charCodeAt(0)) * 16777619;
  }
  return (h >>> 0).toString(16).padStart(8, '0').repeat(5);
};

export const initialFakeState = (): FakeState => {
  return {
    viewer: {
      login: 'fake-user',
      name: 'Fake User',
      avatarUrl:
        'data:image/svg+xml,'
        + encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#1c7a84"/></svg>',
        ),
    },
    defaultBranch: 'master',
    branches: { master: { headSha: sha('master'), files: {} } },
    pulls: [],
    nextPr: 1,
  };
};

export const createFakeClient = (
  opts: {
    storage?: FakeStorage;
    state?: FakeState;
    latencyMs?: number;
    /** Files for a fresh default branch, so a new fake repository starts with the content the site
        already shows instead of empty. Not consulted once the default branch has files. */
    seed?: () => Promise<Bundle['files']>;
  } = {},
): GitHubClient & { state: FakeState; reset(): void } => {
  const existing = opts.state ?? opts.storage?.load();
  let state: FakeState = existing ?? initialFakeState();
  const persist = () => opts.storage?.save(state);
  const seedOnce = async () => {
    const files = await opts.seed?.().catch(() => []);
    if (!files?.length) {
      return;
    }
    state.branches[state.defaultBranch] = {
      headSha: sha('seed'),
      files: Object.fromEntries(
        files.map((f) => [f.path, { content: f.content, encoding: f.encoding, sha: f.sha }]),
      ),
    };
    persist();
  };
  // A default branch that is still empty is seeded too, so state saved before seeding existed catches up.
  const hasFiles = Object.keys(existing?.branches[existing.defaultBranch]?.files ?? {}).length > 0;
  let seeded: Promise<void> | undefined = hasFiles ? Promise.resolve() : undefined;
  const delay = async () => {
    seeded ??= seedOnce();
    await seeded;
    if (opts.latencyMs) {
      await new Promise((r) => setTimeout(r, opts.latencyMs));
    }
  };

  const branch = (ref: string): Branch => {
    const b = state.branches[ref];
    if (!b) {
      throw new Error(`Not Found: branch ${ref}`);
    }
    return { headSha: b.headSha, files: new Map(Object.entries(b.files)) };
  };
  const writeBranch = (ref: string, b: Branch) => {
    state.branches[ref] = { headSha: b.headSha, files: Object.fromEntries(b.files) };
  };
  const prFor = (ref: string) =>
    state.pulls.find((p) => p.headRef === ref && p.state === 'open') ?? null;
  const strip = (p: FakeState['pulls'][number]): PullRequest => ({
    number: p.number,
    url: p.url,
    state: p.state,
    merged: p.merged,
    mergeable: p.mergeable,
    headRef: p.headRef,
  });

  return {
    kind: 'fake',
    get defaultBranch() {
      return state.defaultBranch;
    },
    get state() {
      return state;
    },
    reset() {
      state = initialFakeState();
      seeded = undefined;
      persist();
    },

    async getViewer() {
      await delay();
      return state.viewer;
    },

    async listDrafts() {
      await delay();
      return Object.entries(state.branches)
        .filter(([ref]) => ref.startsWith(DRAFT_PREFIX))
        .map(([ref, b]) => {
          const pr = prFor(ref);
          return {
            ref,
            slug: slugFromRef(ref),
            headSha: b.headSha,
            pr: pr ? strip(pr) : null,
          } satisfies Draft;
        });
    },

    async createDraft(slug) {
      await delay();
      const ref = draftRef(slug);
      if (state.branches[ref]) {
        throw new Error(`Reference already exists: ${ref}`);
      }
      const base = branch(state.defaultBranch);
      writeBranch(ref, { headSha: base.headSha, files: base.files });
      persist();
      return { ref, slug, headSha: base.headSha, pr: null };
    },

    async readBundle(ref, dir) {
      await delay();
      const b = branch(ref);
      const files = [...b.files.entries()]
        .filter(([p]) => p.startsWith(`${dir}/`))
        .map(([path, f]) => ({ path, ...f }));
      return { ref, headSha: b.headSha, files } satisfies Bundle;
    },

    async saveBundle({ ref, dir, files, message, expectedHeadSha }) {
      await delay();
      const b = branch(ref);
      if (state.conflictOnce) {
        state.conflictOnce = false;
        const moved = sha('conflict');
        writeBranch(ref, { ...b, headSha: moved });
        persist();
        throw new StaleRefError(ref, expectedHeadSha, moved);
      }
      if (b.headSha !== expectedHeadSha) {
        throw new StaleRefError(ref, expectedHeadSha, b.headSha);
      }
      for (const f of files) {
        const raw = f.content;
        const binary = isBinaryContent(raw);
        const content = binary ? toBase64(await toBytes(raw)) : raw;
        b.files.set(`${dir}/${f.path}`, {
          content,
          encoding: binary || f.encoding === 'base64' ? 'base64' : 'utf-8',
          sha: sha(content),
        });
      }
      const headSha = sha(message);
      writeBranch(ref, { headSha, files: b.files });
      persist();
      return { headSha, commitUrl: `https://github.example/commit/${headSha}` };
    },

    async deleteDraft(ref) {
      await delay();
      delete state.branches[ref];
      for (const p of state.pulls) {
        if (p.headRef === ref && p.state === 'open') {
          p.state = 'closed';
        }
      }
      persist();
    },

    async openPullRequest({ ref, title, body }) {
      await delay();
      branch(ref);
      const open = prFor(ref);
      if (open) {
        return strip(open);
      }
      const number = state.nextPr++;
      const pr = {
        number,
        url: `https://github.example/pull/${number}`,
        state: 'open' as const,
        merged: false,
        mergeable: true,
        headRef: ref,
        base: state.defaultBranch,
        title,
        body,
      };
      state.pulls.push(pr);
      persist();
      return strip(pr);
    },

    async getPullRequest(ref) {
      await delay();
      const pr = prFor(ref);
      return pr ? strip(pr) : null;
    },

    async mergePullRequest(number) {
      await delay();
      const pr = state.pulls.find((p) => p.number === number);
      if (pr?.state !== 'open') {
        throw new Error(`Not Found: pull ${number}`);
      }
      if (pr.mergeable === false) {
        throw new Error('Pull Request is not mergeable');
      }
      const head = branch(pr.headRef);
      const base = branch(pr.base);
      for (const [p, f] of head.files) {
        base.files.set(p, f);
      }
      const mergeSha = sha(`merge:${number}`);
      writeBranch(pr.base, { headSha: mergeSha, files: base.files });
      pr.state = 'closed';
      pr.merged = true;
      persist();
      return { sha: mergeSha };
    },
  };
};
