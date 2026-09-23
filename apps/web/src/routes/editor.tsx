import { createFileRoute, Outlet } from "@tanstack/react-router";
import { EditorRoute, requireEditor } from "../editor/guard.tsx";

/* Everything under /drafts needs someone signed in, and a GitHub client to talk to. */
export const Route = createFileRoute("/editor")({
  beforeLoad: requireEditor,
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: () => (
    <EditorRoute>
      <Outlet />
    </EditorRoute>
  ),
});
