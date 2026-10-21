import '../src/fonts.css';
import '../src/index.css';
import type { Preview } from '@storybook/react-vite';

/* Stories render on the site's tokens; the toolbar switches the theme the way the site does, on <html>. */
const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: { icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => {
      document.documentElement.dataset.theme = context.globals.theme as string;
      return <Story />;
    },
  ],
  parameters: {
    a11y: { test: 'error' },
  },
};

export default preview;
