import {
  Icon,
  iconButton,
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
} from '@crc/ui';
import { siteFonts } from '../content/theme.ts';
import { editMode, useEditMode } from '../editor/editMode.ts';
import { useEditorLinks } from '../editor/navigation.ts';
import { useDialogState } from '../hooks/useDialogState.ts';
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
import styles from './UserMenu.module.css';

// The editor and its colour picker load apart from the site shell: as the menu that offers them opens.
const themeEditorChunk = preloadable(() => import('./ThemeEditor.tsx'));

/** The theme editor component, wanted once New theme or Edit is chosen; a failed load closes the
    request and says so. The menu's opening loads it ahead, so it usually opens at once. */
const useThemeEditor = (wanted: boolean, close: () => void) => {
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
  const ThemeEditor = useThemeEditor(editing.isOpen, editing.close);

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
      <Menu
        tip="Theme"
        trigger={
          <button
            type="button"
            className={iconButton()}
            aria-label={`Theme: ${label}.${editOn ? ' Edit mode on.' : ''}`}
          >
            <Icon name={editOn ? 'lucide:circle-user' : 'lucide:user'} size="md" />
          </button>
        }
        onOpenChange={(open) => {
          if (open) {
            themeEditorChunk.prefetch();
          }
        }}
      >
        <MenuRadioGroup<ThemePreference>
          label="Theme"
          value={preference}
          onValueChange={themeController.setPreference}
        >
          {builtIns.map((b) => (
            <MenuRadioItem key={b.value} value={b.value} icon={b.icon}>
              {b.label}
            </MenuRadioItem>
          ))}
          {customThemes.map((t) => (
            <MenuRadioItem
              key={t.id}
              value={customPreference(t.id)}
              icon={<span className={styles.swatch} style={{ background: t.accent }} aria-hidden />}
            >
              {t.name}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
        <MenuSeparator />
        {active && (
          <MenuItem
            icon="lucide:pencil"
            onClick={() => editing.open({ theme: active, isNew: false })}
          >
            Edit {active.name}…
          </MenuItem>
        )}
        <MenuItem icon="lucide:plus" onClick={startNew}>
          New custom theme…
        </MenuItem>
        {editMode.available && (
          <>
            <MenuSeparator />
            <MenuGroup label="Working tree">
              <MenuCheckboxItem
                icon="lucide:pencil"
                checked={editOn}
                onCheckedChange={editMode.set}
              >
                Edit mode
              </MenuCheckboxItem>
              {editOn && (
                <>
                  <MenuItem icon="lucide:file-pen" onClick={links.board}>
                    Editor
                  </MenuItem>
                  <MenuItem icon="lucide:file-plus" onClick={links.newEntry}>
                    New entry
                  </MenuItem>
                </>
              )}
            </MenuGroup>
          </>
        )}
      </Menu>
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
