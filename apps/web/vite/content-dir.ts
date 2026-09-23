import { resolve } from "node:path";

/** Where content lives. Overridable so tests can point at a scratch copy instead of the repository. */
export function contentDirFor(root: string): string {
  return process.env.CRC_CONTENT_DIR
    ? resolve(process.env.CRC_CONTENT_DIR)
    : resolve(root, "content");
}

/* A write made through the editor would otherwise come back as a full page reload, remounting the
   editor under the author's hands. The store records the tree it just produced; the content plugin
   still invalidates its modules on every change, and only skips the reload when the tree on disk is
   exactly what the editor wrote. Anything else, including an edit in your code editor, still reloads. */
let editorTreeHash = "";
export const recordEditorTree = (headSha: string) => {
  editorTreeHash = headSha;
};
export const isEditorTree = (headSha: string) => headSha !== "" && headSha === editorTreeHash;
