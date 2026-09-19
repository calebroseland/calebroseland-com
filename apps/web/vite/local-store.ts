import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, extname, join, relative, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import type { Plugin } from "vite";
import { contentDirFor, recordStudioTree } from "./content-dir.ts";

/* Working-tree editing. The studio can read and write the real content files on whatever branch is
   checked out, so an edit made in the browser is an ordinary unstaged change you commit alongside any
   code change. Dev only: the routes are mounted from configureServer and never exist in a build.
   Every path is confined to the content directory. */

const TEXT = new Set([".md", ".yaml", ".yml", ".json", ".txt", ".css", ".svg"]);
const MAX_BODY = 32 * 1024 * 1024;

type StoredFile = { path: string; content: string; encoding: "utf-8" | "base64" };

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

export function readTree(
  contentDir: string,
  prefix: string,
): { headSha: string; files: StoredFile[] } {
  const files = walk(contentDir)
    .map((abs) => {
      const rel = `${prefix}/${relative(contentDir, abs).replaceAll("\\", "/")}`;
      const isText = TEXT.has(extname(abs).toLowerCase());
      const buf = readFileSync(abs);
      return {
        path: rel,
        content: isText ? buf.toString("utf8") : buf.toString("base64"),
        encoding: (isText ? "utf-8" : "base64") as StoredFile["encoding"],
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
  // The head is a hash of the tree, so an edit made outside the browser is caught the same way a moved
  // branch is: the save is refused rather than silently overwriting someone else's work.
  const hash = createHash("sha256");
  for (const f of files) hash.update(`${f.path}:${f.content};`);
  return { headSha: hash.digest("hex").slice(0, 40), files };
}

function currentBranch(root: string): string {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((done, fail) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > MAX_BODY) fail(new Error("payload too large"));
    });
    req.on("end", () => {
      try {
        done(JSON.parse(raw || "{}"));
      } catch (err) {
        fail(err);
      }
    });
    req.on("error", fail);
  });
}

export function localStore(opts: { root: string; prefix?: string }): Plugin {
  const prefix = opts.prefix ?? "content";
  let contentDir = "";

  return {
    name: "crc:local-store",
    apply: "serve",
    configResolved() {
      contentDir = contentDirFor(opts.root);
    },
    configureServer(server) {
      const json = (res: ServerResponse, status: number, payload: unknown) => {
        res.statusCode = status;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(payload));
      };
      const inside = (path: string): string | null => {
        const rel = path.startsWith(`${prefix}/`) ? path.slice(prefix.length + 1) : path;
        const abs = resolve(contentDir, rel);
        return abs.startsWith(contentDir) ? abs : null;
      };

      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (!url?.startsWith("/@local/")) return next();

        void (async () => {
          try {
            if (url === "/@local/status" && req.method === "GET") {
              return json(res, 200, { branch: currentBranch(opts.root), prefix });
            }
            if (url === "/@local/tree" && req.method === "GET") {
              return json(res, 200, readTree(contentDir, prefix));
            }
            if (url === "/@local/write" && req.method === "POST") {
              const payload = (await readBody(req)) as {
                files?: StoredFile[];
                expectedHeadSha?: string;
              };
              const current = readTree(contentDir, prefix);
              if (payload.expectedHeadSha && payload.expectedHeadSha !== current.headSha) {
                return json(res, 409, { error: "stale", headSha: current.headSha });
              }
              for (const file of payload.files ?? []) {
                const abs = inside(file.path);
                if (!abs) continue;
                mkdirSync(dirname(abs), { recursive: true });
                writeFileSync(
                  abs,
                  file.encoding === "base64" ? Buffer.from(file.content, "base64") : file.content,
                );
              }
              const afterWrite = readTree(contentDir, prefix).headSha;
              recordStudioTree(afterWrite);
              return json(res, 200, { headSha: afterWrite });
            }
            /* Binary upload. The bytes are streamed straight to the file: an image never becomes a
               base64 string on the way in, which is both wasteful and what used to overflow the
               argument stack. The tree hash is checked first, exactly as a JSON write is, and the new
               hash is returned so a save can chain several uploads and end with the markdown. */
            if (url === "/@local/upload" && req.method === "POST") {
              const params = new URL(req.url ?? "", "http://localhost").searchParams;
              const target = params.get("path");
              const expected = params.get("expectedHeadSha");
              const abs = target ? inside(target) : null;
              if (!abs) return json(res, 400, { error: "path outside the content directory" });
              const current = readTree(contentDir, prefix);
              if (expected && expected !== current.headSha) {
                return json(res, 409, { error: "stale", headSha: current.headSha });
              }
              mkdirSync(dirname(abs), { recursive: true });
              await pipeline(req, createWriteStream(abs));
              const afterUpload = readTree(contentDir, prefix).headSha;
              recordStudioTree(afterUpload);
              return json(res, 200, { headSha: afterUpload });
            }
            if (url === "/@local/delete" && req.method === "POST") {
              const payload = (await readBody(req)) as { dir?: string };
              const abs = payload.dir ? inside(payload.dir) : null;
              if (abs && abs !== contentDir) rmSync(abs, { recursive: true, force: true });
              const afterDelete = readTree(contentDir, prefix).headSha;
              recordStudioTree(afterDelete);
              return json(res, 200, { headSha: afterDelete });
            }
            return json(res, 404, { error: "unknown local-store route" });
          } catch (err) {
            return json(res, 400, { error: err instanceof Error ? err.message : String(err) });
          }
        })();
      });
    },
  };
}
