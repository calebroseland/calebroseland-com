import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { Center, Cluster, Grid, Stack } from './Layout.tsx';

const Box = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      padding: 'var(--space-3)',
      background: 'var(--color-surface-sunken)',
      border: 'var(--border-width) solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
    }}
  >
    {children}
  </div>
);

const NAMES = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];
const boxes = (n: number) => NAMES.slice(0, n).map((name) => <Box key={name}>{name}</Box>);

const meta = { title: 'Foundations/Layout' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const StackStory: Story = { name: 'Stack', render: () => <Stack gap="3">{boxes(3)}</Stack> };

export const ClusterStory: Story = {
  name: 'Cluster',
  render: () => (
    <Cluster gap="2" justify="between">
      {boxes(5)}
    </Cluster>
  ),
};

export const GridStory: Story = {
  name: 'Grid',
  render: () => (
    <Grid gap="4" min="10rem">
      {boxes(6)}
    </Grid>
  ),
};

export const CenterStory: Story = {
  name: 'Center',
  render: () => (
    <Center max="measure-narrow">
      <Box>Centred to the narrow measure.</Box>
    </Center>
  ),
};
