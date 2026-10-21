import { MutationObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { editorKeys } from './keys.ts';
import { editorQueryClient } from './queryClient.ts';

describe('editorQueryClient', () => {
  it('is one client for every editing surface', () => {
    expect(editorQueryClient()).toBe(editorQueryClient());
  });

  it("refreshes what a write declares stale before the caller's onSuccess runs", async () => {
    const qc = editorQueryClient();
    let fetches = 0;
    await qc.fetchQuery({ queryKey: editorKeys.tree(), queryFn: () => ++fetches });
    const seen: unknown[] = [];
    const observer = new MutationObserver(qc, {
      mutationFn: async () => 'ok',
      meta: { invalidates: [editorKeys.tree()] },
      onSuccess: () => {
        seen.push(qc.getQueryState(editorKeys.tree())?.isInvalidated);
      },
    });
    await observer.mutate();
    expect(seen).toEqual([true]);
  });
});
