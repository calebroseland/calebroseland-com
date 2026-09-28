import type { Profile, ProfileLink } from "@crc/content-schema";
import { Icon } from "@crc/ui";
import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { hasContact } from "../content/profile.ts";
import { useReduceMotion } from "../hooks/useReduceMotion.ts";
import { useSectionHeading } from "../hooks/useSectionHeading.ts";
import { useDetailsExpanded } from "./detailsState.ts";
import styles from "./SiteFooter.module.css";
import { Tip } from "./Tip.tsx";
import { footerHeadingName, footerLinkName, withViewTransition } from "./viewTransition.ts";

const LINKS_ID = "site-footer-links";

/* The card's links, kept at hand past the card. Collapsed, one line of icons by group; expanded, a
   column per group with labels, except an inline group, which stays a row of icons. Each link shares a view-transition name with its place on the card. */
export function SiteFooter({ profile }: { profile: Profile }) {
  const { expanded, toggle } = useDetailsExpanded();
  const reduce = useReduceMotion();
  const iconOnly = !expanded;
  return (
    <footer className={styles.footer} data-expanded={expanded || undefined}>
      <nav id={LINKS_ID} aria-label="Profiles and writing" className={styles.groups}>
        {profile.groups.map((group, g) => (
          <FooterGroup
            key={group.title}
            title={group.title}
            links={group.links}
            index={g}
            iconOnly={iconOnly || group.inline === true}
          />
        ))}
      </nav>
      <div className={styles.actions}>
        <Tip label={expanded ? "Fewer details" : "More details"}>
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={expanded}
            aria-controls={LINKS_ID}
            aria-label={expanded ? "Collapse the footer" : "Expand the footer"}
            onClick={() => void withViewTransition("footer", () => toggleAtBottom(toggle), reduce)}
          >
            <Icon name={expanded ? "lucide:fold-vertical" : "lucide:unfold-vertical"} size="sm" />
          </button>
        </Tip>
      </div>
      <div className={styles.copyright}>
        {hasContact(profile) && (
          <Tip label="Contact card">
            <Link to="/contact" className={styles.link} aria-label="Contact card">
              <Icon name="lucide:id-card" size="sm" />
            </Link>
          </Tip>
        )}
        <p>
          © {new Date().getFullYear()} {profile.name}
        </p>
      </div>
    </footer>
  );
}

/* The toggle sits at the foot of the page, so the page stays pinned to its bottom edge while the footer
   grows or shrinks. The scroll lands before the new snapshot, so the transition morphs in place. */
function toggleAtBottom(toggle: () => void): Promise<void> {
  toggle();
  // After the render the caller flushes, before the transition's new snapshot.
  return Promise.resolve().then(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }),
  );
}

/** An icon-only control gets its name as a tooltip; the control keeps its own accessible name. */
function Named({
  label,
  when,
  children,
}: {
  label: string;
  when: boolean;
  children: ReactElement;
}) {
  return when ? (
    <Tip label={label}>
      <span className={styles.tipTarget}>{children}</span>
    </Tip>
  ) : (
    children
  );
}

function FooterGroup({
  title,
  links,
  index,
  iconOnly,
}: {
  title: string;
  links: readonly ProfileLink[];
  index: number;
  iconOnly: boolean;
}) {
  const named = useSectionHeading();
  return (
    <section {...named.region} className={styles.group} data-icons={iconOnly || undefined}>
      <h2 {...named.heading} className={styles.groupTitle} style={footerHeadingName(index)}>
        {title}
      </h2>
      <ul role="list" className={styles.list}>
        {links.map((link, i) => (
          <li key={link.url}>
            <Named label={link.label} when={iconOnly}>
              <FooterLink link={link} group={index} index={i} />
            </Named>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FooterLink({ link, group, index }: { link: ProfileLink; group: number; index: number }) {
  const props = { className: styles.link, style: footerLinkName(group, index) };
  const body = (
    <>
      <Icon name={link.icon} size="sm" />
      <span className={styles.label}>{link.label}</span>
    </>
  );
  return link.url.startsWith("/") ? (
    <Link to={link.url} {...props}>
      {body}
    </Link>
  ) : (
    <a href={link.url} target="_blank" rel="noopener noreferrer" {...props}>
      {body}
      <span className="visually-hidden"> (opens in new tab)</span>
    </a>
  );
}
