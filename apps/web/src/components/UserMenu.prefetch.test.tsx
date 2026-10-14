import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UserMenu } from './UserMenu.tsx';

const loads = vi.hoisted(() => ({ count: 0 }));

// A stand-in editor that records when its chunk is loaded and renders a marker.
vi.mock('./ThemeEditor.tsx', () => {
  loads.count++;
  return { ThemeEditor: () => <div role="dialog" aria-label="Stand-in editor" /> };
});

describe('UserMenu theme editor loading', () => {
  it('loads the editor as the menu opens, so New theme shows it without waiting', async () => {
    const routeTree = createRootRoute({ component: UserMenu });
    render(
      <RouterProvider
        router={createRouter({
          routeTree,
          history: createMemoryHistory({ initialEntries: ['/'] }),
        })}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /^Account:/ }));
    const menu = await screen.findByRole('menu');
    await waitFor(() => expect(loads.count).toBe(1));
    fireEvent.click(within(menu).getByRole('menuitem', { name: /New custom theme/ }));
    // Already loaded: in the same update, not after another round trip.
    expect(screen.getByRole('dialog', { name: 'Stand-in editor' })).toBeInTheDocument();
    expect(loads.count).toBe(1);
  });
});
