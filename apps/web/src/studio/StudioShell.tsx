import { Center } from "@crc/ui";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ThemeMenu } from "../components/ThemeMenu.tsx";
import { siteProfile } from "../content/profile.ts";
import { session } from "./auth/store.ts";
import { viewerQuery } from "./github/queries.ts";
import { useGitHub } from "./StudioProvider.tsx";
import styles from "./studio.module.css";

/* Chrome for authenticated studio routes. The studio is a section of the site, not a room with one
   door: the bar carries the site's logo and nav beside the studio's own links. */
export function StudioShell({
  children,
  title = "Studio",
  actions,
}: {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}) {
  const gh = useGitHub();
  const viewer = useQuery(viewerQuery(gh));
  const navigate = useNavigate();
  const signOut = () => {
    void navigate({ to: "/studio/login" }).then(() => session.signOut());
  };
  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <div className={styles.barGroup}>
          {/* The logo leaves the studio for the site, as it does everywhere else; the page's own
              heading says which studio screen this is, and the board is a click from there. */}
          <Link
            to="/home"
            className={styles.brand}
            aria-label={`${siteProfile.name}. Back to the site.`}
          >
            {siteProfile.name}
          </Link>
          <nav className={styles.siteNav} aria-label="Site">
            <Link to="/studio" className={styles.studioLink}>
              Studio
            </Link>
            <Link to="/posts" className={styles.studioLink}>
              Posts
            </Link>
            <Link to="/$slug" params={{ slug: "about" }} className={styles.studioLink}>
              About
            </Link>
          </nav>
          {gh.kind === "fake" && <span className={styles.badge}>local fake GitHub</span>}
          {gh.kind === "local" && (
            <span className={styles.badge}>working tree · {viewer.data?.login ?? "…"}</span>
          )}
        </div>
        <div className={styles.barGroup}>
          {actions}
          {viewer.data && (
            <span className={styles.viewer}>
              <img
                src={viewer.data.avatarUrl}
                alt=""
                width={24}
                height={24}
                className={styles.avatar}
              />
              <span>{viewer.data.login}</span>
            </span>
          )}
          <button type="button" className={styles.secondary} onClick={signOut}>
            Sign out
          </button>
          <ThemeMenu />
        </div>
      </header>
      <Center as="main" id="main" max="measure-wide" className={styles.main}>
        <h1 className={styles.title}>{title}</h1>
        {children}
      </Center>
    </div>
  );
}
