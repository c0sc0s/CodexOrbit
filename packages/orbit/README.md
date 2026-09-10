# Orbit

An independently installed extension platform for Codex desktop on macOS, built on Node.js 22+. Orbit owns the launcher, versioned runtime, plugin installation, compatibility checks, configuration locking and activation recovery. It has no Tags or SQLite dependency.

Install from npm or a local tarball following [installation](../../docs/distribution.md). From a built checkout:

```sh
orbit install
orbit plugin add ./packages/orbit-tags
orbit start
orbit plugin list
orbit plugin disable orbit-tags
orbit plugin enable orbit-tags
orbit plugin uninstall orbit-tags
```

Use `~/Applications/Orbit.app` for subsequent launches. A zero-plugin platform is valid. `orbit plugin add /path/to/package` snapshots a built local package. The package must provide an explicit `files` allowlist and `orbit-plugin.json` with `schemaVersion`, `id`, `version`, `runtimeVersion`, `orbit: {min, maxExclusive}`, `renderer` and optional `service`/`codex` declarations. Runtime dependencies are copied into its private snapshot. Registry installs disable npm lifecycle scripts.

Business modules import types from `@c0sc0s/orbit/sdk`; installation clients use `@c0sc0s/orbit/installation`. Platform data defaults to `~/Library/Application Support/Orbit`, configurable with `ORBIT_HOME`. Disable preserves files/data; uninstall removes only that plugin and preserves data by default. `--purge` never recursively removes external data. Registry `orbit update`, `orbit plugin update orbit-tags` and `orbit plugin install @c0sc0s/orbit-tags` require published compatible packages; `orbit rollback` selects a retained compatible runtime.

## Platform uninstall

The source CLI adds `orbit uninstall --dry-run` to preview removal and `orbit uninstall --yes` to remove Orbit, its launcher and registered plugins while keeping data. Add `--purge` to delete Orbit-owned data. External data is reported for explicit cleanup. Remove the separate global CLI with `npm uninstall -g @c0sc0s/orbit`. Platform uninstall is not included in npm version 0.5.0. See [uninstall boundaries](../../docs/distribution.md#uninstall-everything).

## Advanced runtime entry

Orbit also owns loopback CDP, isolated renderer globals, per-plugin service processes, RPC/events and cleanup. These explicit-config commands are available for unmanaged development manifests:

```bash
orbit start --config ./loader.json
orbit status --config ./loader.json
orbit remove --config ./loader.json --plugin hello
orbit stop --config ./loader.json
```

A manifest has `apiVersion: 1` and `plugins: [{id, version, entry, service?, config?, enabled?}]`. `entry` is a local IIFE defining `CodexPlugin.activate(context)`; optional `service` is a Node ESM file exporting `activate(context)`. Paths must stay inside the manifest directory. `examples/loader.json` provides a renderer-only module; `examples/service-loader.json` adds RPC.

Both contexts provide `id`, `config`, `signal` and `onDispose`. Renderer code uses `rpc.call(method, payload, options?)` and `events.subscribe(topic, handler)`. Services use `rpc.handle(method, handler)`, `events.publish(topic, payload, clientId?)`, `clients.onConnect/onDisconnect`, and a persistent `stateDirectory`. The implementation is strict TypeScript. Generated contracts ship in `dist/index.d.ts` alongside compiled ESM JavaScript; consumers do not need a TypeScript runtime. Low-level exports and `createLauncher` support custom infrastructure entry points.

Use `--attach` to require an already debug-enabled app. `watch` runs in the foreground; `apply` injects renderer-only bundles once. Increment the module version after code changes. Cleanup runs in reverse registration order. RPC has timeouts, cancellation, payload and concurrency limits. Service crashes do not stop peer services. Fix and disable/re-enable a failed module; no automatic crash restart is performed.

Plugins are trusted local code. Services run with Node privileges; renderers share the DOM/thread despite isolated globals. Renderer blocking code can block Codex. Do not put conversation bodies or secrets in diagnostics. Bundle all renderer assets locally. The official Codex bundle is never modified.
