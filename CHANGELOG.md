# Changelog

## 0.5.0 — 2026-09-07

Initial public early release. Automated verification and packed-consumer tests pass; clean-account GUI and hook-trust acceptance remain pending.

- Use the dedicated Codex Tags.app launcher with its own icon; remove automatic launch takeover and clean up legacy LaunchAgents on installation. Running non-debuggable apps are left untouched.
- Exclude subagent and guardian-review sessions from the active catalog, dashboard counts and search scope; retain standalone tasks and clean stale cached entries.
- Add an original project logo, linked English/Chinese GitHub homepages and concise development, architecture and release documentation.
- Merge legacy cached local IDs without duplicate sessions; index standard user message records and rebuild older extraction caches automatically.
- Reject symlink installation destinations before lifecycle mutation and keep environment files out of package artifacts.
- Default the public CLI to installation, with explicit three-hook authorization guidance and nonzero exit status for incomplete activation.
- Validate arguments, serialize public lifecycle mutations, resolve hoisted npm dependencies, stop old runtime code before updating, and preserve unrelated launchers and marketplaces.
- Check current UI versions, navigation availability, controller ownership, settings, catalog and index health using one readiness contract.
- Read active local sessions independently of sidebar expansion, use actual update timestamps, and navigate catalog-only results through the app's thread links.
- Add tag description/color editing, deletion confirmation/undo, reserved fallback handling and consistent 32-character names; protect settings inputs and menus from background refreshes.
- Add isolated packed-consumer/native-runtime smoke tests, dashboard interaction regression tests, and macOS CI.

All notable changes to Codex Tags are documented here. Versions follow Semantic Versioning.

### Included capabilities

- Reduced built-in tags to Feature, Bug, Design, and Research with English classification guidance; preserved saved user definitions and custom tags.
- Replaced the management skill with three English user skills: Doctor, Initial, and Rename, using native Codex task tools for agent-driven classification and naming.
- Standardized generated titles as `[Tag]Title` without date metadata while preserving legacy title parsing; shared live tag/description context between skills and first-prompt hooks and expanded the context budget for the full supported vocabulary.
- Added a dedicated macOS launcher with foreign-port protection and reversible lifecycle management.
- Added a publishable `@c0sc0s/codex-tags` CLI with one-command install, enable, disable, status, doctor, update, and reversible uninstall flows.
- Delegated naming-hook registration to the official Codex Marketplace and Plugin CLI instead of mutating private configuration or trust records.
- Replaced the AppleScript launcher compiler dependency with a minimal atomic macOS application bundle.
- Made clean-machine testing deterministic by removing Codex Tags renderer caches and hook markers during explicit `uninstall --purge`.
- Added a native-aligned Tags rail above Pinned for filtering visible sidebar sessions without opening the dashboard.
- Kept the compact rail and dashboard on one filter state while preserving focus, horizontal position, collapsed-group indexing, and reversible native row visibility.
- Added optional classification descriptions and arbitrary six-digit colors to tag definitions.
- Added six curated color presets plus a native color picker to tag creation.
- Upgraded tag settings to schema v2 with automatic legacy tone migration and passed tag descriptions, but not colors, into the first-session naming context.
- Redesigned tag settings as a compact native-aligned editor with a unified color control and a lightweight, divided configuration list.
- Reduced sidebar color noise with progressive tag emphasis: quiet at rest, stronger on hover, strongest for the selected filter, and no repeated row labels while a concrete tag is active.
- Made the controller-owned atomic settings repository authoritative while retaining renderer storage only for first-install migration and last-known caching.
- Added a protocol-v1 envelope and centralized controller router for settings and search messages.
- Split process ownership, target injection, settings, title decoration, sidebar filtering, dashboard rendering, session bindings, styles, and host refresh lifecycle into independently owned modules.
- Removed the injected runtime's permissive TypeScript boundary and added fail-closed runtime configuration validation plus service/contract tests.
- Made modal exit and observer refresh converge when Chromium suspends animation frames in an occluded Electron window.
- Rebuild stale owned overlays after Codex replaces a renderer execution context while retaining host DOM.
- Replaced the ambiguous four-tile Tags launcher icon with a native-weight tag glyph.
- Added English and Simplified Chinese UI resources that follow Codex's active language and update without restarting the injected runtime.

## 0.3.0 — 2026-09-04

- Added locally bundled Motion animations for dashboard entry and exit, menu and tab transitions, search feedback, and interaction states with reduced-motion support.
- Replaced full conversation transfer to the renderer with asynchronous local search requests.
- Added a persistent, incremental SQLite FTS5 index with Chinese substring search support.
- Added a persistent CDP binding for search requests and bounded result delivery.
- Added loading and failure states while keeping title and tag matches immediate.
- Added search-index lifecycle tests and packaged the SQLite runtime dependency during installation.
- Added a plugin-native first-prompt hook that gives the Codex agent the current tag vocabulary and naming protocol without editing session data.
- Added versioned tag-settings synchronization and lifecycle tests for new versus resumed sessions.

## 0.2.0 — 2026-09-04

- Migrated the injected runtime build to TypeScript, Preact, and esbuild.
- Split strict session models, dashboard state, search/ranking, result rendering, and Codex DOM discovery into independent modules.
- Added title/content search tests, snippet selection coverage, and typed build validation.
- Bundled the browser runtime as an installable local artifact with no runtime package-manager or network dependency.
- Preserved the existing Tags UI, IME handling, sorting, filtering, navigation, and reversible native DOM behavior.
- Added dedicated local-development/debugging and distribution/installation guides, plus an agent-readable project entry point.

## 0.1.0 — 2026-09-04

- Productized the existing sidebar enhancement as a Codex plugin source tree.
- Added reproducible install, status, enable, apply, restore, and uninstall commands.
- Added controller ownership checks and safe handling for foreign CDP port occupants.
- Replaced repeated full synchronization with health polling and changed-content refreshes.
- Added expiring Session file discovery so newly created sessions can be indexed.
- Preserved native title DOM and accessibility attributes during reversible enhancement.
- Added architecture, protocol, compatibility, and contributor documentation.
