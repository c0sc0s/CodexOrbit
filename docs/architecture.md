# Architecture

[Development](development.md) · [Protocol](protocol.md) · [Roadmap](roadmap.md)

Codex Tags is a reversible enhancement, not a Codex fork.

## Ownership

| Layer | Owns | Must not own |
| --- | --- | --- |
| CLI / manager | Installation, activation, removal, diagnostics | Session naming or UI behavior |
| Supervisor | One activation attempt per official-app process run | Force-quitting or foreign processes |
| Controller services | CDP targets, settings, catalog, search index | DOM selectors or UI state |
| Injected UI | Presentation, interactions, reversible decoration | Filesystem access or durable settings |
| Host adapter | Codex selectors and native row bindings | Classification policy |
| Hooks / skills | Live classification guidance for the agent | Direct transcript/title database writes |

## Data flow

```text
Codex state database ──read-only──▶ SessionCatalog ──metadata──┐
Codex session JSONL ──read-only──▶ SQLite FTS5 ──snippets──────┤
                                                            ▼
settings.json ◀── SettingsRepository ◀── ControllerRouter ⇄ injected UI
     │                                                      │
     └── hook / naming skills → Codex agent                  └── host adapter
```

The active local catalog is independent of sidebar expansion. Remote-only sessions remain best-effort DOM discovery. Schema mismatch reports an incomplete catalog and falls back to visible/cached rows. Conversation text stays in the local index; only bounded matching snippets cross the bridge.

## Resource boundaries

- **SettingsRepository:** normalization, migration, serialized atomic writes. Renderer storage is only a cache; concurrent windows currently use last-writer-wins.
- **SessionCatalog:** read-only schema-checked metadata, changed snapshots about every 5 seconds.
- **SessionRegistry:** joins metadata and temporary native bindings using canonical local IDs.
- **SessionSearchIndex:** incremental FTS5 indexing, with discovery/refresh about every 30 seconds and bounded text extraction.
- **CodexProcess / TargetRegistry:** process ownership, target discovery, versioned injection and client cleanup.
- **HostLifecycle:** coalesced native changes and pointer/input-safe refresh.
- **DashboardView:** modal controls and interaction state; Preact result rows. Background updates preserve IME, menus, drafts and scroll.
- **ControllerRouter:** validated intent-shaped messages. Navigation requires a UUID present in the current catalog.

## Stack and evolution

Browser: strict TypeScript, Preact result components, bundled Motion, esbuild IIFE. Controller/CLI: Node ESM and better-sqlite3. No remotely loaded runtime scripts.

The dashboard mixes imperative controls and Preact rows. Migrate to a single Preact root when interaction complexity justifies it; do not introduce a general framework solely for uniformity.

## Safety

Native title DOM and listeners have restoration paths. Missing host capabilities should disable the enhancement without damaging native navigation. The signed bundle, session records and authentication data remain untouched.

A LaunchAgent permits the official app entry, with one graceful restart if debugging is absent. Updates stop old code before replacing files and are retryable, not automatically rolled back.

Private DOM/schema/CDP dependencies cannot be guaranteed across future Codex releases. Keep them at adapter/process/catalog boundaries and verify [compatibility](compatibility.md).

For every new capability, identify its owner, command/message, failure isolation, cleanup and tests. Reuse shared normalization; never add another settings store, selectors outside the adapter, or complete-transcript transfer.
