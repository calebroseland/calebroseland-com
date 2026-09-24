import { Center } from "@crc/ui";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { MouseEvent, ReactNode } from "react";
import { siteProfile } from "../content/profile.ts";
import { useReduceMotion } from "../hooks/useReduceMotion.ts";
import styles from "./Page.module.css";
import { SiteFooter } from "./SiteFooter.tsx";
import { UserMenu } from "./UserMenu.tsx";
import { withViewTransition } from "./viewTransition.ts";

function useAtHome(): boolean {
  return useRouterState({ select: (s) => s.location.pathname.replace(/\/$/, "") === "/home" });
}

/** Turns the page back into the landing card, morphing unless motion is reduced. */
function useBackToCard() {
  const reduce = useReduceMotion();
  const navigate = useNavigate();
  return () =>
    withViewTransition("leave", () => navigate({ to: "/" }), reduce);
}

/* Chrome for every page past the landing card: header with the brand + nav, main, footer. The brand is
   the way back: from any page it goes home, and from home it turns back into the card, which it shares
   view-transition names with (Landing.module.css). */
export function Page({
  children,
  width = "measure-wide",
}: {
  children: ReactNode;
  width?: "measure" | "measure-wide";
}) {
  const atHome = useAtHome();
  const toCard = useBackToCard();

  // A plain click on the brand at home runs the reverse morph; modified clicks open the card in a new
  // tab, and everywhere else the brand is an ordinary link home.
  const onBrandClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!atHome || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    void toCard();
  };

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <div className={styles.brand}>
          <Link
            to={atHome ? "/" : "/home"}
            className={styles.home}
            aria-label={atHome ? `${siteProfile.name}. Back to the business card.` : undefined}
            onClick={onBrandClick}
          >
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
          <UserMenu />
        </nav>
      </header>
      <Center as="main" id="main" max={width} className={styles.main}>
        {children}
      </Center>
      <SiteFooter profile={siteProfile} />
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
