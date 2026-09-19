import type { GitHubClient, PullRequest } from "@crc/github-client";
import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { studioKeys } from "../github/queries.ts";

/* Publish = pull request → checks → merge → deploy. The studio never force-merges: a conflicting PR is
   explained and linked, and the merge button only enables when GitHub reports it mergeable. */

export const pullQuery = (gh: GitHubClient, ref: string, opts: { poll?: boolean } = {}) =>
  queryOptions({
    queryKey: studioKeys.pull(ref),
    queryFn: () => gh.getPullRequest(ref),
    staleTime: 5_000,
    refetchInterval: opts.poll ? 15_000 : false,
  });

export type PublishState =
  | { kind: "none" }
  | { kind: "open"; pr: PullRequest; mergeable: boolean | null }
  | { kind: "conflict"; pr: PullRequest }
  | { kind: "merged"; pr: PullRequest };

export function publishState(pr: PullRequest | null): PublishState {
  if (!pr) return { kind: "none" };
  if (pr.merged) return { kind: "merged", pr };
  if (pr.state === "open" && pr.mergeable === false) return { kind: "conflict", pr };
  if (pr.state === "open") return { kind: "open", pr, mergeable: pr.mergeable };
  return { kind: "none" };
}

export function pullRequestBody(input: {
  title: string;
  summary?: string | undefined;
  slug: string;
  ref: string;
}): string {
  return [
    input.summary ? input.summary : `Publish “${input.title}”.`,
    "",
    `- Slug: \`${input.slug}\``,
    `- Branch: \`${input.ref}\``,
    "",
    "Opened from the studio. Merging deploys to production and deletes the draft branch.",
  ].join("\n");
}

export async function openPr(
  gh: GitHubClient,
  queryClient: QueryClient,
  input: { ref: string; title: string; summary?: string | undefined; slug: string },
) {
  const pr = await gh.openPullRequest({
    ref: input.ref,
    title: input.title,
    body: pullRequestBody(input),
  });
  queryClient.setQueryData(studioKeys.pull(input.ref), pr);
  await queryClient.invalidateQueries({ queryKey: studioKeys.drafts() });
  return pr;
}

export async function mergeAndCleanUp(
  gh: GitHubClient,
  queryClient: QueryClient,
  input: { ref: string; number: number },
) {
  const merged = await gh.mergePullRequest(input.number);
  // GitHub's delete_branch_on_merge may already have removed it; ignore a missing ref.
  await gh.deleteDraft(input.ref).catch(() => undefined);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: studioKeys.drafts() }),
    queryClient.invalidateQueries({ queryKey: studioKeys.pull(input.ref) }),
  ]);
  return merged;
}

/** Polls the live health endpoint until the merged sha is deployed, or gives up after `timeoutMs`. */
export async function waitForDeploy(opts: {
  healthUrl: string;
  sha: string;
  timeoutMs?: number;
  intervalMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}): Promise<boolean> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const deadline = now() + (opts.timeoutMs ?? 180_000);
  while (now() < deadline) {
    try {
      const res = await fetchImpl(opts.healthUrl, { cache: "no-store" });
      if (res.ok) {
        const body = (await res.json()) as { sha?: string };
        if (body.sha === opts.sha) return true;
      }
    } catch {
      // transient; keep polling
    }
    await sleep(opts.intervalMs ?? 10_000);
  }
  return false;
}
