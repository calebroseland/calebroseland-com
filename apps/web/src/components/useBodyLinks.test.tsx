import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useBodyLinks } from './useBodyLinks.ts';

const html =
  '<a href="/work">Work</a> <a href="https://example.test/x">Away</a> <a href="#top">Top</a>';

const Body = () => {
  const [body, setBody] = useState<HTMLDivElement | null>(null);
  useBodyLinks(body);
  return (
    <div
      ref={setBody}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: fixed test markup standing in for a built body
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const renderBody = () => {
  const router = createRouter({
    routeTree: createRootRoute({ component: Body }),
    history: createMemoryHistory({ initialEntries: ['/about'] }),
  });
  render(<RouterProvider router={router} />);
  return router;
};

describe('useBodyLinks', () => {
  it('follows a same-origin body link through the router, without a page load', async () => {
    const router = renderBody();
    const link = await screen.findByRole('link', { name: 'Work' });
    // fireEvent returns false when the default (a full navigation) was prevented.
    expect(fireEvent.click(link, { button: 0 })).toBe(false);
    await expect.poll(() => router.state.location.pathname).toBe('/work');
  });

  it('leaves external links, in-page anchors, and modified clicks to the browser', async () => {
    const router = renderBody();
    expect(fireEvent.click(await screen.findByRole('link', { name: 'Away' }))).toBe(true);
    expect(fireEvent.click(screen.getByRole('link', { name: 'Top' }))).toBe(true);
    expect(fireEvent.click(screen.getByRole('link', { name: 'Work' }), { metaKey: true })).toBe(
      true,
    );
    expect(router.state.location.pathname).toBe('/about');
  });
});
