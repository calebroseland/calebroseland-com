import { Button, Icon, Popover, Switch } from '@crc/ui';
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
  return (
    <Popover
      title={name}
      trigger={
        <button type="button" className={styles.options} aria-label={`Options for group ${name}`}>
          <Icon name="lucide:settings-2" size="sm" />
        </button>
      }
    >
      <Switch
        label="Icons in one row"
        checked={group.inline}
        onCheckedChange={(inline) => onChange({ ...group, inline })}
      />
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
    </Popover>
  );
};
