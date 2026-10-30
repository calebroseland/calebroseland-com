import { useStore } from '@tanstack/react-store';
import { Store } from '@tanstack/store';
import { Icon } from '../../Icon.tsx';
import type { IconName } from '../../icons.ts';
import styles from './Toast.module.css';

/* One polite status region and one alert region, mounted once in the shell. Info and success fade on
   their own; a warning (something to fix) or an error (something failed) interrupts, and stays until
   dismissed. Each kind has its colour and icon, so the kind reads before the words do. */
type Kind = 'info' | 'success' | 'warning' | 'error';

/** A task's progress, as a fraction from 0 to 1, or busy when its length is unknown. */
export type Progress = number | 'busy';

type Toast = {
  id: number;
  kind: Kind;
  message: string;
  action?: { label: string; onClick: () => void };
  /** Time left, shown as a bar draining over this many ms. */
  countdown?: number;
  progress?: Progress;
};

const ICONS: Record<Kind, IconName> = {
  info: 'lucide:info',
  success: 'lucide:circle-check',
  warning: 'lucide:triangle-alert',
  error: 'lucide:circle-x',
};

const urgent = (kind: Kind) => kind === 'warning' || kind === 'error';

const DEFAULT_TTL_MS = 4000;
const toasts = new Store<Toast[]>([]);
const timers = new Map<number, ReturnType<typeof setTimeout>>();
let nextId = 1;

/** Fades a toast after `ttl`, unless it is a problem to fix or a task still running. */
const schedule = (toast: Toast, ttl: number, onExpire?: () => void) => {
  clearTimeout(timers.get(toast.id));
  timers.delete(toast.id);
  if (urgent(toast.kind) || toast.progress !== undefined) {
    return;
  }
  timers.set(
    toast.id,
    setTimeout(() => {
      dismiss(toast.id);
      onExpire?.();
    }, ttl),
  );
};

export const notify = (
  message: string,
  opts: {
    kind?: Kind;
    action?: Toast['action'];
    ttl?: number;
    /** Runs when the toast times out, not when it is dismissed or its action is taken. */
    onExpire?: () => void;
    /** Show the time left as a draining bar. */
    countdown?: boolean;
    /** A running task: the toast stays, its bar filling forward, until `update` ends it. */
    progress?: Progress;
  } = {},
): number => {
  const kind = opts.kind ?? 'info';
  const ttl = opts.ttl ?? DEFAULT_TTL_MS;
  const toast: Toast = {
    id: nextId++,
    kind,
    message,
    ...(opts.action ? { action: opts.action } : {}),
    ...(opts.progress === undefined ? {} : { progress: opts.progress }),
    ...(opts.countdown && !urgent(kind) && opts.progress === undefined ? { countdown: ttl } : {}),
  };
  // One urgent toast at a time: a newer problem replaces the last.
  toasts.setState((t) => [...t.filter((x) => !urgent(x.kind) || !urgent(kind)), toast]);
  schedule(toast, ttl, opts.onExpire);
  return toast.id;
};

/** Changes a toast in place. `progress: null` ends its task, and it then fades after `ttl`. */
export const update = (
  id: number,
  patch: { message?: string; kind?: Kind; progress?: Progress | null; ttl?: number },
): void => {
  const current = toasts.state.find((t) => t.id === id);
  if (!current) {
    return;
  }
  const { progress, ...rest } = current;
  const nextProgress = patch.progress === undefined ? progress : patch.progress;
  const next: Toast = {
    ...rest,
    ...(patch.message === undefined ? {} : { message: patch.message }),
    ...(patch.kind === undefined ? {} : { kind: patch.kind }),
    ...(nextProgress === null || nextProgress === undefined ? {} : { progress: nextProgress }),
  };
  toasts.setState((t) => t.map((x) => (x.id === id ? next : x)));
  if (next.progress === undefined && progress !== undefined) {
    schedule(next, patch.ttl ?? DEFAULT_TTL_MS);
  }
};

export const dismiss = (id: number): void => {
  clearTimeout(timers.get(id));
  timers.delete(id);
  toasts.setState((t) => t.filter((x) => x.id !== id));
};

const useToasts = (): Toast[] => {
  return useStore(toasts);
};

export const Toasts = () => {
  const items = useToasts();
  // One stack for both regions, so news and problems never land on top of each other.
  return (
    <div className={styles.stack}>
      <div role="status" aria-live="polite" className={styles.region}>
        {items
          .filter((t) => !urgent(t.kind))
          .map((t) => (
            <ToastItem key={t.id} toast={t} />
          ))}
      </div>
      <div role="alert" className={styles.region}>
        {items
          .filter((t) => urgent(t.kind))
          .map((t) => (
            <ToastItem key={t.id} toast={t} dismissible />
          ))}
      </div>
    </div>
  );
};

const ToastItem = ({ toast, dismissible = false }: { toast: Toast; dismissible?: boolean }) => {
  return (
    <div className={styles.toast} data-kind={toast.kind}>
      <Icon name={ICONS[toast.kind]} size="sm" className={styles.icon} />
      <span>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            dismiss(toast.id);
            toast.action?.onClick();
          }}
        >
          {toast.action.label}
        </button>
      )}
      {dismissible && (
        <button
          type="button"
          className={styles.action}
          onClick={() => dismiss(toast.id)}
          aria-label="Dismiss"
        >
          <Icon name="lucide:x" size="sm" />
        </button>
      )}
      {toast.countdown !== undefined && (
        <span
          className={`${styles.bar} ${styles.countdown}`}
          style={{ animationDuration: `${toast.countdown}ms` }}
          aria-hidden="true"
        />
      )}
      {toast.progress !== undefined && (
        <ProgressBar progress={toast.progress} label={toast.message} />
      )}
    </div>
  );
};

const ProgressBar = ({ progress, label }: { progress: Progress; label: string }) => {
  const busy = progress === 'busy';
  const percent = busy ? undefined : Math.round(Math.min(Math.max(progress, 0), 1) * 100);
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={`${styles.bar} ${busy ? styles.busy : styles.progress}`}
      style={percent === undefined ? undefined : { inlineSize: `${percent}%` }}
    />
  );
};
