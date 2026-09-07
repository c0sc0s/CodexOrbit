# Compatibility policy

Codex Tags integrates with private Codex renderer DOM and therefore cannot promise compatibility with every future Codex build.

Each release must:

- record the tested Codex application version
- verify required stable `data-*` anchors before mutation
- disable only the enhancement when an adapter check fails
- preserve native title content and attributes for exact restoration
- keep the launcher, compact tag filtering, title rendering, search, IME, menus, scrolling, collapsed groups, and restore path in the real-app smoke matrix
- expose the detected adapter and last error through `status`

Compatibility failures must never trigger edits to the official application bundle. A failed injection leaves the original sidebar operational.

## Candidate verification — 2026-09-07

- Codex desktop: `26.901.51231` (build `8109`), macOS, bundle identifier `com.openai.codex`.
- Runtime candidate: `6.0.11`; npm candidate: `@c0sc0s/codex-tags@0.5.0`.
- Actual tarball installation and repeated source installation both reached healthy state without restarting the already-debuggable app.
- Live UI checks passed: navigation/dialog, Chinese input composition, local search response, sort menu persistence/contrast, unsaved tag editor retention, and title highlighting.
- Production dependency audit reported zero known vulnerabilities at verification time.
- Pending: a clean-account cold launch from the official app entry, manual hook authorization and an actual first-turn naming check. Automated hook contract tests do not replace that permission boundary.

`npm run qa:app` is a content-free, non-restarting smoke against an already injected app. It does not rename sessions or save tag edits. Broader cold-launch and rollback scenarios remain manual release gates.

## Release acceptance matrix

| Scenario | Required result | Status |
| --- | --- | --- |
| Source verification | Build, syntax, types and regression tests pass | Passed locally |
| Packed npm consumer | CLI, standalone native SQLite and three skills load | Passed locally |
| Already-open app | UI mounts; search, IME, menus and drafts stay stable | Passed locally |
| Clean-account cold launch | Official entry activates once; no restart loop | Pending |
| Manual hook trust | First new prompt gets current tags; resumed/later prompts do not | Pending real-app check |
| Never-expanded navigation | Catalog result opens the correct session | Pending real-app check |
| Lifecycle recovery | off/on/update/restore and both uninstall modes preserve unrelated data | Pending clean-account check |
| Published npm entry | Exact `npx …@latest` flow succeeds | Pending publication |

## Known limits

- macOS only; no verified Windows/Linux installer.
- The catalog uses a private, schema-checked local database. Remote-only sessions are best-effort sidebar discovery.
- Text extraction supports local user/assistant message records, caps fields at 24,000 characters and sessions at 500,000, and excludes tool output. Search returns at most 100 unique sessions; it is not exhaustive transcript export.
- A newer extractor rebuilds the owned search cache; original session files are unchanged.
- Multi-window settings use last-writer-wins. Updates are retryable but do not yet offer transactional rollback.
- Future Codex builds require renewed adapter and lifecycle checks. Hook trust cannot be granted or certified by doctor.
