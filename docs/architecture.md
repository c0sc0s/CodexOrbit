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
      │          ◀──── settings updates ─────       │
      │          ───── settings snapshots ──▶       │
      ├── SQLite FTS5                               └── native sidebar adapter
      ├── settings.json ──▶ naming hook
      └── Codex lifecycle/persistent CDP
```

Only text fields in user and assistant message records are indexed. System records and tool-output records are excluded; non-text media is not decoded. Content remains local in a persistent SQLite FTS5 database. Full conversation bodies are never copied into the Codex renderer; it receives only bounded matching snippets.

The naming hook is a prompt-context adapter, not a title writer. It injects the configured tag names and optional classification descriptions into the first turn of a newly started session and leaves title selection and persistence to the Codex agent and its built-in task naming capability. Tag colors are renderer metadata and are intentionally omitted from the AI context.

Tag settings use one normalized schema across the UI, controller, and hook. `SettingsRepository` is the durable source of truth: the controller reads it before injection, sends a `settings.snapshot` to every connected renderer, atomically handles `settings.update`, and broadcasts the normalized result to all windows. Renderer `localStorage` is only a last-known cache and one-time migration source when no repository exists. The first-prompt hook reads the same `settings.json` on demand. Legacy `{ name, tone }` definitions are normalized to schema v2 without changing existing session titles; malformed or unsupported files are reported and never silently overwritten by startup migration.

## Injected runtime architecture

The injected runtime is authored as strict TypeScript modules and built into one browser-compatible IIFE. Its current module boundaries are:

- `codex-process`: application discovery, graceful launch, and CDP process ownership
- `runtime-target-registry`: renderer discovery, one-off evaluation, injection, and removal
- `settings-repository`: schema validation, migration, serialized atomic writes, and fallback reads
- `controller-router`: versioned settings/search message dispatch with stale-request suppression
- `cdp-client`: persistent CDP commands and runtime binding events
- `search-index`: incremental SQLite FTS5 indexing and bounded snippet search
- `injected/codex-dom-adapter`: private Codex selectors and native-row discovery
- `injected/runtime-config`: fail-closed validation of the injected configuration
- `injected/runtime-client`: the versioned browser-side bridge
- `injected/store`: serializable state plus explicit typed actions
- `injected/search`: title/content matching, snippets, filters, and sorting
- `injected/components`: Preact-owned result rows and search highlighting
- `injected/title-decorator`: reversible native-title enhancement
- `injected/sidebar-tag-filter`: compact filtering and row visibility
- `injected/dashboard-view`: dashboard, sorting, search input, and tag settings
- `injected/host-lifecycle`: observer scheduling and pointer/focus-safe refresh deferral
- `injected/i18n`: typed English/Chinese UI resources, Codex-locale detection, and live language updates
- `injected/session-registry`: serializable session records separated from live DOM bindings
- `injected/styles`: native-token-based visual contract
- `injected/runtime`: composition, search orchestration, status, and cleanup
- `inject-expression`: Node-side bundle loading and controller/runtime expression boundary

The compact Tags rail and the dashboard intentionally share one selected-tag state. Selecting a tag in either surface immediately filters the native sidebar rows and keeps the same filter when the dashboard opens. The rail is mounted immediately before Codex's native Pinned section, inherits that heading's computed typography and color, and preserves horizontal scroll and keyboard focus across updates. Tag color is progressive: quiet at rest, stronger on row hover, strongest for the selected filter. While filtering by a concrete tag, repeated per-row tag labels are hidden so titles regain horizontal space and the sidebar has one active color signal instead of many competing ones.

`esbuild` bundles Preact and the TypeScript modules, so the installed runtime has no package-manager or network dependency. The complete injected source passes strict TypeScript; private host uncertainty is guarded in the adapter/lifecycle boundary instead of being hidden by `@ts-nocheck`. Codex theme variables remain the styling contract, and large component libraries are intentionally avoided.

UI locale follows Codex's own `document.documentElement.lang`, not the operating-system locale. Simplified Chinese language values use `zh-CN`; English and currently unsupported language values use `en-US`. A root-language observer refreshes owned surfaces when the user changes Codex language, while configured tag names, descriptions, session titles, and indexed conversation content remain untouched as user data. Localized native-label aliases are isolated in the Codex DOM adapter so host-language compatibility does not leak into feature components.

The next optional UI migration is moving the remaining imperative dashboard controls behind one Preact root. It can proceed feature by feature because search, state, dashboard ownership, result rendering, and native DOM discovery no longer depend on one another.

The target boundaries, dependency rules, migration order, and acceptance criteria for that work are maintained in [Architecture roadmap](roadmap.md). New major capabilities should follow that roadmap instead of adding further responsibilities to `runtime.ts` or `controller.mjs`.
