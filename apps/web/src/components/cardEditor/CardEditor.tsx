import { Select } from "@base-ui/react/select";
import type { Profile } from "@crc/content-schema";
import { AuthError, StaleRefError } from "@crc/github-client";
import { DropIndicator, reorder, useItemRegistration, useListReorder } from "@crc/interaction";
import { Icon } from "@crc/ui";
import { mdiCheck, mdiClose, mdiDragVertical, mdiPlus } from "@crc/ui/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useState,
} from "react";
import { session } from "../../studio/auth/store.ts";
import { clientFor } from "../../studio/github/client.ts";
import { studioKeys } from "../../studio/github/queries.ts";
import { loadProfile, PROFILE_REF, type ProfileSource, saveProfile } from "../../studio/profile.ts";
import { StudioProvider, useGitHub } from "../../studio/StudioProvider.tsx";
import { notify } from "../../studio/Toast.tsx";
import styles from "./CardEditor.module.css";
import {
  type EditGroup,
  type EditLink,
  type EditState,
  fieldErrors,
  fromProfile,
  ICON_CHOICES,
  iconPathFor,
  MAX_TAGS,
  newGroup,
  newLink,
  tagProblem,
  toProfile,
} from "./model.ts";

/** What a save produced; the card shows it when it is already the site's source (the working tree). */
export type EditResult = { profile: Profile; workingTree: boolean } | null;

/* The landing card, editable in place for a signed-in editor. It loads the profile through the
   studio's backend (the drafts/profile branch, or the working tree), edits a copy, and saves it back
   as content/profile.yaml. Loaded only when an editor opens it, so readers never download it. */

export const profileKey = studioKeys.bundle(PROFILE_REF, "profile.yaml");

/** Loads what the editor needs before it is shown, so the card can turn over straight into it. */
export function prepareEdit(published: Profile): Promise<ProfileSource> {
  return loadProfile(clientFor(session.store.state), published);
}

/** The landing card's editor: brings its own studio context, since the landing sits outside /studio. */
export default function CardEditor({
  source,
  onDone,
}: {
  source: ProfileSource;
  onDone: (result: EditResult) => void;
}) {
  return (
    <StudioProvider>
      <CardEditorForm source={source} onDone={onDone} heading />
    </StudioProvider>
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

/** The card's editing surface. Studio › Profile renders it inside the studio's shell. */
export function CardEditorForm({
  source,
  onDone,
  heading = false,
}: {
  source: ProfileSource;
  onDone: (result: EditResult) => void;
  /** Adds the page heading; the landing needs one, the studio's shell already has it. */
  heading?: boolean;
}) {
  const gh = useGitHub();
  const queryClient = useQueryClient();
  const [state, setState] = useState<EditState>(() => fromProfile(source.profile));
  const [dirty, setDirty] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const focusAfterMove = useFocusAfterMove();
  const headingId = useId();

  const update = (fn: (s: EditState) => EditState) => {
    setState(fn);
    setDirty(true);
  };
  const next = toProfile(source.profile, state);
  const errors = fieldErrors(next);
  const working = gh.kind === "local";

  const save = useMutation({
    mutationFn: () => saveProfile(gh, source, next, "profile: edit from the landing card"),
    onSuccess: async (saved) => {
      queryClient.setQueryData(profileKey, saved);
      await queryClient.invalidateQueries({ queryKey: studioKeys.drafts() });
      notify(
        working
          ? "Saved content/profile.yaml."
          : `Saved to ${PROFILE_REF}. Publish it from the studio to update the site.`,
      );
      onDone({ profile: saved.profile, workingTree: working });
    },
    onError: (err) => {
      if (err instanceof AuthError) {
        session.signOut();
        notify("Your sign-in expired. Sign in again to save.", { kind: "alert" });
      } else if (err instanceof StaleRefError) {
        notify("The profile changed since you opened it. Close the editor and open it again.", {
          kind: "alert",
        });
      } else notify("Couldn't save the profile.", { kind: "alert" });
    },
  });

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
    setAnnouncement(`${label} moved to position ${to + 1} of ${items.length}`);
    return reorder(items, from, to);
  };

  return (
    <form
      className={styles.editor}
      aria-labelledby={heading ? headingId : undefined}
      aria-label={heading ? undefined : "Edit card"}
      onSubmit={(e) => {
        e.preventDefault();
        if (errors.size === 0 && dirty) save.mutate();
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
        onChange={(tags) => update((s) => ({ ...s, tags }))}
        onMove={(from, to) => {
          const tags = move(state.tags, from, to, state.tags[from] ?? "", (t) => `tag:${t}`);
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
            onMoveLink={(from, to) => {
              const links = move(
                group.links,
                from,
                to,
                group.links[from]?.label || "Link",
                (l) => l.key,
              );
              update((s) => ({
                ...s,
                groups: s.groups.map((x, i) => (i === g ? { ...x, links } : x)),
              }));
            }}
          />
        ))}
        <button
          type="button"
          className={styles.addGroup}
          onClick={() => update((s) => ({ ...s, groups: [...s.groups, newGroup()] }))}
        >
          <Icon path={mdiPlus} size="sm" />
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
        {announcement}
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
            disabled={!dirty || errors.size > 0 || save.isPending}
            aria-busy={save.isPending}
          >
            {save.isPending ? "Saving…" : "Save card"}
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
  axis: "vertical" | "horizontal";
  onMove: (delta: -1 | 1) => void;
  handleRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const [back, forward] =
    axis === "vertical" ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];
  return (
    <button
      type="button"
      ref={handleRef as RefObject<HTMLButtonElement>}
      className={styles.handle}
      data-reorder-key={reorderKey}
      aria-label={label}
      aria-roledescription="reorderable"
      aria-keyshortcuts={axis === "vertical" ? "ArrowUp ArrowDown" : "ArrowLeft ArrowRight"}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key !== back && e.key !== forward) return;
        e.preventDefault();
        onMove(e.key === back ? -1 : 1);
      }}
    >
      {children}
    </button>
  );
}

