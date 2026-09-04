# Architecture

## Product boundaries

Codex Tags has three layers:

1. **Plugin package** — discovery, installation guidance, source distribution, and management skill.
2. **Local controller** — Codex lifecycle, CDP ownership checks, renderer health, and local session indexing.
3. **Injected runtime** — Codex DOM adapter, tag rendering, dashboard UI, filters, sorting, and navigation.

The installed runtime is a build artifact. Source changes originate in this repository and are installed through `scripts/manage.mjs`.

## Data flow

```text
~/.codex/sessions/*.jsonl
          │
          ▼
local controller ── bounded search results ──▶ injected runtime
      │          ◀── async search requests ──       │
      │          ◀──── tag definitions ──────       │
      ├── SQLite FTS5                               └── native sidebar adapter
      ├── settings.json ──▶ naming hook
      └── Codex lifecycle/persistent CDP
```

Only user and assistant text is indexed. Tool output, system instructions, images, and attachments are excluded. Content remains local in a persistent SQLite FTS5 database. Full conversation bodies are never copied into the Codex renderer; it receives only bounded matching snippets.

The naming hook is a prompt-context adapter, not a title writer. It injects the configured tag vocabulary into the first turn of a newly started session and leaves title selection and persistence to the Codex agent and its built-in task naming capability.

## Injected runtime architecture

The injected runtime is authored as typed modules and built into one browser-compatible IIFE. Its current module boundaries are:

- `controller/app-lifecycle`: application discovery, graceful launch, and process ownership
- `cdp-client`: persistent CDP commands and runtime binding events
- `search-index`: incremental SQLite FTS5 indexing and bounded snippet search
- `injected/codex-dom-adapter`: private Codex selectors and native-row discovery
- `injected/store`: serializable dashboard state
- `injected/search`: title/content matching, snippets, filters, and sorting
- `injected/components`: Preact-owned result rows and search highlighting
- `injected/runtime`: lifecycle orchestration, native title decoration, dashboard shell, and compatibility restoration
- `inject-expression`: Node-side bundle loading and controller/runtime expression boundary

`esbuild` bundles Preact and the TypeScript modules, so the installed runtime has no package-manager or network dependency. The dynamic Codex integration shell remains deliberately isolated and temporarily uses a permissive type boundary; new state, search, adapter, and component code must be strict TypeScript. Codex theme variables remain the styling contract, and large component libraries are intentionally avoided.

The next extraction target is the dashboard shell. Moving it behind Preact components can proceed incrementally because search, state, result rendering, and native DOM discovery no longer depend on one another.
