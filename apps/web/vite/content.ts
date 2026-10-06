import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import {
  ADOBE_KIT,
  type Entry,
  type EntryMeta,
  fontVars,
  parseYaml,
  profile,
  type SiteTheme,
  siteTheme,
  usesAdobeFonts,
} from '@crc/content-schema';
import { parseEntry, renderMarkdown } from '@crc/markdown';
import type { Plugin } from 'vite';
import { contentDirFor, isEditorTree, sameOrigin, within } from './content-dir.ts';
import { readTree } from './local-store.ts';

/* Parses, validates, and renders everything under content/ at build time.
   Exposes:
     virtual:content/profile          → validated profile object
     virtual:content/index            → EntryMeta[] (drafts excluded in production)
     virtual:content/entry/<id>       → { meta, html, headings } for one entry (lazy per route)
   Bundle assets referenced by markdown are emitted as hashed files. Invalid content fails the build with the path. */

const PROFILE = 'virtual:content/profile';
const INDEX = 'virtual:content/index';
const THEME = 'virtual:content/theme';
const ENTRY = 'virtual:content/entry/';
const NULL = '\0';

export type { EntryMeta };

type Loaded = { id: string; dir: string; meta: Entry; body: string };

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name === 'index.md') out.push(p);
  }
  return out;
}

