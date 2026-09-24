import { useState } from "react";

/** Open or closed, for a dialog or popover that is not about anything in particular. */
export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return { open, setOpen };
}
