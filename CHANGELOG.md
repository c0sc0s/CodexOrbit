# Changelog

All notable changes to Codex Tags are documented here. Versions follow Semantic Versioning.

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
