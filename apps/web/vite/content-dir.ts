import type { IncomingMessage } from 'node:http';
import { resolve, sep } from 'node:path';

/** Where content lives. Overridable so tests can point at a scratch copy instead of the repository. */
export const contentDirFor = (root: string): string => {
  return process.env.CRC_CONTENT_DIR
    ? resolve(process.env.CRC_CONTENT_DIR)
    : resolve(root, 'content');
};

/** Whether `abs` is `dir` or inside it. A bare prefix match would also admit a sibling like `content-old/`. */
export const within = (dir: string, abs: string): boolean =>
  abs === dir || abs.startsWith(dir + sep);

/** Dev routes answer only this site's own pages; any other page open in the browser could otherwise write content. */
export const sameOrigin = (req: Pick<IncomingMessage, 'headers'>): boolean => {
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') {
    return false;
  }
  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
};

/* A write made through the editor would otherwise come back as a full page reload, remounting the
   editor under the author's hands. The store records the tree it just produced; the content plugin
   still invalidates its modules on every change, and only skips the reload when the tree on disk is
   exactly what the editor wrote. Anything else, including an edit in your code editor, still reloads. */
let editorTreeHash = '';
export const recordEditorTree = (headSha: string): void => {
  editorTreeHash = headSha;
};
export const isEditorTree = (headSha: string): boolean =>
  headSha !== '' && headSha === editorTreeHash;
