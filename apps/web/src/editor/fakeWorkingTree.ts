import { vi } from 'vitest';
import type { Tree, TreeFile } from './workingTree.ts';

/* For tests: the dev server's /@local routes over an in-memory tree, installed as the global fetch.
   Every write moves the head, and a write naming an older head is refused with a 409 as on disk. */

export type FakeWorkingTree = {
  /** The file's text, or undefined when there is none. */
  read: (path: string) => string | undefined;
  /** Changes a file as an editor outside the browser would, moving the head. */
  touch: (path: string, content: string) => void;
};

const toBase64 = async (body: Blob): Promise<string> => {
  let binary = '';
  for (const byte of new Uint8Array(await body.arrayBuffer())) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

export const installFakeWorkingTree = (
  initial: Record<string, string> = {},
  branch = 'feat/test',
): FakeWorkingTree => {
  const files = new Map<string, TreeFile>(
    Object.entries(initial).map(([path, content]) => [path, { path, content, encoding: 'utf-8' }]),
  );
  let version = 1;
  const head = () => `h${version}`;
  const moved = () => {
    version += 1;
    return Response.json({ headSha: head() });
  };
  const stale = (expected: string | null | undefined) => Boolean(expected) && expected !== head();
  const refuse = () => Response.json({ error: 'stale', headSha: head() }, { status: 409 });

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit): Promise<Response> => {
      const url = new URL(input, 'http://localhost');
      switch (url.pathname) {
        case '/@local/status':
          return Response.json({ branch });
        case '/@local/tree':
          return Response.json({ headSha: head(), files: [...files.values()] } satisfies Tree);
        case '/@local/write': {
          const body = JSON.parse(String(init?.body)) as {
            files: TreeFile[];
            expectedHeadSha?: string;
          };
          if (stale(body.expectedHeadSha)) {
            return refuse();
          }
          for (const f of body.files) {
            files.set(f.path, f);
          }
          return moved();
        }
        case '/@local/upload': {
          if (stale(url.searchParams.get('expectedHeadSha'))) {
            return refuse();
          }
          const path = url.searchParams.get('path') ?? '';
          files.set(path, {
            path,
            content: await toBase64(init?.body as Blob),
            encoding: 'base64',
          });
          return moved();
        }
        case '/@local/delete': {
          const { dir } = JSON.parse(String(init?.body)) as { dir: string };
          for (const path of [...files.keys()]) {
            if (path.startsWith(`${dir}/`)) {
              files.delete(path);
            }
          }
          return moved();
        }
        default:
          return Response.json({ error: 'unknown local-store route' }, { status: 404 });
      }
    }),
  );

  return {
    read: (path) => files.get(path)?.content,
    touch: (path, content) => {
      files.set(path, { path, content, encoding: 'utf-8' });
      version += 1;
    },
  };
};
