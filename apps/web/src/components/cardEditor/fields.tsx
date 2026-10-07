import { Select } from '@base-ui/react/select';
import { Icon } from '@crc/ui';
import { type KeyboardEvent, type ReactNode, type RefObject, useId } from 'react';
import { usePopupMotion } from '../../hooks/usePopupMotion.ts';
import styles from './CardEditor.module.css';
import { ICON_CHOICES } from './model.ts';

/** Ties a field's label to its control. */
const useLabelId = () => {
  return useId();
};

/** A labelled field in a popover or on the contact side. */
export const TextField = ({
  label,
  value,
  error,
  onChange,
  className,
  type = 'text',
  visibleLabel = false,
}: {
  label: string;
  value: string;
  error: string | undefined;
  onChange: (v: string) => void;
  className?: string | undefined;
  type?: 'text' | 'url';
  visibleLabel?: boolean;
}) => {
  const id = useLabelId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={visibleLabel ? styles.label : 'visually-hidden'}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={type === 'url' ? 'url' : undefined}
        className={[styles.input, className].filter(Boolean).join(' ')}
        value={value}
        placeholder={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <span id={`${id}-error`} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
};

/* Text on the card, editable where it stands: it keeps the type of whatever holds it, and shows a
   field's edge only on hover, focus, or when something is wrong. Leading and trailing content (a
   link's icon) sits inside that edge, beside the text. */
export const InlineText = ({
  label,
  value,
  error,
  onChange,
  className,
  focusKey,
  leading,
  trailing,
}: {
  label: string;
  value: string;
  error: string | undefined;
  onChange: (v: string) => void;
  className?: string | undefined;
  /** Lets a newly added item's text take focus (see useFocusByKey). */
  focusKey?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}) => {
  const id = useLabelId();
  return (
    <span className={[styles.inlineField, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <span className={styles.inlineControl}>
        {leading}
        <input
          id={id}
          type="text"
          className={styles.inline}
          value={value}
          placeholder={label}
          data-focus-key={focusKey}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {trailing}
      </span>
      {error && (
        <span id={`${id}-error`} className={styles.error}>
          {error}
        </span>
      )}
    </span>
  );
};

/** A drag handle that also moves its item with the arrow keys. */
export const Handle = ({
  label,
  focusKey,
  axis,
  onMove,
  handleRef,
  className,
  children,
}: {
  label: string;
  focusKey: string;
  axis: 'vertical' | 'horizontal' | 'grid';
  onMove: (delta: -1 | 1) => void;
  handleRef: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}) => {
  const keys = {
    vertical: { back: ['ArrowUp'], forward: ['ArrowDown'] },
    horizontal: { back: ['ArrowLeft'], forward: ['ArrowRight'] },
    grid: { back: ['ArrowUp', 'ArrowLeft'], forward: ['ArrowDown', 'ArrowRight'] },
  }[axis];
  return (
    <button
      type="button"
      ref={handleRef as RefObject<HTMLButtonElement>}
      className={[styles.handle, className].filter(Boolean).join(' ')}
      data-focus-key={focusKey}
      aria-label={label}
      aria-roledescription="reorderable"
      aria-keyshortcuts={[...keys.back, ...keys.forward].join(' ')}
      onKeyDown={(e: KeyboardEvent) => {
        const back = keys.back.includes(e.key);
        if (!back && !keys.forward.includes(e.key)) {
          return;
        }
        e.preventDefault();
        onMove(back ? -1 : 1);
      }}
    >
      {children}
    </button>
  );
};

const NO_ICON = 'none';

export const IconSelect = ({
  value,
  label,
  allowNone = false,
  size = 'md',
  className = styles.iconTrigger,
  onChange,
}: {
  value: string | null;
  label: string;
  allowNone?: boolean;
  size?: 'md' | 'xl';
  /** The trigger's look: a bordered button, or the icon as it sits on the card. */
  className?: string | undefined;
  onChange: (icon: string | null) => void;
}) => {
  const known = value === null || ICON_CHOICES.some((c) => c.value === value);
  const choices = [
    ...(allowNone ? [{ value: NO_ICON, label: 'No icon' }] : []),
    ...(known || value === null ? [] : [{ value, label: value }]),
    ...ICON_CHOICES,
  ];
  const motion = usePopupMotion('dropdown');
  return (
    <Select.Root
      onOpenChange={motion.onOpenChange}
      value={value ?? NO_ICON}
      items={choices}
      onValueChange={(v) => v && onChange(v === NO_ICON ? null : (v as string))}
    >
      <Select.Trigger className={className} aria-label={label}>
        <Select.Value>
          {(v: string) =>
            v === NO_ICON ? <span className={styles.noIcon}>—</span> : <Icon name={v} size={size} />
          }
        </Select.Value>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className={styles.floating} sideOffset={4} alignItemWithTrigger={false}>
          <Select.Popup ref={motion.ref} className={styles.iconPopup}>
            <Select.List>
              {choices.map((c) => (
                <Select.Item key={c.value} value={c.value} className={styles.iconItem}>
                  {c.value === NO_ICON ? (
                    <span className={styles.noIcon}>—</span>
                  ) : (
                    <Icon name={c.value} size="sm" />
                  )}
                  <Select.ItemText>{c.label}</Select.ItemText>
                  <Select.ItemIndicator className={styles.iconCheck}>
                    <Icon name="lucide:check" size="sm" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
};
