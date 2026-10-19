# Orbit Home

An independent Orbit plugin that turns native Home into a container for local plugin modules. Its own greeting and clock remain available when no providers are installed. Customize the greeting name, clock and individual modules with the **首页设置** icon button.

```sh
npm run build
node packages/orbit/dist/cli.js plugin add ./packages/orbit-home
node packages/orbit/dist/cli.js start --attach
```

Home owns native navigation, reversible content mounting, layout, module headings, failure isolation and visibility preferences. It uses standard accessible controls, visible main landmarks and content-column geometry, preserving native navigation for unsupported host layouts. Leaving Home restores the original content and composer. Retained hidden panes are excluded, and route events emitted by the native Home click preserve its navigation intent.

Plugins register views through `@c0sc0s/orbit/ui`. Tags contributes an overview of active sessions by tag and a live list of running sessions discovered in the native sidebar; clicking a running session opens it. Todo contributes unfinished nested tasks. Each module can be hidden without disabling its plugin. Home imports neither business package and never reads their databases. Providers own their data subscriptions, editor actions and cleanup.

The Home service stores only greeting and display preferences in `home.json` in its assigned data directory. Partial updates are serialized and atomically persisted, then broadcast with monotonically increasing revisions. No account identity is inferred; the greeting name is explicitly supplied by the user. Defaults show Hello World, local time and all default-visible contributions. Provider absence does not erase visibility choices.

See the [architecture and extension contract](../../docs/home.md) and [public UI guide](../../docs/plugin-ui.md). Tests cover navigation, visibility, load order, cleanup, failure isolation, stale snapshots, concurrent settings writes and standalone package installation. No remote assets are loaded.
