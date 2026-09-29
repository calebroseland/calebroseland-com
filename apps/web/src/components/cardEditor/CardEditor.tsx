import type { Profile } from "@crc/content-schema";
import {
  DropIndicator,
  reorder,
  useDragMoves,
  useItemRegistration,
  useListTarget,
} from "@crc/interaction";
import { Icon } from "@crc/ui";
import { type FormEvent, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { session } from "../../editor/auth/store.ts";
import { useSaveProfile } from "../../editor/data/hooks.ts";
import { EditorProvider, useCapabilities } from "../../editor/EditorProvider.tsx";
import { clientFor } from "../../editor/github/client.ts";
import { loadProfile, PROFILE_REF, type ProfileSource } from "../../editor/profile.ts";
import { notify } from "../../editor/Toast.tsx";
import card from "../Landing.module.css";
import { Tip } from "../Tip.tsx";
import { vtName } from "../viewTransition.ts";
import styles from "./CardEditor.module.css";
import { Handle, IconSelect, InlineText } from "./fields.tsx";
import { useAnnouncer, useFocusByKey, useProfileDraft, useUnsavedGuard } from "./hooks.ts";
import {
  type EditGroup,
  type EditLink,
  type LinkSlot,
  moveLink,
  newGroup,
  newLink,
  nextLinkSlot,
} from "./model.ts";
import { GroupPopover } from "./popovers.tsx";
import { TagEditor } from "./tags.tsx";

const LINKS = "links";
const GROUPS = "groups";
const linkListId = (group: EditGroup) => `links-${group.key}`;

/** What a save produced; the card shows it when it is already the site's source (the working tree). */
export type EditResult = { profile: Profile; workingTree: boolean } | null;

/** The card's two faces while editing, for the landing to place where its own faces go. */
export type EditFaces = { front: ReactNode; back: ReactNode };

/* The landing card, editable where it stands for a signed-in editor: the same card, its text turned
   into fields, its links and groups draggable. It loads the profile through the editor's backend (the
   drafts/profile branch, or the working tree), edits a copy, and saves it back as content/profile.yaml.
   Loaded only when an editor opens it, so readers never download it. */

/** Loads what the editor needs before it is shown, so the card can turn editable in one step. */
export function prepareEdit(published: Profile): Promise<ProfileSource> {
  return loadProfile(clientFor(session.store.state), published);
}

/** One edit session across both faces of the card; brings its own editor context, since the landing
    sits outside /editor. The landing places the faces, so the flip between them stays its own. */
export default function CardEditSession({
  source,
  onFlip,
  onDone,
  children,
}: {
  source: ProfileSource;
  onFlip: () => void;
  onDone: (result: EditResult) => void;
  children: (faces: EditFaces) => ReactNode;
}) {
  return (
    <EditorProvider>
      <Session source={source} onFlip={onFlip} onDone={onDone}>
        {children}
      </Session>
    </EditorProvider>
  );
}

function Session({
  source,
  onFlip,
  onDone,
  children,
}: {
  source: ProfileSource;
  onFlip: () => void;
  onDone: (result: EditResult) => void;
  children: (faces: EditFaces) => ReactNode;
}) {
  const s = useEditSession(source, onDone);
  const [turned, setTurned] = useState(false);
  const flip = () => {
    setTurned(true);
    onFlip();
  };
  return children({
    front: <EditFront s={s} onFlip={flip} focusFlip={turned} />,
    back: <EditBack s={s} onFlip={flip} focusFlip={turned} />,
  });
}

type EditSession = ReturnType<typeof useEditSession>;

/** The draft, its moves, additions and removals (each announced), and saving it. */
function useEditSession(source: ProfileSource, onDone: (result: EditResult) => void) {
  const working = !useCapabilities().branches;
  const { state, dirty, next, errors, update } = useProfileDraft(source.profile);
  const announcer = useAnnouncer();
  const focusByKey = useFocusByKey();
  const save = useSaveProfile(source);
  useUnsavedGuard(dirty);

  const submit = async () => {
    const outcome = await save.run(next);
    if (outcome.ok) {
      notify(
        working
          ? "Saved content/profile.yaml."
          : `Saved to ${PROFILE_REF}. Publish it from the editor to update the site.`,
        { kind: "success" },
      );
      onDone({ profile: outcome.value.profile, workingTree: working });
    } else if (outcome.reason === "expired")
      notify("Your sign-in expired. Sign in again to save.", { kind: "error" });
    else if (outcome.reason === "conflict")
      notify("The profile changed since you opened it. Close the editor and open it again.", {
        kind: "error",
      });
    else notify("Couldn't save the profile.", { kind: "error" });
  };

  const groupName = (g: number) => state.groups[g]?.title.trim() || `Group ${g + 1}`;
  const setGroup = (g: number, group: EditGroup) =>
    update((s) => ({ ...s, groups: s.groups.map((x, i) => (i === g ? group : x)) }));

  const moveTag = (from: number, to: number) => {
    const tag = state.tags[from];
    if (!tag || to < 0 || to >= state.tags.length) return;
    focusByKey(`tag:${tag.key}`);
    announcer.announce(`${tag.label} moved to position ${to + 1} of ${state.tags.length}`);
    update((s) => ({ ...s, tags: reorder(s.tags, from, to) }));
  };

  const relocateLink = (from: LinkSlot, to: LinkSlot) => {
    const link = state.groups[from.group]?.links[from.index];
    if (!link) return;
    const groups = moveLink(state.groups, from, to);
    const length = groups[to.group]?.links.length ?? 0;
    focusByKey(link.key);
    announcer.announce(
      from.group === to.group
        ? `${link.label || "Link"} moved to position ${to.index + 1} of ${length}`
        : `${link.label || "Link"} moved to ${groupName(to.group)}, position ${to.index + 1} of ${length}`,
    );
    update((s) => ({ ...s, groups }));
  };
  const stepLink = (g: number, index: number, delta: -1 | 1) => {
    const to = nextLinkSlot(state.groups, { group: g, index }, delta);
    if (to) relocateLink({ group: g, index }, to);
  };

  const moveGroup = (from: number, to: number) => {
    const group = state.groups[from];
    if (!group || to < 0 || to >= state.groups.length) return;
    focusByKey(`group:${group.key}`);
    announcer.announce(`${groupName(from)} moved to position ${to + 1} of ${state.groups.length}`);
    update((s) => ({ ...s, groups: reorder(s.groups, from, to) }));
  };

  useDragMoves(LINKS, (from, to) => {
    const at = (listId: string) => state.groups.findIndex((g) => linkListId(g) === listId);
    relocateLink(
      { group: at(from.listId), index: from.index },
      { group: at(to.listId), index: to.index },
    );
  });
  useDragMoves(GROUPS, (from, to) => moveGroup(from.index, to.index));

  const addLink = (g: number) => {
    const group = state.groups[g];
    if (!group) return;
    const link = newLink();
    focusByKey(`label:${link.key}`);
    announcer.announce(`Added a link to ${groupName(g)}`);
    setGroup(g, { ...group, links: [...group.links, link] });
  };
  const removeLink = (g: number, index: number) => {
    const group = state.groups[g];
    const link = group?.links[index];
    if (!group || !link) return;
    announcer.announce(`Removed ${link.label || "the link"}`);
    setGroup(g, { ...group, links: group.links.filter((_, i) => i !== index) });
  };
  const addGroup = () => {
    const group = newGroup();
    focusByKey(`title:${group.key}`);
    announcer.announce("Added a group");
    update((s) => ({ ...s, groups: [...s.groups, group] }));
  };
  const removeGroup = (g: number) => {
    announcer.announce(`Removed ${groupName(g)}`);
    update((s) => ({ ...s, groups: s.groups.filter((_, i) => i !== g) }));
  };

  return {
    state,
    errors,
    update,
    working,
    announcement: announcer.message,
    canSave: dirty && errors.size === 0 && !save.pending,
    saving: save.pending,
    onSubmit: (e: FormEvent) => {
      e.preventDefault();
      if (dirty && errors.size === 0 && !save.pending) void submit();
    },
    cancel: () => onDone(null),
    groupName,
    setGroup,
    moveTag,
    stepLink,
    moveGroup,
    addLink,
    removeLink,
    addGroup,
    removeGroup,
  };
}

/** Focuses the element once it mounts, when the mount was caused by turning the card. */
function useFocusWhen<T extends HTMLElement>(when: boolean): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (when) ref.current?.focus();
  }, [when]);
  return ref;
}

