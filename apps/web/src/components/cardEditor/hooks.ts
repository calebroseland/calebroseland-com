import type { Profile } from "@crc/content-schema";
import { useEffect, useState } from "react";
import { type EditState, fieldErrors, fromProfile, tagProblem, toProfile } from "./model.ts";

/** The card being edited: its state, whether it has changed, the profile it would save, and what is
    wrong with it, keyed by field path. */
export function useProfileDraft(profile: Profile) {
  const [state, setState] = useState<EditState>(() => fromProfile(profile));
  const [dirty, setDirty] = useState(false);
  const next = toProfile(profile, state);
  const errors = fieldErrors(next);
  // The schema allows repeats; the card should not show the same focus area twice.
  state.tags.forEach((t, i) => {
    const repeat = tagProblem(state.tags, t.label, t.key);
    if (repeat && !errors.has(`tags.${i}`)) errors.set(`tags.${i}`, repeat);
  });
  return {
    state,
    dirty,
    next,
    errors,
    update: (fn: (s: EditState) => EditState) => {
      setState(fn);
      setDirty(true);
    },
  };
}

/** Text for a polite live region, for changes a screen reader would otherwise miss (a reorder). */
export function useAnnouncer() {
  const [message, announce] = useState("");
  return { message, announce };
}

/** Moves focus to the element marked `data-focus-key`, once React has put it where it now belongs:
    a moved item's handle, or a new item's text. */
export function useFocusByKey() {
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    if (!pending) return;
    document.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(pending)}"]`)?.focus();
    setPending(null);
  }, [pending]);
  return setPending;
}

/** Asks before the page unloads while there are unsaved edits. */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
}
