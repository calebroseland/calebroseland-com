import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('virtual:content/profile', () => ({
  default: {
    name: 'Placeholder Name',
    tagline: 'Placeholder tagline',
    tags: [
      'One',
      { label: 'Two', icon: 'simple-icons:react', show: 'icon' },
      { label: 'Three', link: false },
      'Four',
      'Five',
      'Six',
      'Seven',
      'Eight',
    ],
    groups: [
      {
        title: 'Code',
        links: [{ label: 'GitHub', url: 'https://github.com/x', icon: 'simple-icons:github' }],
      },
      {
        title: 'Writings',
        links: [{ label: 'Posts', url: '/posts', icon: 'lucide:pencil' }],
      },
      {
        title: 'Social',
        links: [
          { label: 'LinkedIn', url: 'https://linkedin.com/in/x', icon: 'simple-icons:linkedin' },
          { label: 'Unknown icon', url: 'https://example.com', icon: 'lucide:does-not-exist' },
        ],
      },
      {
        title: 'Elsewhere',
        inline: true,
        links: [
          { label: 'Mastodon', url: 'https://mastodon.test/@x', icon: 'simple-icons:x' },
          { label: 'Bluesky', url: 'https://bsky.test/x', icon: 'simple-icons:npm' },
        ],
      },
    ],
    contact: {
      email: 'someone@example.com',
      phone: '+1 555 010 0000',
      location: { label: 'Somewhere, USA', url: 'https://maps.example.com/?q=Somewhere' },
    },
  },
}));
vi.mock('virtual:content/index', () => ({ default: [], loaders: {} }));

import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { session } from '../editor/auth/store.ts';
import { routeTree } from '../routeTree.gen.ts';
import { detailsExpanded } from './detailsState.ts';
import { trackReturnPage } from './returnPage.ts';

async function renderLanding() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  trackReturnPage(router);
  render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { level: 1 });
  return router;
}

const nav = () => screen.getByRole('navigation', { name: 'Profiles and links' });

