import { type Profile, profile as profileSchema } from '@crc/content-schema';
import { Document, isMap, isScalar, isSeq, parseDocument, visit } from 'yaml';
import { readTree, writeFiles } from './workingTree.ts';

/* One path for reading and writing content/profile.yaml, used by the landing card's in-place editor.
   A save is the file on disk. */

const PROFILE_PATH = 'content/profile.yaml';

export type ProfileSource = {
  profile: Profile;
  /** The file as read, so a save can keep its comments and layout. */
  yaml: string;
  headSha: string;
};

/** Reads the profile from disk. With no profile there yet, `fallback` (the profile this build was made
    from) stands in until the first save. */
export const loadProfile = async (fallback: Profile): Promise<ProfileSource> => {
  const tree = await readTree();
  const file = tree.files.find((f) => f.path === PROFILE_PATH);
  return {
    profile: file ? profileSchema.parse(parseDocument(file.content).toJS()) : fallback,
    yaml: file?.content ?? '',
    headSha: tree.headSha,
  };
};

/* Edits the document rather than regenerating it: only keys whose values changed are replaced, so the
   leading comment, key order and untouched lines stay as written, and a new or changed link is written
   on one line like the hand-written ones. */
export const serializeProfile = (sourceYaml: string, next: Profile): string => {
  const doc: Document = sourceYaml.trim() ? parseDocument(sourceYaml) : new Document({});
  const before = (doc.toJS() ?? {}) as Record<string, unknown>;
  const after = next as Record<string, unknown>;
  for (const key of Object.keys(before)) {
    if (after[key] === undefined) {
      doc.delete(key);
    }
  }
  for (const [key, value] of Object.entries(after)) {
    if (value === undefined || JSON.stringify(before[key]) === JSON.stringify(value)) {
      continue;
    }
    doc.set(key, doc.createNode(value));
  }
  visit(doc, {
    Pair(_key, pair) {
      // Keys set on a fresh document are plain strings; parsed ones are scalar nodes.
      const key = String(isScalar(pair.key) ? pair.key.value : pair.key);
      if (key === 'tags' && isSeq(pair.value)) {
        pair.value.flow = true;
      }
      if (key === 'links' && isSeq(pair.value)) {
        for (const item of pair.value.items) {
          if (isMap(item)) {
            item.flow = true;
          }
        }
      }
      if (key === 'location' && isMap(pair.value)) {
        pair.value.flow = true;
      }
    },
  });
  return doc.toString({ lineWidth: 0 });
};

/** Validates and writes the profile; throws ChangedOnDiskError when any content file changed on disk
    since it was read. */
export const saveProfile = async (source: ProfileSource, next: Profile): Promise<ProfileSource> => {
  const valid = profileSchema.parse(next);
  const yaml = serializeProfile(source.yaml, valid);
  const saved = await writeFiles({
    dir: 'content',
    files: [{ path: 'profile.yaml', content: yaml }],
    expectedHeadSha: source.headSha,
  });
  return { profile: valid, yaml, headSha: saved.headSha };
};
