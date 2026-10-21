import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/* Every class a CSS module defines is used by a module that imports it. A class nothing references
   is dead weight, or a typo that styles nothing; a third-party class belongs in :global(). */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const trees = ['apps/web/src', 'packages/ui/src', 'packages/interaction/src'];

const files = (dir: string): string[] =>
  readdirSync(join(root, dir), { recursive: true, encoding: 'utf8' }).map((f) => join(dir, f));

const all = trees.flatMap(files);
const modules = all.filter((f) => f.endsWith('.module.css'));
const sources = all
  .filter((f) => /\.tsx?$/.test(f) && !/\.(test|stories)\.tsx?$/.test(f))
  .map((f) => readFileSync(join(root, f), 'utf8'));

/** Class names a module defines, outside comments, url()s and :global(). */
const defined = (css: string): Set<string> => {
  const own = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/url\([^)]*\)/g, '')
    .replace(/"[^"]*"|'[^']*'/g, '')
    .replace(/:global\((?:[^()]|\([^()]*\))*\)/g, '');
  return new Set([...own.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1] ?? ''));
};

/** Class names read from a module by the files that import it; null when one picks a class by a
    computed key (`styles[variant]`), which only a reader can check. */
const used = (module: string): Set<string> | null => {
  const out = new Set<string>();
  const name = basename(module).replaceAll('.', '\\.');
  for (const code of sources) {
    for (const [, alias] of code.matchAll(
      new RegExp(`import (\\w+) from '(?:[^']*/)?${name}'`, 'g'),
    )) {
      if (new RegExp(`\\b${alias}\\[`).test(code)) {
        return null;
      }
      for (const [, cls] of code.matchAll(new RegExp(`\\b${alias}\\.(\\w+)`, 'g'))) {
        out.add(cls ?? '');
      }
    }
  }
  return out;
};

describe('CSS modules', () => {
  // Their classes are picked by variant; a reader checks them, so the list stays short and named.
  it('reads by computed key only in the components that pick a class by variant', () => {
    expect(modules.filter((m) => used(m) === null)).toEqual([
      'packages/ui/src/components/Alert/Alert.module.css',
      'packages/ui/src/components/Button/Button.module.css',
      'packages/ui/src/components/Field/Field.module.css',
      'packages/ui/src/components/IconButton/IconButton.module.css',
    ]);
  });

  it.each(modules)('%s defines no class nothing uses', (module) => {
    const uses = used(module);
    const orphans = [...defined(readFileSync(join(root, module), 'utf8'))].filter(
      (c) => uses !== null && !uses.has(c),
    );
    expect(orphans).toEqual([]);
  });
});
