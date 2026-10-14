import * as z from 'zod/mini';

/** The search param that holds an open viewer on a post or page; anything malformed is dropped. */
export const viewSearch = z.object({ view: z.catch(z.optional(z.string()), undefined) });
