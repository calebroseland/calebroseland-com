import { Icon, type IconName } from "@crc/ui";
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import styles from "./editor.module.css";

/* One polite status region and one alert region, mounted once in the shell. Info and success fade on
   their own; a warning (something to fix) or an error (something failed) interrupts, and stays until
   dismissed. Each kind has its colour and icon, so the kind reads before the words do. */
type Kind = "info" | "success" | "warning" | "error";

type Toast = {
  id: number;
  kind: Kind;
  message: string;
  action?: { label: string; onClick: () => void };
};

const ICONS: Record<Kind, IconName> = {
  info: "lucide:info",
  success: "lucide:circle-check",
  warning: "lucide:triangle-alert",
  error: "lucide:circle-x",
};

const urgent = (kind: Kind) => kind === "warning" || kind === "error";

const toasts = new Store<Toast[]>([]);
let nextId = 1;

export function notify(
  message: string,
  opts: { kind?: Kind; action?: Toast["action"]; ttl?: number } = {},
) {
  const id = nextId++;
  const kind = opts.kind ?? "info";
  toasts.setState((t) => [
    // One urgent toast at a time: a newer problem replaces the last.
    ...t.filter((x) => !urgent(x.kind) || !urgent(kind)),
    { id, kind, message, ...(opts.action ? { action: opts.action } : {}) },
  ]);
  if (!urgent(kind)) setTimeout(() => dismiss(id), opts.ttl ?? 4000);
  return id;
}
function dismiss(id: number) {
  toasts.setState((t) => t.filter((x) => x.id !== id));
}

function useToasts(): Toast[] {
  return useStore(toasts);
}

export function Toasts() {
  const items = useToasts();
  // One stack for both regions, so news and problems never land on top of each other.
  return (
    <div className={styles.toastStack}>
      <div role="status" aria-live="polite" className={styles.toasts}>
        {items
          .filter((t) => !urgent(t.kind))
          .map((t) => (
            <ToastItem key={t.id} toast={t} />
          ))}
      </div>
      <div role="alert" className={styles.toasts}>
        {items
          .filter((t) => urgent(t.kind))
          .map((t) => (
            <ToastItem key={t.id} toast={t} dismissible />
          ))}
      </div>
    </div>
  );
}

function ToastItem({ toast, dismissible = false }: { toast: Toast; dismissible?: boolean }) {
  return (
    <div className={styles.toast} data-kind={toast.kind}>
      <Icon name={ICONS[toast.kind]} size="sm" className={styles.toastIcon} />
      <span>{toast.message}</span>
      {toast.action && (
        <button type="button" className={styles.toastAction} onClick={toast.action.onClick}>
          {toast.action.label}
        </button>
      )}
      {dismissible && (
        <button
          type="button"
          className={styles.toastAction}
          onClick={() => dismiss(toast.id)}
          aria-label="Dismiss"
        >
          <Icon name="lucide:x" size="sm" />
        </button>
      )}
    </div>
  );
}
