import { useId } from 'react';

/** Names a region by its heading: spread `region` on the section and `heading` on its title. */
export function useSectionHeading() {
  const id = useId();
  return { region: { 'aria-labelledby': id }, heading: { id } };
}
