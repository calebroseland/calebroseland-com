import type { Meta, StoryObj } from '@storybook/react-vite';

/* The semantic colour tokens, as the theme in the toolbar resolves them. */
const COLORS = [
  'bg',
  'bg-subtle',
  'surface',
  'surface-raised',
  'surface-sunken',
  'surface-hover',
  'border',
  'border-strong',
  'text',
  'text-muted',
  'text-subtle',
  'accent',
  'accent-hover',
  'accent-subtle',
  'accent-text',
  'link',
  'danger',
  'danger-subtle',
  'warning',
  'warning-subtle',
  'success',
  'success-subtle',
  'focus-ring',
] as const;

const meta = { title: 'Foundations/Tokens' } satisfies Meta;

export default meta;

export const Colors: StoryObj<typeof meta> = {
  render: () => (
    <ul
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))',
        gap: 'var(--space-3)',
        padding: 0,
        listStyle: 'none',
      }}
    >
      {COLORS.map((name) => (
        <li key={name} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <span
            aria-hidden
            style={{
              inlineSize: '2rem',
              blockSize: '2rem',
              background: `var(--color-${name})`,
              border: 'var(--border-width) solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
            }}
          />
          <code>--color-{name}</code>
        </li>
      ))}
    </ul>
  ),
};
