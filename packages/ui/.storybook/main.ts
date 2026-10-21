import type { StorybookConfig } from '@storybook/react-vite';

/* The workshop for @crc/ui: every canonical component in every state, in the site's own themes. */
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  core: { disableTelemetry: true },
};

export default config;
