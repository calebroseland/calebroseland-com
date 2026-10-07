import '@crc/ui/fonts.css';
import '@crc/ui/index.css';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installPageTransitions, pageViewTransition } from './components/pageTransition.ts';
import { trackReturnPage } from './components/returnPage.ts';
import { dropUnavailableSession } from './editor/auth/methods.ts';
import { installErrorReporting } from './reportError.ts';
import { routeTree } from './routeTree.gen.ts';

const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultViewTransition: pageViewTransition,
});
installPageTransitions(router);
trackReturnPage(router);

declare module '@tanstack/react-router' {
  // biome-ignore lint/style/useConsistentTypeDefinitions: module augmentation merges into the library's interface
  interface Register {
    router: typeof router;
  }
}

installErrorReporting();
// Only someone already signed in pays for the check; readers never call the Worker for it.
void dropUnavailableSession();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('#root missing from index.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
