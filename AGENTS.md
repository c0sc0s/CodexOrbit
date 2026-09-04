# Codex Tags engineering guide

## Project overview

Codex Tags is a reversible macOS enhancement for the official Codex desktop app. It starts Codex with a loopback-only Chrome DevTools Protocol endpoint, indexes local session text, and injects a bundled TypeScript/Preact UI into the renderer. It never edits the signed Codex bundle or `app.asar`.

## Read before changing code

| Task | Required document |
| --- | --- |
| Local setup, code ownership, build, hot-apply, or debugging | `docs/development.md` |
| Packaging, release, public distribution, or user installation | `docs/distribution.md` |
| Runtime boundaries and data flow | `docs/architecture.md` |
| Title and controller/runtime contracts | `docs/protocol.md` |
| Codex-version compatibility work | `docs/compatibility.md` |

## Hard constraints

- Edit source in this repository only. Never edit the installed copy under `~/Library/Application Support/Codex Sidebar Tags`.
- Keep the official Codex application bundle, code signature, tasks, and authentication data untouched.
- Keep session content local. Never log conversation bodies or send them to a remote service.
- Keep private Codex selectors inside `runtime/src/injected/codex-dom-adapter.ts`.
- The injected runtime must not fetch remote scripts, styles, or assets.
- Do not hand-edit `runtime/dist/injected.js`; regenerate it with `npm run build` and commit it with its source.
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
node runtime/qa-runtime.mjs
git diff --check
```

`apply` requires Codex to already be running with the owned local CDP endpoint. Follow `docs/development.md` for first-run setup and failure handling.
