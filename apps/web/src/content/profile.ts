import data from 'virtual:content/profile';
import type { Profile } from '@crc/content-schema';

/* Validated at build time by the content Vite plugin (apps/web/vite/content.ts). */
export const siteProfile: Profile = data;

/** Whether the card has a contact side to turn over to. */
export const hasContact = (profile: Profile): boolean => {
  const c = profile.contact;
  return Boolean(c && (c.email || c.phone || c.location));
};
