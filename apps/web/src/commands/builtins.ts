import type { IconName } from "@crc/ui/icons";
import { useEffect } from "react";
import { allTags, formatDate, pages, posts } from "../content/entries.ts";
import { hasContact, siteProfile } from "../content/profile.ts";
import { canSignIn, signInMethods } from "../editor/auth/methods.ts";
import { session } from "../editor/auth/store.ts";
import { customPreference, type ThemePreference, themeController } from "../theme/store.ts";
import { type Command, registerCommands } from "./registry.ts";

const THEMES: ReadonlyArray<{ value: ThemePreference; title: string; icon: IconName }> = [
  { value: "auto", title: "Auto", icon: "lucide:sun-moon" },
  { value: "light", title: "Light", icon: "lucide:sun" },
  { value: "dark", title: "Dark", icon: "lucide:moon" },
];

function siteCommands(): Command[] {
  const go = (id: string, title: string, to: string, icon: IconName, keywords: string[] = []) =>
    ({ id, title, group: "Go to", icon, keywords, run: (ctx) => ctx.go(to) }) satisfies Command;
  return [
    go("go.home", "Home", "/home", "lucide:house", ["start", "latest"]),
    go("go.posts", "Posts", "/posts", "lucide:newspaper", ["writing", "blog"]),
    ...pages.map((p) => go(`go.page.${p.slug}`, p.title, `/${p.slug}`, "lucide:file-text")),
    go("go.card", "Business card", "/", "lucide:id-card", ["landing"]),
    ...(hasContact(siteProfile)
      ? [go("go.contact", "Contact", "/contact", "lucide:mail", ["email", "phone", "card"])]
      : []),
    ...posts.map(
      (p): Command => ({
        id: `post.${p.slug}`,
        title: p.title,
        group: "Posts",
        icon: "lucide:file-text",
        hint: formatDate(p.date),
        keywords: [...p.tags, ...(p.summary ? [p.summary] : [])],
        run: (ctx) => ctx.go(`/posts/${p.slug}`),
      }),
    ),
    ...allTags.map(
      (tag): Command => ({
        id: `tag.${tag}`,
        title: tag,
        group: "Tags",
        icon: "lucide:tag",
        keywords: ["tag"],
        run: (ctx) => ctx.go(`/posts?tag=${encodeURIComponent(tag)}`),
      }),
    ),
  ];
}

function preferenceCommands(): Command[] {
  const { preference, customThemes } = themeController.store.state;
  const current = (value: ThemePreference) => (value === preference ? "Current" : undefined);
  const choose = (value: ThemePreference) => (ctx: { close: () => void }) => {
    themeController.setPreference(value);
    ctx.close();
  };
  return [
    {
      id: "pref.theme",
      title: "Theme",
      group: "Preferences",
      icon: "lucide:palette",
      keywords: ["dark", "light", "color", "appearance"],
      page: () => [
        ...THEMES.map(
          (t): Command => ({
            id: `theme.${t.value}`,
            title: t.title,
            group: "Theme",
            icon: t.icon,
            ...optional("hint", current(t.value)),
            run: choose(t.value),
          }),
        ),
        ...customThemes.map(
          (t): Command => ({
            id: `theme.custom.${t.id}`,
            title: t.name,
            group: "Custom themes",
            icon: "lucide:palette",
            ...optional("hint", current(customPreference(t.id))),
            run: choose(customPreference(t.id)),
          }),
        ),
      ],
    },
  ];
}

function accountCommands(offerSignIn: boolean): Command[] {
  const signedIn = session.store.state.status === "authenticated";
  if (!signedIn)
    return offerSignIn
      ? [
          {
            id: "account.sign-in",
            title: "Sign in",
            group: "Account",
            icon: "lucide:log-in",
            run: (ctx) => ctx.go(`/login?returnTo=${encodeURIComponent(ctx.href)}`),
          },
        ]
      : [];
  return [
    {
      id: "account.editor",
      title: "Editor",
      group: "Account",
      icon: "lucide:file-pen",
      run: (ctx) => ctx.go("/editor"),
    },
    {
      id: "account.new",
      title: "New entry",
      group: "Account",
      icon: "lucide:file-plus",
      run: (ctx) => ctx.go("/editor/new"),
    },
    {
      id: "account.sign-out",
      title: "Sign out",
      group: "Account",
      icon: "lucide:log-out",
      // Leave the editing routes first, so their guard never redirects a page mid-render.
      run: async (ctx) => {
        if (ctx.href.startsWith("/editor")) await ctx.go("/home");
        else ctx.close();
        session.signOut();
      },
    },
  ];
}

const optional = <K extends string, V>(key: K, value: V | undefined) =>
  (value === undefined ? {} : { [key]: value }) as Partial<Record<K, V>>;

/** Registers the site's own commands while the palette host is mounted. */
export function useBuiltinCommands(open: boolean) {
  useEffect(() => registerCommands("site", siteCommands), []);
  useEffect(() => registerCommands("preferences", preferenceCommands), []);
  useEffect(() => {
    let offerSignIn = false;
    const off = registerCommands("account", () => accountCommands(offerSignIn));
    // Asked only when the palette opens, so readers who never open it never call the Worker.
    if (open)
      void signInMethods().then((m) => {
        offerSignIn = canSignIn(m);
      });
    return off;
  }, [open]);
}
