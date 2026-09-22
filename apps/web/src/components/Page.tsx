import { Center, Icon } from "@crc/ui";
import { mdiCardAccountDetails, mdiChevronLeft } from "@crc/ui/icons";
import { Link, useNavigate } from "@tanstack/react-router";
import { useReducedMotion } from "motion/react";
import type { MouseEvent, ReactNode } from "react";
import { siteProfile } from "../content/profile.ts";
import { backdrop, isBackdropClick } from "./backdrop.ts";
import styles from "./Page.module.css";
import { ThemeMenu } from "./ThemeMenu.tsx";
import { withViewTransition } from "./viewTransition.ts";

/* Chrome for every page past the landing card: header with the brand + nav, main, footer. The brand and
   the name inside it share view-transition names with the card, so entering from the card morphs one
   into the other (Landing.module.css), and the card button beside the brand morphs back. */
export function Page({
  children,
  width = "measure-wide",
}: {
  children: ReactNode;
  width?: "measure" | "measure-wide";
}) {
  const reduce = useReducedMotion() ?? false;
  const navigate = useNavigate();

  // Focus moves to the card's heading, as it does after "Enter", because the path may not change.
  const toCard = async () => {
    await withViewTransition(
      "leave",
      () => navigate({ to: "/", state: { entered: false } }),
      reduce,
    );
    const h1 = document.querySelector<HTMLElement>("main h1");
    if (h1) {
      h1.tabIndex = -1;
      h1.focus({ preventScroll: true });
    }
  };

  // A plain click runs the reverse morph; modified clicks fall through to the link (new tab, etc.).
  const onCardLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    void toCard();
  };

  return (
    <div
      className={styles.page}
      {...backdrop}
      onClick={(e) => {
        if (isBackdropClick(e)) void toCard();
      }}
    >
      <header className={styles.bar}>
        <div className={styles.brand}>
          <Link
            to="/"
            state={{ entered: false }}
            className={styles.cardLink}
            aria-label="Back to business card"
            title="Back to business card"
            onClick={onCardLinkClick}
          >
            <Icon path={mdiChevronLeft} size="md" />
            <Icon path={mdiCardAccountDetails} size="md" />
          </Link>
          <Link to="/" state={{ entered: true }} className={styles.home}>
            <span className={styles.siteName}>{siteProfile.name}</span>
          </Link>
        </div>
        <nav className={styles.nav} aria-label="Site">
          <Link to="/posts" className={styles.navLink}>
            Posts
          </Link>
          <Link to="/$slug" params={{ slug: "about" }} className={styles.navLink}>
            About
          </Link>
          <ThemeMenu />
        </nav>
      </header>
      <Center as="main" id="main" max={width} className={styles.main} {...backdrop}>
        {children}
      </Center>
      <footer className={styles.footer} {...backdrop}>
        <a href="/feed.xml">RSS</a>
      </footer>
    </div>
  );
}

export function CenteredMessage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={styles.centered}>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
