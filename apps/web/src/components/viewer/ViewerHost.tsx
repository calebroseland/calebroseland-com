import { ImageViewer } from './ImageViewer.tsx';
import { type HostProps, useViewerHost } from './useViewerHost.ts';

/** Everything behind the body's images, loaded once one is wanted: the URL state and the viewer. */
export const ViewerHost = (props: HostProps) => {
  const viewer = useViewerHost(props);
  return viewer ? <ImageViewer {...viewer} /> : null;
};
