import {
  createRootRoute,
  type ErrorComponentProps,
  HeadContent,
  Outlet,
} from "@tanstack/react-router";
import { MotionProvider } from "../components/MotionProvider.tsx";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootLayout() {
  return (
    <>
      <HeadContent />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <MotionProvider>
        <Outlet />
      </MotionProvider>
    </>
  );
}

function NotFound() {
  return (
    <main id="main" style={{ padding: "var(--space-16) var(--space-4)", textAlign: "center" }}>
      <h1>That page isn't here.</h1>
      <p>
        <a href={import.meta.env.BASE_URL}>Back to the start</a>
      </p>
    </main>
  );
}

function RootError({ error }: ErrorComponentProps) {
  console.error(error);
  return (
    <main id="main" style={{ padding: "var(--space-16) var(--space-4)", textAlign: "center" }}>
      <h1>Something went wrong.</h1>
      <p>
        <button type="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </p>
    </main>
  );
}
