import { ScrollArea } from '@base-ui/react/scroll-area';
import { Icon } from '@crc/ui';
import { createPortal } from 'react-dom';
import { Tip } from '../Tip.tsx';
import styles from './GalleryControls.module.css';
import { useGalleries } from './useGalleries.ts';
import { useGallery } from './useGallery.ts';

/** Controls for every gallery in a body, each rendered into its own figure under the track. */
export const GalleryControls = ({ body }: { body: HTMLElement }) => {
  const figures = useGalleries(body);
  return figures.map((figure, i) => createPortal(<Gallery figure={figure} />, figure, `g${i}`));
};

const Gallery = ({ figure }: { figure: HTMLElement }) => {
  const g = useGallery(figure);
  const count = g.slides.length;
  return (
    <div className={styles.controls} data-controls="">
      <div className={styles.row}>
        <Tip label="Previous image">
          <button
            type="button"
            className={styles.step}
            onClick={() => g.go(g.index - 1)}
            aria-disabled={g.index === 0}
          >
            <Icon name="lucide:chevron-left" size="sm" />
            <span className="visually-hidden">Previous image</span>
          </button>
        </Tip>
        <span className={styles.counter} aria-live="polite">
          {g.index + 1} of {count}
        </span>
        <Tip label="Next image">
          <button
            type="button"
            className={styles.step}
            onClick={() => g.go(g.index + 1)}
            aria-disabled={g.index === count - 1}
          >
            <Icon name="lucide:chevron-right" size="sm" />
            <span className="visually-hidden">Next image</span>
          </button>
        </Tip>
      </div>
      {/* Two images need no strip of thumbnails; the buttons and counter say it all. */}
      {count > 2 && (
        <ScrollArea.Root className={styles.thumbs} data-thumbs="">
          <ScrollArea.Viewport ref={g.strip} className={styles.thumbsViewport}>
            <ul role="list" className={styles.thumbList}>
              {g.slides.map((s, i) => (
                <li key={s.key}>
                  <Tip label={s.alt || `Image ${i + 1}`} side="bottom">
                    <button
                      type="button"
                      className={styles.thumb}
                      onClick={() => g.go(i)}
                      aria-current={i === g.index ? 'true' : undefined}
                      aria-label={`Show image ${i + 1}${s.alt ? `: ${s.alt}` : ''}`}
                    >
                      <img src={s.src} alt="" loading="lazy" decoding="async" />
                    </button>
                  </Tip>
                </li>
              ))}
            </ul>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      )}
    </div>
  );
};
