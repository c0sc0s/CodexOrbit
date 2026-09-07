# Installation and release

[English home](../README.md) · [中文首页](../README.zh-CN.md)

## Contract

The npm package `@c0sc0s/codex-tags` carries the CLI, prebuilt UI bundle, independent Loader and Tags service module, naming hooks and three English skills. Its production dependency is native SQLite. Users need macOS, Node.js 22+, and the official Codex app with plugin support.

Installation:

1. Quit Codex if it is open without Tags, then run `npx @c0sc0s/codex-tags@latest`.
2. In Codex Plugins, review/trust SessionStart, UserPromptSubmit and SessionEnd.

The CLI uses official plugin commands, never private trust records or authorization bypasses. Installing only the plugin does not provide the native runtime needed for UI injection.

For future launches, open `~/Applications/Codex Tags.app` (pin it to the Dock). This small launcher invokes Loader with `loader.json`; Loader starts the official app with loopback debugging; it never monitors or restarts a running app. If a non-debuggable Codex is open, it shows a prompt to quit it manually. The official entry is unmodified. The Loader only maintains configured modules while the explicitly activated app runs; it does not relaunch Codex. Keep the activation Node installation available; rerun the CLI after replacing Node versions.

## Installed files

| Location | Contents |
| --- | --- |
| `~/Library/Application Support/Codex Sidebar Tags/` | Runtime, UI bundle, SQLite dependency, settings, index, logs |
| Its `plugin-marketplace/` directory | CLI-owned plugin snapshot and marketplace |
| `~/Applications/Codex Tags.app` | Loader desktop entry; original path/identity retained for Dock compatibility |
| Codex plugin cache/data | Registered plugin payload and hook markers |

The signed app, authentication data and transcript files are never patched. Search/catalog reads stay local; only bounded snippets enter the injected UI. CDP remains a powerful trusted-local-machine capability.

## Lifecycle

- **install / on / enable:** preflight → remove legacy supervisor → stop old controller → copy runtime/plugin → register → activate → verify.
- **update:** same flow using the invoked package version. Use `npx …@latest update` to fetch the newest; an old globally installed CLI cannot self-upgrade.
- **off / disable / restore:** disable the Tags service/renderer module, remove any legacy supervisor and naming plugin; preserve other Loader modules; retain settings/index.
- **uninstall:** refuse when other modules share the installation; otherwise stop Loader and remove owned runtime, plugin registration, launcher, legacy supervisor, index and logs; retain settings.
- **uninstall --purge:** also remove settings, owned hook data and reachable renderer caches. Never deletes or renames Codex sessions.
- **status / doctor:** read-only. Doctor exits nonzero when not ready; a closed app or disabled installation is expected to be non-ready.

Mutations are serialized. Failed updates are retryable, **not transactional rollbacks**. Unrelated launcher/marketplace conflicts require explicit resolution. Installation health does not verify hook trust.

## Source candidate

```bash
npm ci
npm run verify
node bin/codex-tags.mjs install
```

See [development](development.md) for the separate file-refresh/hot-apply flow.

## Publish checklist

The first public release is an early release with pending manual acceptance explicitly documented. Restart-dependent checks require user approval; do not present package smoke as real-app acceptance.

- [ ] Complete the clean-account [compatibility matrix](compatibility.md), including manually trusted first-turn naming.
- [ ] Synchronize package/lockfile/changelog/plugin versions and review the final diff.
- [ ] Bump `RUNTIME_VERSION` for browser changes; replace the plugin `+codex.<cachebuster>` suffix for changed payloads.
- [ ] Run `npm run verify`, `npm run test:package`, app QA and `git diff --check`.
- [ ] Inspect the tarball: no `.env`, credentials, transcripts, local databases, logs or test fixtures.
- [ ] Verify npm ownership for `@c0sc0s`; keep credentials outside Git and the package.
- [ ] Publish the verified commit: `npm publish --access public --registry=https://registry.npmjs.org`.
- [ ] Verify the published version and exact `npx @c0sc0s/codex-tags@latest` onboarding; update both README release notices.

`prepublishOnly` runs source verification and package smoke. macOS CI checks Node 22/24 and bundle drift; it cannot replace GUI/hook acceptance. Use a configured trusted CI publisher if provenance is needed.

No open-source license is currently granted (`UNLICENSED`). Public distribution alone does not grant one; the owner must choose a license if open-source distribution is intended.

## Independent Loader package

`runtime/src/plugin-loader` is also a self-contained npm package, `@c0sc0s/codex-plugin-loader`, with no production dependencies. Run `npm pack ./runtime/src/plugin-loader` to produce its tarball. Its CLI is the explicit standalone startup entry; it does not install naming hooks, create Tags data or require the Tags controller. The Tags distribution embeds the same source, configures its renderer/service module and delegates the existing desktop entry directly to Loader. See [Loader contract](plugin-loader.md). The package exports the standalone desktop-launcher builder. Publication remains separate release work.
