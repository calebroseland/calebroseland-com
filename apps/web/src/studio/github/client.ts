import {
  createFakeClient,
  createOctokitClient,
  type FakeState,
  type GitHubClient,
  type RepoRef,
} from "@crc/github-client";
import type { Session } from "../auth/store.ts";

export const repo: RepoRef = {
  owner: "calebroseland",
  repo: "calebroseland-com",
  defaultBranch: "master",
};

const FAKE_KEY = "crc:fake-github";

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
export function fakeClient() {
  fakeSingleton ??= createFakeClient({ storage: fakeStorage(), latencyMs: 120 });
  return fakeSingleton;
}
export function resetFake() {
  fakeClient().reset();
}

/** One client per session; the fake persists to localStorage so a dev session survives reloads. */
export function clientFor(session: Session): GitHubClient {
  if (session.status !== "authenticated") throw new Error("Not signed in");
  return session.backend === "fake" ? fakeClient() : createOctokitClient(session.token, repo);
}
