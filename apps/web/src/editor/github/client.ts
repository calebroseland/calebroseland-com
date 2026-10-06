import {
  createFakeClient,
  createOctokitClient,
  type FakeState,
  type GitHubClient,
  type RepoRef,
} from '@crc/github-client';
import type { Session } from '../auth/store.ts';
import { CONTENT_ROOT } from '../drafts/paths.ts';
import { createLocalClient } from './local.ts';

/* Edits branch from, and publish into, the branch this build was made from (CONTENT_BRANCH at build
   time), so staging edits what staging shows. */
const repo: RepoRef = {
  owner: 'calebroseland',
  repo: 'calebroseland-com',
  defaultBranch: __CONTENT_BRANCH__,
};

const FAKE_KEY = 'crc:fake-github';

function fakeStorage() {
  return {
    load(): FakeState | null {
      try {
        const raw = window.localStorage.getItem(FAKE_KEY);
        return raw ? (JSON.parse(raw) as FakeState) : null;
      } catch {
        return null;
      }
    },
    save(state: FakeState) {
      try {
        window.localStorage.setItem(FAKE_KEY, JSON.stringify(state));
      } catch {
        // fine: fake state is disposable
      }
    },
  };
}

let fakeSingleton: ReturnType<typeof createFakeClient> | undefined;
function fakeClient() {
  fakeSingleton ??= createFakeClient({
    storage: fakeStorage(),
    latencyMs: 120,
    // In dev the fake's master starts as a copy of content/, so the board lists what the site renders.
    ...(import.meta.env.DEV && {
      seed: async () => (await createLocalClient().readBundle('', CONTENT_ROOT)).files,
    }),
  });
  return fakeSingleton;
}

/** One client per session; the fake persists to localStorage so a dev session survives reloads. */
export function clientFor(session: Session): GitHubClient {
  if (session.status !== 'authenticated') {
    throw new Error('Not signed in');
  }
  if (session.backend === 'local') {
    return createLocalClient();
  }
  if (session.backend !== 'fake') {
    return createOctokitClient(session.token, repo);
  }
  return fakeClient();
}
