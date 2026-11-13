---
kind: page
title: Work
slug: work
date: 2026-10-27
draft: false
tags: []
---

# Selected work

Highlights of things I've built and shipped, with links to the public pull requests where possible.

⭐ = featured work

## ⭐ Mattermost Docs, from an empty repo

*Jul – Aug 2026*

A sovereign wiki for air-gapped networks, tied to a major customer expansion. I led the frontend and chose a stack meant to set Mattermost's frontend standards: Base UI, Floating UI, TanStack Form, Zod, CSS Modules, Pragmatic Drag and Drop, Playwright, and Testcontainers.

- **Frontend:** app shell, routing, state management, accessible components, drag-and-drop, forms and validation, styling, i18n
- **Testing:** E2E against a containerized database
- **Tooling:** CI
- [docs#2](https://github.com/mattermost/mattermost-plugin-docs/pull/2): scaffolding, app shell, and routing · +8,107 −564 · 115 files
- [docs#12](https://github.com/mattermost/mattermost-plugin-docs/pull/12): the baseline Spaces and Pages UI · +19,332 −1,245 · 238 files
- [docs#19](https://github.com/mattermost/mattermost-plugin-docs/pull/19): Playwright E2E infrastructure and the first authoring spec · +5,227 −3 · 29 files

## Reusing Timestamp instead of building a duplicate

*Aug 2026*

A new date/time preferences feature, built by Design, was heading toward a second date component. During review, I proposed reusing the Timestamp component I'd built in 2020. That removed about 600 lines of production code and fixed a number of defects the duplicate carried.

- **Frontend:** component reuse, localization, user preferences
- [mattermost#38013](https://github.com/mattermost/mattermost/pull/38013) · +909 −1,183 · 41 files

## ⭐ Checklists, from MVP to general availability

*Oct 2025 – Aug 2026*

Lightweight task tracking in any channel, DM, or group message, with no playbook setup. I led it from a fast-tracked MVP through GA, reworking the data model and API so runs no longer require a playbook. Postgres migrations made a run's playbook optional, and later its team, so checklists could live in DMs. Server-side gating in the permissions service keeps full playbook runs out of them.

- **Frontend:** menus, task UI, create flow
- **Backend:** REST and GraphQL APIs, permissions, database migrations
- **Testing:** E2E
- **Layers:** SQL migrations, store, app and permissions services
- [playbooks#2117](https://github.com/mattermost/mattermost-plugin-playbooks/pull/2117): standalone runs without a playbook · +250 −28 · 14 files
- [playbooks#2126](https://github.com/mattermost/mattermost-plugin-playbooks/pull/2126): the Checklists MVP · +3,532 −1,938 · 117 files
- [playbooks#2251](https://github.com/mattermost/mattermost-plugin-playbooks/pull/2251): checklists in DM and group channels, with server-side gating (2026) · +3,118 −286 · 57 files
- [playbooks#2307](https://github.com/mattermost/mattermost-plugin-playbooks/pull/2307): checked and unchecked chips that show who changed a task and when, previously visible only in the run's activity log (2026) · +838 −1 · 10 files

## Opening core to plugins: modals and team-scoped products

*Jul 2026*

Two core extensions that Docs builds on. A typed API lets plugins open a curated set of core modals by ID, each lazy-loaded, with a build-time guard against prop type contract drift. Team-scoped products let a plugin mount under the team route, reusing core's team routing, so deep links and team switches land on the right team.

- **Frontend:** plugin API, lazy loading, routing
- **Tooling:** build-time contract check
- [mattermost#37339](https://github.com/mattermost/mattermost/pull/37339): core modals by ID · +648 −151 · 11 files
- [mattermost#37410](https://github.com/mattermost/mattermost/pull/37410): team-scoped products · +553 −35 · 19 files

## Board Attributes on the generic property system

*Jul 2026*

A System Console screen for board attributes, built on Mattermost's new generic property system with no Boards-specific endpoints. An idempotent startup migration seeds the default Status and Assignee attributes. Protected attributes got a reusable convention: listed first, and locked from editing and reordering.

- **Frontend:** admin UI, drag-and-drop
- **Backend:** data migration
- **Layers:** app-layer migration, model
- [mattermost#36518](https://github.com/mattermost/mattermost/pull/36518) · +7,170 −283 · 138 files

## ⭐ Channel Bookmarks overflow menu, on Pragmatic Drag and Drop

*Jun 2024 – May 2026*

Bookmarks that didn't fit in the bar used to mean scrolling sideways. The overflow menu puts them one click away, with drag-and-drop within and across the bar and menu, keyboard reordering, and screen-reader announcements. It also replaced the deprecated react-beautiful-dnd with Pragmatic Drag and Drop.

- **Frontend:** drag-and-drop, keyboard interaction, accessibility, responsive layout
- **Testing:** E2E
- [mattermost#35118](https://github.com/mattermost/mattermost/pull/35118) · +4,216 −510 · 36 files
- [mattermost#36457](https://github.com/mattermost/mattermost/pull/36457): follow-up polish, no drag with a single bookmark and no menu without overflow · +375 −11 · 7 files
- Earlier: [mattermost#25889](https://github.com/mattermost/mattermost/pull/25889), the original Bookmarks web UI (2024) · +2,923 −437 · 64 files

## One release command, with preflight checks

*Jan 2026*

Playbooks' separate patch, minor, major, and release-candidate Make targets became one `make tag-release` command backed by a Go CLI. It has an interactive terminal UI on Bubble Tea and Lip Gloss, branch validation and other preflight checks before anything is tagged, and dry-run and force modes.

- **Tooling:** CLI, terminal UI, release automation
- [playbooks#2185](https://github.com/mattermost/mattermost-plugin-playbooks/pull/2185) · +3,423 −144 · 8 files

## i18n tooling migration

*Jan 2026*

Moved the core webapp's i18n extraction to @formatjs/cli. The tooling surfaced hundreds of messages that had drifted between code and the English source over the years, and no rule could settle them: each was a call on context and history. New checks keep the drift from coming back.

- **Frontend:** i18n
- **Tooling:** message extraction, CI checks
- [mattermost#34498](https://github.com/mattermost/mattermost/pull/34498) · +1,215 −1,542 · 232 files

## Conditional Playbooks

*Aug – Oct 2025*

Playbook-level attributes, and conditions on tasks. I built the Attributes tab for creating, duplicating, deleting, reordering, and editing each attribute's type, name, and values, and wired it to the property APIs, adding ordering in the app-layer property service. Then the Conditions Editor MVP, which shows a task's condition as a header on the task and collapses it across consecutive tasks in the same group.

- **Frontend:** admin UI, editor
- **Backend:** property service
- **Layers:** app-layer property service
- [playbooks#2061](https://github.com/mattermost/mattermost-plugin-playbooks/pull/2061): the Attributes tab · +1,717 −64 · 17 files
- [playbooks#2090](https://github.com/mattermost/mattermost-plugin-playbooks/pull/2090): editable option values · +482 −327 · 17 files
- [playbooks#2103](https://github.com/mattermost/mattermost-plugin-playbooks/pull/2103): the Conditions Editor MVP · +1,463 −96 · 11 files

## User Properties in the System Console

*Jan – Apr 2025*

Custom profile attributes for admins: field types (text, email, phone, URL, select, multi-select), visibility, links to LDAP and SAML attributes, and drag-and-drop ordering. The app layer sorts fields by the new order, so existing clients show it without changes.

- **Frontend:** admin UI, drag-and-drop
- **Backend:** ordering logic
- **Layers:** app, model
- [mattermost#29672](https://github.com/mattermost/mattermost/pull/29672): the System Console screen · +1,407 −22 · 23 files
- [mattermost#30097](https://github.com/mattermost/mattermost/pull/30097): drag-and-drop reordering · +292 −110 · 11 files
- [mattermost#30511](https://github.com/mattermost/mattermost/pull/30511): field types and visibility · +1,565 −131 · 22 files
- [mattermost#30772](https://github.com/mattermost/mattermost/pull/30772): LDAP/SAML links and duplicating fields · +506 −47 · 15 files

## Shared Channels in the System Console

*Oct 2024*

Shared Channels connects separate Mattermost workspaces. I brought it into the System Console: connected workspaces, creating and accepting connections, and sharing channels with them. Accepting an invite now requires a destination team, carried through the API handler, the remote-cluster service, the model, and the OpenAPI spec.

- **Frontend:** admin UI
- **Backend:** REST API, OpenAPI spec
- **Testing:** E2E
- **Layers:** remote-cluster service, model
- [mattermost#28116](https://github.com/mattermost/mattermost/pull/28116): the System Console screens · +3,338 −96 · 39 files
- [mattermost#28841](https://github.com/mattermost/mattermost/pull/28841): a destination team for accepted invites · +124 −32 · 16 files

## ⭐ Microsoft Teams connection invites

*Mar – May 2024*

The Microsoft Teams plugin needed a controlled way to grow its connected users within licensed seats. I built automated connection invites: a DM sent when a user is active, checked at most hourly and capped at the remaining seats. Admins can restrict invites to an allowlist, stored as user IDs and uploaded or downloaded as a CSV of email addresses. The old "whitelist" really tracked who had ever connected, so I moved that history into its own columns. Metrics report pending invites, the limit, and the allowlist size.

- **Frontend:** admin settings
- **Backend:** REST API, database migrations, metrics
- **Layers:** SQL store, timer layer, mocks, plugin config
- [msteams#544](https://github.com/mattermost/mattermost-plugin-msteams/pull/544): automated invites · +443 −28 · 11 files
- [msteams#599](https://github.com/mattermost/mattermost-plugin-msteams/pull/599): the allowlist and rollout modes · +1,411 −552 · 20 files
- [msteams#631](https://github.com/mattermost/mattermost-plugin-msteams/pull/631): restricted mode, with no invites for bots or guests · +589 −131 · 13 files
- [msteams#675](https://github.com/mattermost/mattermost-plugin-msteams/pull/675): invite metrics · +158 −33 · 6 files

## Global RHS and App Bar

*Oct 2022*

Moved the right-hand sidebar and App Bar to the app root so every product shares them, as part of the "Threads Everywhere" effort that also delivered the in-call chat thread in Mattermost Calls.

- **Frontend:** CSS Grid layout, app shell, plugin APIs
- [webapp#11019](https://github.com/mattermost/mattermost-webapp/pull/11019) · +1,336 −864 · 71 files

## Navigation

*Jul 2021 – Aug 2022*

RHS Home replaced the sidebar's run list with a playbook-centric home, where people browse and run the team's playbooks or start from a template. Then a Playbooks team sidebar, which scoped Playbooks to teams again while keeping deep links working, and joining and leaving playbooks, with GraphQL and SQL store support.

- **Frontend:** navigation, deep links
- **Backend:** GraphQL API, database queries
- **Layers:** SQL store, app
- [playbooks#634](https://github.com/mattermost/mattermost-plugin-playbooks/pull/634): RHS Home · +1,791 −261 · 42 files
- [playbooks#1327](https://github.com/mattermost/mattermost-plugin-playbooks/pull/1327): the team sidebar · +204 −144 · 20 files
- [playbooks#1357](https://github.com/mattermost/mattermost-plugin-playbooks/pull/1357): playbook join and leave · +665 −92 · 18 files

## i18n in Playbooks, from scratch

*Sep 2021 – Jul 2022*

Playbooks had hard-coded English strings. I added the tooling first: message extraction with IDs generated from each message's text, so stale translations and duplicates can't build up, and ICU syntax checks that catch errors at build time instead of runtime. Then came a bulk conversion of hard-coded strings, the Go server's runtime and extraction, and a lint rule that flags untranslated string literals in JSX.

- **Frontend:** string conversion
- **Backend:** server i18n
- **Tooling:** message extraction, syntax checks, lint rules
- [playbooks#774](https://github.com/mattermost/mattermost-plugin-playbooks/pull/774): webapp extraction tooling · +751 −21 · 9 files
- [playbooks#722](https://github.com/mattermost/mattermost-plugin-playbooks/pull/722): ICU syntax checks · +583 −1 · 4 files
- [playbooks#853](https://github.com/mattermost/mattermost-plugin-playbooks/pull/853): bulk string conversion · +669 −336 · 68 files
- [playbooks#945](https://github.com/mattermost/mattermost-plugin-playbooks/pull/945): server runtime and extraction · +286 −50 · 8 files
- [playbooks#1337](https://github.com/mattermost/mattermost-plugin-playbooks/pull/1337): lint for untranslated JSX strings · +466 −132 · 26 files

## ⭐ The redesigned Playbook Editor

*Mar – Jul 2022*

Editing a playbook used to mean switching between separate edit and preview pages. I replaced them with a single editor: an outline of checklists, status updates, retrospectives, and actions, with sticky tabs, scroll navigation, inline renaming, and drag-and-drop for checklists and their nested items. It shipped in stages next to the old pages until it could take over as the default, and afterward its menus moved to a shared, reliably positioned Dropdown.

- **Frontend:** routing, layout, scroll navigation, drag-and-drop, menu positioning
- [playbooks#1096](https://github.com/mattermost/mattermost-plugin-playbooks/pull/1096): the new route and layout foundation · +1,007 −6 · 14 files
- [playbooks#1137](https://github.com/mattermost/mattermost-plugin-playbooks/pull/1137): the header and layout overhaul · +2,269 −1,034 · 26 files
- [playbooks#1200](https://github.com/mattermost/mattermost-plugin-playbooks/pull/1200): the final integration, making it the default editor · +1,383 −982 · 46 files
- [playbooks#1228](https://github.com/mattermost/mattermost-plugin-playbooks/pull/1228): polish, and menus moved onto Floating UI · +252 −96 · 33 files
- [playbooks#1300](https://github.com/mattermost/mattermost-plugin-playbooks/pull/1300): the shared Dropdown on Floating UI · +202 −364 · 21 files

## Natural-language reminders

*Aug 2021 – Apr 2022*

Run owners set status-update reminders in their own words. The reminder timer in the update dialog accepts natural language or exact input ("in 2 days", "23h9m", "next monday at 8 pm"), parsed in the browser with chrono-node, with reworked duration formatting. The dialog also gained a Markdown preview, and the input was later localized.

- **Frontend:** natural-language parsing, duration formatting, Markdown preview, localization
- [playbooks#699](https://github.com/mattermost/mattermost-plugin-playbooks/pull/699): the update dialog with Markdown preview · +659 −91 · 19 files
- [playbooks#724](https://github.com/mattermost/mattermost-plugin-playbooks/pull/724): the reminder timer and duration formatting · +1,595 −326 · 32 files
- [playbooks#1107](https://github.com/mattermost/mattermost-plugin-playbooks/pull/1107): the localized date/time input · +349 −239 · 18 files

## Onboarding

*Feb 2022*

A friendlier templates selector and first-time user flow, a reusable tutorial tour-tip component, and a guided tour of a run's details.

- **Frontend:** onboarding flows, guided tours, reusable components
- [playbooks#1014](https://github.com/mattermost/mattermost-plugin-playbooks/pull/1014): the templates selector and first-time flow · +1,986 −552 · 41 files
- [playbooks#1015](https://github.com/mattermost/mattermost-plugin-playbooks/pull/1015): the tour-tip component · +1,541 −0 · 15 files
- [playbooks#1023](https://github.com/mattermost/mattermost-plugin-playbooks/pull/1023): the run-details tour · +323 −13 · 10 files

## ⭐ Collapsed Reply Threads

*Apr 2021*

The flagship feature that moved replies out of the channel into followable threads. I built the threads inbox, thread items and footers, and unread indicators.

- **Frontend:** threads inbox, unread state, components
- [webapp#7175](https://github.com/mattermost/mattermost-webapp/pull/7175) · +7,074 −3,150 · 146 files

## The Timestamp component

*Aug 2020*

A shared component for localized, relative, and configurable dates. Six years later it's still the standard in 50+ places across the app and its plugins.

- **Frontend:** reusable component, localization
- [webapp#5390](https://github.com/mattermost/mattermost-webapp/pull/5390) · +1,431 −826 · 41 files

---

🐛 = bug fixes

## 🐛 Large realtime events, silently dropped

*Sep 2026*

Playbooks WebSocket events over about 49 KB were silently lost between cluster nodes on the best-effort UDP path. I routed them over the reliable, TCP-backed cluster channel.

- **Backend:** realtime event delivery, clustering
- **Layers:** plugin cluster messaging
- [playbooks#2323](https://github.com/mattermost/mattermost-plugin-playbooks/pull/2323) · +295 −33 · 11 files

## 🐛 Channel privacy, updated in realtime

*May 2026*

Converting a channel between private and public left the sidebar's lock icon wrong until a refresh, because the client assumed every conversion went to private. I added the channel type to the WebSocket event and read it in the client, optional for backward compatibility.

- **Frontend:** realtime state
- **Backend:** WebSocket events
- [mattermost#36006](https://github.com/mattermost/mattermost/pull/36006) · +272 −2 · 6 files

## 🐛 Bookmarks in archived channels

*Feb 2025*

Archived channels froze posts but not bookmarks. I blocked creating, editing, reordering, and deleting them there, in both the API and the UI, matching how posts behave. Then I tightened which files a bookmark can attach, in the app and store layers.

- **Frontend:** disabled states
- **Backend:** API restrictions, file handling
- **Layers:** REST API, app, store
- [mattermost#29490](https://github.com/mattermost/mattermost/pull/29490) · +236 −1 · 5 files
- [mattermost#30034](https://github.com/mattermost/mattermost/pull/30034) · +200 −14 · 8 files

## 🐛 Hardened mode for integration post props

*Oct 2023*

API-level enforcement of hardened-mode restrictions across the create, update, and patch post APIs, backported to the 7.8 release.

- **Backend:** API enforcement, security
- **Layers:** REST API, app
- [mattermost#24195](https://github.com/mattermost/mattermost/pull/24195) · +249 −13 · 8 files

