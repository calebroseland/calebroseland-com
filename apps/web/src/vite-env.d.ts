/// <reference types="vite/client" />
declare const __BUILD_SHA__: string;
declare const __API_ORIGIN__: string;
/** True only under `mise run dev:publish`: the dev server accepts merged content writes. */
declare const __LOCAL_PUBLISH__: boolean;
declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
declare module "virtual:content/profile" {
  const data: import("@crc/content-schema").Profile;
  export default data;
}
declare module "virtual:content/index" {
  const data: import("@crc/content-schema").EntryMeta[];
  export default data;
  export const loaders: Record<
    string,
    () => Promise<{ default: import("./content/entries.ts").LoadedEntry }>
  >;
}
