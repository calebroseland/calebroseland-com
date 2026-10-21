import { Dialog } from '@base-ui/react/dialog';
import { ScrollArea } from '@base-ui/react/scroll-area';
import { Icon, IconButton, iconButton, Tip } from '@crc/ui';
import { m } from 'motion/react';
import { SLIDE_GAP } from './stage.ts';
import { useViewerStage, type ViewerProps } from './useViewerStage.ts';
import styles from './viewer.module.css';

/* The full-screen image viewer: Base UI's modal Dialog around a stage the reader zooms, pans and
   swipes. It opens out of the page's image and closes back into it. Loaded on first use. */
export const ImageViewer = (props: ViewerProps) => {
  const v = useViewerStage(props);
  const { item, count, index } = v;
  if (!item) {
    return null;
  }
  const many = count > 1;
  const title = many ? `Image ${index + 1} of ${count}` : 'Image';

  return (
    <Dialog.Root
      open={v.shown}
      onOpenChange={v.dialog.onOpenChange}
      onOpenChangeComplete={v.dialog.onOpenChangeComplete}
      disablePointerDismissal
    >
      <Dialog.Portal>
        <Dialog.Popup
          ref={v.popup}
          // Focus starts on the viewer itself: arrows and zoom keys work at once, and no button shows a ring.
          initialFocus={v.popup}
          className={styles.viewer}
          finalFocus={v.dialog.finalFocus}
          onKeyDown={v.onKeyDown}
          onFocus={v.onFocusWithin}
          data-controls={v.controls ? 'shown' : 'hidden'}
          data-zoomed={v.zoom > 1.01 ? '' : undefined}
        >
          <m.div className={styles.scrim} style={{ opacity: v.scrimOpacity }} />
          <Dialog.Title className="visually-hidden">{title}</Dialog.Title>
          <m.div className={styles.stage} ref={v.attachStage} style={{ opacity: v.values.fade }}>
            <m.div className={styles.strip} style={{ x: v.values.strip }}>
              <div className={styles.slide}>
                {v.failed ? (
                  <p className={styles.error}>
                    This image couldn't be loaded. <a href={item.src}>Open the file</a>
                  </p>
                ) : (
                  <img
                    key={item.src}
                    ref={v.image}
                    className={`${styles.image} ${styles.current}`}
                    src={item.src}
                    alt=""
                    draggable={false}
                    onError={() => v.onImageError(item.src)}
                  />
                )}
              </div>
              {v.neighbours.map((n) => (
                <div
                  key={n.item.src + n.offset}
                  className={styles.slide}
                  style={{ translate: `calc(${n.offset} * (100% + ${SLIDE_GAP}px)) 0` }}
                  aria-hidden="true"
                >
                  <img
                    className={styles.image}
                    src={n.item.src}
                    alt=""
                    draggable={false}
                    style={{ inlineSize: n.width, blockSize: n.height }}
                  />
                </div>
              ))}
            </m.div>
          </m.div>

          <m.div className={styles.top} style={{ opacity: v.values.fade }}>
            <span className={styles.counter} aria-hidden="true">
              {many ? `${index + 1} / ${count}` : ''}
            </span>
            <div className={styles.tools}>
              <IconButton label="Zoom out" variant="scrim" shape="round" onClick={v.zoomOut}>
                <Icon name="lucide:minus" size="sm" />
              </IconButton>
              <span className={styles.zoom} aria-hidden="true">
                {Math.round(v.zoom * 100)}%
              </span>
              <IconButton label="Zoom in" variant="scrim" shape="round" onClick={v.zoomIn}>
                <Icon name="lucide:plus" size="sm" />
              </IconButton>
              <Tip label="Close" side="bottom">
                <Dialog.Close className={iconButton({ variant: 'scrim', shape: 'round' })}>
                  <Icon name="lucide:x" size="sm" />
                  <span className="visually-hidden">Close</span>
                </Dialog.Close>
              </Tip>
            </div>
          </m.div>

          {many && (
            <>
              <IconButton
                label="Previous image"
                tipSide="right"
                variant="scrim"
                shape="round"
                className={`${styles.side} ${styles.previous}`}
                onClick={v.previous}
                aria-disabled={index === 0}
              >
                <Icon name="lucide:chevron-left" />
              </IconButton>
              <IconButton
                label="Next image"
                tipSide="left"
                variant="scrim"
                shape="round"
                className={`${styles.side} ${styles.next}`}
                onClick={v.next}
                aria-disabled={index === count - 1}
              >
                <Icon name="lucide:chevron-right" />
              </IconButton>
            </>
          )}

          <m.div className={styles.bottom} style={{ opacity: v.values.fade }}>
            {count > 2 && (
              <ScrollArea.Root className={styles.thumbs}>
                <ScrollArea.Viewport ref={v.thumbs} className={styles.thumbsViewport}>
                  <ul role="list" className={styles.thumbList}>
                    {props.set.items.map((it, i) => (
                      <li key={it.key}>
                        <Tip label={it.alt || `Image ${i + 1}`}>
                          <button
                            type="button"
                            className={styles.thumb}
                            onClick={() => props.onIndexChange(i)}
                            aria-current={i === index ? 'true' : undefined}
                            aria-label={`Show image ${i + 1}${it.alt ? `: ${it.alt}` : ''}`}
                          >
                            <img src={it.src} alt="" loading="lazy" decoding="async" />
                          </button>
                        </Tip>
                      </li>
                    ))}
                  </ul>
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            )}
            {item.alt && (
              <Dialog.Description className={styles.caption}>{item.alt}</Dialog.Description>
            )}
          </m.div>

          <p className={styles.live} aria-live="polite">
            {v.announcement}
          </p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
