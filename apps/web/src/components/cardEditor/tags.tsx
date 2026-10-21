import { DropIndicator, useItemRegistration, useListReorder } from '@crc/interaction';
import { Icon, Popover, RadioGroup, Switch, TextField, Tip } from '@crc/ui';
import { type RefObject, useId, useState } from 'react';
import styles from './CardEditor.module.css';
import { Handle, IconSelect } from './fields.tsx';
import { type EditTag, MAX_TAGS, newTag, tagProblem } from './model.ts';

/** The tag being typed, why it cannot be added yet, and the id tying its label and message to it. */
const useTagDraft = () => {
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const inputId = useId();
  return { draft, setDraft, problem, setProblem, inputId };
};

/** A tag without an icon can only show its label; one gaining an icon shows both until told otherwise. */
const showWithIcon = (icon: string | null, show: EditTag['show']): EditTag['show'] => {
  if (!icon) {
    return 'label';
  }
  return show === 'label' ? 'both' : show;
};

/** The card's focus areas as chips: reorder, add, remove, and each one's settings a click away. */
export const TagEditor = ({
  tags,
  errors,
  onChange,
  onMove,
}: {
  tags: EditTag[];
  errors: Map<string, string>;
  onChange: (tags: EditTag[]) => void;
  onMove: (from: number, to: number) => void;
}) => {
  const { draft, setDraft, problem, setProblem, inputId } = useTagDraft();
  useListReorder(
    tags.map((t) => ({ ...t, id: t.key })),
    (next) => onChange(next.map(({ id: _id, ...t }) => t)),
    { listId: 'tags' },
  );

  const add = () => {
    const issue = tagProblem(tags, draft);
    setProblem(issue);
    if (issue) {
      return;
    }
    onChange([...tags, newTag(draft.trim())]);
    setDraft('');
  };

  return (
    <fieldset className={styles.tagEditor}>
      <legend className="visually-hidden">Focus areas {`${tags.length}/${MAX_TAGS}`}</legend>
      <ul className={styles.chips} role="list">
        {tags.map((tag, i) => (
          <TagChip
            key={tag.key}
            tag={tag}
            index={i}
            error={errors.get(`tags.${i}`)}
            onChange={(t) => onChange(tags.map((x) => (x.key === t.key ? t : x)))}
            onMove={(delta) => onMove(i, i + delta)}
            onRemove={() => onChange(tags.filter((t) => t.key !== tag.key))}
          />
        ))}
        <li className={styles.addTag}>
          <label htmlFor={inputId} className="visually-hidden">
            New focus area
          </label>
          <input
            id={inputId}
            className={styles.inline}
            value={draft}
            placeholder="+ Focus area"
            maxLength={40}
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? `${inputId}-problem` : undefined}
            onChange={(e) => {
              setDraft(e.target.value);
              setProblem(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                add();
              }
            }}
          />
        </li>
      </ul>
      {problem && (
        <span id={`${inputId}-problem`} className={styles.error} role="alert">
          {problem}
        </span>
      )}
    </fieldset>
  );
};

/* A focus area as the card will show it (icon, label, or both), marked when it links, with its
   settings a click away. */
const TagChip = ({
  tag,
  index,
  error,
  onChange,
  onMove,
  onRemove,
}: {
  tag: EditTag;
  index: number;
  error: string | undefined;
  onChange: (tag: EditTag) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) => {
  const { ref, handleRef, state } = useItemRegistration(tag.key, index, {
    listId: 'tags',
    axis: 'horizontal',
  });
  const name = tag.label.trim() || 'Untitled focus area';
  const iconOnly = tag.icon !== null && tag.show === 'icon';
  const withIcon = tag.icon !== null && tag.show !== 'label';
  return (
    <li
      ref={ref as RefObject<HTMLLIElement>}
      className={styles.chip}
      data-dragging={state.dragging}
      data-invalid={error ? true : undefined}
    >
      <Handle
        label={`${name}. Arrow keys move it.`}
        focusKey={`tag:${tag.key}`}
        axis="horizontal"
        onMove={onMove}
        handleRef={handleRef}
      >
        {withIcon && tag.icon && <Icon name={tag.icon} size={iconOnly ? 'md' : 'sm'} />}
        {!iconOnly && name}
        {tag.link && (
          <Tip label="Links to its posts">
            <span className={styles.linkMark} data-link-mark>
              <Icon name="lucide:link" size="xs" />
            </span>
          </Tip>
        )}
      </Handle>
      <TagSettings tag={tag} name={name} error={error} onChange={onChange} />
      <button
        type="button"
        className={styles.remove}
        aria-label={`Remove ${name}`}
        onClick={onRemove}
      >
        <Icon name="lucide:x" size="xs" />
      </button>
      <DropIndicator edge={state.edge} />
    </li>
  );
};

const SHOW_OPTIONS = [
  { value: 'icon', label: 'Icon' },
  { value: 'label', label: 'Label' },
  { value: 'both', label: 'Both' },
] as const;

const TagSettings = ({
  tag,
  name,
  error,
  onChange,
}: {
  tag: EditTag;
  name: string;
  error: string | undefined;
  onChange: (tag: EditTag) => void;
}) => {
  return (
    <Popover
      title="Focus area"
      align="start"
      trigger={
        <button type="button" className={styles.remove} aria-label={`Settings for ${name}`}>
          <Icon name="lucide:pencil" size="xs" />
        </button>
      }
    >
      <TextField
        label="Label"
        size="sm"
        value={tag.label}
        error={error}
        onValueChange={(label) => onChange({ ...tag, label })}
      />
      <div className={styles.iconRow}>
        <span className={styles.label}>Icon</span>
        <IconSelect
          value={tag.icon}
          allowNone
          label={`Icon for ${name}`}
          onChange={(icon) =>
            onChange({
              ...tag,
              icon,
              show: showWithIcon(icon, tag.show),
            })
          }
        />
      </div>
      <RadioGroup
        legend="Show"
        value={tag.icon === null ? 'label' : tag.show}
        options={SHOW_OPTIONS}
        disabled={tag.icon === null}
        onValueChange={(show) => onChange({ ...tag, show })}
      />
      <Switch
        label="Links to its posts"
        checked={tag.link}
        onCheckedChange={(link) => onChange({ ...tag, link })}
      />
    </Popover>
  );
};