export function content(opts: {
  root: string;
  includeDrafts?: boolean;
  siteOrigin?: string;
  /** Read from here instead of the repository's content/ (tests use a fixture). */
  contentDir?: string;
}): Plugin {
  const contentDir = opts.contentDir ?? contentDirFor(opts.root);
  const profilePath = join(contentDir, 'profile.yaml');
  const themePath = join(contentDir, 'theme.yaml');
  let includeDrafts = opts.includeDrafts ?? false;
  let isBuild = false;
  const emitted = new Map<string, string>(); // absolute asset path → public url

  /** content/theme.yaml, optional: without it the site keeps today's faces. */
  function loadTheme(): SiteTheme {
    try {
      return parseYaml(siteTheme, existsSync(themePath) ? readFileSync(themePath, 'utf8') : '{}');
    } catch (err) {
      throw new Error(
        `content/theme.yaml is invalid:\n${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  function loadEntries(): Loaded[] {
    const files = [...walk(join(contentDir, 'posts')), ...walk(join(contentDir, 'pages'))];
    const entries = files.map((file) => {
      let parsed: ReturnType<typeof parseEntry>;
      try {
        parsed = parseEntry(readFileSync(file, 'utf8'));
      } catch (err) {
        throw new Error(
          `${relative(opts.root, file)} is invalid:\n${err instanceof Error ? err.message : String(err)}`,
        );
      }
      const dir = dirname(file);
      return { id: relative(contentDir, dir).replaceAll('\\', '/'), dir, ...parsed };
    });
    const slugs = new Map<string, string>();
    for (const e of entries) {
      const key = `${e.meta.kind}:${e.meta.slug}`;
      const prev = slugs.get(key);
      if (prev)
        throw new Error(`duplicate ${e.meta.kind} slug "${e.meta.slug}" in ${prev} and ${e.id}`);
      slugs.set(key, e.id);
    }
    return entries
      .filter((e) => includeDrafts || !e.meta.draft)
      .sort((a, b) => +b.meta.date - +a.meta.date);
  }

  const toMeta = (e: Loaded): EntryMeta => {
    const heroMatch = e.body.match(/!\[[^\]]*\]\(([^)\s]+)\)/);
    const hero =
      heroMatch?.[1] && !/^(https?:)?\/\//.test(heroMatch[1])
        ? assetUrl(e.dir, heroMatch[1])
        : undefined;
    return {
      ...e.meta,
      id: e.id,
      date: e.meta.date.toISOString(),
      dir: e.id,
      ...(hero ? { hero } : {}),
    };
  };

  function assetUrl(dir: string, src: string): string {
    const abs = resolve(dir, src);
    if (!within(contentDir, abs) || !existsSync(abs))
      throw new Error(`missing asset ${src} referenced from ${relative(opts.root, dir)}`);
    if (!isBuild) return `/@content/${relative(contentDir, abs).replaceAll('\\', '/')}`;
    const cached = emitted.get(abs);
    if (cached) return cached;
    const buf = readFileSync(abs);
    const hash = createHash('sha256').update(buf).digest('hex').slice(0, 8);
    const name = `content/${basename(abs, extname(abs))}-${hash}${extname(abs)}`;
    emitted.set(abs, `/${name}`);
    pendingAssets.push({ fileName: name, source: buf });
    return `/${name}`;
  }
  const pendingAssets: Array<{ fileName: string; source: Buffer }> = [];

  return {
    name: 'crc:content',
    configResolved(config) {
      isBuild = config.command === 'build';
      includeDrafts = opts.includeDrafts ?? config.mode !== 'production';
    },
    configureServer(server) {
      // Serve bundle assets straight from content/ in dev.
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path === '/feed.xml' || path === '/sitemap.xml') {
          const origin = opts.siteOrigin ?? 'https://calebroseland.com';
          const entries = loadEntries().map(toMeta);
          res.setHeader('content-type', 'application/xml; charset=utf-8');
          res.end(
            path === '/feed.xml'
              ? feedXml(
                  origin,
                  entries.filter((e) => e.kind === 'post'),
                )
              : sitemapXml(origin, entries),
          );
          return;
        }
        if (!req.url?.startsWith('/@content/')) return next();
        const rel = decodeURIComponent(req.url.slice('/@content/'.length).split('?')[0] ?? '');
        const abs = resolve(contentDir, rel);
        if (
          !sameOrigin(req)
          || !within(contentDir, abs)
          || !existsSync(abs)
          || statSync(abs).isDirectory()
        )
          return next();
        const type = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.webp': 'image/webp',
          '.avif': 'image/avif',
          '.svg': 'image/svg+xml',
          '.gif': 'image/gif',
        }[extname(abs).toLowerCase()];
        if (type) res.setHeader('content-type', type);
        res.end(readFileSync(abs));
      });
      // This plugin runs the schema and the renderer in the dev server itself, which keeps the copies it
      // started with; restart on a change so content is never read by a stale schema.
      const packages = ['content-schema', 'markdown'].map((p) =>
        resolve(opts.root, 'packages', p, 'src'),
      );
      server.watcher.add(packages);
      server.watcher.on('change', (file: string) => {
        if (packages.some((dir) => file.startsWith(dir)) && !file.endsWith('.test.ts'))
          void server.restart();
      });
      server.watcher.add(contentDir);
      for (const event of ['add', 'unlink', 'addDir', 'unlinkDir'] as const) {
        server.watcher.on(event, (file: string) => {
          if (file.startsWith(contentDir)) invalidateContent(server, contentDir);
        });
      }
    },
    resolveId(id) {
      if (id === PROFILE || id === INDEX || id === THEME || id.startsWith(ENTRY)) return NULL + id;
      return null;
    },
    async load(id) {
      if (!id.startsWith(NULL)) return null;
      const bare = id.slice(1);
      if (bare === PROFILE) {
        this.addWatchFile(profilePath);
        try {
          return `export default ${JSON.stringify(parseYaml(profile, readFileSync(profilePath, 'utf8')))};`;
        } catch (err) {
          throw new Error(
            `content/profile.yaml is invalid:\n${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
      if (bare === THEME) {
        this.addWatchFile(themePath);
        return `export default ${JSON.stringify(loadTheme())};`;
      }
      if (bare === INDEX) {
        const entries = loadEntries();
        for (const e of entries) this.addWatchFile(join(e.dir, 'index.md'));
        // Static import() literals so Vite can resolve and code-split one chunk per entry.
        const loaders = entries
          .map(
            (e) =>
              `  ${JSON.stringify(e.id)}: () => import(${JSON.stringify(ENTRY + encodeURIComponent(e.id))}),`,
          )
          .join('\n');
        return `export default ${JSON.stringify(entries.map(toMeta))};\nexport const loaders = {\n${loaders}\n};`;
      }
      if (bare.startsWith(ENTRY)) {
        const wanted = decodeURIComponent(bare.slice(ENTRY.length));
        const e = loadEntries().find((x) => x.id === wanted);
        if (!e) throw new Error(`no content entry ${wanted}`);
        this.addWatchFile(join(e.dir, 'index.md'));
        const { html, headings } = await renderMarkdown(e.body, {
          resolveImage: (src) => assetUrl(e.dir, src),
        });
        return `export default ${JSON.stringify({ meta: toMeta(e), html, headings })};`;
      }
      return null;
    },
    generateBundle() {
      for (const a of pendingAssets)
        this.emitFile({ type: 'asset', fileName: a.fileName, source: a.source });
      pendingAssets.length = 0;
    },
    /* The default theme's faces, before any script runs, and where theme-init.js finds the Adobe kit
       and whether the default theme needs it; a custom theme decides for itself. */
    transformIndexHtml() {
      const { fonts } = loadTheme();
      const vars = Object.entries(fontVars(fonts))
        .map(([name, value]) => `${name}: ${value};`)
        .join(' ');
      return [
        {
          tag: 'style',
          attrs: { id: 'site-fonts' },
          children: `:root { ${vars} }`,
          injectTo: 'head-prepend',
        },
        {
          tag: 'meta',
          attrs: {
            name: 'adobe-fonts',
            content: ADOBE_KIT,
            'data-default': usesAdobeFonts(fonts) ? 'on' : 'off',
          },
          injectTo: 'head-prepend',
        },
      ];
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(contentDir)) return;
      invalidateContent(server, contentDir);
      return [];
    },
    // Feed and sitemap are emitted at build so the Worker serves them as static assets.
    async buildStart() {
      if (!isBuild) return;
      const origin = opts.siteOrigin ?? 'https://calebroseland.com';
      const entries = loadEntries().map(toMeta);
      const postsOnly = entries.filter((e) => e.kind === 'post');
      this.emitFile({ type: 'asset', fileName: 'feed.xml', source: feedXml(origin, postsOnly) });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: sitemapXml(origin, entries),
      });
    },
  };
}

