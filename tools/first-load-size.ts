import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

/* First-load JS: the entry script plus every chunk index.html preloads, gzipped. Summing what the
   page actually fetches stays true however the bundler groups its chunks. */

const LIMIT_KB = 325;

const client = resolve(dirname(fileURLToPath(import.meta.url)), "../apps/web/dist/client");
const html = readFileSync(resolve(client, "index.html"), "utf8");
const scripts = new Set(
  [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].flatMap((m) => (m[1] ? [m[1]] : [])),
);

let bytes = 0;
for (const path of scripts) bytes += gzipSync(readFileSync(resolve(client, path))).length;

const kb = bytes / 1000;
const verdict = kb <= LIMIT_KB ? "ok" : "over";
process.stdout.write(
  `first-load JS (entry + preloads, gzip): ${kb.toFixed(2)} kB of ${LIMIT_KB} kB, ${scripts.size} files: ${verdict}\n`,
);
if (verdict === "over") process.exit(1);
