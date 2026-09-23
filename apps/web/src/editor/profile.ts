import { type Profile, profile as profileSchema } from "@crc/content-schema";
import type { GitHubClient } from "@crc/github-client";
import { Document, isMap, isScalar, isSeq, parseDocument, visit } from "yaml";

/* One path for reading and writing content/profile.yaml, shared by Editor › Profile and the landing
   card's in-place editor. On GitHub (and the fake) edits accumulate on a drafts/profile branch that is
   published like any draft; in working-tree mode they are the file on disk. */

export const PROFILE_REF = "drafts/profile";
const PROFILE_PATH = "content/profile.yaml";

export type ProfileSource = {
  profile: Profile;
  /** The file as read, so a save can keep its comments and layout. */
  yaml: string;
  /** Where a save will go: the draft branch, or the working tree. */
  ref: string;
  headSha: string;
  /** False until the first save creates the branch (GitHub and the fake only). */
  branchExists: boolean;
};

/** Reads the profile from the draft branch if one exists, otherwise from what is published. The fake
    backend starts with an empty repository, so `fallback` (the profile this build was made from)
    stands in until the first save. */
export async function loadProfile(gh: GitHubClient, fallback: Profile): Promise<ProfileSource> {
  const draft =
    gh.kind === "local"
      ? null
      : ((await gh.listDrafts()).find((d) => d.ref === PROFILE_REF) ?? null);
  const bundle = await gh.readBundle(draft?.ref ?? gh.defaultBranch, "content");
  const file = bundle.files.find((f) => f.path === PROFILE_PATH);
  return {
    profile: file ? profileSchema.parse(parseDocument(file.content).toJS()) : fallback,
    yaml: file?.content ?? "",
    ref: gh.kind === "local" ? bundle.ref : PROFILE_REF,
    headSha: gh.kind === "local" || draft ? bundle.headSha : "",
    branchExists: gh.kind === "local" || draft !== null,
  };
}

/* Edits the document rather than regenerating it: only keys whose values changed are replaced, so the
   leading comment, key order and untouched lines stay as written, and a new or changed link is written
   on one line like the hand-written ones. */
export function serializeProfile(sourceYaml: string, next: Profile): string {
  const doc: Document = sourceYaml.trim() ? parseDocument(sourceYaml) : new Document({});
  const before = (doc.toJS() ?? {}) as Record<string, unknown>;
  const after = next as Record<string, unknown>;
  for (const key of Object.keys(before)) if (after[key] === undefined) doc.delete(key);
  for (const [key, value] of Object.entries(after)) {
    if (value === undefined || JSON.stringify(before[key]) === JSON.stringify(value)) continue;
    doc.set(key, doc.createNode(value));
  }
  visit(doc, {
    Pair(_key, pair) {
      // Keys set on a fresh document are plain strings; parsed ones are scalar nodes.
      const key = String(isScalar(pair.key) ? pair.key.value : pair.key);
      if (key === "tags" && isSeq(pair.value)) pair.value.flow = true;
      if (key === "links" && isSeq(pair.value))
        for (const item of pair.value.items) if (isMap(item)) item.flow = true;
      if (key === "location" && isMap(pair.value)) pair.value.flow = true;
    },
  });
  return doc.toString({ lineWidth: 0 });
}

/** Validates and writes the profile; throws StaleRefError when the target moved since it was read
    (in working-tree mode, when any content file changed on disk). */
export async function saveProfile(
  gh: GitHubClient,
  source: ProfileSource,
  next: Profile,
  message: string,
): Promise<ProfileSource> {
  const valid = profileSchema.parse(next);
  let { ref, headSha } = source;
  if (!source.branchExists) {
    const draft = await gh.createDraft("profile");
    ref = draft.ref;
    headSha = draft.headSha;
  }
  const yaml = serializeProfile(source.yaml, valid);
  const saved = await gh.saveBundle({
    ref,
    dir: "content",
    files: [{ path: "profile.yaml", content: yaml }],
    message,
    expectedHeadSha: headSha,
  });
  return { profile: valid, yaml, ref, headSha: saved.headSha, branchExists: true };
}
