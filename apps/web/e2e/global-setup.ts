import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* The editor's working-tree and fake backends both write real files. Tests get their own copy of
   content/ so a run never touches the repository's own. CRC_CONTENT_DIR points the dev server at it. */

export const scratchContentDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.tmp/e2e-content",
);

export default function globalSetup() {
  const source = resolve(dirname(fileURLToPath(import.meta.url)), "../../../content");
  rmSync(scratchContentDir, { recursive: true, force: true });
  mkdirSync(dirname(scratchContentDir), { recursive: true });
  cpSync(source, scratchContentDir, { recursive: true });
}
