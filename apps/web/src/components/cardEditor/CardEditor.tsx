import { Field } from "@base-ui/react/field";
import { Fieldset } from "@base-ui/react/fieldset";
import { Popover } from "@base-ui/react/popover";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Select } from "@base-ui/react/select";
import { Switch } from "@base-ui/react/switch";
import type { Profile } from "@crc/content-schema";
import {
  DropIndicator,
  reorder,
  useDragMoves,
  useItemRegistration,
  useListReorder,
  useListTarget,
} from "@crc/interaction";
import { Icon } from "@crc/ui";
import {
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useState,
} from "react";
import { session } from "../../editor/auth/store.ts";
import { useSaveProfile } from "../../editor/data/hooks.ts";
import { EditorProvider, useCapabilities } from "../../editor/EditorProvider.tsx";
import { clientFor } from "../../editor/github/client.ts";
import { loadProfile, PROFILE_REF, type ProfileSource } from "../../editor/profile.ts";
import { notify } from "../../editor/Toast.tsx";
import { Tip } from "../Tip.tsx";
import styles from "./CardEditor.module.css";
import { useAnnouncer, useProfileDraft } from "./hooks.ts";
import {
  type EditGroup,
  type EditLink,
  type EditTag,
  ICON_CHOICES,
  type LinkSlot,
  MAX_TAGS,
  moveLink,
  newGroup,
  newLink,
  newTag,
  nextLinkSlot,
  tagProblem,
} from "./model.ts";

const LINKS = "links";
const GROUPS = "groups";
const linkListId = (group: EditGroup) => `links-${group.key}`;

/** What a save produced; the card shows it when it is already the site's source (the working tree). */
export type EditResult = { profile: Profile; workingTree: boolean } | null;

/* The landing card, editable in place for a signed-in editor. It loads the profile through the
   editor's backend (the drafts/profile branch, or the working tree), edits a copy, and saves it back
   as content/profile.yaml. Loaded only when an editor opens it, so readers never download it. */

/** Loads what the editor needs before it is shown, so the card can turn over straight into it. */
export function prepareEdit(published: Profile): Promise<ProfileSource> {
  return loadProfile(clientFor(session.store.state), published);
}

/** The landing card's editor: brings its own editor context, since the landing sits outside /editor. */
export default function CardEditor({
  source,
  onDone,
}: {
  source: ProfileSource;
  onDone: (result: EditResult) => void;
}) {
  return (
    <EditorProvider>
      <CardEditorForm source={source} onDone={onDone} heading />
    </EditorProvider>
  );
}

/** Moves focus back to a reordered item after React has moved its node. */
function useFocusAfterMove() {
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    if (!pending) return;
    document.querySelector<HTMLElement>(`[data-reorder-key="${CSS.escape(pending)}"]`)?.focus();
    setPending(null);
  }, [pending]);
  return setPending;
}

