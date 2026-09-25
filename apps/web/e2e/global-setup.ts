import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* Tests run on a fresh copy of fixed fixture content, never the live content/, which the editor's
   working-tree and fake backends would write to. CRC_CONTENT_DIR points the dev server at the copy. */

export const scratchContentDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.tmp/e2e-content",
);

export default function globalSetup() {
  const source = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/content");
  rmSync(scratchContentDir, { recursive: true, force: true });
  mkdirSync(dirname(scratchContentDir), { recursive: true });
  cpSync(source, scratchContentDir, { recursive: true });
}
