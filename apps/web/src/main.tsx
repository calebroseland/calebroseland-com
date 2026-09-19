import "@crc/ui/fonts.css";
import "@crc/ui/index.css";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installErrorReporting } from "./reportError.ts";
import { routeTree } from "./routeTree.gen.ts";

const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

installErrorReporting();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root missing from index.html");

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
