import { Menu } from '@base-ui/react/menu';
import { Icon } from '@crc/ui';
import { useEffect } from 'react';
import { siteFonts } from '../content/theme.ts';
import { useSession, useSignInMethods, useSignOut } from '../editor/auth/hooks.ts';
import { canSignIn } from '../editor/auth/methods.ts';
import { useAccountLinks } from '../editor/navigation.ts';
import { useDialogState } from '../hooks/useDialogState.ts';
import { useDisclosure } from '../hooks/useDisclosure.ts';
import { usePopupMotion } from '../hooks/usePopupMotion.ts';
import { notifyLoadFailed } from '../lazy/failed.ts';
import { useLoaded } from '../lazy/hooks.ts';
import { preloadable } from '../lazy/preloadable.ts';
import { type CustomTheme, defaultTheme } from '../theme/custom.ts';
import { useThemeState } from '../theme/hooks.ts';
import {
  customPreference,
  newThemeId,
  type ThemePreference,
  themeController,
} from '../theme/store.ts';
import { Tip } from './Tip.tsx';
import styles from './UserMenu.module.css';

// The editor and its colour picker load apart from the site shell: as the menu that offers them opens.
const themeEditorChunk = preloadable(() => import('./ThemeEditor.tsx'));

/** The theme editor component, loaded ahead while the account menu is open, so choosing New theme or
    Edit opens it at once; a failed load closes the request and says so. */
const useThemeEditor = (menuOpen: boolean, wanted: boolean, close: () => void) => {
  useEffect(() => {
    if (menuOpen) {
      themeEditorChunk.prefetch();
    }
  }, [menuOpen]);
  const mod = useLoaded(themeEditorChunk, wanted, () => {
    notifyLoadFailed('the theme editor');
    close();
  });
  return mod?.ThemeEditor;
};

const builtIns = [
  { value: 'auto', label: 'Auto', icon: 'lucide:sun-moon' },
  { value: 'light', label: 'Light', icon: 'lucide:sun' },
  { value: 'dark', label: 'Dark', icon: 'lucide:moon' },
] as const;

/* The account menu (Base UI Menu): the theme, and what the visitor can do as themselves — signing in
   or out, and, once signed in, the editing screens. Custom themes sit under the built-ins with their
   accent as a swatch, and the theme editor opens from here too. */
export const UserMenu = () => {
  const { preference, resolved, customThemes } = useThemeState();
  const current = useSession();
  const editing = useDialogState<{ theme: CustomTheme; isNew: boolean }>();
  const links = useAccountLinks();
  const signOut = useSignOut();
  const menu = useDisclosure();
  const motion = usePopupMotion('dropdown');
  const ThemeEditor = useThemeEditor(menu.open, editing.isOpen, editing.close);
  const signedIn = current.status === 'authenticated';
  // Asked only once the menu opens, so readers who never open it never call the Worker for it.
  const methods = useSignInMethods(menu.open && !signedIn);
  const offerSignIn = methods !== null && canSignIn(methods);

  const active = customThemes.find((t) => customPreference(t.id) === preference);
  const builtIn = builtIns.find((b) => b.value === preference);
  const label = active?.name ?? builtIn?.label ?? 'Auto';

  const startNew = () => {
    const n = customThemes.length + 1;
    editing.open({
      theme: defaultTheme(resolved, newThemeId(), `Custom ${n}`, siteFonts),
      isNew: true,
    });
  };

  return (
    <>
      <Menu.Root
        open={menu.open}
        onOpenChange={(open) => {
          motion.onOpenChange(open);
          menu.setOpen(open);
        }}
      >
        <Tip label="Account and theme" side="bottom">
          <Menu.Trigger
            className={styles.button}
            aria-label={
              signedIn
                ? `Account: editing the working tree. Theme: ${label}.`
                : `Account: signed out. Theme: ${label}.`
            }
          >
            <Icon name={signedIn ? 'lucide:circle-user' : 'lucide:user'} size="md" />
          </Menu.Trigger>
        </Tip>
        <Menu.Portal>
          <Menu.Positioner className={styles.positioner} side="bottom" align="end" sideOffset={6}>
            <Menu.Popup className={styles.menu} ref={motion.ref}>
              <Menu.RadioGroup
                value={preference}
                onValueChange={(v: ThemePreference) => themeController.setPreference(v)}
              >
                <Menu.GroupLabel className={styles.groupLabel}>Theme</Menu.GroupLabel>
                {builtIns.map((b) => (
                  <Menu.RadioItem
                    key={b.value}
                    value={b.value}
                    className={styles.item}
                    closeOnClick
                  >
                    <Icon name={b.icon} size="sm" />
                    <span className={styles.itemLabel}>{b.label}</span>
                    <Menu.RadioItemIndicator className={styles.indicator}>
                      <Icon name="lucide:check" size="sm" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ))}
                {customThemes.map((t) => (
                  <Menu.RadioItem
                    key={t.id}
                    value={customPreference(t.id)}
                    className={styles.item}
                    closeOnClick
                  >
                    <span className={styles.swatch} style={{ background: t.accent }} aria-hidden />
                    <span className={styles.itemLabel}>{t.name}</span>
                    <Menu.RadioItemIndicator className={styles.indicator}>
                      <Icon name="lucide:check" size="sm" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
              <Menu.Separator className={styles.separator} />
              {active && (
                <Menu.Item
                  className={styles.item}
                  onClick={() => editing.open({ theme: active, isNew: false })}
                >
                  <Icon name="lucide:pencil" size="sm" />
                  <span className={styles.itemLabel}>Edit {active.name}…</span>
                </Menu.Item>
              )}
              <Menu.Item className={styles.item} onClick={startNew}>
                <Icon name="lucide:plus" size="sm" />
                <span className={styles.itemLabel}>New custom theme…</span>
              </Menu.Item>
              {(signedIn || offerSignIn) && <Menu.Separator className={styles.separator} />}
              {signedIn ? (
                <Menu.Group>
                  <Menu.GroupLabel className={styles.groupLabel}>
                    Signed in · working tree
                  </Menu.GroupLabel>
                  <Menu.Item className={styles.item} onClick={links.board}>
                    <Icon name="lucide:file-pen" size="sm" />
                    <span className={styles.itemLabel}>Editor</span>
                  </Menu.Item>
                  <Menu.Item className={styles.item} onClick={links.newEntry}>
                    <Icon name="lucide:file-plus" size="sm" />
                    <span className={styles.itemLabel}>New entry</span>
                  </Menu.Item>
                  <Menu.Item className={styles.item} onClick={signOut}>
                    <Icon name="lucide:log-out" size="sm" />
                    <span className={styles.itemLabel}>Sign out</span>
                  </Menu.Item>
                </Menu.Group>
              ) : (
                offerSignIn && (
                  <Menu.Item className={styles.item} onClick={links.signIn}>
                    <Icon name="lucide:log-in" size="sm" />
                    <span className={styles.itemLabel}>Sign in</span>
                  </Menu.Item>
                )
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {editing.subject && ThemeEditor && (
        <ThemeEditor
          key={editing.subject.theme.id}
          initial={editing.subject.theme}
          isNew={editing.subject.isNew}
          onClose={editing.close}
        />
      )}
    </>
  );
};
