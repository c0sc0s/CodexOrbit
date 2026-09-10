# OrbitAI engineering guide

## Project overview

OrbitAI is an npm workspaces monorepo. `packages/orbit` owns platform installation, the launcher, plugin registration, shared configuration and locking, the reusable CDP runtime, service isolation and extension SDK; `packages/orbit-tags` owns tags, local search, naming and UI. Orbit must never depend on Tags or SQLite. Cross-package imports must use declared package exports. Neither package edits the signed Codex bundle or `app.asar`.

## Read before changing code

| Task | Required document |
| --- | --- |
| Local setup, code ownership, build, hot-apply, or debugging | `docs/development.md` |
| Packaging, release, public distribution, or user installation | `docs/distribution.md` |
| Runtime boundaries and data flow | `docs/architecture.md` |
| Platform installation and plugin ownership | `docs/orbit-platform-design.md` |
| Architecture evolution, refactoring sequence, or adding a major capability | `docs/roadmap.md` |
| Title and controller/runtime contracts | `docs/protocol.md` |
| Codex-version compatibility work | `docs/compatibility.md` |

## Hard constraints

- Edit source in this repository only. Never edit installed copies under `~/Library/Application Support/Orbit` or `~/Library/Application Support/Codex Sidebar Tags`.
- Keep the official Codex application bundle, code signature, tasks, and authentication data untouched.
- Keep session content local. Never log conversation bodies or send them to a remote service.
- Keep private Codex selectors inside `packages/orbit-tags/runtime/src/injected/codex-dom-adapter.ts`.
- The injected runtime must not fetch remote scripts, styles, or assets.
- Do not hand-edit `packages/orbit-tags/runtime/dist/injected.js`; regenerate it with `npm run build` and commit it with its source.
- Increment `RUNTIME_VERSION` after injected behavior changes. Use the plugin cachebuster update flow for plugin releases.

## Required verification

```bash
npm run build
npm run check
npm run typecheck
npm test
node scripts/manage.mjs install
node scripts/manage.mjs apply
node scripts/manage.mjs status
node packages/orbit-tags/runtime/qa-runtime.mjs
git diff --check
```

`npm run verify` is the local shortcut for the first four commands. `npm run dev:apply` is the supported build → install → hot-apply development loop.

`apply` requires Codex to already be running with the owned local CDP endpoint. Follow `docs/development.md` for first-run setup and failure handling.
