import {
  type Profile,
  type ProfileContact,
  type ProfileLink,
  type ProfileTag,
  resolveTag,
  tagLabel,
} from "@crc/content-schema";
import { Icon } from "@crc/ui";
import { Link, useMatch, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, m, type Transition } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { hasContact } from "../content/profile.ts";
import { useSignedIn } from "../editor/auth/hooks.ts";
import type { ProfileSource } from "../editor/profile.ts";
import { notify } from "../editor/Toast.tsx";
import { useReduceMotion } from "../hooks/useReduceMotion.ts";
import { backdrop, isBackdropClick } from "./backdrop.ts";
import { useSiteGo } from "./backToCard.ts";
import type { EditFaces, EditResult } from "./cardEditor/CardEditor.tsx";
import { useDetailsExpanded } from "./detailsState.ts";
import { FocusChip } from "./FocusChip.tsx";
import styles from "./Landing.module.css";
import { returnPage } from "./returnPage.ts";
import { Tip } from "./Tip.tsx";
import { UserMenu } from "./UserMenu.tsx";
import { footerHeadingName, footerLinkName, vtName, withViewTransition } from "./viewTransition.ts";

type OpenEditor = {
  source: ProfileSource;
  Session: (props: {
    source: ProfileSource;
    onFlip: () => void;
    onDone: (r: EditResult) => void;
    children: (faces: EditFaces) => ReactNode;
  }) => ReactNode;
};

/* The landing is a business card, after the 2019 site. Flipping to the contact side carries over from
   it (animate.css simpleFlip on X, inverted, under a 400px perspective, with the card's height
   following); the timings are that card's, not the token scale, because they are what made the flip
   read as a card turning over. "Show more" and "Enter" reflow the page, so they run as view
   transitions (Landing.module.css) rather than Motion animations. */
const CSS_EASE = [0.25, 0.1, 0.25, 1] as const;
const FLIP_IN = 0.7;
const FLIP_OUT = 0.5;
const HEIGHT = 0.75;

const still: Transition = { duration: 0 };

function faceMotion(reduce: boolean) {
  const t = (duration: number): Transition =>
    reduce ? still : { duration, ease: CSS_EASE, height: { duration: HEIGHT, ease: CSS_EASE } };
  return {
    initial: { opacity: 0, rotateX: -90, height: 0 },
    animate: { opacity: 1, rotateX: 0, height: "auto", transition: t(FLIP_IN) },
    exit: { opacity: 0, rotateX: -90, height: 0, transition: t(FLIP_OUT) },
    style: { transformPerspective: 400 },
  };
}

/** Moves focus to the element once it mounts, when the mount was caused by the user turning the card. */
function useFocusOnMount<T extends HTMLElement>(when: boolean): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (when) ref.current?.focus();
  }, [when]);
  return ref;
}

/** Passes other props through, so it can be a tooltip's trigger. */
function ExternalLink({ href, children, ...rest }: ComponentProps<"a"> & { href: string }) {
  return (
    <a {...rest} className={styles.link} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="visually-hidden"> (opens in new tab)</span>
    </a>
  );
}

/** A root-relative url is a page on this site, so it goes through the router (and its basepath). */
/** Every link on the card wears the same icon, in the same slot, so labels line up down a column. */
function CardLink({ link, iconOnly = false }: { link: ProfileLink; iconOnly?: boolean }) {
  const body = (
    <>
      <Icon name={link.icon} size="xl" className={styles.linkIcon} />
      <span className={styles.label}>{link.label}</span>
    </>
  );
  const anchor = link.url.startsWith("/") ? (
    <Link to={link.url} className={styles.link}>
      {body}
    </Link>
  ) : (
    <ExternalLink href={link.url}>{body}</ExternalLink>
  );
  return iconOnly ? <Tip label={link.label}>{anchor}</Tip> : anchor;
}

/** An inline group: every link, one row of icons, in both states of the card. */
function IconRow({ links, group }: { links: readonly ProfileLink[]; group: number }) {
  return (
    <ul className={`${styles.list} ${styles.iconRow}`} role="list">
      {links.map((link, i) => (
        <li
          key={link.url}
          className={`${styles.linkItem} ${styles.vt} ${styles.toFooter}`}
          style={{ ...vtName(`card-link-${group}-${i}`), ...footerLinkName(group, i) }}
        >
          <CardLink link={link} iconOnly />
        </li>
      ))}
    </ul>
  );
}

