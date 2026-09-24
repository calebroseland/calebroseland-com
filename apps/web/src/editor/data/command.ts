import { AuthError, StaleRefError } from "@crc/github-client";
import { type UseMutationOptions, useMutation } from "@tanstack/react-query";

/* What a write hands back to the screen that asked for it. Screens decide what to say and where to go;
   the data hooks only say what happened. */

export type Failure =
  /** Someone else moved the branch (or the file on disk) since it was loaded. */
  | { ok: false; reason: "conflict"; error: StaleRefError }
  /** GitHub rejected the token; the session has already ended. */
  | { ok: false; reason: "expired"; error: AuthError }
  | { ok: false; reason: "failed"; error: unknown };

type Outcome<T> = { ok: true; value: T } | Failure;

export function toFailure(error: unknown): Failure {
  if (error instanceof StaleRefError) return { ok: false, reason: "conflict", error };
  if (error instanceof AuthError) return { ok: false, reason: "expired", error };
  return { ok: false, reason: "failed", error };
}

export type Command<TVariables, TData> = {
  run: (variables: TVariables) => Promise<Outcome<TData>>;
  pending: boolean;
  /** What the pending (or last) run was called with, so a list can mark the row it is working on. */
  variables: TVariables | undefined;
  /** How the last run failed, until the next one starts. */
  failure: Failure | null;
};

/** A mutation as a command that never throws: every run resolves to an Outcome. */
export function useCommand<TData, TVariables>(
  options: UseMutationOptions<TData, Error, TVariables>,
): Command<TVariables, TData> {
  const mutation = useMutation(options);
  return {
    run: (variables) =>
      mutation.mutateAsync(variables).then((value) => ({ ok: true, value }) as const, toFailure),
    pending: mutation.isPending,
    variables: mutation.variables,
    failure: mutation.error ? toFailure(mutation.error) : null,
  };
}
