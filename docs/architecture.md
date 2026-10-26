# Architecture

[Development](development.md) · [Source layout](source-layout.md) · [Platform design](orbit-platform-design.md) · [Protocol](protocol.md)

OrbitAI is an npm workspaces monorepo. Orbit is the independently installable platform; orbit-tags is an optional business plugin.

## Ownership and execution

| Layer | Responsibility |
| --- | --- |
| Orbit installation manager | Versioned runtime, launcher, configuration lock, activation recovery |
| Orbit plugin manager | Manifest/compatibility validation, snapshots, registration, enable/disable/uninstall |
| Orbit official-extension adapter | Naming hooks/skills registration through official Codex APIs |
| Orbit host | Owned CDP, renderer targets, isolated service processes, RPC/events and cleanup |
| Orbit browser UI helpers | Native button presentation, themed tooltips, placement and per-control cleanup |
| Tags service | Settings, session catalog, search index and validated navigation |
| Tags renderer | UI and reversible DOM decoration |
| Tags host adapter | Product-specific Codex selectors and diagnostics |

```text
Orbit launcher → active Orbit Runtime
                         ├─ Tags renderer ⇄ module-local RPC/events ⇄ Tags service
                         └─ Other plugin  ⇄ module-local RPC/events ⇄ Other service
```

A zero-plugin installation is valid. Packages have independent versions; plugin manifests declare a stable Orbit compatibility interval. The platform, not each business installer, selects the active runtime.

Orbit Todo is an independent business plugin. Its renderer and packaged CLI share a task repository through separate local connections; transactions and per-task revisions protect concurrent updates. Its service sends bounded summary pages, loads descriptions on demand and broadcasts generation invalidations after UI or external CLI writes. Todo neither imports Tags nor reads Codex transcripts. See its [package guide](../packages/orbit-todo/README.md).

Orbit Context is an independent, read-only local rollout analyzer. Its service returns bounded aggregate context categories and the last request's token counters; its renderer enhances the native context-ring hover. Context bundles the public `@c0sc0s/orbit-tags/host-adapter` export at build time so private selectors retain one owner. It has no runtime dependency on Tags, its RPC or SQLite. Conversation bodies never enter the renderer. See its [measurement contract](../packages/orbit-context/README.md).

`loader.json` is an atomic authoritative configuration containing platform metadata and plugin registrations. All management mutations use its installation lock; low-level helpers refuse to edit platform-managed configuration. Versioned snapshots are prepared before activation, and the preceding runtime is retained. Changes currently coordinate a daemon restart so cleanup precedes package removal. Codex itself is never restarted.

Each plugin receives a persistent data directory. Disable preserves package/data files. Uninstall removes only the selected plugin's files and registration, preserving data by default and leaving the platform intact. The package snapshot records its assigned data location for naming hooks.

## Business boundaries

Tags UI and services import the type-only `@c0sc0s/orbit/sdk` contract. Renderer UI can also import browser-only helpers from `@c0sc0s/orbit/ui`; services cannot import that entry point. Runtime CDP and process APIs are reserved for platform and diagnostic adapters. Tags installation clients delegate to Orbit, and its update worker requests a pinned plugin installation through the stable Orbit command.

Tags settings are normalized and atomically persisted. The catalog reads local metadata independently of sidebar expansion; the SQLite index stays private to Tags. Other plugins must not call Tags internal RPC or share its database. Only metadata, bounded matching snippets and settings enter the renderer.

Renderer globals use an isolated JavaScript world, but DOM, CSS and main-thread CPU remain shared. Service processes contain crashes and blocking service work, not malicious access to the OS. Each business plugin owns its host adapter and CSS namespace. Home sections provide renderer-local UI composition through the public UI entry point. Cross-plugin RPC, shared business databases and a plugin store are not implemented.

The [shared UI helpers](plugin-ui.md) consume caller-supplied DOM templates without locating private host anchors. They preserve native presentation and apply tooltip theme tokens, with independent IDs and disposal per plugin control.

## Engineering

Strict TypeScript produces ESM and generated declarations. Separate renderer checks exclude Node ambient types. AST-based checks enforce source-layer imports and reject runtime dependency cycles. Tests cover SDK contracts, compiled Node code, browser interactions, installation ownership, compatibility, locking, rollback and real tarball consumers. Preact, Motion and esbuild implement the Tags UI; no remote runtime assets are fetched.

Signed Codex files, authentication and session content remain untouched. Search content stays local. See [release gates](distribution.md) for the distinction between automated verification and clean-account/manual acceptance.

Orbit Home is an independent container plugin. Its renderer owns native navigation, the greeting/clock and overview/main module layout; its local service persists display preferences. Providers register immutable descriptors through the UI SDK and own business data and actions. Todo and Tags are optional modules. Home never imports them or reads their stores. See [Home architecture](home.md).
