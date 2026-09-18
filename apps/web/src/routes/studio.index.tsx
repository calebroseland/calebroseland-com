import { createFileRoute } from "@tanstack/react-router";
import { StudioShell } from "../studio/StudioShell.tsx";

export const Route = createFileRoute("/studio/")({
  head: () => ({ meta: [{ title: "Studio" }] }),
  component: () => (
    <StudioShell>
      <p>Drafts arrive in Phase 4.</p>
    </StudioShell>
  ),
});
