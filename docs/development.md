# Local development and debugging

This document is the operational entry point for humans and coding agents working on Codex Tags.

## Prerequisites

- macOS with the official Codex desktop app at `/Applications/ChatGPT.app`
- Node.js 22 or newer
- A local checkout of this repository

Do not develop against files under `~/Library/Application Support/Codex Sidebar Tags`. That directory is an installation output and is overwritten by `install`.

## Initial setup

```bash
git clone https://github.com/c0sc0s/codex-tags.git
cd codex-tags
npm ci
npm run verify
```

The repository commits `runtime/dist/injected.js`, so end users do not need npm dependencies. Contributors must rebuild it whenever files under `runtime/src/injected/` change.

## Code map

| Change | Primary location |
| --- | --- |
| Dashboard results and highlighting | `runtime/src/injected/components/` |
| Dashboard shell, search/sort controls, and tag editor | `runtime/src/injected/dashboard-view.ts` |
| Result merging, filtering, and sorting | `runtime/src/injected/search.ts` |
| Domain/host record types and explicit UI actions | `runtime/src/injected/models.ts`, `store.ts` |
| Codex private selectors and native-row discovery | `runtime/src/injected/codex-dom-adapter.ts` |
| Reversible title decoration | `runtime/src/injected/title-decorator.ts` |
| Compact sidebar filtering | `runtime/src/injected/sidebar-tag-filter.ts` |
| Observer and focus/pointer-safe refresh lifecycle | `runtime/src/injected/host-lifecycle.ts` |
| Injected configuration and controller client | `runtime/src/injected/runtime-config.ts`, `runtime-client.ts` |
| Browser-runtime composition, search orchestration, status, and cleanup | `runtime/src/injected/runtime.ts` |
| Session JSONL parsing and discovery | `runtime/src/content-index.mjs` |
| Incremental SQLite FTS5 search | `runtime/src/search-index.mjs` |
| Persistent CDP transport | `runtime/src/cdp-client.mjs` |
| Codex process and renderer target ownership | `runtime/src/codex-process.mjs`, `runtime-target-registry.mjs` |
| Durable settings and versioned message dispatch | `runtime/src/settings-repository.mjs`, `controller-router.mjs` |
| Controller composition, indexing schedule, and health loop | `runtime/src/controller.mjs` |
| Installed-file and launcher management | `scripts/manage.mjs` |
| Browser bundle generation | `scripts/build.mjs` |

All injected source is checked under strict TypeScript. Private, version-dependent Codex DOM knowledge belongs in the adapter and host-lifecycle boundary; do not reintroduce `@ts-nocheck` in the composition root.

## Start Codex for development

Check the current state first:

```bash
node scripts/manage.mjs status
```

For the first setup, or when `status` reports `cdp: false`, run:

```bash
node scripts/manage.mjs enable
```

`enable` installs the runtime and may gracefully quit and relaunch Codex with the local CDP endpoint on `127.0.0.1:9341`. A running task can be interrupted, so an agent must warn the user before invoking it.

The installation also creates `~/Applications/Codex Tags.app`. Use that launcher for later development sessions so CDP and the controller are started correctly.

## Edit-and-preview loop

There is currently no file watcher or HMR server. The supported fast loop is:

```bash
npm run build
node scripts/manage.mjs install
node scripts/manage.mjs apply
```

This regenerates the IIFE bundle, atomically copies the candidate runtime into Application Support, and hot-applies it to the open Codex renderer. It does not restart Codex when the owned CDP endpoint is already available.

Use the supported shortcut while iterating:

```bash
npm run dev:apply
```

After changing only controller code, still run `install` before `apply`; `apply` intentionally executes the installed controller rather than repository source.

## Verification before handoff

Run the complete local gate:

```bash
npm run verify
node scripts/manage.mjs install
node scripts/manage.mjs apply
node scripts/manage.mjs status
npm run qa:app
git diff --check
```

Expected runtime status includes `cdp: true`, the new `sourceVersion`, and matching values under `activeVersions`. The real-app QA covers launcher placement, Chinese IME input, tag filtering, sort menus, collapsed groups, title/content search, highlighting, navigation, modal cleanup, and scroll stability.

QA screenshots are written under:

```text
~/Library/Application Support/Codex Sidebar Tags/previews/
```

## Debugging

Start with:

```bash
node scripts/manage.mjs status
```

Useful local files:

```text
~/Library/Application Support/Codex Sidebar Tags/controller.log
~/Library/Application Support/Codex Sidebar Tags/launcher.log
~/Library/Application Support/Codex Sidebar Tags/controller.pid
~/Library/Application Support/Codex Sidebar Tags/install.json
```

The injected runtime exposes a bounded, content-free diagnostic surface as `window.__codexSidebarTags`:

- `status()` reports versions, row counts, asynchronous search state, and render counters.
- `debug()` reports recent interaction and refresh events without conversation bodies.
- `dispose()` removes the enhancement and restores native title DOM.

The plugin also bundles `hooks/hooks.json`. Use Codex's hook review UI to trust the current definition before end-to-end testing. Unit tests exercise the lifecycle contract without modifying global Codex configuration: `startup` arms a session, its first `UserPromptSubmit` receives naming context, and later or resumed turns receive nothing.

Common failures:

- `cdp: false`: launch with `enable` or `Codex Tags.app`.
- Port `9341` belongs to another process: stop and report the conflict; never terminate the foreign process automatically.
- UI missing after a Codex update: inspect only `codex-dom-adapter.ts`, verify stable `data-*` anchors, and fail closed if they changed.
- Stale UI after source changes: confirm `npm run build`, then `install`, then `apply`, in that order.
- Search content missing: verify `searchIndex.indexedSessions` in controller status and `searchIndexStatus` in runtime status; the controller refreshes changed local sessions approximately every 30 seconds.

Environment overrides available for isolated tests are `CODEX_TAGS_CDP_PORT`, `CODEX_TAGS_INSTALL_DIR`, `CODEX_TAGS_APPLICATIONS_DIR`, and `CODEX_TAGS_STATE_DIR`. Do not use them in normal user installation instructions.

## Safe rollback

```bash
node scripts/manage.mjs restore
```

This stops the controller and removes injected UI without modifying Codex or session data. Use `uninstall` only when the user explicitly asks to remove Codex Tags and its owned local files.
