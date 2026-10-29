import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { editorQueryClient } from './data/queryClient.ts';

/** Gives an editing surface the shared query client. */
export const EditorProvider = ({ children }: { children: ReactNode }) => {
  return <QueryClientProvider client={editorQueryClient()}>{children}</QueryClientProvider>;
};
