# Development and debugging

[English home](../README.md) · [中文首页](../README.zh-CN.md)

## Setup

Use macOS, Node.js 22+, and the official Codex desktop app. The installer verifies its bundle identity, not just its filename.

```bash
git clone https://github.com/c0sc0s/codex-tags.git OrbitAI
cd OrbitAI
npm ci
npm run verify
node packages/orbit/dist/cli.js install
node packages/orbit/dist/cli.js plugin add ./packages/orbit-tags
node packages/orbit/dist/cli.js start
```

Activation never restarts a running Codex. If the app is open without debugging, ask the user to quit it before launching `~/Applications/Orbit.app`. Review the three hooks in Codex Plugins separately.

Edit this checkout, never installed files in Application Support or the plugin cache.

## Edit → preview

```bash
npm run dev:apply
```

This runs build → repository `install` → `apply` against an already debug-enabled app. The repository install step explicitly updates Orbit from the built workspace before registering Tags; the public Tags CLI never upgrades the shared runtime. No watcher/HMR is provided. The repository Tags command delegates to Orbit to register a new package snapshot. Orbit owns shared installation, locking and official extension registration; existing hook trust may need renewed review.

- Browser changes: bump `RUNTIME_VERSION` in `packages/orbit-tags/runtime/src/shared/plugin.ts`, then build/install/apply.
- Loader kernel changes: bump `LOADER_VERSION` and its package version so the isolated-world bootstrap is replaced after unloading.
- Service/Loader changes: install/apply to stop old modules before replacing files and start the updated Loader.
- Hook/skill changes: refresh the plugin cachebuster and use the public installer; renewed hook review may be required.
- Never edit `packages/orbit-tags/runtime/dist/injected.js` manually; commit the generated bundle with source changes.

## TypeScript build

All Orbit and Tags production logic is strict TypeScript. The shared `tsconfig.base.json` configures NodeNext ESM; package builds emit JavaScript, source maps and generated declarations into their ignored `dist/` directories. Orbit builds before Tags so consumers resolve the same public exports used by installed packages. The injected Preact UI is bundled separately with esbuild into the tracked `runtime/dist/injected.js`.

Small `.mjs` CLI/hook entrypoints delegate to compiled code. Build scripts and Node test harnesses may remain JavaScript. Run `npm run build` before direct CLI or Node tests. `npm pack` builds the package through `prepack`; published packages do not require TypeScript at runtime.

Orbit's CLI uses FIGlet for the ORBIT wordmark, Ora for terminal progress and Picocolors for styling. These production dependencies are restricted to `src/cli/`; the SDK and injected runtime do not import them. Presentation tests cover terminal cleanup, responsive help layout, plain output and JSON compatibility. Keep operation text and next-step guidance in the presentation layer, not in installation services.

## Code map

See [source layout and enforced dependency rules](source-layout.md) for the complete module and test organization.

| Concern | Owner |
| --- | --- |
| CLI and installation | `packages/orbit/src/{cli,installation,plugins}/`; Tags compatibility entry: `packages/orbit-tags/scripts/manager-core.ts` |
| Readiness / mutation lock | `packages/orbit-tags/scripts/{health,lifecycle-lock}.ts` |
| Independent loader / CDP | `packages/orbit/src/` (standalone npm package) |
| Tags module metadata | `packages/orbit-tags/runtime/src/shared/plugin.ts` |
| Tags services / bridge | `packages/orbit-tags/runtime/src/service/{activate,router}.ts`, `shared/protocol.ts` |
| Tags diagnostics | `packages/orbit-tags/runtime/src/controller.ts` |
| Catalog / search | `packages/orbit-tags/runtime/src/service/{catalog,search}/` |
| Saved definitions | `packages/orbit-tags/runtime/src/service/settings/`, `shared/tag-settings.ts` |
| Host selectors | `packages/orbit-tags/runtime/src/injected/codex-dom-adapter.ts` |
| UI lifecycle | `packages/orbit-tags/runtime/src/injected/{runtime,host-lifecycle}.ts` |
| Dashboard / sidebar | `packages/orbit-tags/runtime/src/injected/dashboard-view.ts`, `components/`, `sidebar-tag-filter.ts`, `title-decorator.ts` |
| UI data / language | `packages/orbit-tags/runtime/src/injected/{session-registry,search,store,i18n}.ts` |
| Naming / skills | `packages/orbit-tags/hooks/session-naming.ts`, `packages/orbit-tags/skills/{doctor,initial,rename}/` |

## Verification

```bash
npm run verify
npm run test:package
npm run dev:apply
node packages/orbit-tags/bin/codex-tags.mjs doctor
npm run qa:app
git diff --check
```

The package smoke installs the actual tarball into a temporary consumer and checks hoisted dependencies, standalone SQLite, CLI validation and plugin payload without changing real Codex data.

App QA requires an already injected app. It checks IME, search, menu persistence/contrast, draft retention, highlighting and cleanup without restarting, renaming tasks or saving tag edits. Cold launch, trusted first-turn naming and uninstall/restore remain separate [release checks](compatibility.md).

## Debugging

Start with `node packages/orbit-tags/bin/codex-tags.mjs doctor --json`.

Platform logs under `~/Library/Application Support/Orbit/`: `.loader-<identity>/loader.log`, `launcher.log`. Platform metadata is in `loader.json`; plugin update metadata is in its data directory. Never share credentials or conversation text in diagnostics.

Renderer diagnostics in the `codex-plugin-loader` isolated world: `window.__codexSidebarTags.status()`, `debug()`, `dispose()`.

| Symptom | Check |
| --- | --- |
| Missing UI | Owned CDP, source/active versions, sidebar mount |
| Port 9341 conflict | Report it; never kill a foreign process |
| Stale UI | Build → install → apply; runtime version bump |
| Missing body match | Index status, supported record shapes, text limits and refresh delay |
| Codex update regression | Host adapter / catalog schema; never patch the signed app |
| Stale CLI lock | Confirm no Tags CLI is running, then remove only the named lock |

Testing overrides: `CODEX_TAGS_INSTALL_DIR` (runtime), `CODEX_TAGS_APPLICATIONS_DIR` (launcher), `CODEX_TAGS_CDP_PORT` (default 9341), `CODEX_HOME` (Codex data), `CODEX_TAGS_SETTINGS_PATH` (hook settings), `CODEX_TAGS_STATE_DIR` (hook markers). They do not isolate every macOS/plugin side effect; unit tests use injected fake process runners.

Use `orbit plugin disable orbit-tags` to disable Tags while keeping settings and other modules. Uninstall only with explicit user permission.

## Loader development

See [Loader architecture and entry](plugin-loader.md). The package under `packages/orbit/src` has no Tags or SQLite dependency. Changes there are copied by the repository installer and included in package smoke. Its Node tests run in `npm test`.
