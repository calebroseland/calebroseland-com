/** Token-name unions so layout props autocomplete and off-scale values fail typecheck. */
const spaceTokens = [
  '0',
  'px',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '8',
  '10',
  '12',
  '16',
  '20',
  '24',
  '32',
] as const;
export type SpaceToken = (typeof spaceTokens)[number];

const measureTokens = ['measure-narrow', 'measure', 'measure-wide'] as const;
export type MeasureToken = (typeof measureTokens)[number];

export const space = (token: SpaceToken): string => `var(--space-${token})`;
