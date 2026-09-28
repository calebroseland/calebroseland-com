import { useNavigate } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { useReduceMotion } from "../hooks/useReduceMotion.ts";
import { withViewTransition } from "./viewTransition.ts";

/** Turns the page back into the landing card, on its front or its contact side, morphing unless motion
    is reduced. */
export function useBackToCard() {
  const reduce = useReduceMotion();
  const navigate = useNavigate();
  return (to: "/" | "/contact" = "/") =>
    withViewTransition("leave", () => navigate({ to, viewTransition: false }), reduce);
}

/** A plain click; a modified one (new tab, new window) is left to the browser. */
export const isPlainClick = (e: MouseEvent) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
