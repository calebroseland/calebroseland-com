import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseYaml } from './load.ts';
import { compactTag, profile, profileContact, profileLink, resolveTag } from './profile.ts';

const validLink = {
  label: 'GitHub',
  url: 'https://github.com/calebroseland',
  icon: 'simple-icons:github',
};

describe('profileLink', () => {
  it('accepts a well-formed link', () => {
    expect(profileLink.parse(validLink)).toEqual(validLink);
  });

  it.each([
    ['empty label', { ...validLink, label: '' }],
    ['path-relative url', { ...validLink, url: 'local' }],
    ['protocol-relative url', { ...validLink, url: '//example.com' }],
    ['icon without an Iconify prefix', { ...validLink, icon: 'github' }],
    ['icon from an unsupported set', { ...validLink, icon: 'mdi:github' }],
    ['icon with spaces', { ...validLink, icon: 'lucide:git hub' }],
  ])('rejects %s', (_name, input) => {
    expect(profileLink.safeParse(input).success).toBe(false);
  });

  it('accepts a root-relative path to a page on this site', () => {
    expect(profileLink.parse({ ...validLink, url: '/posts' }).url).toBe('/posts');
  });

  it('accepts any https url with an Iconify icon name', () => {
    fc.assert(
      fc.property(fc.webUrl({ validSchemes: ['https'] }), (url) => {
        expect(profileLink.safeParse({ ...validLink, url }).success).toBe(true);
      }),
    );
  });
});

describe('profile', () => {
  const validProfile = {
    name: 'Caleb Roseland',
    tagline: 'Placeholder tagline',
    groups: [{ title: 'Code', links: [validLink] }],
  };

  it('defaults tags to none, and drops the retired placeholder flag', () => {
    const parsed = profile.parse({ ...validProfile, placeholder: true });
    expect(parsed.tags).toEqual([]);
    expect(parsed).not.toHaveProperty('placeholder');
  });

  it('requires at least one group with one link', () => {
    expect(profile.safeParse({ ...validProfile, groups: [] }).success).toBe(false);
    expect(
      profile.safeParse({ ...validProfile, groups: [{ title: 'x', links: [] }] }).success,
    ).toBe(false);
  });

  it('names the failing path when YAML is invalid', () => {
    const yaml = `name: Caleb\ntagline: x\ngroups:\n  - title: Code\n    links:\n      - label: GitHub\n        url: not-a-url\n        icon: "simple-icons:github"\n`;
    expect(() => parseYaml(profile, yaml)).toThrowError(/groups.*0.*links.*0.*url/s);
  });
});

describe('profileContact', () => {
  it("accepts the 2019 card's fields", () => {
    const contact = {
      email: 'caleb@calebroseland.com',
      phone: '+1 507 476 1225',
      location: { label: 'Minnesota, USA', url: 'https://maps.google.com/?q=Minnesota,+USA' },
    };
    expect(profileContact.parse(contact)).toEqual(contact);
  });

  it('accepts any subset, including none', () => {
    expect(profileContact.parse({})).toEqual({});
    expect(profileContact.parse({ email: 'a@b.co' })).toEqual({ email: 'a@b.co' });
  });

  it.each([
    ['an email without a domain', { email: 'caleb@' }],
    ['a phone with letters', { phone: 'call me maybe' }],
    ['a phone too short to dial', { phone: '12' }],
    ['a location with a relative url', { location: { label: 'Home', url: '/home' } }],
  ])('rejects %s', (_name, input) => {
    expect(profileContact.safeParse(input).success).toBe(false);
  });
});

describe('focus areas', () => {
  const base = { name: 'A', tagline: 'b', groups: [{ title: 'c', links: [validLink] }] };

  it('accepts the short and long forms side by side', () => {
    const parsed = profile.parse({
      ...base,
      tags: [
        'TypeScript',
        { label: 'React', icon: 'simple-icons:react', show: 'icon' },
        { label: '.NET', link: false },
      ],
    });
    expect(parsed.tags.map(resolveTag)).toEqual([
      { label: 'TypeScript', icon: null, show: 'label', link: true },
      { label: 'React', icon: 'simple-icons:react', show: 'icon', link: true },
      { label: '.NET', icon: null, show: 'label', link: false },
    ]);
  });

  it.each([
    ['an unknown display', { label: 'x', show: 'big' }],
    ['a bad icon name', { label: 'x', icon: 'react' }],
    ['a label over 24 characters', { label: 'x'.repeat(25) }],
  ])('rejects %s', (_n, tag) => {
    expect(profile.safeParse({ ...base, tags: [tag] }).success).toBe(false);
  });

  it('writes back the shortest form that means the same', () => {
    expect(compactTag(resolveTag('Go'))).toBe('Go');
    expect(compactTag(resolveTag({ label: 'Go', show: 'icon' }))).toBe('Go');
    expect(compactTag({ label: 'Go', icon: 'simple-icons:go', show: 'both', link: true })).toEqual({
      label: 'Go',
      icon: 'simple-icons:go',
    });
    expect(compactTag({ label: 'Go', icon: 'simple-icons:go', show: 'icon', link: false })).toEqual(
      {
        label: 'Go',
        icon: 'simple-icons:go',
        show: 'icon',
        link: false,
      },
    );
  });
});
