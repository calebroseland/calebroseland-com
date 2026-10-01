import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* Tests run on a fresh copy of fixed fixture content, never the live content/, which the editor's
   working-tree and fake backends would write to. CRC_CONTENT_DIR points the dev server at the copy.
   The web server's command runs this file before Vite starts: Playwright starts the web server before
   globalSetup, so a copy made there would arrive after Vite first read the folder, and under it. */

export const scratchContentDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.tmp/e2e-content",
);

function prepareScratchContent() {
  const source = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/content");
  rmSync(scratchContentDir, { recursive: true, force: true });
  mkdirSync(dirname(scratchContentDir), { recursive: true });
  cpSync(source, scratchContentDir, { recursive: true });
}

if (import.meta.main) prepareScratchContent();
