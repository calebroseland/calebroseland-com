import { useState } from 'react';
import type { NewEntry } from '../data/ops.ts';
import { type EntryKind, slugify } from './paths.ts';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The new-entry form. The slug follows the title until it is edited by hand; `entry` is what to
    create, or null while the form is incomplete. */
export function useNewEntryForm(initialKind: EntryKind) {
  const [kind, setKind] = useState<EntryKind>(initialKind);
  const [title, setTitle] = useState('');
  const [typedSlug, setTypedSlug] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const slug = typedSlug ?? slugify(title);
  const slugOk = SLUG.test(slug);
  const entry: NewEntry | null =
    title.trim() && slugOk
      ? { kind, title: title.trim(), slug, date: new Date(`${date}T00:00:00Z`) }
      : null;
  return {
    kind,
    setKind,
    title,
    setTitle,
    slug,
    setSlug: setTypedSlug,
    slugOk,
    date,
    setDate,
    entry,
  };
}
