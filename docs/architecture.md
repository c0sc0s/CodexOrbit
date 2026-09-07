# Architecture

[Development](development.md) · [Protocol](protocol.md) · [Loader SDK](plugin-loader.md)

The desktop launcher starts Codex Plugin Loader. Loader loads configured modules into the official Codex app without modifying its signed bundle.

| Layer | Responsibility |
| --- | --- |
| Tags CLI / installer | Package installation, module configuration and diagnostics |
| Desktop launcher | Invoke the standalone Loader CLI |
| Loader | Owned CDP endpoint, isolated renderer world, per-plugin service processes, RPC/events, lifecycle and cleanup |
| Tags service | Local settings, session catalog, search index and navigation validation |
| Tags renderer | UI, interactions and reversible DOM decoration |
| Codex DOM adapter | All private host selectors and native row bindings |
| Hooks / skills | Agent naming guidance using the saved tag definitions |

```text
Desktop entry → Loader → Tags renderer ⇄ RPC/events ⇄ Tags service
                              │                         ├─ settings.json
                       Codex DOM adapter                ├─ read-only session catalog
                                                        └─ local SQLite search index
```

`runtime/src/plugin-loader` is independently packable and has no Tags or SQLite dependency. Its public module contexts expose business RPC, events and resource lifecycle; business modules never construct CDP commands or injection expressions. Services run in separate Node processes. Renderer globals live in a named isolated world, sharing the app's DOM and renderer thread. See [Loader architecture](plugin-loader.md) for contracts and failure behavior.

Tags registers `runtime/dist/injected.js` and `tags-service.mjs` in `loader.json`. On activation the renderer requests its configuration; after readiness the service sends settings/catalog snapshots. Each connected window has an instance identity, so replacement and reload cannot receive another instance's outstanding replies.

`SettingsRepository` normalizes and atomically serializes writes. Windows use last-writer-wins; localStorage is a cache. Hooks read the same settings file. `SessionCatalog` joins schema-checked local metadata with [persisted sidebar membership](sidebar-catalog.md), independently of sidebar expansion. Voice and guardian reviews are excluded; explicitly listed tasks retain membership regardless of legacy subagent provenance. Schema mismatch reports incompleteness. `SessionRegistry` joins that metadata with temporary DOM bindings. `SessionSearchIndex` refreshes about every 30 seconds; catalog snapshots refresh about every five seconds. Only metadata and bounded matching snippets enter the renderer, and conversation content stays local.

`HostLifecycle` coalesces native changes. `DashboardView` combines imperative controls and Preact result rows, preserving input composition, drafts, menus and scroll during updates. `ControllerRouter` validates Tags message envelopes; navigation requires a UUID in the current catalog. Private selectors stay in `injected/codex-dom-adapter.ts`.

Browser code uses strict TypeScript, Preact, bundled Motion and an esbuild IIFE. Node services use ESM and better-sqlite3. Modules register cleanup as they acquire resources. The Loader contains service-process failures; renderer plugins remain trusted code sharing DOM and CPU. No remote runtime assets are loaded. Signed app files, sessions and authentication data remain untouched.
