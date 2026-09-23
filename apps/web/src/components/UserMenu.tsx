import { Menu } from "@base-ui/react/menu";
import { Icon } from "@crc/ui";
import {
  mdiAccountCircleOutline,
  mdiAccountOutline,
  mdiBrightnessAuto,
  mdiCheck,
  mdiFileDocumentEditOutline,
  mdiLoginVariant,
  mdiLogoutVariant,
  mdiMoonWaningCrescent,
  mdiNotePlusOutline,
  mdiPencil,
  mdiPlus,
  mdiWhiteBalanceSunny,
} from "@crc/ui/icons";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { lazy, Suspense, useState } from "react";
import { session } from "../editor/auth/store.ts";
import { capabilitiesOf } from "../editor/data/backend.ts";
import { type CustomTheme, defaultTheme } from "../theme/custom.ts";
import {
  customPreference,
  newThemeId,
  type ThemePreference,
  themeController,
} from "../theme/store.ts";
import styles from "./UserMenu.module.css";

// The editor and its colour picker load only when someone opens it.
const ThemeEditor = lazy(() => import("./ThemeEditor.tsx"));

const builtIns = [
  { value: "auto", label: "Auto", icon: mdiBrightnessAuto },
  { value: "light", label: "Light", icon: mdiWhiteBalanceSunny },
  { value: "dark", label: "Dark", icon: mdiMoonWaningCrescent },
] as const;

/* The account menu (Base UI Menu): the theme, and what the visitor can do as themselves — signing in
   or out, and, once signed in, the editing screens. Custom themes sit under the built-ins with their
   accent as a swatch, and the theme editor opens from here too. */
export function UserMenu() {
  const { preference, resolved, customThemes } = useStore(themeController.store, (s) => s);
  const current = useStore(session.store, (s) => s);
  const [editing, setEditing] = useState<{ theme: CustomTheme; isNew: boolean } | null>(null);
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location.href });
  const onEditingRoute = location.startsWith("/editor");
  const signedIn = current.status === "authenticated";

  const active = customThemes.find((t) => customPreference(t.id) === preference);
  const builtIn = builtIns.find((b) => b.value === preference);
  const label = active?.name ?? builtIn?.label ?? "Auto";

  const startNew = () => {
    const n = customThemes.length + 1;
    setEditing({ theme: defaultTheme(resolved, newThemeId(), `Custom ${n}`), isNew: true });
  };

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          className={styles.button}
          aria-label={
            signedIn
              ? `Account: signed in with ${capabilitiesOf(current.backend).label}. Theme: ${label}.`
              : `Account: signed out. Theme: ${label}.`
          }
        >
          <Icon path={signedIn ? mdiAccountCircleOutline : mdiAccountOutline} size="md" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner className={styles.positioner} side="bottom" align="end" sideOffset={6}>
            <Menu.Popup className={styles.menu}>
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
                    <Icon path={b.icon} size="sm" />
                    <span className={styles.itemLabel}>{b.label}</span>
                    <Menu.RadioItemIndicator className={styles.indicator}>
                      <Icon path={mdiCheck} size="sm" />
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
                      <Icon path={mdiCheck} size="sm" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
              <Menu.Separator className={styles.separator} />
              {active && (
                <Menu.Item
                  className={styles.item}
                  onClick={() => setEditing({ theme: active, isNew: false })}
                >
                  <Icon path={mdiPencil} size="sm" />
                  <span className={styles.itemLabel}>Edit {active.name}…</span>
                </Menu.Item>
              )}
              <Menu.Item className={styles.item} onClick={startNew}>
                <Icon path={mdiPlus} size="sm" />
                <span className={styles.itemLabel}>New custom theme…</span>
              </Menu.Item>
              <Menu.Separator className={styles.separator} />
              {signedIn ? (
                <Menu.Group>
                  <Menu.GroupLabel className={styles.groupLabel}>
                    Signed in · {capabilitiesOf(current.backend).label}
                  </Menu.GroupLabel>
                  <Menu.Item
                    className={styles.item}
                    onClick={() => void navigate({ to: "/editor" })}
                  >
                    <Icon path={mdiFileDocumentEditOutline} size="sm" />
                    <span className={styles.itemLabel}>Editor</span>
                  </Menu.Item>
                  <Menu.Item
                    className={styles.item}
                    onClick={() => void navigate({ to: "/editor/new" })}
                  >
                    <Icon path={mdiNotePlusOutline} size="sm" />
                    <span className={styles.itemLabel}>New entry</span>
                  </Menu.Item>
                  <Menu.Item
                    className={styles.item}
                    onClick={() => {
                      // Leave the editing routes before the session goes, so their guard never has to
                      // redirect a page that is already rendering.
                      void navigate({ to: onEditingRoute ? "/home" : "." }).then(() =>
                        session.signOut(),
                      );
                    }}
                  >
                    <Icon path={mdiLogoutVariant} size="sm" />
                    <span className={styles.itemLabel}>Sign out</span>
                  </Menu.Item>
                </Menu.Group>
              ) : (
                <Menu.Item
                  className={styles.item}
                  onClick={() => void navigate({ to: "/login", search: { returnTo: location } })}
                >
                  <Icon path={mdiLoginVariant} size="sm" />
                  <span className={styles.itemLabel}>Sign in</span>
                </Menu.Item>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {editing && (
        <Suspense fallback={null}>
          <ThemeEditor
            key={editing.theme.id}
            initial={editing.theme}
            isNew={editing.isNew}
            onClose={() => setEditing(null)}
          />
        </Suspense>
      )}
    </>
  );
}
