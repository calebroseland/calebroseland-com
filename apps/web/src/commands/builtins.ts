import type { IconName } from '@crc/ui/icons';
import { useEffect } from 'react';
import { allTags, formatDate, pages, posts } from '../content/entries.ts';
import { hasContact, siteProfile } from '../content/profile.ts';
import { editMode } from '../editor/editMode.ts';
import { type ReadingWidth, readingWidth } from '../theme/readingWidth.ts';
import { customPreference, type ThemePreference, themeController } from '../theme/store.ts';
import { type Command, registerCommands } from './registry.ts';

const THEMES: ReadonlyArray<{ value: ThemePreference; title: string; icon: IconName }> = [
  { value: 'auto', title: 'Auto', icon: 'lucide:sun-moon' },
  { value: 'light', title: 'Light', icon: 'lucide:sun' },
  { value: 'dark', title: 'Dark', icon: 'lucide:moon' },
];

const WIDTHS: ReadonlyArray<{ value: ReadingWidth; title: string; icon: IconName }> = [
  { value: 'standard', title: 'Standard', icon: 'lucide:text-align-center' },
  { value: 'wide', title: 'Wide', icon: 'lucide:unfold-horizontal' },
];

const siteCommands = (): Command[] => {
  const go = (id: string, title: string, to: string, icon: IconName, keywords: string[] = []) =>
    ({ id, title, group: 'Go to', icon, keywords, run: (ctx) => ctx.go(to) }) satisfies Command;
  return [
    go('go.home', 'Home', '/home', 'lucide:house', ['start', 'latest']),
    go('go.posts', 'Posts', '/posts', 'lucide:newspaper', ['writing', 'blog']),
    ...pages.map((p) => go(`go.page.${p.slug}`, p.title, `/${p.slug}`, 'lucide:file-text')),
    go('go.card', 'Business card', '/', 'lucide:id-card', ['landing']),
    ...(hasContact(siteProfile)
      ? [go('go.contact', 'Contact', '/contact', 'lucide:mail', ['email', 'phone', 'card'])]
      : []),
    ...posts.map(
      (p): Command => ({
        id: `post.${p.slug}`,
        title: p.title,
        group: 'Posts',
        icon: 'lucide:file-text',
        hint: formatDate(p.date),
        keywords: [...p.tags, ...(p.summary ? [p.summary] : [])],
        run: (ctx) => ctx.go(`/posts/${p.slug}`),
      }),
    ),
    ...allTags.map(
      (tag): Command => ({
        id: `tag.${tag}`,
        title: tag,
        group: 'Tags',
        icon: 'lucide:tag',
        keywords: ['tag'],
        run: (ctx) => ctx.go(`/posts?tag=${encodeURIComponent(tag)}`),
      }),
    ),
  ];
};

const preferenceCommands = (): Command[] => {
  const { preference, customThemes } = themeController.store.state;
  const current = (value: ThemePreference) => (value === preference ? 'Current' : undefined);
  const choose = (value: ThemePreference) => (ctx: { close: () => void }) => {
    themeController.setPreference(value);
    ctx.close();
  };
  return [
    {
      id: 'pref.theme',
      title: 'Theme',
      group: 'Preferences',
      icon: 'lucide:palette',
      keywords: ['dark', 'light', 'color', 'appearance'],
      page: () => [
        ...THEMES.map(
          (t): Command => ({
            id: `theme.${t.value}`,
            title: t.title,
            group: 'Theme',
            icon: t.icon,
            ...optional('hint', current(t.value)),
            run: choose(t.value),
          }),
        ),
        ...customThemes.map(
          (t): Command => ({
            id: `theme.custom.${t.id}`,
            title: t.name,
            group: 'Custom themes',
            icon: 'lucide:palette',
            ...optional('hint', current(customPreference(t.id))),
            run: choose(customPreference(t.id)),
          }),
        ),
      ],
    },
    {
      id: 'pref.width',
      title: 'Reading width',
      group: 'Preferences',
      icon: 'lucide:text-align-center',
      keywords: ['wide', 'width', 'column', 'measure'],
      page: () =>
        WIDTHS.map(
          (w): Command => ({
            id: `width.${w.value}`,
            title: w.title,
            group: 'Reading width',
            icon: w.icon,
            ...optional('hint', w.value === readingWidth.store.state ? 'Current' : undefined),
            run: (ctx) => {
              readingWidth.set(w.value);
              ctx.close();
            },
          }),
        ),
    },
  ];
};

const editCommands = (): Command[] => {
  if (!editMode.available) {
    return [];
  }
  const on = editMode.store.state;
  return [
    {
      id: 'edit.mode',
      title: on ? 'Turn edit mode off' : 'Turn edit mode on',
      group: 'Editing',
      icon: 'lucide:pencil',
      keywords: ['edit', 'working tree', 'write'],
      run: (ctx) => {
        editMode.set(!on);
        ctx.close();
      },
    },
    ...(on
      ? [
          {
            id: 'edit.board',
            title: 'Editor',
            group: 'Editing',
            icon: 'lucide:file-pen',
            run: (ctx) => ctx.go('/editor'),
          } satisfies Command,
          {
            id: 'edit.new',
            title: 'New entry',
            group: 'Editing',
            icon: 'lucide:file-plus',
            run: (ctx) => ctx.go('/editor/new'),
          } satisfies Command,
        ]
      : []),
  ];
};

const optional = <K extends string, V>(key: K, value: V | undefined) =>
  (value === undefined ? {} : { [key]: value }) as Partial<Record<K, V>>;

/** Registers the site's own commands while the palette host is mounted. */
export const useBuiltinCommands = () => {
  useEffect(() => registerCommands('site', siteCommands), []);
  useEffect(() => registerCommands('preferences', preferenceCommands), []);
  useEffect(() => registerCommands('editing', editCommands), []);
};
