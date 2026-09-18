/// <reference types="vite/client" />
declare const __BUILD_SHA__: string;
declare const __API_ORIGIN__: string;
declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
declare module "virtual:content/profile" {
  const data: import("@crc/content-schema").Profile;
  export default data;
}
