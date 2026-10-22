# Orbit ByteDance feed support

Private support library for [Meego](../orbit-byted-meego/README.md) and [Libra](../orbit-byted-libra/README.md). It is not an Orbit plugin.

The `service` export owns bounded `bytedcli` subprocesses, validated JSON envelopes, atomic local caches and single-flight background refresh. The `model` export contains browser-safe list contracts; `ui` registers an independently disposable Home section. Each plugin supplies its own source, URL allowlist, login command and cache identity.

Queries use the installed CLI with automatic upgrades disabled. GUI launches resolve `bytedcli` beside the running Node executable, on PATH, or in standard local bin directories. Plugin config may set an absolute `cliPath`. No shell, browser cookies, Codex credentials or conversation data are read. Credentials remain managed by the CLI.

Only item IDs, titles, status labels, display metadata and platform URLs are cached in each plugin's assigned data directory. Refreshes run at startup, on request and every five minutes after the preceding attempt. RPC returns immediately while the service publishes progress and completion. Failures preserve the last successful list; successful empty responses replace it. Pagination and item caps are visibly marked as incomplete.

Sources and views can opt into local dismissal with `dismissible`. The service validates current-list IDs, serializes cache writes and persists dismissed IDs with the source's cache; refreshes filter them out. A dismissal is published only after it is saved, and never calls the remote platform. Changing the cache identity clears the local dismissals.

Run `npm run build` at the repository root, then `npm test -w @c0sc0s/orbit-byted`. The Node and renderer TypeScript projects remain separate.
