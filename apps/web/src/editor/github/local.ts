import type { Bundle, Draft, GitHubClient, PullRequest, Viewer } from '@crc/github-client';
import { isBinaryContent, StaleRefError } from '@crc/github-client';
import { parseEntry } from '@crc/markdown';
import { CONTENT_ROOT } from '../drafts/paths.ts';

/* Working-tree backend: the editor edits the real files on the branch you have checked out, through
   the dev server. There are no branches and no pull requests here, because the edit is not a separate
   unit of work: it is an unstaged change you commit yourself, next to any code change in the same
   branch. The head is a hash of the content tree, so an edit made in your code editor between load
   and save is caught rather than silently overwritten.

   The interface is GitHubClient so the board, the editor and the buffer stay backend-agnostic. The
   pull-request methods are unreachable: the UI hides publishing when `kind` is "local". */

const WORKING_TREE_REF = 'working tree';

type TreeResponse = { headSha: string; files: Bundle['files'] };

const json = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(input, init);
  if (res.status === 409) {
    const body = (await res.json().catch(() => ({}))) as { headSha?: string };
    throw new StaleRefError(WORKING_TREE_REF, '', body.headSha ?? 'unknown');
  }
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${input} failed: ${res.status}`);
  }
  return (await res.json()) as T;
};

const unsupported = (what: string) => (): never => {
  throw new Error(`${what} is not available when editing the working tree`);
};

export const createLocalClient = (): GitHubClient => {
  const tree = () => json<TreeResponse>('/@local/tree');

  return {
    kind: 'local',
    defaultBranch: WORKING_TREE_REF,

    async getViewer(): Promise<Viewer> {
      const status = await json<{ branch: string }>('/@local/status');
      return {
        login: status.branch,
        name: 'working tree',
        avatarUrl:
          'data:image/svg+xml,'
          + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="16" fill="#1c7a84"/></svg>',
          ),
      };
    },

    /* Every entry on disk is directly editable, so each one is offered as its own "draft". The board
       shows them as working-tree rows and the editor opens them without branching first. */
    async listDrafts(): Promise<Draft[]> {
      const { headSha, files } = await tree();
      const drafts: Draft[] = [];
      for (const file of files) {
        if (!file.path.endsWith('/index.md')) {
          continue;
        }
        try {
          drafts.push({
            ref: WORKING_TREE_REF,
            slug: parseEntry(file.content).meta.slug,
            headSha,
            pr: null,
          });
        } catch {
          // Invalid frontmatter is a content problem the build reports; the board skips the row.
        }
      }
      return drafts;
    },

    /** Nothing to branch: the entry is created by the first save. */
    async createDraft(slug: string): Promise<Draft> {
      const { headSha } = await tree();
      return { ref: WORKING_TREE_REF, slug, headSha, pr: null };
    },

    async readBundle(_ref: string, dir: string): Promise<Bundle> {
      const { headSha, files } = await tree();
      const prefix = dir === CONTENT_ROOT ? `${CONTENT_ROOT}/` : `${dir}/`;
      return {
        ref: WORKING_TREE_REF,
        headSha,
        files: files.filter((f) => f.path.startsWith(prefix)),
      };
    },

    /* Binary files are streamed to disk one at a time, then the text files go in a single write. Each
       call checks the tree it was given and returns the tree it produced, so the chain keeps detecting
       a change made elsewhere without an image ever being encoded as a string. */
    async saveBundle({ dir, files, expectedHeadSha }) {
      let head = expectedHeadSha;

      for (const file of files) {
        const raw = file.content;
        if (!isBinaryContent(raw)) {
          continue;
        }
        const body = raw instanceof Blob ? raw : new Blob([raw as BlobPart]);
        const query = new URLSearchParams({ path: `${dir}/${file.path}`, expectedHeadSha: head });
        const uploaded = await json<{ headSha: string }>(`/@local/upload?${query}`, {
          method: 'POST',
          headers: { 'content-type': 'application/octet-stream' },
          body,
        });
        head = uploaded.headSha;
      }

      const text = files
        .filter((f) => !isBinaryContent(f.content))
        .map((f) => ({
          path: `${dir}/${f.path}`,
          content: f.content as string,
          encoding: f.encoding === 'base64' ? ('base64' as const) : ('utf-8' as const),
        }));
      if (text.length === 0) {
        return { headSha: head, commitUrl: '' };
      }

      const { headSha } = await json<{ headSha: string }>('/@local/write', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ files: text, expectedHeadSha: head }),
      });
      return { headSha, commitUrl: '' };
    },

    async deleteDraft(_ref: string): Promise<void> {
      // Deleting "the draft" means deleting the entry itself; the board passes the directory instead.
      throw new Error('Delete an entry with deleteEntry, not deleteDraft');
    },

    openPullRequest: unsupported('Opening a pull request') as GitHubClient['openPullRequest'],
    async getPullRequest(): Promise<PullRequest | null> {
      return null;
    },
    mergePullRequest: unsupported('Merging') as GitHubClient['mergePullRequest'],
  };
};

/** Removes a whole bundle directory from the working tree. */
export const deleteLocalEntry = async (dir: string): Promise<void> => {
  await json('/@local/delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dir }),
  });
};
