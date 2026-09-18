import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseYaml, profile } from "@crc/content-schema";
import type { Plugin } from "vite";

/* Parses and validates content at build time and exposes it as JSON modules.
   Keeps yaml and zod out of the client bundle and turns an invalid file into a build error
   that names the file and field. Grows in Phase 2 to cover posts and pages. */

const VIRTUAL = "virtual:content/profile";
const RESOLVED = `\0${VIRTUAL}`;

export function content(opts: { root: string }): Plugin {
  const profilePath = resolve(opts.root, "content/profile.yaml");
  return {
    name: "crc:content",
    resolveId(id) {
      return id === VIRTUAL ? RESOLVED : null;
    },
    load(id) {
      if (id !== RESOLVED) return null;
      this.addWatchFile(profilePath);
      let data: unknown;
      try {
        data = parseYaml(profile, readFileSync(profilePath, "utf8"));
      } catch (err) {
        throw new Error(
          `content/profile.yaml is invalid:\n${err instanceof Error ? err.message : String(err)}`,
        );
      }
      return `export default ${JSON.stringify(data)};`;
    },
    handleHotUpdate({ file, server }) {
      if (file === profilePath) {
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      }
    },
  };
}
