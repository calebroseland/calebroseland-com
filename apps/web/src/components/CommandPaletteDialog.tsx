import { Autocomplete } from '@base-ui/react/autocomplete';
import { Dialog } from '@base-ui/react/dialog';
import { ScrollArea } from '@base-ui/react/scroll-area';
import { Icon } from '@crc/ui';
import type { KeyboardEvent } from 'react';
import { type CommandGroup, usePaletteView, useRunCommand } from '../commands/hooks.ts';
import { palette } from '../commands/palette.ts';
import { type Command, searchText } from '../commands/registry.ts';
import { usePopupMotion } from '../hooks/usePopupMotion.ts';
import styles from './CommandPaletteDialog.module.css';

/* Base UI's command palette pattern: a Dialog around an inline Autocomplete. A command either runs,
   or opens a page of its own commands; Backspace in an empty search, or the back button, returns. */
export default function CommandPaletteDialog({ open }: { open: boolean }) {
  const view = usePaletteView(open);
  const run = useRunCommand();
  const motion = usePopupMotion('dialog', open);

  const activate = (c: Command) => {
    if (c.page) view.enter(c);
    else void run(c);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && view.query === '' && view.page) {
      e.preventDefault();
      view.back();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? palette.open() : palette.close())}>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Viewport className={styles.viewport}>
          <Dialog.Popup ref={motion.ref} className={styles.popup} aria-label="Command palette">
            <Autocomplete.Root
              open
              inline
              items={view.groups}
              value={view.query}
              onValueChange={view.setQuery}
              itemToStringValue={searchText}
              autoHighlight="always"
              keepHighlight
            >
              {view.page && (
                <div className={styles.crumb}>
                  <button type="button" className={styles.back} onClick={view.back}>
                    <Icon name="lucide:arrow-left" size="sm" />
                    <span className="visually-hidden">Back</span>
                  </button>
                  <span>{view.page.title}</span>
                </div>
              )}
              <Autocomplete.InputGroup className={styles.inputGroup}>
                <Icon name="lucide:search" size="sm" />
                <Autocomplete.Input
                  className={styles.input}
                  aria-label={view.page ? `Search ${view.page.title}` : 'Search commands'}
                  placeholder={
                    view.page ? `${view.page.title}…` : 'Go to, search posts, change theme…'
                  }
                  onKeyDown={onKeyDown}
                />
              </Autocomplete.InputGroup>
              <Dialog.Close className="visually-hidden">Close</Dialog.Close>
              <ScrollArea.Root className={styles.results}>
                <ScrollArea.Viewport className={styles.viewportScroll}>
                  <Autocomplete.Empty>
                    <p className={styles.empty}>Nothing matches.</p>
                  </Autocomplete.Empty>
                  <Autocomplete.List className={styles.list}>
                    {(group: CommandGroup) => (
                      <Autocomplete.Group
                        key={group.value}
                        items={group.items}
                        className={styles.group}
                      >
                        <Autocomplete.GroupLabel className={styles.groupLabel}>
                          {group.value}
                        </Autocomplete.GroupLabel>
                        <Autocomplete.Collection>
                          {(c: Command) => (
                            <Autocomplete.Item
                              key={c.id}
                              value={c}
                              className={styles.item}
                              onClick={() => activate(c)}
                            >
                              {c.icon && <Icon name={c.icon} size="sm" />}
                              <span className={styles.title}>{c.title}</span>
                              {c.hint && <span className={styles.hint}>{c.hint}</span>}
                              {c.page && <Icon name="lucide:chevron-right" size="sm" />}
                            </Autocomplete.Item>
                          )}
                        </Autocomplete.Collection>
                      </Autocomplete.Group>
                    )}
                  </Autocomplete.List>
                </ScrollArea.Viewport>
              </ScrollArea.Root>
              <div className={styles.keys} aria-hidden="true">
                <span>
                  <kbd>↵</kbd> Open
                </span>
                {view.page && (
                  <span>
                    <kbd>⌫</kbd> Back
                  </span>
                )}
                <span>
                  <kbd>Esc</kbd> Close
                </span>
              </div>
            </Autocomplete.Root>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
