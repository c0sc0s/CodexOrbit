# Architecture roadmap

This document is the executable architecture TODO for Codex Tags. It describes the target boundaries and the order in which the current implementation should evolve as more capabilities are added.

The roadmap is intentionally incremental. Every phase must leave the installed product usable, reversible, and covered by the existing real-app QA gate.

## Current assessment

The 2026-09 architecture milestone established the production boundaries needed by the current Tags feature: strict injected TypeScript, controller-owned settings, one versioned bridge, independently testable process/target/settings/router services, and separate dashboard, title, filter, registry, style, and host-lifecycle modules. The remaining items below are future scale and compatibility work rather than blockers for the current feature.

| Priority | Finding | Consequence |
| --- | --- | --- |
| P1 | Dashboard controls still use imperative DOM construction, although their ownership is isolated in `DashboardView` and result rows use Preact. | A future large dashboard may benefit from one Preact root and component-level interaction tests. |
| P1 | Session completeness still starts from the native sidebar plus a renderer cache. | A controller-owned catalog is needed before archived or never-expanded sessions can be modeled independently of host UI. |
| P2 | Search refresh scheduling remains in the controller composition loop. | More local services would justify an independently testable scheduler/lifecycle coordinator. |
| P2 | Settings broadcasts are atomic and normalized but use last-writer-wins semantics. | If multi-window concurrent editing becomes common, add repository revisions and optimistic conflict handling. |
| P2 | `runtime/qa-runtime.mjs` is still one stateful full smoke scenario. | Named fixtures and selectable scenarios will make future Codex compatibility failures faster to diagnose. |

There is no need for a general-purpose plugin framework or a large state-management library now. Clear ports, feature ownership, and one composition root are sufficient.

## Target principles

1. **One owner per resource.** The controller owns persisted settings, the session catalog, and the search index. The renderer owns ephemeral interaction state. The Codex host adapter owns private DOM knowledge.
2. **Pure domain data.** Tag, session, query, sort, and protocol types never contain DOM nodes, database handles, CDP sockets, or filesystem paths.
3. **Version every cross-runtime boundary.** Runtime configuration, controller messages, settings, catalog snapshots, and installation metadata have explicit schemas.
4. **Feature slices over a new framework.** Title decoration, sidebar filtering, session browsing, and tag settings are independent feature folders that depend on narrow application ports.
5. **Fail closed at the host boundary.** A missing Codex capability disables only the affected feature and leaves native UI untouched.
6. **Local and reversible by construction.** Conversation bodies remain outside the renderer, all writes stay inside the owned data directory, and every mount returns a complete cleanup path.
7. **Incremental migration.** Architecture-only pull requests preserve behavior and pass the same unit, contract, and real-app gates before the next extraction starts.

## Target runtime model

```text
Codex session files
       │
       ▼
SessionCatalog ─────▶ SearchService ─────▶ SQLite FTS5
       │                    │
       │ catalog events     │ bounded matches
       └──────────────┬─────┘
                      ▼
              ControllerRouter ◀────▶ SettingsRepository ─────▶ naming hook
                      │
             versioned local bridge
                      │
                      ▼
                 RuntimeClient
                      │
          AppStore + feature commands
          ┌───────────┼───────────┐
          ▼           ▼           ▼
   session browser  tag settings  sidebar filter
          │                       │
          └──────── CodexHostAdapter ─────▶ private Codex DOM
```

The dashboard may know that a session has a `threadId`; it must not know how Codex renders or expands that session. Navigation is an intent such as `host.openThread(threadId)`. The adapter decides how to satisfy it for the detected Codex build.

## Ownership and dependency rules

| Boundary | Owns | Must not own |
| --- | --- | --- |
| `shared/domain` | `TagDefinition`, `SessionRecord`, title parsing, normalization, query and sort rules | DOM, CDP, Node APIs, persistence |
| `shared/protocol` | Message envelope, request/result payloads, schema validation, protocol negotiation | UI state or transport implementation |
| `controller` | Process lifecycle, renderer targets, settings repository, catalog, index, message routing | DOM selectors or Preact components |
| `injected/host` | Codex selectors, capability detection, native mounting, row bindings, navigation, exact restoration | Product filtering and sorting rules |
| `injected/app` | Runtime composition, feature lifecycle, app store, commands, error state | Private selectors or filesystem assumptions |
| `injected/features` | Feature UI and feature-local interaction state | Direct `localStorage`, CDP bindings, sibling internals, broad document observers |
| `hooks` | First-turn naming-context adaptation | Renderer storage, title mutation, controller lifecycle |
| `scripts` | Installation and release orchestration | Product behavior |

Dependency direction is one way:

```text
features ─▶ app ports ─▶ shared domain/protocol
host adapter ──────────▶ shared domain
controller services ───▶ shared domain/protocol
composition roots wire concrete implementations
```

Feature folders may import shared UI primitives, domain types, and application ports. They must not import another feature's private files. Cross-feature behavior goes through app state or an explicit command.

## Target source layout

The layout can be reached gradually; do not move every file in one pull request.