const TAGS_SHOWN = 6;

/** Focus areas (see FocusChip); past a handful, the rest wait behind "+N more". */
function Tags({ tags }: { tags: readonly ProfileTag[] }) {
  const [all, setAll] = useState(false);
  const listId = useId();
  const hidden = tags.length - TAGS_SHOWN;
  return (
    <div className={`${styles.tags} ${styles.vt}`} style={vtName("card-tags")}>
      <ul id={listId} className={styles.tagList} role="list" aria-label="Focus areas">
        {(all ? tags : tags.slice(0, TAGS_SHOWN)).map((tag) => (
          <li key={tagLabel(tag)}>
            <FocusChip tag={resolveTag(tag)} />
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          className={styles.tagMore}
          aria-expanded={all}
          aria-controls={listId}
          aria-label={all ? "Show fewer focus areas" : `+${hidden} more focus areas`}
          onClick={() => setAll((a) => !a)}
        >
          {all ? "Show fewer" : `+${hidden} more`}
        </button>
      )}
    </div>
  );
}

function Front({
  profile,
  expanded,
  onToggle,
  onFlip,
  onEdit,
  opening,
  focusOnMount,
}: {
  profile: Profile;
  expanded: boolean;
  onToggle: () => void;
  onFlip: (() => void) | null;
  onEdit: (() => void) | null;
  opening: boolean;
  focusOnMount: "flip" | "edit" | null;
}) {
  const linksId = useId();
  const flipRef = useFocusOnMount<HTMLButtonElement>(focusOnMount === "flip");
  const editRef = useFocusOnMount<HTMLButtonElement>(focusOnMount === "edit");
  return (
    <>
      <div className={styles.corners}>
        <div className={styles.cornerStart}>
          <span className={`${styles.cornerSlot} ${styles.vt}`} style={vtName("card-theme")}>
            <UserMenu />
          </span>
          {onEdit && (
            <Tip label="Edit card" side="bottom">
              <button
                ref={editRef}
                type="button"
                className={`${styles.cornerButton} ${styles.vt}`}
                style={vtName("card-edit")}
                aria-label="Edit card"
                aria-busy={opening || undefined}
                disabled={opening}
                onClick={onEdit}
              >
                <Icon name="lucide:pencil" size="md" />
              </button>
            </Tip>
          )}
        </div>
        {onFlip && (
          <Tip label="Contact card" side="bottom">
            <button
              ref={flipRef}
              type="button"
              className={`${styles.cornerButton} ${styles.vt}`}
              style={vtName("card-flip")}
              aria-label="Contact information"
              onClick={onFlip}
            >
              <Icon name="lucide:id-card" size="lg" />
              <Icon name="lucide:chevron-right" size="sm" />
            </button>
          </Tip>
        )}
      </div>

      <h1 id="site-name" className={styles.name}>
        <span className={styles.siteName}>{profile.name}</span>
      </h1>
      <p className={`${styles.tagline} ${styles.vt}`} style={vtName("card-tagline")}>
        {profile.tagline}
      </p>

      {expanded && profile.tags.length > 0 && <Tags tags={profile.tags} />}

      <nav
        id={linksId}
        aria-label="Profiles and links"
        className={styles.links}
        data-expanded={expanded || undefined}
        style={
          {
            "--faces": Math.max(1, profile.groups.filter((x) => !x.inline).length),
          } as CSSProperties
        }
      >
        {profile.groups.map((group, g) => {
          const [primary, ...rest] = group.links;
          if (!primary) return null;
          return (
            <div key={group.title} className={styles.group} data-inline={group.inline || undefined}>
              {expanded ? (
                <h2
                  className={`${styles.groupTitle} ${styles.vt} ${styles.toFooter}`}
                  style={{ ...vtName(`card-group-${g}`), ...footerHeadingName(g) }}
                >
                  {/* The icon rides with the words, so it fades beside them between card and footer. */}
                  <span className={styles.headingText}>
                    {group.title}
                    <Icon name="lucide:external-link" size="xs" />
                  </span>
                </h2>
              ) : (
                // Where the heading would be, so the footer's heading grows out of the collapsed card.
                <span
                  aria-hidden="true"
                  className={`${styles.headingAnchor} ${styles.toFooter}`}
                  style={footerHeadingName(g)}
                />
              )}
              {group.inline ? (
                <IconRow links={group.links} group={g} />
              ) : (
                <ul className={styles.list} role="list">
                  <li
                    className={`${styles.linkItem} ${styles.vt} ${styles.toFooter}`}
                    style={{ ...vtName(`card-link-${g}-0`), ...footerLinkName(g, 0) }}
                  >
                    <CardLink link={primary} />
                    {/* Where each hidden link would sit, so the footer's links flow out of the card. */}
                    {!expanded &&
                      rest.map((link, i) => (
                        <span
                          key={link.url}
                          aria-hidden="true"
                          inert
                          className={`${styles.linkAnchor} ${styles.toFooter}`}
                          style={{ ...footerLinkName(g, i + 1), "--row": i + 1 } as CSSProperties}
                        >
                          {/* Invisible; sizes the mark like the link so it does not stretch. */}
                          <CardLink link={link} />
                        </span>
                      ))}
                  </li>
                  {expanded &&
                    rest.map((link, i) => (
                      <li
                        key={link.url}
                        className={`${styles.linkItem} ${styles.vt} ${styles.toFooter}`}
                        style={{
                          ...vtName(`card-link-${g}-${i + 1}`),
                          ...footerLinkName(g, i + 1),
                        }}
                      >
                        <CardLink link={link} />
                      </li>
                    ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        className={`${styles.more} ${styles.vt}`}
        style={vtName("card-more")}
        aria-expanded={expanded}
        aria-controls={linksId}
        onClick={onToggle}
      >
        show {expanded ? "less" : "more"}
      </button>
    </>
  );
}

function Back({
  profile,
  contact,
  onFlip,
  focusOnMount,
}: {
  profile: Profile;
  contact: ProfileContact;
  onFlip: () => void;
  focusOnMount: boolean;
}) {
  const closeRef = useFocusOnMount<HTMLButtonElement>(focusOnMount);
  return (
    <div className={styles.back}>
      <div>
        <h1 id="site-name" className={styles.backName}>
          <span className={styles.siteName}>{profile.name}</span>
        </h1>
        <p className={styles.tagline}>{profile.tagline}</p>
        <ul className={styles.details} role="list" aria-label="Contact">
          {contact.phone && (
            <li>
              <a className={styles.detail} href={`tel:${contact.phone.replaceAll(/[^+\d]/g, "")}`}>
                <Icon name="lucide:phone" size="md" />
                <span>{contact.phone}</span>
              </a>
            </li>
          )}
          {contact.email && (
            <li>
              <a className={styles.detail} href={`mailto:${contact.email}`}>
                <Icon name="lucide:mail" size="md" />
                <span>{contact.email}</span>
              </a>
            </li>
          )}
          {contact.location && (
            <li>
              {contact.location.url ? (
                <a
                  className={styles.detail}
                  href={contact.location.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="lucide:map-pin" size="md" />
                  <span>{contact.location.label}</span>
                  <span className="visually-hidden"> (map, opens in new tab)</span>
                </a>
              ) : (
                <span className={styles.detail}>
                  <Icon name="lucide:map-pin" size="md" />
                  <span>{contact.location.label}</span>
                </span>
              )}
            </li>
          )}
        </ul>
      </div>
      <Tip label="Back to links" side="bottom">
        <button
          ref={closeRef}
          type="button"
          className={styles.cornerButton}
          aria-label="Back to links"
          onClick={onFlip}
        >
          <Icon name="lucide:x" size="lg" />
        </button>
      </Tip>
    </div>
  );
}

/** Which face the URL shows: the front at /, the contact side at /contact. */
function useCardSide(): "front" | "back" {
  return useMatch({ from: "/_card/contact", shouldThrow: false }) ? "back" : "front";
}

export function Landing({ profile: published }: { profile: Profile }) {
  // After a save to the working tree the file on disk is the new profile; show it without a reload.
  const [saved, setSaved] = useState<Profile | null>(null);
  const profile = saved ?? published;
  const reduce = useReduceMotion();
  const navigate = useNavigate();
  const go = useSiteGo();
  const side = useCardSide();
  const { expanded, toggle: toggleDetails } = useDetailsExpanded();
  // Focus follows the card only after the visitor has turned it; the first paint leaves focus alone.
  const [turned, setTurned] = useState(false);
  const signedIn = useSignedIn();
  const [editing, setEditing] = useState<OpenEditor | null>(null);
  // While editing, the face is the session's own: /contact would redirect a card with no contact yet.
  const [editSide, setEditSide] = useState<"front" | "back">("front");
  // Signing out (the palette can, mid-edit) ends the edit: its backend is gone.
  if (editing && !signedIn) setEditing(null);
  const [opening, setOpening] = useState(false);
  // After the editor closes, focus goes back to the Edit button once the front face has turned back.
  const [returnToEdit, setReturnToEdit] = useState(false);
  const contact = profile.contact;
  // Turning by the buttons or by back and forward alike, the new face takes focus.
  const [shownSide, setShownSide] = useState(side);
  if (side !== shownSide) {
    setShownSide(side);
    setTurned(true);
    setReturnToEdit(false);
  }

  /* The editor's code and the profile both load first, so the card turns editable in one step, where it
     stands: an in-place morph, like "show more". Readers never load either. */
  const openEditor = async () => {
    setOpening(true);
    try {
      const mod = await import("./cardEditor/CardEditor.tsx");
      const source = await mod.prepareEdit(profile);
      await withViewTransition(
        "edit",
        () => {
          setEditSide("front");
          setEditing({ source, Session: mod.default });
        },
        reduce,
      );
    } catch {
      notify("Couldn't open the editor. Check the connection and try again.", { kind: "error" });
    } finally {
      setOpening(false);
    }
  };
  const closeEditor = (result: EditResult) =>
    void withViewTransition(
      "edit",
      () => {
        if (result?.workingTree) setSaved(result.profile);
        setReturnToEdit(true);
        setEditing(null);
      },
      reduce,
    );

  const flip = () => void navigate({ to: side === "front" ? "/contact" : "/" });

  /* The card's two faces, read-only or the edit session's, turned by the same flip. */
  const faces = ({ front, back }: { front: ReactNode; back: ReactNode | null }) => {
    const showBack = back !== null && (editing ? editSide : side) === "back";
    return (
      <AnimatePresence mode="wait" initial={false}>
        {showBack ? (
          <m.section
            key="back"
            aria-labelledby={editing ? undefined : "site-name"}
            className={`${styles.card} ${styles.cardBack}`}
            // Capture, so one press turns the card back before a tooltip takes the key to close itself.
            onKeyDownCapture={(e) => {
              if (!editing && e.key === "Escape") flip();
            }}
            {...faceMotion(reduce)}
          >
            {back}
          </m.section>
        ) : (
          <m.section
            key="front"
            aria-labelledby={editing ? undefined : "site-name"}
            className={styles.card}
            data-expanded={editing || expanded || undefined}
            data-editing={editing ? true : undefined}
            {...faceMotion(reduce)}
          >
            {front}
          </m.section>
        )}
      </AnimatePresence>
    );
  };

  // Focus follows the path change through the root layout's focus-on-navigate.
  const enter = () => go(returnPage());

  return (
    <div
      className={styles.page}
      {...backdrop}
      onClick={(e) => {
        // Leaving mid-edit would throw the edit away, so the background only enters when not editing.
        if (!editing && isBackdropClick(e)) void enter();
      }}
    >
      <main id="main" className={styles.stage} {...backdrop}>
        {editing ? (
          <editing.Session
            source={editing.source}
            onFlip={() => setEditSide((f) => (f === "front" ? "back" : "front"))}
            onDone={closeEditor}
          >
            {faces}
          </editing.Session>
        ) : (
          faces({
            front: (
              <Front
                profile={profile}
                expanded={expanded}
                onToggle={() => withViewTransition("expand", toggleDetails, reduce)}
                onFlip={hasContact(profile) ? flip : null}
                onEdit={signedIn ? () => void openEditor() : null}
                opening={opening}
                focusOnMount={returnToEdit ? "edit" : turned ? "flip" : null}
              />
            ),
            back: contact ? (
              <Back profile={profile} contact={contact} onFlip={flip} focusOnMount={turned} />
            ) : null,
          })
        )}
        {/* Leaving mid-edit would throw the edit away. */}
        {!editing && (
          <button
            type="button"
            className={`${styles.enter} ${styles.vt}`}
            style={vtName("card-enter")}
            onClick={enter}
          >
            Enter
            <Icon name="lucide:arrow-right" size="md" />
          </button>
        )}
      </main>
    </div>
  );
}
