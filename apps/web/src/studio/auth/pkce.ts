/* RFC 7636 PKCE helpers. Randomness is injectable so tests are deterministic. */

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

export type RandomSource = (bytes: Uint8Array<ArrayBuffer>) => Uint8Array;
const defaultRandom: RandomSource = (bytes) => crypto.getRandomValues(bytes);

export function randomString(length: number, random: RandomSource = defaultRandom): string {
  const bytes = random(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += CHARS[b % CHARS.length];
  return out;
}

export const createVerifier = (random?: RandomSource) => randomString(64, random);
export const createState = (random?: RandomSource) => randomString(32, random);

export function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function createChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(digest);
}

export function authorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const u = new URL("https://github.com/login/oauth/authorize");
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("state", params.state);
  u.searchParams.set("code_challenge", params.challenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}