```text
src/
  shared/
    domain/
      tags.ts
      sessions.ts
      title-format.ts
    protocol/
      envelope.ts
      messages.ts
      runtime-config.ts
  controller/
    app.ts                     # composition root
    codex-process.ts
    target-registry.ts
    controller-router.ts
    settings-repository.ts
    session-catalog.ts
    search-service.ts
  injected/
    entry.ts                   # browser bundle entry
    app/
      runtime-app.ts
      runtime-store.ts
      runtime-client.ts
    host/
      codex-host-adapter.ts
      codex-capabilities.ts
      session-binding-registry.ts
    features/
      title-decoration/
      sidebar-filter/
      session-browser/
      tag-settings/
    ui/
      components/
      tokens.ts
      styles.ts
  hooks/
    session-naming.ts
  cli/
    manage.ts
runtime/dist/                 # generated Node ESM and browser IIFE artifacts
tests/
  unit/
  contract/
  fixtures/codex-dom/
  real-app/
```

During migration, existing paths remain valid and generated artifacts stay installable. The final build should compile browser and Node entry points from TypeScript; end users still receive prebuilt artifacts and do not need a package manager.

## Stable contracts

### Domain records

`SessionRecord` is serializable and contains only stable data such as `threadId`, raw title, parsed tag, project identity, pinned state, and timestamps. A separate `SessionHostBinding` associates a `threadId` with current native DOM nodes inside the host adapter.

`TagDefinition` has one normalizer and one migration path shared by the UI, controller, and hook:

