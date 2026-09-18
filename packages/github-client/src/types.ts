/* The narrow surface the studio needs. Two implementations: Octokit (real GitHub) and an in-memory fake.
   Every method maps to a small number of REST calls; saveBundle is one atomic commit via the Git Data API. */

export type Viewer = { login: string; name: string | null; avatarUrl: string };

export type RepoRef = { owner: string; repo: string; defaultBranch: string };

export type FileInput = {
  path: string;
  content: string | Uint8Array;
  encoding?: "utf-8" | "base64";
};

export type Bundle = {
  ref: string;
  headSha: string;
  files: Array<{ path: string; content: string; sha: string; encoding: "utf-8" | "base64" }>;
};

export type PullRequest = {
  number: number;
  url: string;
  state: "open" | "closed";
  merged: boolean;
  mergeable: boolean | null;
  headRef: string;
};

export type Draft = {
  /** Branch name, e.g. drafts/hello */
  ref: string;
  slug: string;
  headSha: string;
  pr: PullRequest | null;
};

export class StaleRefError extends Error {
  constructor(
    public readonly ref: string,
    public readonly expected: string,
    public readonly actual: string,
  ) {
    super(`Branch ${ref} moved: expected ${expected}, found ${actual}`);
    this.name = "StaleRefError";
  }
}

export class AuthError extends Error {
  constructor(message = "GitHub rejected the token") {
    super(message);
    this.name = "AuthError";
  }
}

export interface GitHubClient {
  readonly kind: "octokit" | "fake";
  getViewer(): Promise<Viewer>;
  listDrafts(): Promise<Draft[]>;
  createDraft(slug: string): Promise<Draft>;
  readBundle(ref: string, dir: string): Promise<Bundle>;
  /** Blobs → tree → commit → update-ref. Throws StaleRefError when the branch tip is not expectedHeadSha. */
  saveBundle(input: {
    ref: string;
    dir: string;
    files: FileInput[];
    message: string;
    expectedHeadSha: string;
  }): Promise<{ headSha: string; commitUrl: string }>;
  deleteDraft(ref: string): Promise<void>;
  openPullRequest(input: { ref: string; title: string; body: string }): Promise<PullRequest>;
  getPullRequest(ref: string): Promise<PullRequest | null>;
  mergePullRequest(number: number): Promise<{ sha: string }>;
}

export const DRAFT_PREFIX = "drafts/";
export const draftRef = (slug: string) => `${DRAFT_PREFIX}${slug}`;
export const slugFromRef = (ref: string) =>
  ref.replace(/^refs\/heads\//, "").slice(DRAFT_PREFIX.length);
