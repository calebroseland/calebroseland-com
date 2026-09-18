import type { Profile } from "@crc/content-schema";
import { Center, Cluster, durations, eases, Grid, Icon, Stack } from "@crc/ui";
import * as icons from "@crc/ui/icons";
import { mdiOpenInNew } from "@crc/ui/icons";
import { m, useReducedMotion } from "motion/react";
import styles from "./Landing.module.css";
import { ThemeToggle } from "./ThemeToggle.tsx";

const iconPath = (name: string): string => (icons as Record<string, string>)[name] ?? mdiOpenInNew;

/* The one landing-page motion moment: link groups settle in once on first paint.
   MotionConfig reducedMotion="user" in the root disables it for users who asked. */
const enter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export function Landing({ profile }: { profile: Profile }) {
  // Motion's reducedMotion="user" keeps opacity fades; the UX spec asks for no entrance at all.
  const reduceMotion = useReducedMotion();
  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <ThemeToggle />
      </header>
      <Center as="main" id="main" max="48rem" className={styles.main}>
        <Stack as="section" gap="4" align="center" aria-labelledby="site-name">
          <h1 id="site-name" className={styles.name}>
            {profile.name}
          </h1>
          <p className={styles.tagline}>{profile.tagline}</p>
          {profile.tags.length > 0 && (
            <Cluster as="ul" gap="2" justify="center" role="list" aria-label="Focus areas">
              {profile.tags.map((tag) => (
                <li key={tag} className={styles.tag}>
                  {tag}
                </li>
              ))}
            </Cluster>
          )}
        </Stack>

        <Grid as="nav" aria-label="Profiles and links" gap="8" min="12rem">
          {profile.groups.map((group, i) => (
            <m.div
              key={group.title}
              {...(reduceMotion ? {} : enter)}
              transition={{ duration: durations.slow, ease: eases.out, delay: i * 0.06 }}
            >
              <Stack gap="2">
                <h2 className={styles.groupTitle}>{group.title}</h2>
                <Stack as="ul" gap="0" role="list">
                  {group.links.map((link) => (
                    <li key={link.url}>
                      <a
                        className={styles.link}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Icon path={iconPath(link.icon)} size="md" />
                        <span>{link.label}</span>
                        <span className="visually-hidden"> (opens in new tab)</span>
                        <Icon path={mdiOpenInNew} size="xs" className={styles.external} />
                      </a>
                    </li>
                  ))}
                </Stack>
              </Stack>
            </m.div>
          ))}
        </Grid>
      </Center>
    </div>
  );
}
