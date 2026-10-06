import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const order = (css: string) => css.match(/@layer ([a-z-]+(?:,\s*[a-z-]+)+);/)?.[1];

describe('cascade layer order', () => {
  it('is declared in index.html before any stylesheet, matching @crc/ui', () => {
    const html = read('../index.html');
    const declared = html.indexOf('<style>@layer ');
    expect(order(html)).toBe(order(read('../../../packages/ui/src/index.css')));
    expect(declared).toBeGreaterThan(-1);
    // Vite injects built stylesheets into the head; nothing may precede the order statement.
    expect(html.slice(0, declared)).not.toMatch(/rel="stylesheet"|<style/);
  });
});