/** The card's editing surface. */
function CardEditorForm({
  source,
  onDone,
  heading = false,
}: {
  source: ProfileSource;
  onDone: (result: EditResult) => void;
  /** Adds the page heading; the landing needs one, the editor's shell already has it. */
  heading?: boolean;
}) {
  const working = !useCapabilities().branches;
  const { state, dirty, next, errors, update } = useProfileDraft(source.profile);
  const announcer = useAnnouncer();
  const focusAfterMove = useFocusAfterMove();
  const headingId = useId();
  const save = useSaveProfile(source);

  const submit = async () => {
    const outcome = await save.run(next);
    if (outcome.ok) {
      notify(
        working
          ? "Saved content/profile.yaml."
          : `Saved to ${PROFILE_REF}. Publish it from the editor to update the site.`,
      );
      onDone({ profile: outcome.value.profile, workingTree: working });
    } else if (outcome.reason === "expired")
      notify("Your sign-in expired. Sign in again to save.", { kind: "alert" });
    else if (outcome.reason === "conflict")
      notify("The profile changed since you opened it. Close the editor and open it again.", {
        kind: "alert",
      });
    else notify("Couldn't save the profile.", { kind: "alert" });
  };

  const move = <T,>(
    items: readonly T[],
    from: number,
    to: number,
    label: string,
    keyOf: (t: T) => string,
  ): T[] => {
    const moved = items[from];
    if (moved === undefined || to < 0 || to >= items.length) return [...items];
    focusAfterMove(keyOf(moved));
    announcer.announce(`${label} moved to position ${to + 1} of ${items.length}`);
    return reorder(items, from, to);
  };

  const groupName = (g: number) => state.groups[g]?.title.trim() || `Group ${g + 1}`;
  const relocateLink = (from: LinkSlot, to: LinkSlot) => {
    const link = state.groups[from.group]?.links[from.index];
    if (!link) return;
    const groups = moveLink(state.groups, from, to);
    const length = groups[to.group]?.links.length ?? 0;
    focusAfterMove(link.key);
    announcer.announce(
      from.group === to.group
        ? `${link.label || "Link"} moved to position ${to.index + 1} of ${length}`
        : `${link.label || "Link"} moved to ${groupName(to.group)}, position ${to.index + 1} of ${length}`,
    );
    update((s) => ({ ...s, groups }));
  };
  const moveGroup = (from: number, to: number) => {
    const groups = move(state.groups, from, to, groupName(from), (g) => `group:${g.key}`);
    update((s) => ({ ...s, groups }));
  };
  useDragMoves(LINKS, (from, to) => {
    const at = (listId: string) => state.groups.findIndex((g) => linkListId(g) === listId);
    relocateLink(
      { group: at(from.listId), index: from.index },
      { group: at(to.listId), index: to.index },
    );
  });
  useDragMoves(GROUPS, (from, to) => moveGroup(from.index, to.index));

  return (
    <form
      className={styles.editor}
      aria-labelledby={heading ? headingId : undefined}
      aria-label={heading ? undefined : "Edit card"}
      onSubmit={(e) => {
        e.preventDefault();
        if (errors.size === 0 && dirty) void submit();
      }}
    >
      {heading && (
        <h1 id={headingId} className="visually-hidden">
          Edit card
        </h1>
      )}
      <TextField
        label="Name"
        className={styles.name}
        value={state.name}
        error={errors.get("name")}
        onChange={(name) => update((s) => ({ ...s, name }))}
      />
      <TextField
        label="Tagline"
        className={styles.tagline}
        value={state.tagline}
        error={errors.get("tagline")}
        onChange={(tagline) => update((s) => ({ ...s, tagline }))}
      />

      <TagEditor
        tags={state.tags}
        errors={errors}
        onChange={(tags) => update((s) => ({ ...s, tags }))}
        onMove={(from, to) => {
          const tags = move(
            state.tags,
            from,
            to,
            state.tags[from]?.label ?? "",
            (t) => `tag:${t.key}`,
          );
          update((s) => ({ ...s, tags }));
        }}
      />

      <div className={styles.groups}>
        {state.groups.map((group, g) => (
          <GroupEditor
            key={group.key}
            group={group}
            index={g}
            errors={errors}
            canRemove={state.groups.length > 1}
            onChange={(nextGroup) =>
              update((s) => ({ ...s, groups: s.groups.map((x, i) => (i === g ? nextGroup : x)) }))
            }
            onRemove={() => update((s) => ({ ...s, groups: s.groups.filter((_, i) => i !== g) }))}
            onMove={(delta) => moveGroup(g, g + delta)}
            onMoveLink={(index, delta) => {
              const to = nextLinkSlot(state.groups, { group: g, index }, delta);
              if (to) relocateLink({ group: g, index }, to);
            }}
          />
        ))}
        <button
          type="button"
          className={styles.addGroup}
          onClick={() => update((s) => ({ ...s, groups: [...s.groups, newGroup()] }))}
        >
          <Icon name="lucide:plus" size="sm" />
          Add group
        </button>
      </div>

      <fieldset className={styles.contact}>
        <legend className={styles.legend}>Back of the card</legend>
        {(
          [
            ["email", "Email", "contact.email"],
            ["phone", "Phone", "contact.phone"],
            ["location", "Location", "contact.location.label"],
            ["locationUrl", "Map link", "contact.location.url"],
          ] as const
        ).map(([field, label, path]) => (
          <TextField
            key={field}
            label={label}
            visibleLabel
            type={field === "locationUrl" ? "url" : "text"}
            value={state.contact[field]}
            error={errors.get(path)}
            onChange={(v) => update((s) => ({ ...s, contact: { ...s.contact, [field]: v } }))}
          />
        ))}
      </fieldset>

      <p className="visually-hidden" aria-live="polite">
        {announcer.message}
      </p>

      <div className={styles.bar}>
        <p className={styles.where}>
          {working ? "Saves to content/profile.yaml on this branch." : `Saves to ${PROFILE_REF}.`}
          {errors.size > 0 && (
            <span className={styles.problems}>
              {" "}
              {errors.size === 1
                ? "1 field needs attention."
                : `${errors.size} fields need attention.`}
            </span>
          )}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={() => onDone(null)}>
            Cancel
          </button>
          <button
            type="submit"
            className={styles.primary}
            disabled={!dirty || errors.size > 0 || save.pending}
            aria-busy={save.pending}
          >
            {save.pending ? "Saving…" : "Save card"}
          </button>
        </div>
      </div>
    </form>
  );
}

