import type { Profile, ProfileLink } from "@crc/content-schema";
import { Icon } from "@crc/ui";
import * as icons from "@crc/ui/icons";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useId } from "react";
import { session } from "../studio/auth/store.ts";
import styles from "./SiteFooter.module.css";
import { footerLinkName } from "./viewTransition.ts";

const iconPath = (name: string): string =>
  (icons as Record<string, string>)[name] ?? icons.mdiOpenInNew;

/* The card's links, kept at hand once the visitor is past the card: one column per group, the way
   many sites close. Each link shares a view-transition name with its place on the card, so entering
   the site carries the links down here and leaving carries them back. */
export function SiteFooter({ profile }: { profile: Profile }) {
  // The studio is for whoever can edit: someone signed in, or anyone running the dev server.
  const signedIn = useStore(session.store, (s) => s.status === "authenticated");
  const showStudio = signedIn || import.meta.env.DEV;
  return (
    <footer className={styles.footer}>
      <nav aria-label="Profiles and writing" className={styles.groups}>
        {profile.groups.map((group, g) => (
          <FooterGroup key={group.title} title={group.title} links={group.links} index={g} />
        ))}
      </nav>
      <div className={styles.meta}>
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <a href="/feed.xml">RSS</a>
        {showStudio && <Link to="/studio">Studio</Link>}
      </div>
    </footer>
  );
}

function FooterGroup({
  title,
  links,
  index,
}: {
  title: string;
  links: readonly ProfileLink[];
  index: number;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={styles.group}>
      <h2 id={headingId} className={styles.groupTitle}>
        {title}
      </h2>
      <ul role="list" className={styles.list}>
        {links.map((link, i) => (
          <li key={link.url}>
            <FooterLink link={link} group={index} index={i} />
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
      <Icon path={iconPath(link.icon)} size="sm" />
      <span>{link.label}</span>
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
