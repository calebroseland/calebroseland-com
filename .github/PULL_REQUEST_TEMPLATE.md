## Summary

<!-- What changed and why, in at most 2–3 short paragraphs. Lead with the outcome for the reader, not the list of files. -->

<details>
<summary>Details</summary>

<!-- Optional. What a reviewer may want but does not need first: notable choices, risks and rollout, deferrals and skips. Delete this block if unused. -->

</details>

## Test plan

<!-- Optional. In one or two sentences: what needs testing and how it was covered. Then the checklist, with results; mark anything not run and say why. For a complex change, move the checklist and its results into the details block below. Delete this section if unused. -->

- [ ] `mise run check`
- [ ] `mise run build`
- [ ] `mise run test:e2e` (if `apps/**` or `packages/**` changed)
- [ ] Manual: keyboard path and VoiceOver pass for any new interactive flow

<details>
<summary>Details</summary>

<!-- Optional, for complex changes: per-area cases, repeated runs, browsers and devices covered. Delete this block if unused. -->

</details>

## Links

<!-- Tickets and issues, related PRs, specs, standards applied. "None" if none. -->

- Closes #

## Screenshots

<!-- Before and after for each changed surface, in light and dark and at desktop and phone widths, uploaded so they render here (`gh pr create --attach`). A local path or "captured locally" does not count. "N/A, no UI change" if nothing visible changed. -->

| | Before | After |
|---|---|---|
| Light |  |  |
| Dark |  |  |

## Release note

<!-- One or two sentences for readers of the site, in their terms, or "None". -->