function TagEditor({
  tags,
  onChange,
  onMove,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  onMove: (from: number, to: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const inputId = useId();
  const items = tags.map((t) => ({ id: t, tag: t }));
  useListReorder(items, (nextItems) => onChange(nextItems.map((i) => i.tag)), { listId: "tags" });

  const add = () => {
    const issue = tagProblem(tags, draft);
    setProblem(issue);
    if (issue) return;
    onChange([...tags, draft.trim()]);
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
            key={tag}
            tag={tag}
            index={i}
            onMove={(delta) => onMove(i, i + delta)}
            onRemove={() => onChange(tags.filter((t) => t !== tag))}
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
          <Icon path={mdiPlus} size="sm" />
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

function TagChip({
  tag,
  index,
  onMove,
  onRemove,
}: {
  tag: string;
  index: number;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { ref, handleRef, state } = useItemRegistration(tag, index, {
    listId: "tags",
    axis: "horizontal",
  });
  return (
    <li
      ref={ref as RefObject<HTMLLIElement>}
      className={styles.chip}
      data-dragging={state.dragging}
    >
      <Handle
        label={`${tag}. Arrow keys move it.`}
        reorderKey={`tag:${tag}`}
        axis="horizontal"
        onMove={onMove}
        handleRef={handleRef}
      >
        {tag}
      </Handle>
      <button
        type="button"
        className={styles.remove}
        aria-label={`Remove ${tag}`}
        onClick={onRemove}
      >
        <Icon path={mdiClose} size="xs" />
      </button>
      <DropIndicator edge={state.edge} />
    </li>
  );
}

function GroupEditor({
  group,
  index,
  errors,
  canRemove,
  onChange,
  onRemove,
  onMoveLink,
}: {
  group: EditGroup;
  index: number;
  errors: Map<string, string>;
  canRemove: boolean;
  onChange: (g: EditGroup) => void;
  onRemove: () => void;
  onMoveLink: (from: number, to: number) => void;
}) {
  const listId = `links-${group.key}`;
  const items = group.links.map((l) => ({ ...l, id: l.key }));
  useListReorder(
    items,
    (next) => onChange({ ...group, links: next.map(({ id: _id, ...l }) => l) }),
    {
      listId,
    },
  );
  const name = group.title.trim() || `Group ${index + 1}`;
  const setLink = (i: number, link: EditLink) =>
    onChange({ ...group, links: group.links.map((l, j) => (j === i ? link : l)) });

  return (
    <fieldset className={styles.group}>
      <legend className="visually-hidden">{name}</legend>
      <div className={styles.groupHead}>
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
            <Icon path={mdiClose} size="sm" />
          </button>
        )}
      </div>
      <ul className={styles.linkList} role="list">
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
            onMove={(delta) => onMoveLink(i, i + delta)}
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
        <Icon path={mdiPlus} size="sm" />
        Add link to {name}
      </button>
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
  const { ref, handleRef, state } = useItemRegistration(link.key, index, { listId });
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
        <Icon path={mdiDragVertical} size="sm" />
      </Handle>
      <IconSelect
        value={link.icon}
        label={`Icon for ${name}`}
        onChange={(icon) => onChange({ ...link, icon })}
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
          <Icon path={mdiClose} size="sm" />
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

function IconSelect({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (icon: string) => void;
}) {
  const known = ICON_CHOICES.some((c) => c.value === value);
  const choices = known ? ICON_CHOICES : [{ value, label: value }, ...ICON_CHOICES];
  return (
    <Select.Root value={value} items={choices} onValueChange={(v) => v && onChange(v as string)}>
      <Select.Trigger className={styles.iconTrigger} aria-label={label}>
        <Select.Value>{(v: string) => <Icon path={iconPathFor(v)} size="md" />}</Select.Value>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className={styles.floating} sideOffset={4} alignItemWithTrigger={false}>
          <Select.Popup className={styles.iconPopup}>
            <Select.List>
              {choices.map((c) => (
                <Select.Item key={c.value} value={c.value} className={styles.iconItem}>
                  <Icon path={iconPathFor(c.value)} size="sm" />
                  <Select.ItemText>{c.label}</Select.ItemText>
                  <Select.ItemIndicator className={styles.iconCheck}>
                    <Icon path={mdiCheck} size="sm" />
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
