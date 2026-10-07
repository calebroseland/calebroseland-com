import type { GitHubClient } from '@crc/github-client';

/* What each backend can do, so screens ask about a capability instead of naming a backend. */

export type BackendKind = GitHubClient['kind'];

export type Capabilities = {
  /** How the backend is named to the person signed in. */
  label: string;
  /** Edits happen on draft branches; without them an edit is a change to the files themselves. */
  branches: boolean;
  /** Publishing goes through a pull request and a merge. */
  publishes: boolean;
  /** A merge is followed by a deploy worth waiting for before showing the live page. */
  deploys: boolean;
};

const CAPABILITIES: Record<BackendKind, Capabilities> = {
  local: { label: 'working tree', branches: false, publishes: false, deploys: false },
  fake: { label: 'local fake GitHub', branches: true, publishes: true, deploys: false },
  octokit: { label: 'GitHub', branches: true, publishes: true, deploys: true },
};

export const capabilitiesOf = (kind: BackendKind): Capabilities => CAPABILITIES[kind];
