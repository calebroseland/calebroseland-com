/* The editor edits the real files on the branch you have checked out, through the dev server's
   /@local routes (vite/local-store.ts). An edit is an unstaged change you commit yourself, next to any
   code change. The head is a hash of the content tree, so an edit made in your code editor between
   load and save is caught rather than silently overwritten. */

export type TreeFile = { path: string; content: string; encoding: 'utf-8' | 'base64' };

/** Everything under content/, with the hash a write must name to be accepted. */
export type Tree = { headSha: string; files: TreeFile[] };

/** A file to write beside the others in an entry's directory. An image goes as its bytes. */
export type FileInput = { path: string; content: string | Blob };

/** A file under content/ changed on disk since the tree the write was based on. */
export class ChangedOnDiskError extends Error {
  constructor(public readonly headSha: string) {
    super('The content directory changed on disk since it was read');
    this.name = 'ChangedOnDiskError';
  }
}

const json = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(input, init);
  if (res.status === 409) {
    const body = (await res.json().catch(() => ({}))) as { headSha?: string };
    throw new ChangedOnDiskError(body.headSha ?? 'unknown');
  }
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${input} failed: ${res.status}`);
  }
  return (await res.json()) as T;
};

const post = <T>(input: string, body: unknown): Promise<T> =>
  json<T>(input, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

export const readTree = (): Promise<Tree> => json<Tree>('/@local/tree');

/** The branch checked out in the repository the dev server runs from. */
export const readBranch = async (): Promise<string> =>
  (await json<{ branch: string }>('/@local/status')).branch;

/* Images are streamed to disk one at a time, then the text files go in a single write. Each call
   checks the tree it was given and returns the tree it produced, so the chain keeps detecting a change
   made elsewhere without an image ever being encoded as a string. */
export const writeFiles = async (input: {
  dir: string;
  files: FileInput[];
  expectedHeadSha: string;
}): Promise<{ headSha: string }> => {
  let head = input.expectedHeadSha;
  for (const file of input.files) {
    if (typeof file.content === 'string') {
      continue;
    }
    const query = new URLSearchParams({ path: `${input.dir}/${file.path}`, expectedHeadSha: head });
    const uploaded = await json<{ headSha: string }>(`/@local/upload?${query}`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: file.content,
    });
    head = uploaded.headSha;
  }

  const text = input.files.flatMap((f) =>
    typeof f.content === 'string'
      ? [{ path: `${input.dir}/${f.path}`, content: f.content, encoding: 'utf-8' as const }]
      : [],
  );
  if (text.length === 0) {
    return { headSha: head };
  }
  return post<{ headSha: string }>('/@local/write', { files: text, expectedHeadSha: head });
};

/** Removes a whole entry directory. */
export const deleteDir = async (dir: string): Promise<void> => {
  await post('/@local/delete', { dir });
};
