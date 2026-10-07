import { type RefObject, useRef } from 'react';

/** A ref that always holds the latest value, for callbacks registered once (editor plugins, listeners). */
export const useLatest = <T>(value: T): RefObject<T> => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};
