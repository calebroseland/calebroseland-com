import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireEditor } from '../editor/editMode.ts';
import { EditorRoute } from '../editor/guard.tsx';

/* Everything under /editor is the dev server's, and turns edit mode on. */
export const Route = createFileRoute('/editor')({
  beforeLoad: requireEditor,
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  component: () => (
    <EditorRoute>
      <Outlet />
    </EditorRoute>
  ),
});
