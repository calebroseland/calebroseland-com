import { GalleryControls } from '../gallery/GalleryControls.tsx';
import type { HostProps } from './useViewerHost.ts';
import { ViewerHost } from './ViewerHost.tsx';

/* What a body's images get once script for them has loaded: the viewer and the gallery controls.
   One chunk, so the site shell carries a single loader for both. */
export const BodyMedia = (props: HostProps & { galleries: boolean }) => {
  const { galleries, ...host } = props;
  return (
    <>
      <ViewerHost {...host} />
      {/* Keyed by the entry, so a new body's galleries get fresh controls. */}
      {galleries && <GalleryControls key={host.entryId} body={host.body} />}
    </>
  );
};
