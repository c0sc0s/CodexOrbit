# Orbit Context

Hover Codex's existing context-usage ring beside the model picker to see a compact 352px context card. The overview shows usage, a thin capacity bar, categories ranked by size and one line of cache statistics. Click a category to inspect its sources in the same card, or switch the overview to a treemap of the used context. The chart contains at most six categories; remaining capacity stays in the thin meter. Model details and measurement notes open through “统计口径”. Mouse leave dismisses the card even after clicking its controls; keyboard focus keeps it available. Enter or Arrow Down opens keyboard interaction, and Escape closes it and returns focus.

## Install the release candidate

Version 0.1.0 is prepared for first publication. Until it is available on npm, install from a built checkout:

```sh
npm run build
node packages/orbit/dist/cli.js plugin add ./packages/orbit-context
node packages/orbit/dist/cli.js start --attach
```

After npm publication, install the same version with `orbit plugin install @c0sc0s/orbit-context@0.1.0`. See the [release checklist](https://github.com/c0sc0s/CodexOrbit/blob/main/docs/context-release.md) for acceptance and publishing commands.

The app must already run through Orbit with its owned CDP endpoint. The plugin supports the verified English, simplified Chinese and traditional Chinese context-ring labels. Unsupported anchors leave native hover behavior intact. A local session is selected from a UUID route or the selected sidebar row's plain UUID / `local:<UUID>` identity. This also supports desktop memory routing, where the page URL remains `/index.html`. Other host-prefixed identities retain native hover behavior rather than reading a local session with the same UUID.

## Measurement

- The headline uses the last request's `total_tokens`, including its output, matching Codex's context indicator. Cumulative session usage is never substituted. The model-reported window is used; there is no hardcoded model capacity.
- Cache hit rate is `cached_input_tokens / input_tokens` from that same request. Missing values remain unknown. Cache is a subset of input and is not an extra treemap tile.
- Composition is an estimate from local rollout text: ASCII characters / 4 and other Unicode code points / 1.5. It is not an exact model-tokenizer breakdown. The service groups base/application instructions, AGENTS.md blocks, tool definitions, skill catalogs/explicit skill blocks, tool results and conversation text. Loaded skills returned by generic tools remain tool results unless the record explicitly identifies a skill block.
- If the estimate is below the reported total, the difference is unallocated. If above, all areas are proportionally normalized and the measurement notes explain the adjustment. Images, opaque reasoning, unrecorded tools and protocol overhead cannot be separately measured. Category percentages and the treemap use occupied context as their denominator; the capacity meter uses the full context window. Sources remain available through the category list, including categories too small to label in the treemap.
- Composition is frozen at the latest measurement. Later records await another count. Duplicate `token_usage_record` / `token_count` representations are coalesced. Compaction replaces history, retains base instructions/tool definitions and invalidates the previous count. A missing replacement history is marked incomplete.

## Boundaries

The service reads local `sessions` and `archived_sessions` JSONL files under `CODEX_HOME` (default `~/.codex`) and never writes them. It returns bounded names, categories and counts, without message bodies. It does not access credentials, SQLite, external services or another plugin's RPC. Records over 4 MiB are skipped with an incomplete flag; files over 128 MiB are explicitly unsupported. Catalog discovery is limited to 100,000 entries and cached for 30 seconds; at most eight aggregate snapshots are cached. Open panels refresh every five seconds; closing cancels requests and timers.

Private host selectors stay in Tags' `codex-dom-adapter.ts`, exposed through the public `@c0sc0s/orbit-tags/host-adapter` build export. Context bundles only the adapter functions it uses; Tags is a development dependency and does not need to be enabled or installed at runtime. All UI assets are local and native attributes are restored on disposal.

Run `npm test -w @c0sc0s/orbit-context` after building. The tests cover counters, compaction, incomplete records, privacy, area proportions, native hover suppression, keyboard access, desktop session identities, navigation races and cleanup. After installing, run `node packages/orbit-context/scripts/qa-runtime.mjs` to check the actual visible native ring, local RPC result, interactive panel and cleanup in the running app. It does not navigate or modify the conversation. An optional `--screenshot <absolute-path>` saves only the plugin panel. Bump `RUNTIME_VERSION` and the manifest `runtimeVersion` together after renderer changes.

## License

[MIT](LICENSE).