/* The front, editable in place: the card's own classes for its look, and its view-transition names on
   what both states share, so turning editable morphs the card rather than swapping it. */
function EditFront({
  s,
  onFlip,
  focusFlip,
}: {
  s: EditSession;
  onFlip: () => void;
  focusFlip: boolean;
}) {
  const { state, errors, update } = s;
  const flipRef = useFocusWhen<HTMLButtonElement>(focusFlip);
  return (
    <form aria-label="Edit card" className={styles.editFace} onSubmit={s.onSubmit}>
      <div className={card.corners}>
        <span />
        <Tip label="Contact details" side="bottom">
          <button
            ref={flipRef}
            type="button"
            className={`${card.cornerButton} ${card.vt}`}
            style={vtName("card-flip")}
            aria-label="Contact details"
            onClick={onFlip}
          >
            <Icon name="lucide:id-card" size="lg" />
            <Icon name="lucide:chevron-right" size="sm" />
          </button>
        </Tip>
      </div>

      <div className={`${card.name} ${card.vt}`} style={vtName("site-name")}>
        <InlineText
          label="Name"
          value={state.name}
          error={errors.get("name")}
          onChange={(name) => update((d) => ({ ...d, name }))}
        />
      </div>
      <div className={`${card.tagline} ${card.vt}`} style={vtName("card-tagline")}>
        <InlineText
          label="Tagline"
          value={state.tagline}
          error={errors.get("tagline")}
          onChange={(tagline) => update((d) => ({ ...d, tagline }))}
        />
      </div>

      <div className={`${card.tags} ${card.vt}`} style={vtName("card-tags")}>
        <TagEditor
          tags={state.tags}
          errors={errors}
          onChange={(tags) => update((d) => ({ ...d, tags }))}
          onMove={s.moveTag}
        />
      </div>

      <div className={`${card.links} ${styles.editGroups}`} data-expanded>
        {state.groups.map((group, g) => (
          <EditGroupColumn key={group.key} s={s} group={group} index={g} />
        ))}
        <button type="button" className={styles.addGroup} onClick={s.addGroup}>
          <Icon name="lucide:plus" size="sm" />
          Add group
        </button>
      </div>

      <p className="visually-hidden" aria-live="polite">
        {s.announcement}
      </p>
      <SaveBar s={s} />
    </form>
  );
}