describe('Landing', () => {
  beforeEach(() => detailsExpanded.setState(() => false));

  it('renders the name as the page heading and the tagline', async () => {
    await renderLanding();
    expect(screen.getByRole('heading', { level: 1, name: 'Placeholder Name' })).toBeInTheDocument();
    expect(screen.getByText('Placeholder tagline')).toBeInTheDocument();
  });

  it("collapsed, shows only each group's first link, opening in a new tab", async () => {
    await renderLanding();
    const links = within(nav()).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      'https://github.com/x',
      '/posts',
      'https://linkedin.com/in/x',
      // An inline group shows every link, as icons, collapsed or not.
      'https://mastodon.test/@x',
      'https://bsky.test/x',
    ]);
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0]).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(links[0]).toHaveAccessibleName(/GitHub.*opens in new tab/);
    // Headings and tags belong to the expanded card; hidden rows are unmounted, not just invisible.
    expect(within(nav()).queryAllByRole('heading')).toHaveLength(0);
    expect(screen.queryByRole('list', { name: 'Focus areas' })).not.toBeInTheDocument();
  });

  it('show more reveals every link under its group heading, and show less folds them away', async () => {
    await renderLanding();
    const toggle = screen.getByRole('button', { name: 'show more' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', nav().id);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('show less');
    expect(
      within(nav())
        .getAllByRole('heading', { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(['Code', 'Writings', 'Social', 'Elsewhere']);
    expect(within(nav()).getAllByRole('link')).toHaveLength(6);
    expect(
      within(screen.getByRole('list', { name: 'Focus areas' })).getAllByRole('listitem'),
    ).toHaveLength(6);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await vi.waitFor(() => expect(within(nav()).getAllByRole('link')).toHaveLength(5));
  });

  it('a held Enter toggles show more once, as Space does', async () => {
    await renderLanding();
    const toggle = screen.getByRole('button', { name: 'show more' });
    // fireEvent returns false when the handler prevented the default, here the button's click.
    expect(fireEvent.keyDown(toggle, { key: 'Enter' })).toBe(true);
    expect(fireEvent.keyDown(toggle, { key: 'Enter', repeat: true })).toBe(false);
    expect(fireEvent.keyDown(toggle, { key: ' ', repeat: true })).toBe(true);
  });

  it('an inline group is a row of icons, each still named by its label', async () => {
    await renderLanding();
    const mastodon = within(nav()).getByRole('link', { name: /Mastodon/ });
    expect(mastodon).toHaveAccessibleName(/^Mastodon.*opens in new tab/);
    expect(mastodon.closest('ul')?.className).toMatch(/iconRow/);
  });

  it('shares show more with the site footer, both ways', async () => {
    const router = await renderLanding();
    fireEvent.click(screen.getByRole('button', { name: 'show more' }));
    await router.navigate({ to: '/home' });
    fireEvent.click(await screen.findByRole('button', { name: 'Collapse the footer' }));
    await router.navigate({ to: '/' });
    expect(await screen.findByRole('button', { name: 'show more' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('links each focus area to its posts, and shows the rest behind +N more', async () => {
    await renderLanding();
    fireEvent.click(screen.getByRole('button', { name: 'show more' }));
    const areas = screen.getByRole('list', { name: 'Focus areas' });
    expect(within(areas).getByRole('link', { name: 'Posts tagged One' })).toHaveAttribute(
      'href',
      '/posts?tag=One',
    );
    const more = screen.getByRole('button', { name: '+2 more focus areas' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(more).toHaveAttribute('aria-controls', areas.id);

    fireEvent.click(more);
    expect(within(areas).getAllByRole('listitem')).toHaveLength(8);
    expect(within(areas).getAllByRole('link')).toHaveLength(7);
    expect(screen.getByRole('button', { name: 'Show fewer focus areas' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('shows an icon-only focus area as a labelled tile, and one without a link as plain text', async () => {
    await renderLanding();
    fireEvent.click(screen.getByRole('button', { name: 'show more' }));
    const areas = screen.getByRole('list', { name: 'Focus areas' });
    const tile = within(areas).getByRole('link', { name: 'Posts tagged Two' });
    expect(tile).not.toHaveTextContent('Two');
    expect(tile).toHaveAttribute('href', '/posts?tag=Two');
    expect(within(areas).getByText('Three').closest('a')).toBeNull();
  });

  it('falls back to a generic icon for an unknown icon name instead of crashing', async () => {
    await renderLanding();
    fireEvent.click(screen.getByRole('button', { name: 'show more' }));
    expect(screen.getByRole('link', { name: /Unknown icon/ })).toBeInTheDocument();
  });

  it('turns over to the contact side at /contact and back, moving focus with the card', async () => {
    const router = await renderLanding();
    fireEvent.click(screen.getByRole('button', { name: 'Contact information' }));

    const close = await screen.findByRole('button', { name: 'Back to links' });
    expect(router.state.location.pathname).toBe('/contact');
    await vi.waitFor(() => expect(close).toHaveFocus());
    const contact = screen.getByRole('list', { name: 'Contact' });
    expect(within(contact).getByRole('link', { name: /\+1 555 010 0000/ })).toHaveAttribute(
      'href',
      'tel:+15550100000',
    );
    expect(within(contact).getByRole('link', { name: /someone@example.com/ })).toHaveAttribute(
      'href',
      'mailto:someone@example.com',
    );
    expect(within(contact).getByRole('link', { name: /Somewhere, USA/ })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Placeholder Name' })).toBeInTheDocument();

    fireEvent.keyDown(close, { key: 'Escape' });
    const flip = await screen.findByRole('button', { name: 'Contact information' });
    await vi.waitFor(() => expect(flip).toHaveFocus());
    expect(screen.queryByRole('list', { name: 'Contact' })).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('exposes the theme control, and links a site page in place rather than in a new tab', async () => {
    await renderLanding();
    expect(screen.getByRole('button', { name: /Theme: Auto/ })).toBeInTheDocument();
    const posts = within(nav()).getByRole('link', { name: 'Posts' });
    expect(posts).toHaveAttribute('href', '/posts');
    expect(posts).not.toHaveAttribute('target');
  });

  it('enter returns to the last page seen outside the card, whichever way the card was reached', async () => {
    const router = await renderLanding();
    await router.navigate({ to: '/posts' });
    await screen.findByRole('heading', { level: 1, name: 'Posts' });
    await router.navigate({ to: '/' });
    fireEvent.click(await screen.findByRole('button', { name: 'Contact information' }));
    await screen.findByRole('button', { name: 'Back to links' });
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }));
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/posts'));
  });

  it('enter leaves the card for the site, with its nav, and moves focus to the page heading', async () => {
    await renderLanding();
    expect(screen.queryByRole('navigation', { name: 'Site' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }));

    const heading = await screen.findByRole('heading', { level: 1, name: 'Posts' });
    await vi.waitFor(() => expect(heading).toHaveFocus());
    expect(
      screen.queryByRole('navigation', { name: 'Profiles and links' }),
    ).not.toBeInTheDocument();
    const site = screen.getByRole('navigation', { name: 'Site' });
    expect(within(site).getByRole('link', { name: 'Posts' })).toHaveAttribute('href', '/posts');
    // At home the brand goes back to the card.
    expect(
      screen.getByRole('link', { name: /Placeholder Name\. Back to the business card/ }),
    ).toHaveAttribute('href', '/');
    // The card's links carry on in the footer, every one of them, grouped as on the card.
    const footer = screen.getByRole('navigation', { name: 'Profiles and writing' });
    expect(
      within(footer)
        .getAllByRole('heading', { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(['Code', 'Writings', 'Social', 'Elsewhere']);
    expect(within(footer).getByRole('link', { name: 'Posts' })).toHaveAttribute('href', '/posts');
    // The way into the editor is the account menu, not the footer.
    expect(
      within(screen.getByRole('contentinfo')).queryByRole('link', { name: 'Editor' }),
    ).not.toBeInTheDocument();
    expect(
      within(footer).getByRole('link', { name: /LinkedIn.*opens in new tab/ }),
    ).toHaveAttribute('target', '_blank');
  });

  it('a click on the empty background enters the site, but a click on the card does not', async () => {
    await renderLanding();
    fireEvent.click(screen.getByRole('heading', { level: 1 }));
    fireEvent.click(screen.getByRole('main'), { metaKey: true });
    expect(screen.getByRole('button', { name: 'Enter' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('main'));
    await screen.findByRole('heading', { level: 1, name: 'Posts' });
    // Past the card the background is just background.
    fireEvent.click(screen.getByRole('main'));
    expect(screen.getByRole('navigation', { name: 'Site' })).toBeInTheDocument();
  });

  it('enters on Posts; the brand leads back to Posts from a page, and from Posts to the card', async () => {
    const router = await renderLanding();
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }));
    await screen.findByRole('heading', { level: 1, name: 'Posts' });

    // From another page, the brand is an ordinary link to Posts.
    await router.navigate({ to: '/home' });
    await screen.findByRole('heading', { level: 1, name: 'Latest writing' });
    const brand = screen.getByRole('link', { name: 'Placeholder Name' });
    expect(brand).toHaveAttribute('href', '/posts');
    fireEvent.click(brand);
    await screen.findByRole('heading', { level: 1, name: 'Posts' });

    // From Posts it goes back to the card.
    fireEvent.click(screen.getByRole('link', { name: /Back to the business card/ }));
    await screen.findByRole('heading', { level: 1, name: 'Placeholder Name' });
    expect(screen.getByRole('navigation', { name: 'Profiles and links' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Site' })).not.toBeInTheDocument();
  });

  it('offers no editing to readers', async () => {
    await renderLanding();
    expect(screen.queryByRole('button', { name: 'Edit card' })).not.toBeInTheDocument();
  });

  describe('editing in place', () => {
    const openEditor = async () => {
      await renderLanding();
      fireEvent.click(screen.getByRole('button', { name: 'Edit card' }));
      return screen.findByRole('form', { name: 'Edit card' }, { timeout: 5000 });
    };
    const savedYaml = (): string | undefined => {
      const fake = JSON.parse(localStorage.getItem('crc:fake-github') ?? '{}');
      return fake.branches?.['drafts/profile']?.files?.['content/profile.yaml']?.content;
    };

    beforeEach(() => {
      localStorage.clear();
      session.signIn({ status: 'authenticated', backend: 'fake', token: 'fake' });
    });
    afterEach(() => {
      session.signOut();
      localStorage.clear();
    });

    it('turns the card itself editable, with every link of every group, and nothing to save yet', async () => {
      const form = await openEditor();
      expect(within(form).getByRole('textbox', { name: 'Name' })).toHaveValue('Placeholder Name');
      expect(within(form).getByRole('textbox', { name: 'Tagline' })).toHaveValue(
        'Placeholder tagline',
      );
      expect(
        within(form)
          .getAllByRole('textbox', { name: /^Label for / })
          .map((l) => (l as HTMLInputElement).value),
      ).toEqual(['GitHub', 'Posts', 'LinkedIn', 'Unknown icon', 'Mastodon', 'Bluesky']);
      expect(
        within(form)
          .getAllByRole('textbox', { name: 'Group name' })
          .map((l) => (l as HTMLInputElement).value),
      ).toEqual(['Code', 'Writings', 'Social', 'Elsewhere']);
      expect(within(form).getByRole('button', { name: 'Save card' })).toBeDisabled();
      // In place: the card has not turned over to a separate face.
      expect(screen.queryByRole('list', { name: 'Contact' })).not.toBeInTheDocument();
    });

    it("edits each link's address and icon on the card itself", async () => {
      const form = await openEditor();
      const address = within(form).getByRole('textbox', { name: 'Address for GitHub' });
      expect(address).toHaveValue('https://github.com/x');
      // The icon leads the label's own field; the address runs the full width underneath.
      const labelField = within(form).getByRole('textbox', { name: 'Label for GitHub' });
      expect(
        within(labelField.parentElement as HTMLElement).getByRole('combobox', {
          name: 'Icon for GitHub',
        }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it("moves a link from its grip's arrow keys, across into the next group, and announces it", async () => {
      const form = await openEditor();
      fireEvent.keyDown(within(form).getByRole('button', { name: /^Move GitHub\./ }), {
        key: 'ArrowDown',
      });
      await waitFor(() =>
        expect(screen.getByText('GitHub moved to Writings, position 1 of 2')).toBeInTheDocument(),
      );
      expect(
        within(form)
          .getAllByRole('textbox', { name: /^Label for / })
          .map((l) => (l as HTMLInputElement).value)
          .slice(0, 2),
      ).toEqual(['GitHub', 'Posts']);
    });

    it('adds and removes links and groups', async () => {
      const form = await openEditor();
      fireEvent.click(within(form).getByRole('button', { name: 'Add link to Social' }));
      await waitFor(() =>
        expect(within(form).getByRole('textbox', { name: 'Label for new link' })).toHaveFocus(),
      );
      fireEvent.click(within(form).getByRole('button', { name: 'Add group' }));
      expect(within(form).getAllByRole('textbox', { name: 'Group name' })).toHaveLength(5);

      fireEvent.click(within(form).getByRole('button', { name: 'Remove Unknown icon' }));
      expect(within(form).queryByRole('textbox', { name: 'Label for Unknown icon' })).toBeNull();

      fireEvent.click(within(form).getByRole('button', { name: 'Options for group Elsewhere' }));
      fireEvent.click(
        within(await screen.findByRole('dialog', { name: 'Elsewhere' })).getByRole('button', {
          name: 'Remove group',
        }),
      );
      expect(within(form).getAllByRole('textbox', { name: 'Group name' })).toHaveLength(4);
    });

    it('edits the contact side in place by turning the card, and saves both sides at once', async () => {
      const form = await openEditor();
      fireEvent.change(within(form).getByRole('textbox', { name: 'Tagline' }), {
        target: { value: 'Turned over' },
      });
      fireEvent.click(within(form).getByRole('button', { name: 'Contact details' }));
      // The front face leaves before the contact side arrives.
      const email = await screen.findByRole('textbox', { name: 'Email' });
      expect(email).toHaveValue('someone@example.com');
      fireEvent.change(email, { target: { value: 'new@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: 'Back to links' }));
      const front = await screen.findByRole('textbox', { name: 'Tagline' });
      // The session survives the turn.
      expect(front).toHaveValue('Turned over');

      fireEvent.click(screen.getByRole('button', { name: 'Save card' }));
      await waitFor(() => expect(savedYaml()).toContain('email: new@example.com'), {
        timeout: 5000,
      });
      expect(savedYaml()).toContain('tagline: Turned over');
    });

    it("edits in the card's own layout: headings and links keep the read card's classes", async () => {
      await renderLanding();
      fireEvent.click(screen.getByRole('button', { name: 'show more' }));
      const readHeading = within(nav()).getByRole('heading', { level: 2, name: /Code/ });
      const readLink = within(nav())
        .getByRole('link', { name: /GitHub/ })
        .closest('li');
      const headingClass = readHeading.classList[0] ?? '';
      const linkClass = readLink?.classList[0] ?? '';
      fireEvent.click(screen.getByRole('button', { name: 'Edit card' }));
      const form = await screen.findByRole('form', { name: 'Edit card' }, { timeout: 5000 });
      const title = within(form).getAllByRole('textbox', { name: 'Group name' })[0];
      const label = within(form).getByRole('textbox', { name: 'Label for GitHub' });
      expect(title?.closest(`.${CSS.escape(headingClass)}`)).not.toBeNull();
      expect(label.closest(`.${CSS.escape(linkClass)}`)).not.toBeNull();
    });

    it('a focus area shows its icon, its label, or both, as its settings choose, and saves the choice', async () => {
      const form = await openEditor();
      const chipOf = (name: RegExp) =>
        within(form).getByRole('button', { name }).closest('li') as HTMLElement;
      const shows = (name: RegExp) => {
        const handle = within(chipOf(name)).getByRole('button', { name });
        // The chip's own icon; the link mark beside it is not the focus area's icon.
        const all = handle.querySelectorAll('svg').length;
        return { icons: all - handle.querySelectorAll('[data-link-mark] svg').length };
      };
      fireEvent.click(within(form).getByRole('button', { name: 'Settings for Two' }));
      const settings = await screen.findByRole('dialog', { name: 'Focus area' });
      const option = (label: string) => within(settings).getByRole('radio', { name: label });
      expect(option('Icon')).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(option('Label'));
      await waitFor(() => expect(option('Label')).toHaveAttribute('aria-checked', 'true'));
      expect(shows(/^Two\./).icons).toBe(0);
      expect(chipOf(/^Two\./)).toHaveTextContent('Two');

      fireEvent.click(option('Both'));
      await waitFor(() => expect(option('Both')).toHaveAttribute('aria-checked', 'true'));
      expect(shows(/^Two\./).icons).toBe(1);

      fireEvent.click(option('Label'));
      fireEvent.click(within(form).getByRole('button', { name: 'Save card' }));
      await waitFor(
        () => expect(savedYaml()).toMatch(/label: Two, icon: simple-icons:react, show: label/),
        {
          timeout: 5000,
        },
      );

      // The fake backend outlives each test: put Two back as the other tests expect it.
      fireEvent.click(await screen.findByRole('button', { name: 'Edit card' }, { timeout: 5000 }));
      const again = await screen.findByRole('form', { name: 'Edit card' }, { timeout: 5000 });
      fireEvent.click(within(again).getByRole('button', { name: 'Settings for Two' }));
      const reset = await screen.findByRole('dialog', { name: 'Focus area' });
      fireEvent.click(within(reset).getByRole('radio', { name: 'Icon' }));
      fireEvent.click(within(again).getByRole('button', { name: 'Save card' }));
      await waitFor(
        () => expect(savedYaml()).toMatch(/label: Two, icon: simple-icons:react, show: icon/),
        {
          timeout: 5000,
        },
      );
    });

    it('signing out mid-edit puts the card back, read-only', async () => {
      await openEditor();
      act(() => session.signOut());
      await waitFor(() =>
        expect(screen.queryByRole('form', { name: 'Edit card' })).not.toBeInTheDocument(),
      );
      expect(screen.getByText('Placeholder tagline')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit card' })).not.toBeInTheDocument();
    });

    it('cancel puts the card back as it was and saves nothing', async () => {
      const form = await openEditor();
      fireEvent.change(within(form).getByRole('textbox', { name: 'Tagline' }), {
        target: { value: 'Never saved' },
      });
      fireEvent.click(within(form).getByRole('button', { name: 'Cancel' }));
      await waitFor(() =>
        expect(screen.queryByRole('form', { name: 'Edit card' })).not.toBeInTheDocument(),
      );
      expect(screen.getByText('Placeholder tagline')).toBeInTheDocument();
      expect(savedYaml()).toBeUndefined();
      await waitFor(() => expect(screen.getByRole('button', { name: 'Edit card' })).toHaveFocus());
    });
  });

  it('lets a signed-in editor change the card and save it as profile.yaml on drafts/profile', async () => {
    localStorage.clear();
    session.signIn({ status: 'authenticated', backend: 'fake', token: 'fake' });
    try {
      await renderLanding();
      fireEvent.click(screen.getByRole('button', { name: 'Edit card' }));
      const form = await screen.findByRole('form', { name: 'Edit card' }, { timeout: 5000 });

      fireEvent.change(within(form).getByRole('textbox', { name: 'Tagline' }), {
        target: { value: 'A better tagline' },
      });
      fireEvent.change(within(form).getByRole('textbox', { name: 'New focus area' }), {
        target: { value: 'Nine' },
      });
      fireEvent.keyDown(within(form).getByRole('textbox', { name: 'New focus area' }), {
        key: 'Enter',
      });
      fireEvent.click(within(form).getByRole('button', { name: 'Remove One' }));
      // Each chip's settings: turn Two's link off.
      fireEvent.click(within(form).getByRole('button', { name: 'Settings for Two' }));
      const settings = await screen.findByRole('dialog', { name: 'Focus area' });
      fireEvent.click(within(settings).getByRole('switch', { name: 'Links to its posts' }));

      // An invalid address blocks saving and says why, under the address on the card.
      const address = within(form).getByRole('textbox', { name: 'Address for GitHub' });
      fireEvent.change(address, { target: { value: 'not a url' } });
      expect(address).toHaveAttribute('aria-invalid', 'true');
      expect(address).toHaveAccessibleDescription(/full address/);
      expect(within(form).getByRole('button', { name: 'Save card' })).toBeDisabled();
      fireEvent.change(address, { target: { value: 'https://github.com/x' } });

      fireEvent.click(within(form).getByRole('button', { name: 'Save card' }));
      await waitFor(
        () => expect(screen.queryByRole('form', { name: 'Edit card' })).not.toBeInTheDocument(),
        { timeout: 5000 },
      );
      const fake = JSON.parse(localStorage.getItem('crc:fake-github') ?? '{}');
      const yaml: string = fake.branches['drafts/profile'].files['content/profile.yaml'].content;
      expect(yaml).toContain('tagline: A better tagline');
      expect(yaml).toMatch(
        /tags: \[ \{ label: Two, icon: simple-icons:react, show: icon, link: false }, \{ label: Three, link: false }, Four, .*Nine ]/,
      );
      await waitFor(() => expect(screen.getByRole('button', { name: 'Edit card' })).toHaveFocus());
    } finally {
      session.signOut();
      localStorage.clear();
    }
  });
});
