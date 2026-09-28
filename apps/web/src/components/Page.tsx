import { Center } from "@crc/ui";
import { Link, useRouterState } from "@tanstack/react-router";
import type { MouseEvent, ReactNode } from "react";
import { siteProfile } from "../content/profile.ts";
import { isPlainClick, useBackToCard } from "./backToCard.ts";
import styles from "./Page.module.css";
import { SearchButton } from "./SearchButton.tsx";
import { SiteFooter } from "./SiteFooter.tsx";
import { UserMenu } from "./UserMenu.tsx";

function useAtHome(): boolean {
  return useRouterState({ select: (s) => s.location.pathname.replace(/\/$/, "") === "/home" });
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
    if (!atHome || !isPlainClick(e)) return;
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
          <SearchButton />
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
