# Runtime protocol

## Title protocol

The portable fallback metadata lives in the session title:

```text
[Tag][Optional time]Title
```

Both ASCII and Chinese brackets are accepted. Tags are case-insensitive for color lookup but retain their original display spelling.

## New-session naming hook

The plugin bundles `SessionStart`, `UserPromptSubmit`, and `SessionEnd` lifecycle hooks. A `startup` event arms one session ID, and the first prompt for that ID consumes the marker and receives a compact developer-context naming policy. Resumed sessions and later prompts receive no context. `SessionEnd` removes an unused marker.

The hook never edits a transcript or session file. It instructs the Codex agent to use Codex's own task naming capability and select exactly one configured tag. The controller owns the versioned local `settings.json` file; renderers send updates through the local bridge and receive normalized snapshots. The hook reads that same file and falls back to the built-in definitions when it is unavailable.

```json
{
  "schemaVersion": 2,
  "tags": [
    {
      "name": "Bug",
      "color": "#d95c5c",
      "description": "修复错误、异常行为、回归或稳定性问题"
    },
    {
      "name": "Review",
      "color": "#123456",
      "description": ""
    }
  ]
}
```

`description` is optional and normalized to a single line of at most 240 characters. `color` is a six-digit hexadecimal UI value. Schema v1 `{ name, tone }` files remain readable and are migrated to curated concrete colors. On macOS the authoritative repository is `~/Library/Application Support/Codex Sidebar Tags/settings.json`; plugin-data environment overrides remain supported for tests and future platforms.

The first-prompt context contains classification data in this shape and deliberately excludes colors:

```text
- [Bug]: 修复错误、异常行为、回归或稳定性问题
- [Review]
```

## Controller/runtime protocol

Every controller/runtime message uses one envelope:

```ts
interface RuntimeMessage {
  protocolVersion: 1;
  type: string;
  requestId?: number;
  payload: Record<string, unknown>;
}
```

Current message families are:

- `search.request` / `search.result`: asynchronous bounded local content search
- `settings.get` / `settings.snapshot` / `settings.update`: controller-owned tag settings
- `hello` and `runtime.status`: reserved protocol-v1 capability/status families

Unknown message types are ignored. Malformed envelopes and unsupported protocol majors fail closed. Search request IDs make stale responses safe to ignore.

The injected runtime exposes `window.__codexSidebarTags` as a deliberately small diagnostics and compatibility surface:

- `handleMessage(message)`: validate and dispatch a protocol-v1 controller message
- `setSearchResult(result)`: legacy compatibility adapter for a bounded search result
- `tagDefinitions()`: return a defensive snapshot for first-install migration and diagnostics
- `contentThreadIds()`: enumerate sessions currently mapped by the DOM adapter
- `status()`: report runtime version, enhanced rows, search state, and render counters
- `debug()`: return the bounded local interaction trace
- `dispose()`: restore native DOM and remove injected UI and listeners

The runtime sends serialized envelopes through one CDP `Runtime.addBinding` bridge. `ControllerRouter` validates and dispatches them to settings or search services, then returns envelopes through a bounded evaluated expression. Only matching snippets and normalized settings are transferred; full conversation bodies remain outside the renderer. The browser bundle is loaded from the installed runtime directory, and no remote script is fetched.

Planned message families are `catalog.snapshot`, `catalog.delta`, and `navigation.open`. Protocol version and injected runtime version are independent: a protocol major changes only for an incompatible wire contract, while injected UI changes bump `RUNTIME_VERSION` so hot apply cannot retain old browser code.

`status()` also exposes `sidebarFilter` and `activeTag` so installation checks and real-app QA can verify the compact sidebar filter without inspecting private state.
