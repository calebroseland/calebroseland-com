/* Typed query-key factory for everything the editor caches. Every key sits under ["editor"]. */
export const editorKeys = {
  all: ['editor'] as const,
  branch: () => [...editorKeys.all, 'branch'] as const,
  /** Everything under content/ in the working tree. */
  tree: () => [...editorKeys.all, 'tree'] as const,
};