```ts
interface TagDefinition {
  name: string;
  color: `#${string}`;
  description: string;
}
```

Runtime validation must still reject malformed colors, bracketed names, duplicate names, excessive lengths, and unsupported schema majors.

### Controller messages

Every message uses one envelope:

```ts
interface ProtocolEnvelope<TType extends string, TPayload> {
  protocolVersion: 1;
  type: TType;
  requestId?: number;
  payload: TPayload;
}
```

Initial message families are `hello`, `search.request`, `search.result`, `settings.get`, `settings.snapshot`, `settings.update`, `catalog.snapshot`, `catalog.delta`, `navigation.open`, and `runtime.status`. Unknown message types are ignored; unsupported major versions fail closed and surface a bounded status error.

### Feature lifecycle

Do not introduce a public extension SDK yet. Internally, every imperative feature follows the same lifecycle shape:

```ts
interface DisposableFeature {
  mount(): void;
  dispose(): void;
}
```

Preact-owned features render through the app root. Imperative host features are mounted by `RuntimeApp`. A feature is complete only when repeated `mount → dispose → mount` restores the exact native state.

## Phased TODO

### Phase 0 — Freeze contracts and behavior

- [x] Record architecture decisions for settings ownership, protocol versioning, and the host-adapter boundary.
- [x] Move shared runtime configuration types out of `runtime.ts` and validate injected config at startup.
- [ ] Add sanitized DOM fixtures for the current Codex build, a missing-capability case, collapsed Pinned, and a collapsed project.
- [ ] Split the real-app QA runner into named scenarios while preserving one full smoke command.
- [ ] Record baseline bundle size, initial injection time, observer refresh count, search latency, and cleanup result.

Acceptance:

- Existing behavior and persisted data are unchanged.
- The complete verification gate passes and the baseline is checked into documentation.
- Failures identify the scenario and capability instead of only an assertion line.

### Phase 1 — Establish shared domain and protocol

- [x] Create the single `TagDefinition` normalizer and settings migration implementation.
- [x] Create pure `SessionRecord`, parsed-title, query, sort, and search-result types.
- [x] Split `SessionRecord` from renderer-only `SessionHostBinding`.
- [x] Add the versioned protocol envelope and runtime-config schema.
- [x] Convert search request/result expressions to the shared protocol router without changing search behavior.
- [x] Add contract tests that serialize in one runtime and validate in the other.

Acceptance:

- Tag constraints and title parsing exist in one implementation each.
- No shared domain or protocol module imports DOM or Node infrastructure.
- Current settings files and search requests remain backward compatible.

### Phase 2 — Decompose the injected runtime

- [x] Extract CSS/tokens from `runtime.ts` into a dedicated injected style module.
- [x] Move entry-cache and native-node association into `SessionBindingRegistry`.
- [x] Move MutationObserver scheduling, pointer/focus deferral, and restoration into the host adapter lifecycle.
- [x] Introduce a typed app store with explicit actions for query, tag, sort, view, and validation state.
- [ ] Migrate the dashboard shell, session browser, and tag-settings view to one Preact app root.
- [x] Move the compact sidebar filter and title decoration into independent feature modules.
- [ ] Reduce `installRuntime` to configuration validation, dependency wiring, mount, status, and dispose.
- [x] Remove `@ts-nocheck`; isolate unavoidable host uncertainty behind `unknown` plus adapter guards.

Acceptance:

- A search, settings, or UI feature can be unit-tested with a fake runtime client and fake host adapter.
- Input composition, focus, menu state, scrolling, and repeated disposal still pass real-app QA.
- Private Codex selectors occur only under `injected/host`.

### Phase 3 — Decompose the controller

- [x] Extract `CodexProcess` for detection, graceful restart, CDP ownership, and launch.
- [x] Extract `TargetRegistry` for renderer discovery, version-aware injection, removal, and target cleanup.
- [x] Extract `SettingsRepository` with serialized atomic writes and schema migration.
- [ ] Extract `SearchService` and its refresh scheduler from the watch loop.
- [x] Add `ControllerRouter` with one handler map instead of feature branches in the loop.
- [ ] Keep `controller/app.ts` as the composition root and lifecycle coordinator.
- [ ] Replace silent recoverable catches with bounded local diagnostics that never include conversation text.

Acceptance:

- Process, target, settings, and search services have independent unit tests.
- The controller loop coordinates services but does not know their serialization or retry details.
- Controller shutdown closes clients, the database, timers, and the PID file exactly once.

### Phase 4 — Make controller data authoritative

- [x] Make `SettingsRepository` the source of truth; use renderer storage only as a last-known cache.
- [ ] Implement `settings.get`, `settings.snapshot`, and `settings.update` with optimistic UI and conflict-safe revisions.
- [x] Make the naming hook read the same repository format and retain the built-in fallback.
- [ ] Build a controller-owned `SessionCatalog` from local session metadata.
- [ ] Send `catalog.snapshot` on connection and bounded `catalog.delta` updates afterwards.
- [ ] Limit the host adapter to current DOM binding, native filtering, and navigation.
- [ ] Remove catalog completeness dependence on which sidebar groups are expanded.

Acceptance:

- Settings survive renderer replacement and remain consistent across multiple windows.
- Dashboard session counts do not change when Pinned or Projects are collapsed.
- No full conversation body crosses the bridge.

### Phase 5 — Testing and developer experience

- [ ] Add pure unit tests for every domain reducer, normalizer, ranker, and migration.
- [ ] Add component tests for search IME, sort menu keyboard behavior, tag creation, custom colors, deletion, and errors.
- [ ] Add host-adapter fixture tests for mount, capability failure, navigation, filtering, and exact restore.
- [ ] Add protocol tests for stale responses, unknown messages, malformed payloads, reconnect, and version mismatch.
- [ ] Add controller integration tests with temporary settings and index directories.
- [x] Add `dev` and `verify` scripts for build → install → hot apply and the complete release gate.
- [ ] Add CI for clean install, build reproducibility, type checking, unit tests, license checks, and generated-artifact drift.

Acceptance:

- Most feature regressions fail before real-app QA.
- A contributor has one documented fast loop and one documented release gate.
- The checked-in browser and Node artifacts are reproducible from source.

### Phase 6 — Product distribution and compatibility

- [ ] Produce a versioned build manifest with artifact hashes, schema versions, and tested Codex builds.
- [ ] Add migration backup and rollback for settings and index schemas.
- [ ] Detect Codex capabilities at runtime and expose per-feature compatibility status.
- [ ] Define update, downgrade, uninstall, and user-data retention semantics.
- [ ] Package platform-specific native dependencies explicitly; fail installation with a clear unsupported-platform error.
- [ ] Automate release notes, cachebuster updates, smoke results, and artifact verification.
- [ ] Keep the launcher/CDP channel as the compatibility fallback until an official Codex sidebar extension API can replace the host adapter.

Acceptance:

- Installation and rollback are repeatable on a clean user account.
- An incompatible Codex update disables only affected features and reports why.
- The signed Codex bundle, authentication data, and session transcripts remain untouched.

## Adding a future capability

Before implementation, answer these questions in the feature plan:

1. Is the data durable domain data, ephemeral UI state, or host binding state?
2. Which existing owner should provide it? If none exists, what narrow port is needed?
3. Does the feature require a protocol message or schema migration?
4. Can the feature fail independently without damaging the native sidebar?
5. What exact cleanup restores native behavior?
6. Which unit, contract, fixture, and real-app scenarios prove it works?
7. Does any conversation content leave the controller? The acceptable answer remains no.

Do not add a global flag, a new direct CDP expression, a selector outside the host adapter, or another renderer persistence path merely to ship one feature.

## Change sequencing rules

- Complete phases in order, but deliver each checkbox in small behavior-preserving pull requests.
- Do not combine a settings migration, a protocol-major change, and a Codex selector update in one pull request.
- Introduce a new interface only when it establishes a real ownership boundary or enables a fake in tests.
- Prefer existing Preact and platform APIs. Add a dependency only when it removes more complexity than it introduces and its license is verified.
- Regenerate and commit `runtime/dist` with source changes; never edit generated files manually.
- Bump the injected runtime version whenever the installed browser artifact changes so hot application cannot retain an older implementation.

## Definition of done

An architecture task is complete only when:

- ownership and dependency direction match this document
- public and cross-runtime types are documented and validated
- schema and protocol changes include migration or compatibility behavior
- unit or contract tests cover the extracted behavior
- full build, type check, tests, hot apply, status, real-app QA, and `git diff --check` pass
- documentation and generated artifacts are updated together
- restore/uninstall behavior and local-data privacy are unchanged or explicitly documented
