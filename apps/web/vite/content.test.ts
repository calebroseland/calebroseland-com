import type { EntryMeta } from '@crc/content-schema';
import { describe, expect, it } from 'vitest';
import { entryUrl, feedXml, sitemapXml } from './content.ts';

const post: EntryMeta = {
  id: 'posts/2026/09-18-x',
  dir: 'posts/2026/09-18-x',
  kind: 'post',
  title: 'Tom & Jerry <3',
  slug: 'tom-jerry',
  date: '2026-09-18T00:00:00.000Z',
  draft: false,
  tags: [],
  summary: 'Quotes "here"',
};
const page: EntryMeta = {
  ...post,
  id: 'pages/about',
  dir: 'pages/about',
  kind: 'page',
  slug: 'about',
  title: 'About',
};

describe('feed and sitemap', () => {
  it('builds entry urls per kind', () => {
    expect(entryUrl('https://x.test', post)).toBe('https://x.test/posts/tom-jerry');
    expect(entryUrl('https://x.test', page)).toBe('https://x.test/about');
  });

  it('escapes xml in the feed', () => {
    const xml = feedXml('https://x.test', [post]);
    expect(xml).toContain('<title>Tom &amp; Jerry &lt;3</title>');
    expect(xml).toContain('<description>Quotes &quot;here&quot;</description>');
    expect(xml).toContain('<pubDate>Fri, 18 Sep 2026 00:00:00 GMT</pubDate>');
    expect(xml).toContain('href="https://x.test/feed.xml"');
  });

  it('lists landing, posts index, and every entry in the sitemap', () => {
    const xml = sitemapXml('https://x.test', [post, page]);
    expect(xml.match(/<loc>/g)).toHaveLength(4);
    expect(xml).toContain('<loc>https://x.test/about</loc>');
  });

  it('handles an empty feed', () => {
    expect(feedXml('https://x.test', [])).toContain('<lastBuildDate>Thu, 01 Jan 1970');
  });
});
