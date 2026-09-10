# Orbit

Orbit is a dependency-free Node.js package at `packages/orbit`. It owns desktop startup, the local CDP connection, plugin services and renderer lifecycle. Tags uses its public SDK; Orbit never imports Tags, SQLite or private Codex DOM selectors.

## Architecture

```text
Desktop launcher / Loader CLI → loader.json → Loader daemon
                                               │
                      ┌────────────────────────┴──────────────────┐
                      ▼                                           ▼
             Service process per plugin                Owned loopback CDP
             Node activate(context)                              │
                      ▲                                  Named isolated world
                      └──────── RPC / events ─────────── Renderer activate(context)
                                                        Shared Codex DOM
```

The microkernel owns transport and lifecycle. Business modules own their data, validation and UI. The service process boundary contains process crashes and blocking Node code. The renderer uses a named isolated JavaScript world in the main frame, keeping its globals separate from Codex while sharing the DOM. Neither mechanism is a security sandbox for untrusted plugins: services have the user's Node privileges, and renderer plugins share a renderer thread and DOM. A synchronous renderer loop can still block Codex.

Orbit installs `~/Applications/Orbit.app` with its own icon. The launcher invokes the platform's stable `orbit.mjs` entry, which resolves the active runtime. `createLauncher` accepts explicit infrastructure paths.

## Manifest and SDK

Paths are relative to the configuration directory; entries and symlinks must resolve inside it. IDs are unique lowercase names, up to 64 characters. `enabled` defaults to true. Each renderer bundle defines `CodexPlugin.activate`; `service` optionally names an ESM module exporting `activate`.

```json
{
  "apiVersion": 1,
  "plugins": [{
    "id": "example",
    "version": "1.0.0",
    "entry": "renderer.js",
    "service": "service.mjs",
    "config": { "label": "Example" }
  }]
}
```

The `@c0sc0s/orbit/sdk` entry ships TypeScript `RendererContext`, `RendererPlugin` and `ServiceContext` contracts. Both contexts provide `id`, `config`, an abort `signal` and `onDispose(callback)`. Bundle renderer dependencies locally with esbuild `format: "iife", globalName: "CodexPlugin"`.

```js
// service.mjs
export function activate({ rpc, events, clients }) {
  rpc.handle("greeting", () => "Hello");
  clients.onConnect(id => events.publish("ready", {}, id));
}
```

```js
// Renderer source, bundled into renderer.js
export async function activate({ rpc, events, onDispose }) {
  const label = document.createElement("div");
  label.textContent = await rpc.call("greeting");
  onDispose(() => label.remove());
  document.body.append(label);
  events.subscribe("ready", () => { label.dataset.ready = "true"; });
}
```

| API | Contract |
| --- | --- |
| Renderer `rpc.call(method, payload?, {signal?, timeoutMs?}?)` | JSON request; resolves a JSON result or rejects |
| Renderer `events.subscribe(topic, handler)` | Module-local subscription; returns unsubscribe; cleared on unload |
| Service `rpc.handle(method, handler)` | Unique method; handler receives payload and `{clientId, signal}` |
| Service `events.publish(topic, payload, clientId?)` | Send to one connected client or all clients of this module |
| Service `clients.onConnect / onDisconnect` | Subscribe to renderer readiness/removal; client IDs change after replacement/reload |
| Service `stateDirectory` | Persistent `module-data/<id>` directory; module owns its storage format |

Renderer activation can call RPC before readiness. `onConnect` runs after activation, allowing the service to send initial snapshots after event subscriptions exist. Services should tolerate a repeated connect notification following a transient delivery failure. No raw CDP client, binding name or injection expression is exposed through either business context. Low-level package exports support infrastructure embedding and diagnostics.

## Lifecycle and limits

Each config/port has one background owner with a token-checked process lease. Renderer IDs also have a configuration owner. Foreign ports and conflicting owners are rejected; the Loader never kills an unrelated process or patches the official app bundle. A stale crash lease requires checking the named PID and removing the reported lease file.

The daemon reconciles configuration and windows. Active matching renderer versions are retained; changing a module's manifest replaces it. Source-only changes require a version bump or explicit stop/start. Removal aborts renderer work, removes bindings, cancels in-flight calls and closes the service. Disposers run in reverse registration order and must be registered immediately when resources are acquired.

- Renderer activation/individual cleanup has a five-second deadline. A timeout or failed cleanup blocks replacement until that renderer reloads.
- Each service has its own process. Service startup failure/crash is reported for that module; healthy modules continue. There is no automatic crash restart loop: disable/re-enable the module or restart Loader after fixing it.
- RPC defaults to ten seconds and accepts at most thirty seconds. Cancellation reaches the service handler's signal. Requests are limited to 64 KiB on the renderer bridge; service replies/events to 1 MiB. Each transport/service caps in-flight requests at 128.
- Shutdown gives service cleanup a bounded grace period, then kills only the owned child if it is blocked. A daemon disconnect terminates its service children.
- Connection tokens and CDP context generations prevent stale messages from entering a replacement renderer. Topics and RPC handlers are scoped per module; they are not an authorization boundary against malicious local code.

Diagnostics report module/window and failure stage without recording request bodies or arbitrary plugin exceptions. Service stdout/stderr are suppressed. Renderer diagnostic `status()` implementations must avoid secrets and conversation content.

## Commands and packaging

```bash
npm pack -w @c0sc0s/orbit
node packages/orbit/dist/cli.js start --config ./loader.json --attach
node packages/orbit/dist/cli.js status --config ./loader.json
node packages/orbit/dist/cli.js remove --config ./loader.json --plugin example
node packages/orbit/dist/cli.js stop --config ./loader.json
```

The packed executable is `orbit`. `start` starts a closed official Codex with local debugging, or reuses a compatible running app; `--attach` requires it already running with the owned endpoint. `watch` runs in the foreground. `apply` loads renderer-only bundles once. `remove --plugin` persists `enabled: false` and preserves peers. `stop` leaves Codex running. `status` imports no plugins. Commands use port 9341 unless `--port` is supplied. A running non-debuggable Codex must be quit manually.

Tags declares a versioned dependency on `@c0sc0s/orbit`. Orbit registers its renderer/service manifest and assigns its data directory. Disabling or uninstalling Tags leaves the platform and peers intact. Package publication is separate from source delivery.

Tests exercise real service processes, crash/blocking containment, cancellation, message limits, multiple modules/windows, stale replies, reload, scoped removal, ownership and independent packed consumption. Real-app QA checks the Tags UI and local RPC path; [compatibility checks](compatibility.md) cover release acceptance.

## Design references

The separation follows the [VS Code extension-host model](https://code.visualstudio.com/api/advanced-topics/extension-host) and [Electron's narrow IPC interface guidance](https://www.electronjs.org/docs/latest/tutorial/context-isolation). Transport uses [CDP isolated worlds](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-createIsolatedWorld), [named-context bindings](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-addBinding) and [Node child-process IPC](https://nodejs.org/api/child_process.html). These are design references; the implementation does not use VS Code or Electron extension APIs.
