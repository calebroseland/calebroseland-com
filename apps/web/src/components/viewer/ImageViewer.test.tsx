import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'motion/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageViewer } from './ImageViewer.tsx';
import { findSet } from './sets.ts';
import type { ViewerProps } from './useViewerStage.ts';

const body = () => {
  const el = document.createElement('div');
  el.innerHTML = `<figure class="gallery"><ul class="gallery-track">${['A', 'B', 'C']
    .map(
      (alt) =>
        `<li><figure class="media"><a class="zoom" href="/${alt}.png"><img src="/${alt}.png" alt="${alt} picture" width="800" height="600"></a></figure></li>`,
    )
    .join('')}</ul></figure>`;
  document.body.append(el);
  return el;
};

const setup = (overrides: Partial<ViewerProps> = {}) => {
  const set = findSet(body(), 'g1');
  if (!set) {
    throw new Error('no set');
  }
  const props: ViewerProps = {
    set,
    index: 1,
    open: true,
    onIndexChange: vi.fn(),
    onCloseRequest: vi.fn(),
    onClosed: vi.fn(),
    ...overrides,
  };
  const view = render(
    <LazyMotion features={domAnimation} strict>
      <ImageViewer {...props} />
    </LazyMotion>,
  );
  return { props, view };
};

beforeEach(() => {
  // jsdom has no layout observer; nothing here resizes.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('ImageViewer', () => {
  it('is a modal dialog named by its place in the set and described by the alt', async () => {
    setup();
    const dialog = await screen.findByRole('dialog', { name: 'Image 2 of 3' });
    expect(dialog).toHaveAccessibleDescription('B picture');
    for (const name of ['Zoom in', 'Zoom out', 'Close', 'Previous image', 'Next image']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    // The description already says the alt; the image itself is not read again.
    expect(dialog.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('moves through the set by keys and buttons, and asks to close on Esc', async () => {
    const { props } = setup();
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(props.onIndexChange).toHaveBeenLastCalledWith(2);
    fireEvent.keyDown(dialog, { key: 'Home' });
    expect(props.onIndexChange).toHaveBeenLastCalledWith(0);
    fireEvent.click(screen.getByRole('button', { name: 'Previous image' }));
    expect(props.onIndexChange).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(props.onCloseRequest).toHaveBeenCalled();
  });

  it('announces a change of image with its alt', async () => {
    const { props, view } = setup();
    await screen.findByRole('dialog');
    view.rerender(
      <LazyMotion features={domAnimation} strict>
        <ImageViewer {...props} index={2} />
      </LazyMotion>,
    );
    expect(await screen.findByText('Image 3 of 3: C picture')).toBeInTheDocument();
  });

  it('has no previous or next for a set of one', async () => {
    const set = findSet(body(), 'g1');
    const one = set ? { id: 's1', items: set.items.slice(0, 1) } : undefined;
    if (!one) {
      throw new Error('no set');
    }
    setup({ set: one, index: 0 });
    await screen.findByRole('dialog', { name: 'Image' });
    expect(screen.queryByRole('button', { name: 'Next image' })).toBeNull();
  });

  it('leaves, then reports it has closed, when no longer open', async () => {
    const { props, view } = setup();
    await screen.findByRole('dialog');
    view.rerender(
      <LazyMotion features={domAnimation} strict>
        <ImageViewer {...props} open={false} />
      </LazyMotion>,
    );
    await waitFor(() => expect(props.onClosed).toHaveBeenCalled());
  });
});
