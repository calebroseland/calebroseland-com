import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/* Each folder under fixtures/ is linted with its own config, which loads one custom rule. A line that
   ends in `// expect` must be flagged, and no other line may be. */

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const fixtures = join(here, 'fixtures');
const biome = join(root, 'node_modules/.bin/biome');

const flagged = (dir: string): string[] => {
  let out = '';
  try {
    out = execFileSync(
      biome,
      ['lint', `--config-path=${join(dir, 'fixtures.biome.json')}`, '--max-diagnostics=500', dir],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch (error) {
    // Biome exits non-zero when it reports errors, which is the point here.
    const { stdout = '', stderr = '' } = error as { stdout?: string; stderr?: string };
    out = stdout + stderr;
  }
  // A rule that fails to load reports nothing, which would read as a pass.
  if (/during loading of plugins|configuration resulted in errors/.test(out)) {
    throw new Error(`Biome could not load the rule for ${dir}:\n${out}`);
  }
  const lines = [...out.matchAll(/(\S+\.tsx?):(\d+):\d+ plugin/g)].map(
    ([, file = '', line = '']) => `${relative(dir, resolve(root, file))}:${line}`,
  );
  return [...new Set(lines)].sort();
};

const expected = (dir: string): string[] =>
  readdirSync(dir)
    .filter((f) => /\.tsx?$/.test(f))
    .flatMap((f) =>
      readFileSync(join(dir, f), 'utf8')
        .split('\n')
        .flatMap((text, i) => (text.trimEnd().endsWith('// expect') ? [`${f}:${i + 1}`] : [])),
    )
    .sort();

describe('custom Biome rules', () => {
  for (const rule of readdirSync(fixtures)) {
    it(`${rule} flags exactly the marked lines`, () => {
      const dir = join(fixtures, rule);
      const marked = expected(dir);
      expect(marked.length, 'a fixture folder needs at least one marked line').toBeGreaterThan(0);
      expect(flagged(dir)).toEqual(marked);
    });
  }
});