function EditGroupColumn({ s, group, index }: { s: EditSession; group: EditGroup; index: number }) {
  const listId = linkListId(group);
  const { ref, handleRef, state } = useItemRegistration(group.key, index, {
    listId: GROUPS,
    axis: "grid",
  });
  const list = useListTarget({ listId, kind: LINKS, length: group.links.length });
  const name = s.groupName(index);
  const linksError = s.errors.get(`groups.${index}.links`);
  const setLink = (i: number, link: EditLink) =>
    s.setGroup(index, { ...group, links: group.links.map((l, j) => (j === i ? link : l)) });

  return (
    <fieldset
      ref={ref as RefObject<HTMLFieldSetElement>}
      className={`${card.group} ${styles.group}`}
      data-dragging={state.dragging}
    >
      <legend className="visually-hidden">{name}</legend>
      <div
        className={`${card.groupTitle} ${styles.groupHead} ${card.vt}`}
        style={vtName(`card-group-${index}`)}
      >
        <Handle
          label={`Move group ${name}. Arrow keys move it.`}
          focusKey={`group:${group.key}`}
          axis="grid"
          onMove={(delta) => s.moveGroup(index, index + delta)}
          handleRef={handleRef}
        >
          <Icon name="lucide:grip-vertical" size="sm" />
        </Handle>
        <InlineText
          label="Group name"
          value={group.title}
          focusKey={`title:${group.key}`}
          error={s.errors.get(`groups.${index}.title`)}
          onChange={(title) => s.setGroup(index, { ...group, title })}
        />
        <GroupPopover
          group={group}
          name={name}
          canRemove={s.state.groups.length > 1}
          onChange={(g) => s.setGroup(index, g)}
          onMove={(delta) => s.moveGroup(index, index + delta)}
          onRemove={() => s.removeGroup(index)}
        />
      </div>
      <ul
        ref={list.ref as RefObject<HTMLUListElement>}
        className={`${card.list} ${styles.linkList}`}
        role="list"
        data-over={list.over || undefined}
        data-empty={group.links.length === 0 || undefined}
      >
        {group.links.map((link, i) => (
          <EditLinkRow
            key={link.key}
            s={s}
            link={link}
            group={index}
            index={i}
            listId={listId}
            canRemove={group.links.length > 1}
            onChange={(l) => setLink(i, l)}
          />
        ))}
      </ul>
      {linksError && <span className={styles.error}>{linksError}</span>}
      <button type="button" className={styles.addLink} onClick={() => s.addLink(index)}>
        <Icon name="lucide:plus" size="sm" />
        Add link to {name}
      </button>
      <DropIndicator edge={state.edge} />
    </fieldset>
  );
}

