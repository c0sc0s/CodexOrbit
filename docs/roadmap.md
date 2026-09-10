# Release gates and engineering priorities

Orbit owns installation, runtime and plugin lifecycle. Business packages own their services, data and UI. See [architecture](architecture.md) and [platform ownership](orbit-platform-design.md).

## Release gates

- Clean-account cold launch through `Orbit.app`.
- Manual hook trust, first-prompt naming and resumed-session behavior.
- Navigation to a task whose sidebar group has never been expanded.
- Published npm onboarding and update acceptance.

Automated tests and live UI checks do not replace these manual gates. See [compatibility](compatibility.md).

## Engineering priorities

| Priority | Work | Acceptance |
| --- | --- | --- |
| P1 | Sanitized DOM/schema fixtures | Adapter failures tested before live QA |
| P1 | Recovery journal and snapshot collection | Power-loss recovery and bounded disk retention |
| P1 | Multi-window settings revisions | Conflicting edits detected |
| P2 | Unified Preact dashboard root | Stable IME, menus, drafts and scroll |
| P2 | Compatibility manifest | Tested Codex builds and capability status recorded |
| P2 | Search completeness and performance | Text caps, refresh delays and latency measured |

Keep changes scoped to their owner. Add shared contracts only for demonstrated cross-module needs. A sibling capability belongs in its own business package. Every feature requires bounded cleanup, tests and accurate documentation.
