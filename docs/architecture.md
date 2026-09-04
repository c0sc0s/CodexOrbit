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
local controller ── versioned snapshot/delta ──▶ injected runtime
          │                                      │
          └── Codex lifecycle/CDP                 └── native sidebar adapter
```

Only user and assistant text is indexed. Tool output, system instructions, images, and attachments are excluded. Content remains local.

## Target architecture

The current injected runtime is preserved for compatibility while it is decomposed into typed modules. The intended module boundaries are:

- `controller/app-lifecycle`: application discovery, graceful launch, and process ownership
- `controller/cdp-client`: target discovery and versioned runtime calls
- `controller/session-catalog`: authoritative session metadata and incremental content indexing
- `injected/codex-dom-adapter`: all private Codex DOM knowledge
- `injected/store`: serializable UI state and reducer actions
- `injected/components`: Tags launcher, dashboard, filters, results, and settings
- `shared/protocol`: controller/runtime message shapes and compatibility versions

The injected modules will be authored in TypeScript and bundled as one dependency-free IIFE. Preact is the preferred UI runtime because it provides predictable component lifecycle and state updates with a small bundle. Codex theme variables remain the styling contract; large component libraries are intentionally avoided.

