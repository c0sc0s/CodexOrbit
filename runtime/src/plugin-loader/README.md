# Codex Plugin Loader

A dependency-free Node.js 22+ toolkit for adding trusted local modules to Codex desktop on macOS. Loader owns desktop startup, loopback CDP, isolated renderer globals, per-plugin service processes, RPC/events and cleanup. It does not depend on Tags.

```bash
codex-plugin-loader start --config ./loader.json
codex-plugin-loader status --config ./loader.json
codex-plugin-loader remove --config ./loader.json --plugin hello
codex-plugin-loader stop --config ./loader.json
```

A manifest has `apiVersion: 1` and `plugins: [{id, version, entry, service?, config?, enabled?}]`. `entry` is a local IIFE defining `CodexPlugin.activate(context)`; optional `service` is a Node ESM file exporting `activate(context)`. Paths must stay inside the manifest directory. `examples/loader.json` provides a renderer-only module; `examples/service-loader.json` adds RPC.

Both contexts provide `id`, `config`, `signal` and `onDispose`. Renderer code uses `rpc.call(method, payload, options?)` and `events.subscribe(topic, handler)`. Services use `rpc.handle(method, handler)`, `events.publish(topic, payload, clientId?)`, `clients.onConnect/onDisconnect`, and a persistent `stateDirectory`. TypeScript contracts ship in `index.d.mts`. Low-level exports and `createLauncher` support custom infrastructure entry points.

Use `--attach` to require an already debug-enabled app. `watch` runs in the foreground; `apply` injects renderer-only bundles once. Increment the module version after code changes. Cleanup runs in reverse registration order. RPC has timeouts, cancellation, payload and concurrency limits. Service crashes do not stop peer services. Fix and disable/re-enable a failed module; no automatic crash restart is performed.

Plugins are trusted local code. Services run with Node privileges; renderers share the DOM/thread despite isolated globals. Renderer blocking code can block Codex. Do not put conversation bodies or secrets in diagnostics. Bundle all renderer assets locally. The official Codex bundle is never modified.
