import { useState } from "react";

/** A dialog that opens about something (a row, an error) and closes back to nothing. */
export function useDialogState<T>() {
  const [subject, setSubject] = useState<T | null>(null);
  return {
    subject,
    isOpen: subject !== null,
    open: (next: T) => setSubject(next),
    close: () => setSubject(null),
    /** For components that report open changes: only closing is theirs to decide. */
    onOpenChange: (open: boolean) => {
      if (!open) setSubject(null);
    },
  };
}
