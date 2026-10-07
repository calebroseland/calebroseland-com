import { AuthError } from '@crc/github-client';
import { MutationObserver } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';
import { session } from '../auth/store.ts';
import { editorKeys } from './keys.ts';
import { editorQueryClient } from './queryClient.ts';

const signIn = (token: string) =>
  session.signIn({ status: 'authenticated', backend: 'fake', token });

describe('editorQueryClient', () => {
  afterEach(() => session.signOut());

  it('is one client for every editing surface', () => {
    expect(editorQueryClient()).toBe(editorQueryClient());
  });

  it("refreshes what a write declares stale before the caller's onSuccess runs", async () => {
    signIn('t');
    const qc = editorQueryClient();
    let fetches = 0;
    await qc.fetchQuery({ queryKey: editorKeys.drafts(), queryFn: () => ++fetches });
    const seen: unknown[] = [];
    const observer = new MutationObserver(qc, {
      mutationFn: async () => 'ok',
      meta: { invalidates: [editorKeys.drafts()] },
      onSuccess: () => {
        seen.push(qc.getQueryState(editorKeys.drafts())?.isInvalidated);
      },
    });
    await observer.mutate();
    expect(seen).toEqual([true]);
  });

  it('ends the session when GitHub rejects the token during a write', async () => {
    signIn('t');
    const observer = new MutationObserver(editorQueryClient(), {
      mutationFn: () => Promise.reject(new AuthError()),
    });
    await expect(observer.mutate()).rejects.toBeInstanceOf(AuthError);
    expect(session.store.state.status).toBe('anonymous');
  });

  it('drops the cache when a different sign-in takes over', async () => {
    signIn('first');
    const qc = editorQueryClient();
    qc.setQueryData(editorKeys.viewer(), 'first-user');
    signIn('first');
    expect(qc.getQueryData(editorKeys.viewer())).toBe('first-user');
    signIn('second');
    expect(qc.getQueryData(editorKeys.viewer())).toBeUndefined();
  });
});
