# Installation and release

[English home](../README.md) · [中文首页](../README.zh-CN.md)

## Contract

The npm package `@c0sc0s/codex-tags` carries the CLI, prebuilt UI bundle, local controller, naming hooks and three English skills. Its production dependency is native SQLite. Users need macOS, Node.js 22+, and the official Codex app with plugin support.

After publication:

1. Run `npx @c0sc0s/codex-tags@latest`; activation may gracefully restart Codex.
2. In Codex Plugins, review/trust SessionStart, UserPromptSubmit and SessionEnd.

The CLI uses official plugin commands, never private trust records or authorization bypasses. Installing only the plugin does not provide the native runtime needed for UI injection.

The LaunchAgent waits for official-app launches rather than opening Codex at login. It attempts activation once per process run, never force-quits and leaves foreign CDP occupants alone. A fallback launcher is also installed. Keep the activation Node installation available; rerun the CLI after replacing Node versions.

## Installed files

| Location | Contents |
| --- | --- |
| `~/Library/Application Support/Codex Sidebar Tags/` | Runtime, UI bundle, SQLite dependency, settings, index, logs |
| Its `plugin-marketplace/` directory | CLI-owned plugin snapshot and marketplace |
| `~/Applications/Codex Tags.app` | Small shell launcher, not a second Codex app |
| `~/Library/LaunchAgents/io.github.c0sc0s.codex-tags.supervisor.plist` | Per-user supervisor |
| Codex plugin cache/data | Registered plugin payload and hook markers |

The signed app, authentication data and transcript files are never patched. Search/catalog reads stay local; only bounded snippets enter the injected UI. CDP remains a powerful trusted-local-machine capability.

## Lifecycle

- **install / on / enable:** preflight → stop old controller/supervisor → copy runtime/plugin → register → activate → verify.
- **update:** same flow using the invoked package version. Use `npx …@latest update` to fetch the newest; an old globally installed CLI cannot self-upgrade.
- **off / disable / restore:** stop supervisor/controller, restore UI and remove naming plugin; retain settings/index.
- **uninstall:** remove owned runtime, plugin registration, launcher, supervisor, index and logs; retain settings.
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

The current candidate is not yet accepted for `latest`. Restart-dependent checks require user approval.

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
