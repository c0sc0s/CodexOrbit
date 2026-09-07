# Development and debugging

[English home](../README.md) · [中文首页](../README.zh-CN.md)

## Setup

Use macOS, Node.js 22+, and the official Codex desktop app. The installer verifies its bundle identity, not just its filename.

```bash
git clone https://github.com/c0sc0s/codex-tags.git
cd codex-tags
npm ci
npm run verify
node bin/codex-tags.mjs install
```

Activation never restarts a running Codex. If the app is open without debugging, ask the user to quit it before launching `~/Applications/Codex Tags.app`. Review the three hooks in Codex Plugins separately.

Edit this checkout, never installed files in Application Support or the plugin cache.

## Edit → preview

```bash
npm run dev:apply
```

This runs build → repository `install` → `apply` against an already debug-enabled app. No watcher/HMR is provided. Unlike public CLI installation, repository `node scripts/manage.mjs install` stops loaded code, refreshes files and the Loader launcher, and removes the legacy supervisor; it does not register/enable the plugin or activate the UI.

- Browser changes: bump `RUNTIME_VERSION` in `runtime/src/tags-plugin.mjs`, then build/install/apply.
- Loader kernel changes: bump `LOADER_VERSION` and its package version so the isolated-world bootstrap is replaced after unloading.
- Service/Loader changes: install/apply to stop old modules before replacing files and start the updated Loader.
- Hook/skill changes: refresh the plugin cachebuster and use the public installer; renewed hook review may be required.
- Never edit `runtime/dist/injected.js` manually; commit the generated bundle with source changes.

## Code map

| Concern | Owner |
| --- | --- |
| CLI and installation | `bin/codex-tags.mjs`, `scripts/{cli-options,manager-core}.mjs` |
| Readiness / mutation lock | `scripts/{health,lifecycle-lock}.mjs` |
| Independent loader / CDP | `runtime/src/plugin-loader/` (standalone npm package) |
| Tags module metadata | `runtime/src/tags-plugin.mjs` |
| Tags services / bridge | `runtime/src/{tags-service,controller-router,protocol}.mjs` |
| Tags CLI compatibility | `runtime/src/controller.mjs` |
| Catalog / search | `runtime/src/{session-catalog,content-index,search-index}.mjs` |
| Saved definitions | `runtime/src/{settings-repository,tag-settings}.mjs` |
| Host selectors | `runtime/src/injected/codex-dom-adapter.ts` |
| UI lifecycle | `runtime/src/injected/{runtime,host-lifecycle}.ts` |
| Dashboard / sidebar | `runtime/src/injected/dashboard-view.ts`, `components/`, `sidebar-tag-filter.ts`, `title-decorator.ts` |
| UI data / language | `runtime/src/injected/{session-registry,search,store,i18n}.ts` |
| Naming / skills | `hooks/session-naming.mjs`, `skills/{doctor,initial,rename}/` |

## Verification

```bash
npm run verify
npm run test:package
npm run dev:apply
node bin/codex-tags.mjs doctor
npm run qa:app
git diff --check
```

The package smoke installs the actual tarball into a temporary consumer and checks hoisted dependencies, standalone SQLite, CLI validation and plugin payload without changing real Codex data.

App QA requires an already injected app. It checks IME, search, menu persistence/contrast, draft retention, highlighting and cleanup without restarting, renaming tasks or saving tag edits. Cold launch, trusted first-turn naming and uninstall/restore remain separate [release checks](compatibility.md).

## Debugging

Start with `node bin/codex-tags.mjs doctor --json`.

Logs under `~/Library/Application Support/Codex Sidebar Tags/`: `.loader-<identity>/loader.log`, `launcher.log`. Installation metadata is in `install.json`. Never share credentials or conversation text in diagnostics.

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

Use `node bin/codex-tags.mjs off` to disable Tags while keeping settings and other Loader modules. Uninstall only with explicit user permission.

## Loader development

See [Loader architecture and entry](plugin-loader.md). The package under `runtime/src/plugin-loader` has no Tags or SQLite dependency. Changes there are copied by the repository installer and included in package smoke. Its Node tests run in `npm test`.
