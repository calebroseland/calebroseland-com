import { useNavigate } from '@tanstack/react-router';

/* Where the editor sends people next, as small hooks returning the move. */

/** An address inside this app: a path, never another origin written as `//host` or `/\host`. */
export const isAppHref = (href: string | undefined): href is string =>
  href?.startsWith('/') === true && !/^\/[/\\]/.test(href);

export const useOpenInEditor = () => {
  const navigate = useNavigate();
  return (slug: string) => navigate({ to: '/editor/$slug', params: { slug } });
};

/** The menu's ways into editing: the board and a new entry. */
export const useEditorLinks = () => {
  const navigate = useNavigate();
  return {
    board: () => void navigate({ to: '/editor' }),
    newEntry: () => void navigate({ to: '/editor/new' }),
  };
};
