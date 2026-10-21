import { describe, expect, it } from 'vitest';
import { ChangedOnDiskError } from '../workingTree.ts';
import { type Failure, toFailure } from './command.ts';

describe('toFailure', () => {
  it('names the failures a screen answers differently', () => {
    const stale = new ChangedOnDiskError('b');
    const other = new Error('network');
    expect(toFailure(stale)).toEqual<Failure>({ ok: false, reason: 'conflict', error: stale });
    expect(toFailure(other)).toEqual<Failure>({ ok: false, reason: 'failed', error: other });
  });
});