function EditLinkRow({
  s,
  link,
  group,
  index,
  listId,
  canRemove,
  onChange,
}: {
  s: EditSession;
  link: EditLink;
  group: number;
  index: number;
  listId: string;
  canRemove: boolean;
  onChange: (l: EditLink) => void;
}) {
  const { ref, handleRef, state } = useItemRegistration(link.key, index, { listId, kind: LINKS });
  const name = link.label.trim() || "new link";
  const path = `groups.${group}.links.${index}`;
  return (
    <li
      ref={ref as RefObject<HTMLLIElement>}
      className={`${card.linkItem} ${styles.linkRow} ${card.vt}`}
      style={vtName(`card-link-${group}-${index}`)}
      data-dragging={state.dragging}
    >
      <Handle
        label={`Move ${name}. Arrow keys move it.`}
        focusKey={link.key}
        axis="vertical"
        onMove={(delta) => s.stepLink(group, index, delta)}
        handleRef={handleRef}
      >
        <Icon name="lucide:grip-vertical" size="sm" />
      </Handle>
      <span className={styles.linkFields}>
        <InlineText
          label={`Label for ${name}`}
          value={link.label}
          focusKey={`label:${link.key}`}
          error={s.errors.get(`${path}.label`)}
          onChange={(label) => onChange({ ...link, label })}
          leading={
            <IconSelect
              value={link.icon}
              label={`Icon for ${name}`}
              size="xl"
              className={styles.cardIcon}
              onChange={(icon) => icon && onChange({ ...link, icon })}
            />
          }
        />
        <InlineText
          label={`Address for ${name}`}
          className={styles.address}
          value={link.url}
          error={s.errors.get(`${path}.url`) ?? s.errors.get(`${path}.icon`)}
          onChange={(url) => onChange({ ...link, url })}
        />
      </span>
      {canRemove ? (
        <button
          type="button"
          className={styles.options}
          aria-label={`Remove ${name}`}
          onClick={() => s.removeLink(group, index)}
        >
          <Icon name="lucide:x" size="sm" />
        </button>
      ) : (
        // Keeps the fields' width steady down the column; a group's last link cannot go.
        <span className={styles.options} aria-hidden="true" />
      )}
      <DropIndicator edge={state.edge} />
    </li>
  );
}

const CONTACT_FIELDS = [
  ["email", "Email", "lucide:mail", "contact.email"],
  ["phone", "Phone", "lucide:phone", "contact.phone"],
  ["location", "Location", "lucide:map-pin", "contact.location.label"],
  ["locationUrl", "Map link", "lucide:link", "contact.location.url"],
] as const;

/** The contact side, editable the same way; empty fields are left out of the file. */
function EditBack({
  s,
  onFlip,
  focusFlip,
}: {
  s: EditSession;
  onFlip: () => void;
  focusFlip: boolean;
}) {
  const { state, errors, update } = s;
  const closeRef = useFocusWhen<HTMLButtonElement>(focusFlip);
  return (
    <form aria-label="Edit card" className={styles.editFace} onSubmit={s.onSubmit}>
      <div className={card.back}>
        <div className={styles.backBody}>
          <p className={card.backName}>{state.name}</p>
          <p className={card.tagline}>{state.tagline}</p>
          <ul
            className={`${card.details} ${styles.contactFields}`}
            role="list"
            aria-label="Contact"
          >
            {CONTACT_FIELDS.map(([field, label, icon, path]) => (
              <li key={field} className={card.detail}>
                <Icon name={icon} size="md" />
                <InlineText
                  label={label}
                  value={state.contact[field]}
                  error={errors.get(path)}
                  onChange={(v) => update((d) => ({ ...d, contact: { ...d.contact, [field]: v } }))}
                />
              </li>
            ))}
          </ul>
        </div>
        <Tip label="Back to links" side="bottom">
          <button
            ref={closeRef}
            type="button"
            className={card.cornerButton}
            aria-label="Back to links"
            onClick={onFlip}
          >
            <Icon name="lucide:x" size="lg" />
          </button>
        </Tip>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {s.announcement}
      </p>
      <SaveBar s={s} />
    </form>
  );
}

/** Where "show more" is on the read card: where the save goes, what needs fixing, Cancel and Save. */
function SaveBar({ s }: { s: EditSession }) {
  const problems = s.errors.size;
  return (
    <div className={`${styles.bar} ${card.vt}`} style={vtName("card-more")}>
      <p className={styles.where}>
        {s.working ? "Saves to content/profile.yaml on this branch." : `Saves to ${PROFILE_REF}.`}
        {problems > 0 && (
          <span className={styles.problems}>
            {" "}
            {problems === 1 ? "1 field needs attention." : `${problems} fields need attention.`}
          </span>
        )}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={s.cancel}>
          Cancel
        </button>
        <button type="submit" className={styles.primary} disabled={!s.canSave} aria-busy={s.saving}>
          {s.saving ? "Saving…" : "Save card"}
        </button>
      </div>
    </div>
  );
}
