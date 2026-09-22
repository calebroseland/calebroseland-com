import type { Profile, ProfileContact, ProfileLink } from "@crc/content-schema";
import { Icon } from "@crc/ui";
import * as icons from "@crc/ui/icons";
import {
  mdiArrowRight,
  mdiCardAccountDetails,
  mdiChevronRight,
  mdiClose,
  mdiEmailOutline,
  mdiMapMarkerOutline,
  mdiOpenInNew,
  mdiPhoneOutline,
} from "@crc/ui/icons";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, m, type Transition, useReducedMotion } from "motion/react";
import { type ReactNode, type RefObject, useEffect, useId, useRef, useState } from "react";
import { backdrop, isBackdropClick } from "./backdrop.ts";
import styles from "./Landing.module.css";
import { ThemeMenu } from "./ThemeMenu.tsx";
import { vtName, withViewTransition } from "./viewTransition.ts";

const iconPath = (name: string): string => (icons as Record<string, string>)[name] ?? mdiOpenInNew;

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

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className={styles.link} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="visually-hidden"> (opens in new tab)</span>
    </a>
  );
}

/** A root-relative url is a page on this site, so it goes through the router (and its basepath). */
function CardLink({ link, iconSize }: { link: ProfileLink; iconSize: "xl" | "lg" }) {
  const body = (
    <>
      <Icon path={iconPath(link.icon)} size={iconSize} />
      <span className={styles.label}>{link.label}</span>
    </>
  );
  return link.url.startsWith("/") ? (
    <Link to={link.url} className={styles.link}>
      {body}
    </Link>
  ) : (
    <ExternalLink href={link.url}>{body}</ExternalLink>
  );
}

function Front({
  profile,
  expanded,
  onToggle,
  onFlip,
  focusOnMount,
}: {
  profile: Profile;
  expanded: boolean;
  onToggle: () => void;
  onFlip: (() => void) | null;
  focusOnMount: boolean;
}) {
  const linksId = useId();
  const flipRef = useFocusOnMount<HTMLButtonElement>(focusOnMount);
  return (
    <>
      <div className={styles.corners}>
        <span className={`${styles.cornerSlot} ${styles.vt}`} style={vtName("card-theme")}>
          <ThemeMenu />
        </span>
        {onFlip && (
          <button
            ref={flipRef}
            type="button"
            className={`${styles.cornerButton} ${styles.vt}`}
            style={vtName("card-flip")}
            aria-label="Contact information"
            onClick={onFlip}
          >
            <Icon path={mdiCardAccountDetails} size="lg" />
            <Icon path={mdiChevronRight} size="sm" />
          </button>
        )}
      </div>

      <h1 id="site-name" className={styles.name}>
        <span className={styles.siteName}>{profile.name}</span>
      </h1>
      <p className={`${styles.tagline} ${styles.vt}`} style={vtName("card-tagline")}>
        {profile.tagline}
      </p>

      {expanded && profile.tags.length > 0 && (
        <ul
          className={`${styles.tags} ${styles.vt}`}
          style={vtName("card-tags")}
          role="list"
          aria-label="Focus areas"
        >
          {profile.tags.map((tag) => (
            <li key={tag} className={styles.tag}>
              {tag}
            </li>
          ))}
        </ul>
      )}

      <nav
        id={linksId}
        aria-label="Profiles and links"
        className={styles.links}
        data-expanded={expanded || undefined}
      >
        {profile.groups.map((group, g) => {
          const [primary, ...rest] = group.links;
          if (!primary) return null;
          return (
            <div key={group.title} className={styles.group}>
              {expanded && (
                <h2
                  className={`${styles.groupTitle} ${styles.vt}`}
                  style={vtName(`card-group-${g}`)}
                >
                  {group.title}
                  <Icon path={mdiOpenInNew} size="xs" />
                </h2>
              )}
              <ul className={styles.list} role="list">
                <li
                  className={`${styles.linkItem} ${styles.vt}`}
                  style={vtName(`card-link-${g}-0`)}
                >
                  <CardLink link={primary} iconSize="xl" />
                </li>
                {expanded &&
                  rest.map((link, i) => (
                    <li
                      key={link.url}
                      className={`${styles.linkItem} ${styles.vt}`}
                      style={vtName(`card-link-${g}-${i + 1}`)}
                    >
                      <CardLink link={link} iconSize="lg" />
                    </li>
                  ))}
              </ul>
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
                <Icon path={mdiPhoneOutline} size="md" />
                <span>{contact.phone}</span>
              </a>
            </li>
          )}
          {contact.email && (
            <li>
              <a className={styles.detail} href={`mailto:${contact.email}`}>
                <Icon path={mdiEmailOutline} size="md" />
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
                  <Icon path={mdiMapMarkerOutline} size="md" />
                  <span>{contact.location.label}</span>
                  <span className="visually-hidden"> (map, opens in new tab)</span>
                </a>
              ) : (
                <span className={styles.detail}>
                  <Icon path={mdiMapMarkerOutline} size="md" />
                  <span>{contact.location.label}</span>
                </span>
              )}
            </li>
          )}
        </ul>
      </div>
      <button
        ref={closeRef}
        type="button"
        className={styles.cornerButton}
        aria-label="Back to links"
        onClick={onFlip}
      >
        <Icon path={mdiClose} size="lg" />
      </button>
    </div>
  );
}

