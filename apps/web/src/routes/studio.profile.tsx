import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import cardStyles from "../components/cardEditor/CardEditor.module.css";
import { CardEditorForm, profileKey } from "../components/cardEditor/CardEditor.tsx";
import { siteProfile } from "../content/profile.ts";
import { loadProfile } from "../studio/profile.ts";
import { useGitHub } from "../studio/StudioProvider.tsx";
import { StudioShell } from "../studio/StudioShell.tsx";
import styles from "../studio/studio.module.css";

/* The landing card's editor, reached from the studio: the same form, the same save path
   (studio/profile.ts), shown on a card-shaped surface so it reads like the card it edits. */

export const Route = createFileRoute("/studio/profile")({
  head: () => ({ meta: [{ title: "Card · Studio" }] }),
  component: ProfileRoute,
});

function ProfileRoute() {
  const gh = useGitHub();
  const navigate = useNavigate();
  const source = useQuery({ queryKey: profileKey, queryFn: () => loadProfile(gh, siteProfile) });
  const back = () => navigate({ to: "/studio" });

  return (
    <StudioShell title="Card">
      <p className={styles.muted}>
        Everything on the landing card: name, tagline, focus areas, link groups and the contact
        details on its back. Drag, or focus a handle and use the arrow keys, to reorder.
      </p>
      {source.isPending ? (
        <p role="status" className={styles.muted}>
          Loading the profile…
        </p>
      ) : source.isError ? (
        <div role="alert" className={styles.muted}>
          <p>Couldn't load the profile.</p>
          <button type="button" className={styles.secondary} onClick={() => source.refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <div className={cardStyles.surface}>
          <CardEditorForm source={source.data} onDone={back} />
        </div>
      )}
    </StudioShell>
  );
}
