import { Menu } from '@base-ui/react/menu';
import { Icon } from '@crc/ui';
import { useEffect } from 'react';
import { siteFonts } from '../content/theme.ts';
import { editMode, useEditMode } from '../editor/editMode.ts';
import { useEditorLinks } from '../editor/navigation.ts';
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

/* The site menu (Base UI Menu): the theme, and under the dev server, edit mode and the editing
   screens. Custom themes sit under the built-ins with their accent as a swatch, and the theme editor
   opens from here too. */
export const UserMenu = () => {
  const { preference, resolved, customThemes } = useThemeState();
  const editOn = useEditMode();
  const editing = useDialogState<{ theme: CustomTheme; isNew: boolean }>();
  const links = useEditorLinks();
  const menu = useDisclosure();
  const motion = usePopupMotion('dropdown');
  const ThemeEditor = useThemeEditor(menu.open, editing.isOpen, editing.close);

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
        <Tip label={editMode.available ? 'Theme and editing' : 'Theme'} side="bottom">
          <Menu.Trigger
            className={styles.button}
            aria-label={`Theme: ${label}.${editOn ? ' Edit mode on.' : ''}`}
          >
            <Icon name={editOn ? 'lucide:circle-user' : 'lucide:user'} size="md" />
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
              {editMode.available && (
                <Menu.Group>
                  <Menu.Separator className={styles.separator} />
                  <Menu.GroupLabel className={styles.groupLabel}>Working tree</Menu.GroupLabel>
                  <Menu.CheckboxItem
                    className={styles.item}
                    checked={editOn}
                    onCheckedChange={editMode.set}
                  >
                    <Icon name="lucide:pencil" size="sm" />
                    <span className={styles.itemLabel}>Edit mode</span>
                    <Menu.CheckboxItemIndicator className={styles.indicator}>
                      <Icon name="lucide:check" size="sm" />
                    </Menu.CheckboxItemIndicator>
                  </Menu.CheckboxItem>
                  {editOn && (
                    <>
                      <Menu.Item className={styles.item} onClick={links.board}>
                        <Icon name="lucide:file-pen" size="sm" />
                        <span className={styles.itemLabel}>Editor</span>
                      </Menu.Item>
                      <Menu.Item className={styles.item} onClick={links.newEntry}>
                        <Icon name="lucide:file-plus" size="sm" />
                        <span className={styles.itemLabel}>New entry</span>
                      </Menu.Item>
                    </>
                  )}
                </Menu.Group>
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
