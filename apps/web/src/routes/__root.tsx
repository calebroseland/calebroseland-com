import {
  createRootRoute,
  type ErrorComponentProps,
  HeadContent,
  Outlet,
  useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { MotionProvider } from "../components/MotionProvider.tsx";
import { CenteredMessage, Page } from "../components/Page.tsx";
import { TipProvider } from "../components/Tip.tsx";
import { Toasts } from "../editor/Toast.tsx";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootLayout() {
  useFocusHeadingOnNavigate();
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
    </>
  );
}

/* After a client-side navigation, move focus to the new page's h1 so keyboard and screen-reader users land on content. */
function useFocusHeadingOnNavigate() {
  const router = useRouter();
  useEffect(
    () =>
      router.subscribe("onResolved", ({ pathChanged }) => {
        if (!pathChanged) return;
        const h1 = document.querySelector<HTMLElement>("main h1");
        if (h1) {
          h1.tabIndex = -1;
          h1.focus({ preventScroll: true });
        }
      }),
    [router],
  );
}

function NotFound() {
  return (
    <Page>
      <CenteredMessage title="That page isn't here.">
        <p>
          <a href={import.meta.env.BASE_URL}>Back to the start</a>
        </p>
      </CenteredMessage>
    </Page>
  );
}

function RootError({ error }: ErrorComponentProps) {
  console.error(error);
  return (
    <Page>
      <CenteredMessage title="Something went wrong.">
        <p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </p>
      </CenteredMessage>
    </Page>
  );
}
