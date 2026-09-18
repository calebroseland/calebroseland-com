import { Center } from "@crc/ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { siteProfile } from "../content/profile.ts";
import styles from "./Page.module.css";
import { ThemeToggle } from "./ThemeToggle.tsx";

/* Chrome for every route except the landing: header with home link + nav, main, footer. */
export function Page({
  children,
  width = "measure-wide",
}: {
  children: ReactNode;
  width?: "measure" | "measure-wide";
}) {
  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link to="/" className={styles.home}>
          {siteProfile.name}
        </Link>
        <nav className={styles.nav} aria-label="Site">
          <Link to="/posts" className={styles.navLink}>
            Posts
          </Link>
          <Link to="/$slug" params={{ slug: "about" }} className={styles.navLink}>
            About
          </Link>
          <ThemeToggle />
        </nav>
      </header>
      <Center as="main" id="main" max={width} className={styles.main}>
        {children}
      </Center>
      <footer className={styles.footer}>
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
