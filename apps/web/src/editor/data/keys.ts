/* Typed query-key factory for everything the editor caches. Every key sits under ["editor"], so a
   change of sign-in can drop them together. */
export const editorKeys = {
  all: ["editor"] as const,
  viewer: () => [...editorKeys.all, "viewer"] as const,
  drafts: () => [...editorKeys.all, "drafts"] as const,
  published: () => [...editorKeys.all, "published"] as const,
  /** Everything under content/ on one branch (or the working tree). */
  tree: (ref: string) => [...editorKeys.all, "tree", ref] as const,
  pull: (ref: string) => [...editorKeys.all, "pull", ref] as const,
};
