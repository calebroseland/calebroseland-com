import { Octokit } from '@octokit/core';
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods';
import { toBase64 } from './base64.ts';
import {
  AuthError,
  type Bundle,
  DRAFT_PREFIX,
  type Draft,
  draftRef,
  type FileInput,
  type GitHubClient,
  isBinaryContent,
  type PullRequest,
  type RepoRef,
  StaleRefError,
  slugFromRef,
  toBytes,
  type Viewer,
} from './types.ts';

const MyOctokit = Octokit.plugin(restEndpointMethods);

const toPr = (pr: {
  number: number;
  html_url: string;
  state: string;
  merged_at?: string | null;
  mergeable?: boolean | null;
  head: { ref: string };
}): PullRequest => {
  return {
    number: pr.number,
    url: pr.html_url,
    state: pr.state === 'open' ? 'open' : 'closed',
    merged: Boolean(pr.merged_at),
    mergeable: pr.mergeable ?? null,
    headRef: pr.head.ref,
  };
};

/** Real GitHub through @octokit/core + REST plugin. Subrequest counts per method are noted for the Worker budget, though calls run in the browser. */
export const createOctokitClient = (token: string, repo: RepoRef): GitHubClient => {
  const octokit = new MyOctokit({ auth: token });
  const base = { owner: repo.owner, repo: repo.repo };

  const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      if (
        typeof err === 'object'
        && err
        && 'status'
        && (err as { status?: number }).status === 401
      ) {
        throw new AuthError();
      }
      throw err;
    }
  };

  return {
    kind: 'octokit',
    defaultBranch: repo.defaultBranch,

    getViewer: () =>
      wrap(async () => {
        const { data } = await octokit.rest.users.getAuthenticated();
        return { login: data.login, name: data.name, avatarUrl: data.avatar_url } satisfies Viewer;
      }),

    listDrafts: () =>
      wrap(async () => {
        const [{ data: refs }, { data: prs }] = await Promise.all([
          octokit.rest.git.listMatchingRefs({ ...base, ref: `heads/${DRAFT_PREFIX}` }),
          octokit.rest.pulls.list({ ...base, state: 'open', per_page: 100 }),
        ]);
        return refs.map((r) => {
          const ref = r.ref.replace(/^refs\/heads\//, '');
          const pr = prs.find((p) => p.head.ref === ref);
          return {
            ref,
            slug: slugFromRef(ref),
            headSha: r.object.sha,
            pr: pr ? toPr(pr) : null,
          } satisfies Draft;
        });
      }),

    createDraft: (slug) =>
      wrap(async () => {
        const { data: head } = await octokit.rest.git.getRef({
          ...base,
          ref: `heads/${repo.defaultBranch}`,
        });
        const ref = draftRef(slug);
        await octokit.rest.git.createRef({
          ...base,
          ref: `refs/heads/${ref}`,
          sha: head.object.sha,
        });
        return { ref, slug, headSha: head.object.sha, pr: null };
      }),

    readBundle: (ref, dir) =>
      wrap(async () => {
        const { data: head } = await octokit.rest.git.getRef({ ...base, ref: `heads/${ref}` });
        const { data: tree } = await octokit.rest.git.getTree({
          ...base,
          tree_sha: head.object.sha,
          recursive: '1',
        });
        const inDir = tree.tree.filter((t) => t.type === 'blob' && t.path?.startsWith(`${dir}/`));
        const files = await Promise.all(
          inDir.map(async (t) => {
            const { data: blob } = await octokit.rest.git.getBlob({
              ...base,
              file_sha: t.sha as string,
            });
            const isText = /\.(md|ya?ml|json|txt|css|svg)$/i.test(t.path as string);
            return {
              path: t.path as string,
              sha: t.sha as string,
              encoding: isText ? ('utf-8' as const) : ('base64' as const),
              content: isText
                ? new TextDecoder().decode(
                    Uint8Array.from(atob(blob.content.replace(/\n/g, '')), (c) => c.charCodeAt(0)),
                  )
                : blob.content.replace(/\n/g, ''),
            };
          }),
        );
        return { ref, headSha: head.object.sha, files } satisfies Bundle;
      }),

    saveBundle: ({ ref, dir, files, message, expectedHeadSha }) =>
      wrap(async () => {
        // 1 getRef + N blobs + 1 tree + 1 commit + 1 updateRef ≈ N + 4 requests
        const { data: head } = await octokit.rest.git.getRef({ ...base, ref: `heads/${ref}` });
        if (head.object.sha !== expectedHeadSha) {
          throw new StaleRefError(ref, expectedHeadSha, head.object.sha);
        }
        const { data: headCommit } = await octokit.rest.git.getCommit({
          ...base,
          commit_sha: head.object.sha,
        });
        const blobs = await Promise.all(
          files.map(async (f: FileInput) => {
            const raw = f.content;
            const binary = isBinaryContent(raw);
            const { data } = await octokit.rest.git.createBlob({
              ...base,
              content: binary ? toBase64(await toBytes(raw)) : raw,
              encoding: binary || f.encoding === 'base64' ? 'base64' : 'utf-8',
            });
            return {
              path: `${dir}/${f.path}`,
              mode: '100644' as const,
              type: 'blob' as const,
              sha: data.sha,
            };
          }),
        );
        const { data: tree } = await octokit.rest.git.createTree({
          ...base,
          base_tree: headCommit.tree.sha,
          tree: blobs,
        });
        const { data: commit } = await octokit.rest.git.createCommit({
          ...base,
          message,
          tree: tree.sha,
          parents: [head.object.sha],
        });
        try {
          await octokit.rest.git.updateRef({ ...base, ref: `heads/${ref}`, sha: commit.sha });
        } catch (err) {
          // 422 is a non-fast-forward: another save moved the branch after the check above.
          if ((err as { status?: number }).status !== 422) {
            throw err;
          }
          const { data: now } = await octokit.rest.git.getRef({ ...base, ref: `heads/${ref}` });
          throw new StaleRefError(ref, expectedHeadSha, now.object.sha);
        }
        return { headSha: commit.sha, commitUrl: commit.html_url };
      }),

    deleteDraft: (ref) =>
      wrap(async () => void (await octokit.rest.git.deleteRef({ ...base, ref: `heads/${ref}` }))),

    openPullRequest: ({ ref, title, body }) =>
      wrap(async () => {
        const { data } = await octokit.rest.pulls.create({
          ...base,
          head: ref,
          base: repo.defaultBranch,
          title,
          body,
        });
        return toPr(data);
      }),

    getPullRequest: (ref) =>
      wrap(async () => {
        const { data } = await octokit.rest.pulls.list({
          ...base,
          head: `${repo.owner}:${ref}`,
          state: 'open',
          per_page: 1,
        });
        const first = data[0];
        if (!first) {
          return null;
        }
        const { data: full } = await octokit.rest.pulls.get({ ...base, pull_number: first.number });
        return toPr(full);
      }),

    mergePullRequest: (number) =>
      wrap(async () => {
        const { data } = await octokit.rest.pulls.merge({
          ...base,
          pull_number: number,
          merge_method: 'squash',
        });
        return { sha: data.sha };
      }),
  };
};
