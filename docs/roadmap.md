# Roadmap

The current design separates the reusable Codex Plugin Loader from product services and UI. Loader provides desktop/CLI entry, isolated service processes and RPC/events and renderer-plugin lifecycle; Tags is its first configured renderer/service module. See [the loader contract](plugin-loader.md) for ownership and extension boundaries.

## Release blockers

- [ ] Clean-account install and cold launch through the official app entry.
- [ ] Manual hook trust, first-prompt naming and resumed-session behavior.
- [ ] Real off/on/update/restore and both uninstall modes, preserving unrelated data.
- [ ] Navigation to a session whose sidebar group has never been expanded.
- [ ] Published npm `latest` onboarding.

Passing unit tests does not replace these gates. See [compatibility](compatibility.md).

## Next engineering work

| Priority | Improvement | Acceptance |
| --- | --- | --- |
| P1 | Sanitized DOM/schema fixtures | Collapsed groups, missing capabilities and restoration regress before live QA |
| P1 | Versioned recoverable installation | Interrupted updates retain a known-good artifact with documented rollback |
| P1 | Multi-window settings revisions | Conflicts detected without silent lost edits |
| P2 | Single Preact dashboard root | IME, menus, drafts and scroll persist without imperative remount guards |
| P2 | Compatibility manifest | Tested builds, hashes, schemas and per-feature state are recorded |
| P2 | Search completeness/performance | Text caps, refresh delays and query latency are measured and visible |

## Established foundations

- Strict browser TypeScript and testable process/settings/router boundaries.
- Controller-owned settings and shared live naming context.
- Catalog independent of collapsed groups and local indexed search.
- CLI lifecycle lock, plugin registration, health checks and owned-file cleanup.
- Packed-consumer/native SQLite smoke, UI regressions, named app scenarios and macOS CI.
- English/Chinese UI and linked bilingual GitHub READMEs.

## Delivery rules

Use small behavior-preserving changes. Avoid mixing private-selector rewrites, settings migrations and protocol-major changes. Every feature needs an owner, validated boundary, cleanup and tests; source, generated artifacts and concise docs move together.

Prefer existing Preact/platform APIs. Add dependencies only when they reduce complexity and their licenses fit. A future official sidebar extension API should replace the host adapter without rewriting product logic.
