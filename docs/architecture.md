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
| Tags service | Settings, session catalog, search index and validated navigation |
| Tags renderer | UI and reversible DOM decoration |
| Tags host adapter | Product-specific Codex selectors and diagnostics |

```text
Orbit launcher → active Orbit Runtime
                         ├─ Tags renderer ⇄ module-local RPC/events ⇄ Tags service
                         └─ Other plugin  ⇄ module-local RPC/events ⇄ Other service
```

A zero-plugin installation is valid. Packages have independent versions; plugin manifests declare a stable Orbit compatibility interval. The platform, not each business installer, selects the active runtime.

`loader.json` is an atomic authoritative configuration containing platform metadata and plugin registrations. All management mutations use its installation lock; low-level helpers refuse to edit platform-managed configuration. Versioned snapshots are prepared before activation, and the preceding runtime is retained. Changes currently coordinate a daemon restart so cleanup precedes package removal. Codex itself is never restarted.

Each plugin receives a persistent data directory. Disable preserves package/data files. Uninstall removes only the selected plugin's files and registration, preserving data by default and leaving the platform intact. The package snapshot records its assigned data location for naming hooks.

## Business boundaries

Tags UI and services import the type-only `@c0sc0s/orbit/sdk` contract. Runtime CDP and process APIs are reserved for platform and diagnostic adapters. Tags installation clients delegate to Orbit, and its update worker requests a pinned plugin installation through the stable Orbit command.

Tags settings are normalized and atomically persisted. The catalog reads local metadata independently of sidebar expansion; the SQLite index stays private to Tags. Other plugins must not call Tags internal RPC or share its database. Only metadata, bounded matching snippets and settings enter the renderer.

Renderer globals use an isolated JavaScript world, but DOM, CSS and main-thread CPU remain shared. Service processes contain crashes and blocking service work, not malicious access to the OS. Each business plugin owns its host adapter and CSS namespace. Cross-plugin capabilities, UI slots and a plugin store are not implemented.

## Engineering

Strict TypeScript produces ESM and generated declarations. Separate renderer checks exclude Node ambient types. AST-based checks enforce source-layer imports and reject runtime dependency cycles. Tests cover SDK contracts, compiled Node code, browser interactions, installation ownership, compatibility, locking, rollback and real tarball consumers. Preact, Motion and esbuild implement the Tags UI; no remote runtime assets are fetched.

Signed Codex files, authentication and session content remain untouched. Search content stays local. See [release gates](distribution.md) for the distinction between automated verification and clean-account/manual acceptance.
