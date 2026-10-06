/* Feature flags are Worker vars, set per environment in wrangler.jsonc and locally in .dev.vars, so
   turning one on is a deploy (or an edit to .dev.vars), never a rebuild. A flag is on only when its
   value is exactly "on". */
export const featureOn = (value: string | undefined): boolean => value === 'on';
