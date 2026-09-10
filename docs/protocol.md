# Runtime protocol

## Title protocol

The portable fallback metadata lives in the session title:

```text
[Tag]Title
```

New names contain one ASCII-bracketed tag and the title, with no date/time metadata. The parser also accepts date-bearing metadata and Chinese brackets. Tags are case-insensitive for color lookup but retain their original display spelling. `Uncategorized` is the reserved fallback when no configured tag fits; user tag data is not translated.

## New-session naming hook

The plugin bundles `SessionStart`, `UserPromptSubmit`, and `SessionEnd` lifecycle hooks. A `startup` event arms one session ID, and the first prompt for that ID consumes the marker and receives a compact developer-context naming policy. Resumed sessions and later prompts receive no context. `SessionEnd` removes an unused marker.

The hook never edits a transcript or session file. It instructs the Codex agent to use Codex's own task naming capability and select exactly one configured tag. The Tags service owns the versioned local `settings.json` file; renderers send updates through the local bridge and receive normalized snapshots. The hook reads that same file and falls back to the built-in definitions when it is unavailable.

```json
{
  "schemaVersion": 2,
  "tags": [
    {
      "name": "Bug",
      "color": "#d95c5c",
      "description": "Diagnose and fix incorrect behavior, errors, or regressions."
    },
    {
      "name": "Review",
      "color": "#123456",
      "description": ""
    }
  ]
}
```

`description` is optional and normalized to a single line of at most 240 characters. `color` is a six-digit hexadecimal UI value. The settings reader accepts schema v1 `{ name, tone }` input and normalizes it to concrete colors. The authoritative `settings.json` lives in the plugin's assigned data directory, recorded in `orbit-installation.json`.

The first-prompt context contains classification data in this shape and deliberately excludes colors:

```text
- [Bug]: Diagnose and fix incorrect behavior, errors, or regressions.
- [Review]
```

The hook and the `initial`/`rename` skills share `readNamingContext` and `buildNamingContext` in `hooks/session-naming.mjs`. Running that script with `--context` prints a read-only JSON snapshot containing `settingsPath`, `source` (`settings` or `defaults`), `error`, `titleFormat`, `fallbackTag`, `tags` (names/descriptions only), and `policy`. Skills surface invalid settings before making changes; the automatic hook falls back to the built-in definitions.

Settings are read at the first `UserPromptSubmit`, not cached at `SessionStart` or bundled at install time. Saved edits made between startup and the first prompt are included. Later turns do not receive repeated automatic naming instructions; invoking a naming skill reads fresh settings again. The supported vocabulary is at most 32 normalized tags, names up to 32 characters and descriptions up to 240 characters. The hook's 65,536-unit context allowance covers the complete maximum vocabulary even when measured in UTF-8 bytes. All configured tags are included, regardless of the current sidebar filter.

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
- `settings.get` / `settings.snapshot` / `settings.update`: service-owned tag settings
- `settings.error`: failed persistence; the preceding snapshot restores saved settings
- `catalog.snapshot`: active local metadata, completeness flag and bounded error message
- Optional catalog pin/project metadata may be unavailable; `null` must not erase known native-row metadata.
- `navigation.open`: open a UUID only if present in the controller's current catalog
- `update.check`: check the fixed npm registry, optionally bypassing the cache with `force: true`
- `update.install`: install the service’s detected higher version; the renderer cannot supply a package, version, URL or command
- `update.snapshot`: current/latest package versions, lifecycle phase and localized error code; persisted worker state survives service replacement
- `hello` and `runtime.status`: reserved protocol-v1 capability/status families

Unknown message types are ignored. Malformed envelopes and unsupported protocol majors fail closed. Search request IDs make stale responses safe to ignore.

The injected runtime exposes `window.__codexSidebarTags` as a deliberately small diagnostics and compatibility surface:

- `handleMessage(message)`: validate and dispatch a protocol-v1 controller message
- `setSearchResult(result)`: direct result adapter for a bounded search result
- `tagDefinitions()`: return a defensive snapshot for first-install migration and diagnostics
- `contentThreadIds()`: enumerate sessions currently mapped by the DOM adapter
- `status()`: report runtime version, enhanced rows, search state, and render counters
- `debug()`: return the bounded local interaction trace
- `dispose()`: restore native DOM and remove injected UI and listeners

The renderer obtains its initial configuration through Loader RPC `bootstrap`. Tags intents use RPC `dispatch`; snapshots/results use the module-local `message` event. `ControllerRouter` validates the Tags protocol independently of Loader's transport. Only metadata, matching snippets and normalized settings are transferred. `window.__codexSidebarTags` lives in Loader's isolated JavaScript world. No remote script is fetched. Loader API and Tags protocol versions are independent.

The catalog uses changed snapshots. Protocol version and injected runtime version are independent: a protocol major changes only for an incompatible wire contract, while injected UI changes bump `RUNTIME_VERSION` so hot apply cannot retain old browser code.

`status()` also exposes `sidebarFilter` and `activeTag` so installation checks and real-app QA can verify the compact sidebar filter without inspecting private state.
