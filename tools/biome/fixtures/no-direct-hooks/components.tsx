import { useQuery } from '@tanstack/react-query';
import { useHotkey } from '@tanstack/react-hotkeys';
import { memo, use, useEffectEvent, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useItemRegistration } from '@crc/interaction';
import useMeasure from 'react-use-measure';
import { useLocalThing } from './local.ts';

/* Each line ending in "expect" must be flagged; no other line may be. */

export function Declared() {
  const [s] = useState(0); // expect
  return s;
}

export const ArrowBlock = () => {
  const [s] = useState(0); // expect
  return s;
};

export const ArrowExpression = () => useState(0)[0]; // expect

export const Expression = function () {
  const [s] = useState(0); // expect
  return s;
};

export default function DefaultExported() {
  const [s] = useState(0); // expect
  return s;
}

export const Wrapped = memo(function Wrapped() {
  const [s] = useState(0); // expect
  return s;
});

export function UsesPromise({ p }: { p: Promise<number> }) {
  return use(p); // expect
}

export function NotListedBefore() {
  useHotkey('k', () => {}); // expect
  useEffectEvent(() => {}); // expect
  useFormStatus(); // expect
  return null;
}

export const Typed = ({ n }: { n: number }) => {
  const q = useQuery({ queryKey: [n], queryFn: () => n }); // expect
  return q.data;
};

export function MemberHook({ form }: { form: { useStore: (f: (s: number) => number) => number } }) {
  return form.useStore((s) => s); // expect
}

export function TypeArguments() {
  const el = useRef<HTMLDivElement>(null); // expect
  return el;
}

export function DefaultImported() {
  const [ref] = useMeasure(); // expect
  return ref;
}

export function CustomHook() {
  return useLocalThing();
}

// The workspace's own packages hold purpose-named hooks too.
export function WorkspaceHook() {
  return useItemRegistration('key', 0);
}

export function useThing() {
  return useState(0);
}

export const useArrowThing = () => useState(0);
