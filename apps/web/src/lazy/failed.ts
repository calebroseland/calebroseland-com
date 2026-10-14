import { notify } from '../editor/Toast.tsx';

/** Says a lazily loaded surface couldn't open. A browser keeps a failed module fetch failed for the
    page's life (Chromium does), so the way back is a reload, offered right there. */
export const notifyLoadFailed = (what: string): void => {
  notify(`Couldn't open ${what}. Check the connection, then reload the page.`, {
    kind: 'error',
    action: { label: 'Reload', onClick: () => window.location.reload() },
  });
};
