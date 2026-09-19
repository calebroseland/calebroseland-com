import {
  createFakeClient,
  createOctokitClient,
  type FakeState,
  type GitHubClient,
  type RepoRef,
} from "@crc/github-client";
import type { Session } from "../auth/store.ts";

const repo: RepoRef = {
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
function fakeClient() {
  fakeSingleton ??= createFakeClient({ storage: fakeStorage(), latencyMs: 120 });
  return fakeSingleton;
}

/* With the dev server started as CRC_LOCAL_PUBLISH=1, a merge on the fake backend writes the merged
   content files to disk so the site's build-time content pipeline picks them up and the post really
   renders. Without that flag the endpoint does not exist and the 404 is ignored. */
async function writeMergedContentToDisk(
  files: Record<string, { content: string; encoding: "utf-8" | "base64" }>,
) {
  const payload = Object.entries(files)
    .filter(([path]) => path.startsWith("content/"))
    .map(([path, file]) => ({ path, content: file.content, encoding: file.encoding }));
  if (payload.length === 0) return;
  try {
    await fetch("/@content/write", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ files: payload }),
    });
  } catch {
    // The local publish target is optional; the merge itself already succeeded.
  }
}

/** One client per session; the fake persists to localStorage so a dev session survives reloads. */
export function clientFor(session: Session): GitHubClient {
  if (session.status !== "authenticated") throw new Error("Not signed in");
  if (session.backend !== "fake") return createOctokitClient(session.token, repo);
  const fake = fakeClient();
  if (!__LOCAL_PUBLISH__) return fake;
  return {
    ...fake,
    async mergePullRequest(number) {
      const merged = await fake.mergePullRequest(number);
      await writeMergedContentToDisk(fake.state.branches[fake.state.defaultBranch]?.files ?? {});
      return merged;
    },
  };
}