function TextField({
  label,
  value,
  error,
  onChange,
  className,
  type = "text",
  visibleLabel = false,
}: {
  label: string;
  value: string;
  error: string | undefined;
  onChange: (v: string) => void;
  className?: string | undefined;
  type?: "text" | "url";
  visibleLabel?: boolean;
}) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={visibleLabel ? styles.label : "visually-hidden"}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={type === "url" ? "url" : undefined}
        className={[styles.input, className].filter(Boolean).join(" ")}
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
}

function Handle({
  label,
  reorderKey,
  axis,
  onMove,
  handleRef,
  children,
}: {
  label: string;
  reorderKey: string;
  axis: "vertical" | "horizontal" | "grid";
  onMove: (delta: -1 | 1) => void;
  handleRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const keys = {
    vertical: { back: ["ArrowUp"], forward: ["ArrowDown"] },
    horizontal: { back: ["ArrowLeft"], forward: ["ArrowRight"] },
    grid: { back: ["ArrowUp", "ArrowLeft"], forward: ["ArrowDown", "ArrowRight"] },
  }[axis];
  return (
    <button
      type="button"
      ref={handleRef as RefObject<HTMLButtonElement>}
      className={styles.handle}
      data-reorder-key={reorderKey}
      aria-label={label}
      aria-roledescription="reorderable"
      aria-keyshortcuts={[...keys.back, ...keys.forward].join(" ")}
      onKeyDown={(e: KeyboardEvent) => {
        const back = keys.back.includes(e.key);
        if (!back && !keys.forward.includes(e.key)) return;
        e.preventDefault();
        onMove(back ? -1 : 1);
      }}
    >
      {children}
    </button>
  );
}

function TagEditor({
  tags,
  errors,
  onChange,
  onMove,
}: {
  tags: EditTag[];
  errors: Map<string, string>;
  onChange: (tags: EditTag[]) => void;
  onMove: (from: number, to: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const inputId = useId();
  useListReorder(
    tags.map((t) => ({ ...t, id: t.key })),
    (next) => onChange(next.map(({ id: _id, ...t }) => t)),
    { listId: "tags" },
  );

  const add = () => {
    const issue = tagProblem(tags, draft);
    setProblem(issue);
    if (issue) return;
    onChange([...tags, newTag(draft.trim())]);
    setDraft("");
  };

  return (
    <fieldset className={styles.tagEditor}>
      <legend className={styles.legend}>
        Focus areas <span className={styles.count}>{`${tags.length}/${MAX_TAGS}`}</span>
      </legend>
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
      </ul>
      <div className={styles.addTag}>
        <label htmlFor={inputId} className="visually-hidden">
          New focus area
        </label>
        <input
          id={inputId}
          className={styles.input}
          value={draft}
          placeholder="Add a focus area"
          maxLength={40}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? `${inputId}-problem` : undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            setProblem(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className={styles.secondary} onClick={add}>
          <Icon name="lucide:plus" size="sm" />
          Add
        </button>
      </div>
      {problem && (
        <span id={`${inputId}-problem`} className={styles.error} role="alert">
          {problem}
        </span>
      )}
    </fieldset>
  );
}

/* A focus area as the card will show it (icon, label, or both), marked when it links, with its
   settings a click away. */
function TagChip({
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
}) {
  const { ref, handleRef, state } = useItemRegistration(tag.key, index, {
    listId: "tags",
    axis: "horizontal",
  });
  const name = tag.label.trim() || "Untitled focus area";
  const iconOnly = tag.icon !== null && tag.show === "icon";
  return (
    <li
      ref={ref as RefObject<HTMLLIElement>}
      className={styles.chip}
      data-dragging={state.dragging}
      data-invalid={error ? true : undefined}
    >
      <Handle
        label={`${name}. Arrow keys move it.`}
        reorderKey={`tag:${tag.key}`}
        axis="horizontal"
        onMove={onMove}
        handleRef={handleRef}
      >
        {tag.icon && <Icon name={tag.icon} size={iconOnly ? "md" : "sm"} />}
        {!iconOnly && name}
        {tag.link && (
          <Tip label="Links to its posts">
            <span className={styles.linkMark}>
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
}

const SHOW_OPTIONS = [
  { value: "icon", label: "Icon" },
  { value: "label", label: "Label" },
  { value: "both", label: "Both" },
] as const;

function TagSettings({
  tag,
  name,
  error,
  onChange,
}: {
  tag: EditTag;
  name: string;
  error: string | undefined;
  onChange: (tag: EditTag) => void;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger className={styles.remove} aria-label={`Settings for ${name}`}>
        <Icon name="lucide:pencil" size="xs" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className={styles.floating} side="bottom" align="start" sideOffset={6}>
          <Popover.Popup className={styles.tagPopup}>
            <Popover.Title className={styles.legend}>Focus area</Popover.Title>
            <TextField
              label="Label"
              visibleLabel
              value={tag.label}
              error={error}
              onChange={(label) => onChange({ ...tag, label })}
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
                    show: icon ? (tag.show === "label" ? "both" : tag.show) : "label",
                  })
                }
              />
            </div>
            <Fieldset.Root
              className={styles.showGroup}
              disabled={tag.icon === null}
              render={
                <RadioGroup
                  value={tag.icon === null ? "label" : tag.show}
                  onValueChange={(show) => onChange({ ...tag, show: show as EditTag["show"] })}
                />
              }
            >
              <Fieldset.Legend className={styles.label}>Show</Fieldset.Legend>
              {SHOW_OPTIONS.map((o) => (
                <label key={o.value} className={styles.segment}>
                  <Radio.Root value={o.value} className={styles.radio}>
                    <Radio.Indicator className={styles.radioDot} />
                  </Radio.Root>
                  {o.label}
                </label>
              ))}
            </Fieldset.Root>
            <Field.Root className={styles.switchRow}>
              <Field.Label className={styles.label}>Links to its posts</Field.Label>
              <Switch.Root
                className={styles.switch}
                checked={tag.link}
                onCheckedChange={(link) => onChange({ ...tag, link })}
              >
                <Switch.Thumb className={styles.switchThumb} />
              </Switch.Root>
            </Field.Root>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function GroupEditor({
  group,
  index,
  errors,
  canRemove,
  onChange,
  onRemove,
  onMove,
  onMoveLink,
}: {
  group: EditGroup;
  index: number;
  errors: Map<string, string>;
  canRemove: boolean;
  onChange: (g: EditGroup) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
  onMoveLink: (index: number, delta: -1 | 1) => void;
}) {
  const listId = linkListId(group);
  const { ref, handleRef, state } = useItemRegistration(group.key, index, {
    listId: GROUPS,
    axis: "grid",
  });
  const list = useListTarget({ listId, kind: LINKS, length: group.links.length });
  const name = group.title.trim() || `Group ${index + 1}`;
  const setLink = (i: number, link: EditLink) =>
    onChange({ ...group, links: group.links.map((l, j) => (j === i ? link : l)) });

  return (
    <fieldset
      ref={ref as RefObject<HTMLFieldSetElement>}
      className={styles.group}
      data-dragging={state.dragging}
    >
      <legend className="visually-hidden">{name}</legend>
      <div className={styles.groupHead}>
        <Handle
          label={`Move group ${name}. Arrow keys move it.`}
          reorderKey={`group:${group.key}`}
          axis="grid"
          onMove={onMove}
          handleRef={handleRef}
        >
          <Icon name="lucide:grip-vertical" size="sm" />
        </Handle>
        <TextField
          label="Group name"
          className={styles.groupTitle}
          value={group.title}
          error={errors.get(`groups.${index}.title`)}
          onChange={(title) => onChange({ ...group, title })}
        />
        {canRemove && (
          <button
            type="button"
            className={styles.remove}
            aria-label={`Remove group ${name}`}
            onClick={onRemove}
          >
            <Icon name="lucide:x" size="sm" />
          </button>
        )}
      </div>
      <ul
        ref={list.ref as RefObject<HTMLUListElement>}
        className={styles.linkList}
        role="list"
        data-over={list.over || undefined}
      >
        {group.links.map((link, i) => (
          <LinkRow
            key={link.key}
            link={link}
            index={i}
            listId={listId}
            errors={errors}
            path={`groups.${index}.links.${i}`}
            canRemove={group.links.length > 1}
            onChange={(l) => setLink(i, l)}
            onRemove={() => onChange({ ...group, links: group.links.filter((_, j) => j !== i) })}
            onMove={(delta) => onMoveLink(i, delta)}
          />
        ))}
      </ul>
      {errors.get(`groups.${index}.links`) && (
        <span className={styles.error}>{errors.get(`groups.${index}.links`)}</span>
      )}
      <button
        type="button"
        className={styles.addLink}
        onClick={() => onChange({ ...group, links: [...group.links, newLink()] })}
      >
        <Icon name="lucide:plus" size="sm" />
        Add link to {name}
      </button>
      <DropIndicator edge={state.edge} />
    </fieldset>
  );
}

function LinkRow({
  link,
  index,
  listId,
  errors,
  path,
  canRemove,
  onChange,
  onRemove,
  onMove,
}: {
  link: EditLink;
  index: number;
  listId: string;
  errors: Map<string, string>;
  path: string;
  canRemove: boolean;
  onChange: (l: EditLink) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
}) {
  const { ref, handleRef, state } = useItemRegistration(link.key, index, { listId, kind: LINKS });
  const name = link.label.trim() || "new link";
  return (
    <li
      ref={ref as RefObject<HTMLLIElement>}
      className={styles.linkRow}
      data-dragging={state.dragging}
    >
      <Handle
        label={`Move ${name}. Arrow keys move it.`}
        reorderKey={link.key}
        axis="vertical"
        onMove={onMove}
        handleRef={handleRef}
      >
        <Icon name="lucide:grip-vertical" size="sm" />
      </Handle>
      <IconSelect
        value={link.icon}
        label={`Icon for ${name}`}
        onChange={(icon) => icon && onChange({ ...link, icon })}
      />
      <TextField
        label={`Label for ${name}`}
        className={styles.linkLabel}
        value={link.label}
        error={errors.get(`${path}.label`)}
        onChange={(label) => onChange({ ...link, label })}
      />
      {canRemove && (
        <button
          type="button"
          className={styles.remove}
          aria-label={`Remove ${name}`}
          onClick={onRemove}
        >
          <Icon name="lucide:x" size="sm" />
        </button>
      )}
      <div className={styles.linkUrl}>
        <TextField
          label={`Address for ${name}`}
          type="url"
          value={link.url}
          error={errors.get(`${path}.url`)}
          onChange={(url) => onChange({ ...link, url })}
        />
      </div>
      <DropIndicator edge={state.edge} />
    </li>
  );
}

const NO_ICON = "none";

function IconSelect({
  value,
  label,
  allowNone = false,
  onChange,
}: {
  value: string | null;
  label: string;
  allowNone?: boolean;
  onChange: (icon: string | null) => void;
}) {
  const known = value === null || ICON_CHOICES.some((c) => c.value === value);
  const choices = [
    ...(allowNone ? [{ value: NO_ICON, label: "No icon" }] : []),
    ...(known || value === null ? [] : [{ value, label: value }]),
    ...ICON_CHOICES,
  ];
  return (
    <Select.Root
      value={value ?? NO_ICON}
      items={choices}
      onValueChange={(v) => v && onChange(v === NO_ICON ? null : (v as string))}
    >
      <Select.Trigger className={styles.iconTrigger} aria-label={label}>
        <Select.Value>
          {(v: string) =>
            v === NO_ICON ? <span className={styles.noIcon}>—</span> : <Icon name={v} size="md" />
          }
        </Select.Value>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className={styles.floating} sideOffset={4} alignItemWithTrigger={false}>
          <Select.Popup className={styles.iconPopup}>
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
}
