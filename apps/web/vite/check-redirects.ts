import { fileURLToPath } from 'node:url';
import { createLogger, preview } from 'vite';

/* Cloudflare skips an invalid _redirects rule with only a warning. The Cloudflare plugin's preview
   parses the built file with Cloudflare's own parser, so its warning fails this check instead. */

const logger = createLogger();
const warn = logger.warn;
let invalid = false;
logger.warn = (message, options) => {
  invalid ||= /invalid redirect rule/.test(message);
  warn(message, options);
};

const server = await preview({
  root: fileURLToPath(new URL('..', import.meta.url)),
  customLogger: logger,
  preview: { port: 5197, open: false },
});
await server.close();

if (invalid) {
  process.exit(1);
}
