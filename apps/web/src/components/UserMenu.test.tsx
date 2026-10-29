import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { themeController } from '../theme/store.ts';
import { UserMenu } from './UserMenu.tsx';

/** The menu navigates, so it needs a router; one route is enough for the theme side of it. */
const renderMenu = () => {
  const routeTree = createRootRoute({ component: UserMenu });
  render(
    <RouterProvider
      router={createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/'] }) })}
    />,
  );
  return screen.findByRole('button', { name: /^Theme:/ });
};

const root = document.documentElement;

beforeEach(() => {
  for (const t of themeController.store.state.customThemes) {
    themeController.deleteCustom(t.id);
  }
  themeController.preview(null);
  themeController.setPreference('auto');
  localStorage.clear();
});

const openMenu = async () => {
  fireEvent.click(screen.getByRole('button', { name: /^Theme:/ }));
  return screen.findByRole('menu');
};

const newTheme = async () => {
  fireEvent.click(within(await openMenu()).getByRole('menuitem', { name: /New custom theme/ }));
  return screen.findByRole('dialog', { name: 'New theme' });
};

describe('UserMenu', () => {
  it('lists the built-in themes with the current one checked, and switches on choice', async () => {
    await renderMenu();
    const menu = await openMenu();
    expect(within(menu).getByRole('menuitemradio', { name: 'Auto' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    fireEvent.click(within(menu).getByRole('menuitemradio', { name: 'Dark' }));

    expect(root.dataset.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Theme: Dark/ })).toBeInTheDocument();
  });

  it('creates a custom theme that previews live, saves, and appears checked in the menu', async () => {
    await renderMenu();
    const dialog = await newTheme();

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Ember' },
    });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Dark' }));
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Accent' }), {
      target: { value: 'e8590c' },
    });

    // The page behind the sheet is the preview; nothing is stored yet.
    await waitFor(() => expect(root.style.getPropertyValue('--accent-600')).toContain('#e8590c'));
    expect(root.dataset.theme).toBe('dark');
    expect(localStorage.getItem('theme-custom')).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save theme' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(localStorage.getItem('theme')).toMatch(/^custom:/);
    expect(screen.getByRole('button', { name: /Theme: Ember/ })).toBeInTheDocument();

    const menu = await openMenu();
    expect(within(menu).getByRole('menuitemradio', { name: 'Ember' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(within(menu).getByRole('menuitem', { name: 'Edit Ember…' })).toBeInTheDocument();
  });

  it('cancel puts back what was showing', async () => {
    themeController.setPreference('light');
    await renderMenu();
    const dialog = await newTheme();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Dark' }));
    await waitFor(() => expect(root.dataset.theme).toBe('dark'));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(root.dataset.theme).toBe('light');
    expect(root.style.getPropertyValue('--accent-600')).toBe('');
    expect(themeController.store.state.customThemes).toHaveLength(0);
  });

  it('sliders are labelled, show their value, and reset to the default', async () => {
    await renderMenu();
    const dialog = await newTheme();
    const size = within(dialog).getByRole('slider', { name: 'Text size' });
    expect(size).toHaveAttribute('aria-valuetext', '100%');
    fireEvent.keyDown(size, { key: 'ArrowRight' });
    await waitFor(() => expect(size).toHaveAttribute('aria-valuetext', '102.5%'));
    await waitFor(() =>
      expect(root.style.getPropertyValue('--font-size-base')).toBe('calc(1rem * 1.025)'),
    );

    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset text size to 100%' }));
    await waitFor(() => expect(size).toHaveAttribute('aria-valuetext', '100%'));
  });

  it('deleting the selected custom theme asks once more, then falls back to auto', async () => {
    await renderMenu();
    fireEvent.click(within(await newTheme()).getByRole('button', { name: 'Save theme' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(within(await openMenu()).getByRole('menuitem', { name: /^Edit / }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit theme' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(themeController.store.state.customThemes).toHaveLength(1);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete for good' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(themeController.store.state.customThemes).toHaveLength(0);
    expect(themeController.store.state.preference).toBe('auto');
    expect(root.style.getPropertyValue('--accent-600')).toBe('');
  });
});

describe('UserMenu editing', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    sessionStorage.clear();
  });

  /* Whether the site can edit is fixed when the module loads, so each case loads it fresh. */
  const renderFresh = async () => {
    vi.resetModules();
    const router = await import('@tanstack/react-router');
    const { UserMenu: Fresh } = await import('./UserMenu.tsx');
    render(
      <router.RouterProvider
        router={router.createRouter({
          routeTree: router.createRootRoute({ component: Fresh }),
          history: router.createMemoryHistory({ initialEntries: ['/'] }),
        })}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /^Theme:/ }));
    return screen.findByRole('menu');
  };

  it('offers edit mode under the dev server, and the editing screens once it is on', async () => {
    vi.stubEnv('DEV', true);
    const menu = await renderFresh();
    const toggle = within(menu).getByRole('menuitemcheckbox', { name: 'Edit mode' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(within(menu).queryByRole('menuitem', { name: 'Editor' })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(await within(menu).findByRole('menuitem', { name: 'Editor' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'New entry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit mode on/ })).toBeInTheDocument();
  });

  it('offers no editing in a built site', async () => {
    vi.stubEnv('DEV', false);
    const menu = await renderFresh();
    expect(
      within(menu).queryByRole('menuitemcheckbox', { name: 'Edit mode' }),
    ).not.toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /New custom theme/ })).toBeInTheDocument();
  });
});