function invalidateContent(server: import('vite').ViteDevServer, contentDir: string) {
  for (const mod of server.moduleGraph.idToModuleMap.values()) {
    if (mod.id?.includes('virtual:content/')) server.moduleGraph.invalidateModule(mod);
  }
  // Skip the reload when the tree on disk is exactly what the editor just wrote: it already shows
  // that, and reloading would remount the editor. Any other change still reloads the open page.
  if (!isEditorTree(readTree(contentDir, 'content').headSha))
    server.ws.send({ type: 'full-reload' });
}

const esc = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

export function entryUrl(origin: string, e: EntryMeta): string {
  return e.kind === 'post' ? `${origin}/posts/${e.slug}` : `${origin}/${e.slug}`;
}

export function feedXml(origin: string, posts: EntryMeta[]): string {
  const items = posts
    .map(
      (p) => `  <item>
    <title>${esc(p.title)}</title>
    <link>${entryUrl(origin, p)}</link>
    <guid isPermaLink="true">${entryUrl(origin, p)}</guid>
    <pubDate>${new Date(p.date).toUTCString()}</pubDate>${p.summary ? `\n    <description>${esc(p.summary)}</description>` : ''}
  </item>`,
    )
    .join('\n');
  const updated = posts[0] ? new Date(posts[0].date).toUTCString() : new Date(0).toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Caleb Roseland</title>
  <link>${origin}/</link>
  <description>Posts</description>
  <language>en</language>
  <lastBuildDate>${updated}</lastBuildDate>
  <atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>
`;
}

export function sitemapXml(origin: string, entries: EntryMeta[]): string {
  const urls = [`${origin}/`, `${origin}/posts`, ...entries.map((e) => entryUrl(origin, e))];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`;
}
