import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from '../../Icon.tsx';
import { Button } from './Button.tsx';

const meta = {
  title: 'Controls/Button',
  component: Button,
  args: { children: 'Save', variant: 'secondary', size: 'md' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost', 'inline'] },
    tone: { control: 'inline-radio', options: [undefined, 'danger'] },
    size: { control: 'inline-radio', options: ['md', 'sm'] },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary' } };

export const Secondary: Story = {};

export const Ghost: Story = { args: { variant: 'ghost' } };

/** A text action inside a sentence, a toast or an alert. */
export const Inline: Story = {
  render: (args) => (
    <p>
      Couldn't read your working tree. <Button {...args} variant="inline" />
    </p>
  ),
  args: { children: 'Retry' },
};

/** Every variant, at both sizes, enabled, disabled and pending, and in the danger tone. */
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      {(['md', 'sm'] as const).map((size) =>
        ([undefined, 'danger'] as const).map((tone) => (
          <div
            key={`${size}-${tone ?? 'plain'}`}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}
          >
            {(['primary', 'secondary', 'ghost', 'inline'] as const).map((variant) => (
              <Button key={variant} variant={variant} size={size} tone={tone}>
                {variant}
              </Button>
            ))}
            <Button size={size} tone={tone} disabled>
              Disabled
            </Button>
            <Button variant="primary" size={size} tone={tone} pending>
              Saving…
            </Button>
            <Button size={size} tone={tone}>
              <Icon name="lucide:plus" size="sm" />
              With icon
            </Button>
          </div>
        )),
      )}
    </div>
  ),
};

export const MatrixDark: Story = { ...Matrix, globals: { theme: 'dark' } };