export function Landing({ profile }: { profile: Profile }) {
  const reduce = useReducedMotion() ?? false;
  const navigate = useNavigate();
  const [side, setSide] = useState<"front" | "back">("front");
  const [expanded, setExpanded] = useState(false);
  // Focus follows the card only after the visitor has turned it; the first paint leaves focus alone.
  const [turned, setTurned] = useState(false);
  const contact = profile.contact;
  const hasContact = Boolean(contact && (contact.email || contact.phone || contact.location));

  const flip = () => {
    setTurned(true);
    setSide((s) => (s === "front" ? "back" : "front"));
  };

  // The path does not change, so the root layout's focus-on-navigate does not fire; do it here. The
  // router's own viewTransition option is not used because it renders the new state after its
  // transition callback resolves, which can leave the card in the new snapshot.
  const enter = async () => {
    await withViewTransition(
      "enter",
      () => navigate({ to: "/", state: { entered: true } }),
      reduce,
    );
    const h1 = document.querySelector<HTMLElement>("main h1");
    if (h1) {
      h1.tabIndex = -1;
      h1.focus({ preventScroll: true });
    }
  };

  return (
    <div
      className={styles.page}
      {...backdrop}
      onClick={(e) => {
        if (isBackdropClick(e)) void enter();
      }}
    >
      <main id="main" className={styles.stage} {...backdrop}>
        <AnimatePresence mode="wait" initial={false}>
          {side === "back" && contact ? (
            <m.section
              key="back"
              aria-labelledby="site-name"
              className={`${styles.card} ${styles.cardBack}`}
              onKeyDown={(e) => {
                if (e.key === "Escape") flip();
              }}
              {...faceMotion(reduce)}
            >
              <Back profile={profile} contact={contact} onFlip={flip} focusOnMount={turned} />
            </m.section>
          ) : (
            <m.section
              key="front"
              aria-labelledby="site-name"
              className={styles.card}
              data-expanded={expanded || undefined}
              {...faceMotion(reduce)}
            >
              <Front
                profile={profile}
                expanded={expanded}
                onToggle={() => withViewTransition("expand", () => setExpanded((e) => !e), reduce)}
                onFlip={hasContact ? flip : null}
                focusOnMount={turned}
              />
            </m.section>
          )}
        </AnimatePresence>
        <button
          type="button"
          className={`${styles.enter} ${styles.vt}`}
          style={vtName("card-enter")}
          onClick={enter}
        >
          Enter
          <Icon path={mdiArrowRight} size="md" />
        </button>
      </main>
    </div>
  );
}
