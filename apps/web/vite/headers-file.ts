import type { Plugin } from "vite";
import { headersFile } from "../worker/headers.ts";

/** Writes `_headers` beside the built assets, so pages and files get the Worker's security headers. */
export function securityHeadersFile(): Plugin {
  return {
    name: "crc:headers-file",
    apply: "build",
    applyToEnvironment: (env) => env.name === "client",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "_headers", source: headersFile() });
    },
  };
}
