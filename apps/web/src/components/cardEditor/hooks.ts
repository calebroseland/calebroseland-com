import type { Profile } from "@crc/content-schema";
import { useState } from "react";
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
