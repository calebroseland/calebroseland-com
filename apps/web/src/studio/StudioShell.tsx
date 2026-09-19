import { Center } from "@crc/ui";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ThemeToggle } from "../components/ThemeToggle.tsx";
import { session } from "./auth/store.ts";
import { viewerQuery } from "./github/queries.ts";
import { useGitHub } from "./StudioProvider.tsx";
import styles from "./studio.module.css";

/* Chrome for authenticated studio routes: title, viewer, sign out. */
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
          <Link to="/studio" className={styles.brand}>
            Studio
          </Link>
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
          <ThemeToggle />
        </div>
      </header>
      <Center as="main" id="main" max="measure-wide" className={styles.main}>
        <h1 className={styles.title}>{title}</h1>
        {children}
      </Center>
    </div>
  );
}
