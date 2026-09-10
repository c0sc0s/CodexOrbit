# Orbit installation and distribution

[Home](../README.md) · [中文首页](../README.zh-CN.md) · [Platform ownership](orbit-platform-design.md)

Orbit is the installed product. Plugins are optional. The private OrbitAI workspace root is not published.

## Requirements

Use macOS, Node.js 22.13+, npm and the official Codex desktop app. Install only trusted plugins.

Orbit 0.5.0 and Orbit Tags 0.9.0 are unpublished npm candidates. Registry installation and update commands require a published compatible version.

## Local installation

Run from the OrbitAI checkout:

```sh
npm ci
npm run verify
npm pack -w @c0sc0s/orbit
npm install -g ./c0sc0s-orbit-0.5.0.tgz
orbit install
orbit plugin list
```

This creates a zero-plugin platform and `~/Applications/Orbit.app` with its bundled icon. The global CLI and active runtime are separate installations. `orbit install` repairs an installed entry without replacing its active runtime.

Add Tags if desired:

```sh
orbit plugin add ./packages/orbit-tags
orbit start
orbit plugin list
orbit doctor
```

If Codex is running without debugging, quit it manually before starting Orbit. Orbit never restarts Codex. Subsequent launches use `~/Applications/Orbit.app`.

Review SessionStart, UserPromptSubmit and SessionEnd in Codex Plugins. Registration does not grant trust or prove a hook executed.

## Plugin operations

```sh
orbit plugin disable orbit-tags
orbit plugin enable orbit-tags
orbit plugin uninstall orbit-tags
```

Disable retains files and data. Uninstall removes the selected plugin's registration and managed payload, retains data by default, and leaves Orbit and peers intact. `--purge` removes data only when Orbit verifies ownership of its canonical directory. External data requires explicit cleanup.

`orbit plugin add <built-directory>` requires a package `files` allowlist and `orbit-plugin.json`. It snapshots resolved production dependencies without workspace symlinks.

## Registry distribution

After compatible versions are published:

```sh
npm install -g @c0sc0s/orbit
orbit install
orbit plugin install @c0sc0s/orbit-tags
orbit start
```

`orbit update` fetches Orbit; `orbit plugin update orbit-tags` fetches Tags. `orbit rollback` selects the retained runtime subject to plugin compatibility. Registry installation disables npm lifecycle scripts; native dependencies must ship compatible binaries.

## Files and ownership

The root is `~/Library/Application Support/Orbit`, configurable with `ORBIT_HOME`.

| Path | Purpose |
| --- | --- |
| `orbit.mjs` | Stable entry resolving the active runtime |
| `runtime/<version>-<identity>/` | Runtime snapshots |
| `loader.json` | Runtime, plugin registrations and ownership |
| `plugins/<id>/<version>-<identity>/` | Plugin snapshots and dependencies |
| `data/<id>/` | Plugin data |
| `marketplaces/<id>/` | Official Codex extension payloads |
| `.loader-<identity>/` | Daemon lease, status and logs |

Tags uses Orbit module ID `orbit-tags` and official Codex extension ID `codex-tags@codex-tags-cli`. These identifiers belong to different registries. The installed package's `orbit-installation.json` records its assigned data directory for naming hooks.

## Safety and recovery

Mutations serialize on the configuration lock. Compatibility and ownership checks precede activation. Module changes restart a running Orbit daemon, not Codex. Failed activation restores configuration and attempts runtime recovery even when extension recovery fails. Runtime snapshots support rollback; business data migrations are not rolled back.

A missing marketplace can be rebuilt only when its exact name and declared path belong to the plugin under this platform root. Existing malformed directories and foreign sources require inspection. No command bypasses hook trust.

Plugins are trusted code, not security sandboxes. Bundle renderer assets locally and never log conversation bodies.

## Verification and release

Run `npm run verify`, `npm run test:package`, `npm run qa:app` and `git diff --check`.

Package tests use real tarballs; on macOS the official CLI runs under a temporary `CODEX_HOME` to test empty-platform installation, plugin lifecycle and missing-marketplace recovery. They do not start Codex or alter the real account.

Complete the manual gates in [compatibility](compatibility.md). Publish Orbit before Tags. Npm publication is an explicit release action, separate from Git push.
