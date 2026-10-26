import { describe, expect, it } from 'vitest';
import { createReadingWidthStore } from './readingWidth.ts';

const fakeEnv = (stored?: string, opts: { throwing?: boolean } = {}) => {
  const data = new Map<string, string>(stored === undefined ? [] : [['reading-width', stored]]);
  const blocked = () => {
    throw new Error('blocked');
  };
  const storage = opts.throwing
    ? { getItem: blocked, setItem: blocked, removeItem: blocked }
    : {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => void data.set(k, v),
        removeItem: (k: string) => void data.delete(k),
      };
  const props = new Map<string, string>();
  const root = {
    style: {
      setProperty: (n: string, v: string | null) => void props.set(n, v ?? ''),
      removeProperty: (n: string) => {
        props.delete(n);
        return '';
      },
    },
  };
  return { storage, root, data, props };
};

describe('reading width', () => {
  it('is standard until chosen, leaving the page as designed', () => {
    const env = fakeEnv();
    expect(createReadingWidthStore(env).store.state).toBe('standard');
    expect(env.props.has('--reading-width')).toBe(false);
  });

  it.each([
    ['narrow', '60ch'],
    ['wide', '120ch'],
  ] as const)('applies and keeps %s as %s', (choice, css) => {
    const env = fakeEnv();
    createReadingWidthStore(env).set(choice);
    expect(env.props.get('--reading-width')).toBe(css);
    expect(env.data.get('reading-width')).toBe(choice);
  });

  it('goes back to the designed measure on standard, keeping nothing', () => {
    const env = fakeEnv('wide');
    const width = createReadingWidthStore(env);
    expect(env.props.get('--reading-width')).toBe('120ch');
    width.set('standard');
    expect(env.props.has('--reading-width')).toBe(false);
    expect(env.data.has('reading-width')).toBe(false);
  });

  it('ignores a stored value it does not know', () => {
    expect(createReadingWidthStore(fakeEnv('{"ch":90}')).store.state).toBe('standard');
  });

  it('works for the session when storage throws', () => {
    const env = fakeEnv(undefined, { throwing: true });
    createReadingWidthStore(env).set('narrow');
    expect(env.props.get('--reading-width')).toBe('60ch');
  });
});
