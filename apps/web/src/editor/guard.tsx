import { Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ENTRY_PAGE } from '../components/returnPage.ts';
import { EditorProvider } from './EditorProvider.tsx';
import { useEditMode } from './editMode.ts';

/* beforeLoad guards navigation; this guards the render, so turning edit mode off while an editing route
   is mounted leaves for the site instead of rendering the editor. */
export const EditorRoute = ({ children }: { children: ReactNode }) => {
  const editing = useEditMode();
  if (!editing) {
    return <Navigate to={ENTRY_PAGE} replace />;
  }
  return <EditorProvider>{children}</EditorProvider>;
};
