import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import styles from "./editor.module.css";

/* One polite status region and one alert region, mounted once in the shell. Alerts persist until dismissed. */
type Toast = {
  id: number;
  kind: "status" | "alert";
  message: string;
  action?: { label: string; onClick: () => void };
};

const toasts = new Store<Toast[]>([]);
let nextId = 1;

export function notify(
  message: string,
  opts: { kind?: Toast["kind"]; action?: Toast["action"]; ttl?: number } = {},
) {
  const id = nextId++;
  const kind = opts.kind ?? "status";
  toasts.setState((t) => [
    ...t.filter((x) => x.kind !== "alert" || kind !== "alert"),
    { id, kind, message, ...(opts.action ? { action: opts.action } : {}) },
  ]);
  if (kind === "status") setTimeout(() => dismiss(id), opts.ttl ?? 4000);
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
  const status = items.filter((t) => t.kind === "status");
  const alerts = items.filter((t) => t.kind === "alert");
  return (
    <>
      <div role="status" aria-live="polite" className={styles.toasts}>
        {status.map((t) => (
          <div key={t.id} className={styles.toast}>
            <span>{t.message}</span>
            {t.action && (
              <button type="button" className={styles.toastAction} onClick={t.action.onClick}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
      <div role="alert" className={styles.toasts}>
        {alerts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles.toastAlert}`}>
            <span>{t.message}</span>
            {t.action && (
              <button type="button" className={styles.toastAction} onClick={t.action.onClick}>
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              className={styles.toastAction}
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
