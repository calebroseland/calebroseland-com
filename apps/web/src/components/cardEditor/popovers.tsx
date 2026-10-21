import { Field } from '@base-ui/react/field';
import { Popover } from '@base-ui/react/popover';
import { Switch } from '@base-ui/react/switch';
import { Button, Icon, usePopupMotion } from '@crc/ui';
import styles from './CardEditor.module.css';
import type { EditGroup } from './model.ts';

/** A group's settings, and moving or removing it without a drag. */
export const GroupPopover = ({
  group,
  name,
  canRemove,
  onChange,
  onMove,
  onRemove,
}: {
  group: EditGroup;
  name: string;
  canRemove: boolean;
  onChange: (group: EditGroup) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) => {
  const motion = usePopupMotion('dropdown');
  return (
    <Popover.Root onOpenChange={motion.onOpenChange}>
      <Popover.Trigger className={styles.options} aria-label={`Options for group ${name}`}>
        <Icon name="lucide:settings-2" size="sm" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className={styles.floating} side="bottom" align="end" sideOffset={6}>
          <Popover.Popup ref={motion.ref} className={styles.popup}>
            <Popover.Title className={styles.legend}>{name}</Popover.Title>
            <Field.Root className={styles.switchRow}>
              <Field.Label className={styles.label}>Icons in one row</Field.Label>
              <Switch.Root
                className={styles.switch}
                checked={group.inline}
                onCheckedChange={(inline) => onChange({ ...group, inline })}
              >
                <Switch.Thumb className={styles.switchThumb} />
              </Switch.Root>
            </Field.Root>
            <div className={styles.popupActions}>
              <Button size="sm" onClick={() => onMove(-1)}>
                Move earlier
              </Button>
              <Button size="sm" onClick={() => onMove(1)}>
                Move later
              </Button>
              {canRemove && (
                <Button variant="ghost" tone="danger" size="sm" onClick={onRemove}>
                  Remove group
                </Button>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
