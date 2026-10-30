import { TipProvider, Toasts } from '@crc/ui';
import {
  createRootRoute,
  type ErrorComponentProps,
  HeadContent,
  Outlet,
  useRouter,
} from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAutoReturn, useReturnToCard } from '../components/autoReturn.ts';
import { CommandPalette } from '../components/CommandPalette.tsx';
import { LoadingBar } from '../components/LoadingBar.tsx';
import { MotionProvider } from '../components/MotionProvider.tsx';
import { CenteredMessage, Page } from '../components/Page.tsx';
import { useRouterLoading } from '../loading/hooks.ts';

const RootLayout = () => {
  useFocusHeadingOnNavigate();
  useRouterLoading();
  return (
    <>
      <HeadContent />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <TipProvider>
        <MotionProvider>
          <Outlet />
        </MotionProvider>
      </TipProvider>
      <Toasts />
      <CommandPalette />
      <LoadingBar />
    </>
  );
};

/* After a client-side navigation, move focus to the new page's h1 so keyboard and screen-reader users land on content. */
const useFocusHeadingOnNavigate = () => {
  const router = useRouter();
  useEffect(
    () =>
      router.subscribe('onResolved', ({ pathChanged }) => {
        if (!pathChanged) {
          return;
        }
        const h1 = document.querySelector<HTMLElement>('main h1');
        if (h1) {
          h1.tabIndex = -1;
          h1.focus({ preventScroll: true });
        }
      }),
    [router],
  );
};

const NotFound = () => {
  useReturnToCard();
  return (
    <Page>
      <CenteredMessage title="That page isn't here.">
        <p>
          <a href={import.meta.env.BASE_URL}>Back to the start</a>
        </p>
      </CenteredMessage>
    </Page>
  );
};

const RootError = ({ error }: ErrorComponentProps) => {
  console.error(error);
  useAutoReturn(() => window.location.assign(import.meta.env.BASE_URL));
  return (
    <Page>
      <CenteredMessage title="Something went wrong.">
        <p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </p>
      </CenteredMessage>
      {/* The root's error page replaces RootLayout, and with it the shell's toasts. */}
      <Toasts />
    </Page>
  );
};

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});
