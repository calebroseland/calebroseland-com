import { readFileSync } from 'node:fs';
import { type Profile, profile as profileSchema } from '@crc/content-schema';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';
import { installFakeWorkingTree } from './fakeWorkingTree.ts';
import { loadProfile, saveProfile, serializeProfile } from './profile.ts';
import { ChangedOnDiskError } from './workingTree.ts';

const sourceYaml = readFileSync(
  new URL('../../fixtures/content/profile.yaml', import.meta.url),
  'utf8',
);
const published: Profile = profileSchema.parse(parse(sourceYaml));

describe('serializeProfile', () => {
  // The yaml library writes every flow collection with inner padding, so a file already in that
  // style comes back byte for byte; content/profile.yaml's tags line adopts it on its first save.
  it('round-trips a file byte for byte when nothing changed', () => {
    const file = `# Heading comment.
name: Someone
tagline: Does things
tags: [ One, Two ]
groups:
  - title: Code
    links:
      - { label: GitHub, url: https://github.com/x, icon: simple-icons:github }
`;
    expect(serializeProfile(file, profileSchema.parse(parse(file)))).toBe(file);
  });

  it('keeps the leading comment and one-line links when the content changes', () => {
    const next = { ...published, tagline: 'Engineer', tags: [...published.tags, 'Rust'] };
    const out = serializeProfile(sourceYaml, next);
    expect(out.startsWith('# ')).toBe(true);
    expect(out).toContain('tagline: Engineer');
    expect(out).toMatch(/tags: \[.*Rust ]/);
    expect(out).toMatch(
      /- \{ label: GitHub, url: https:\/\/github\.com\/calebroseland, icon: simple-icons:github }/,
    );
    expect(profileSchema.parse(parse(out))).toEqual(next);
  });

  it('writes a fresh file when there was none, in the same one-line style', () => {
    const out = serializeProfile('', published);
    expect(profileSchema.parse(parse(out))).toEqual(published);
    expect(out).toMatch(/^tags: \[ /m);
    expect(out).toMatch(/^ {6}- \{ label: GitHub, /m);
  });
});

describe('loadProfile and saveProfile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts from the fallback, writes profile.yaml on first save, then reads it back', async () => {
    const disk = installFakeWorkingTree();
    const first = await loadProfile(published);
    expect(first.profile).toEqual(published);

    const saved = await saveProfile(first, { ...published, name: 'Someone' });
    expect(disk.read('content/profile.yaml')).toContain('name: Someone');

    const again = await loadProfile(published);
    expect(again.profile.name).toBe('Someone');
    expect(again.headSha).toBe(saved.headSha);
  });

  it('keeps the file as written apart from what changed', async () => {
    const disk = installFakeWorkingTree({ 'content/profile.yaml': sourceYaml });
    await saveProfile(await loadProfile(published), { ...published, tagline: 'Engineer' });
    expect(disk.read('content/profile.yaml')).toBe(
      serializeProfile(sourceYaml, { ...published, tagline: 'Engineer' }),
    );
  });

  it('refuses to overwrite a file that changed on disk since it was read', async () => {
    const disk = installFakeWorkingTree({ 'content/profile.yaml': sourceYaml });
    const source = await loadProfile(published);
    disk.touch('content/posts/2026/10-21-elsewhere/index.md', '# edited in a code editor');
    await expect(saveProfile(source, published)).rejects.toBeInstanceOf(ChangedOnDiskError);
    expect(disk.read('content/profile.yaml')).toBe(sourceYaml);
  });

  it('rejects an invalid profile before writing anything', async () => {
    const disk = installFakeWorkingTree();
    const source = await loadProfile(published);
    await expect(saveProfile(source, { ...published, name: '' })).rejects.toThrow();
    expect(disk.read('content/profile.yaml')).toBeUndefined();
  });
});
