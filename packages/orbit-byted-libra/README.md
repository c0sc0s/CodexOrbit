# Orbit ByteDance Libra

`orbit-byted-libra` adds **我的实验** to Orbit Home. It shows the signed-in user's unfinished experiments with status, application, traffic allocation and end date, with links to the original reports.

## Setup

Install `bytedcli` through the company tooling. Log in for the target Libra site:

```sh
bytedcli --site i18n-tt auth login
```

From this repository:

```sh
npm run build
node packages/orbit/dist/cli.js plugin add ./packages/orbit-byted-libra
node packages/orbit/dist/cli.js start --attach
```

Install Orbit Home separately if needed. Startup and manual refresh run in the plugin service; subsequent refreshes run every five minutes. Network or authentication failures retain the previous cached list and show a recovery message. The renderer uses only locally bundled assets.

Each experiment has a **删除** button to remove it from this local list. Deletions are saved with the plugin cache and survive refreshes and restarts; they do not modify or end experiments in Libra. Changing the configured site, application or CLI path resets the cached list and its deletions. A failed save keeps the experiment visible so you can retry.

## Configuration

The module's optional `config` accepts `site` (`i18n-tt`, the default, or `cn`), `appId` (a positive integer, or `-1` for all applications) and `cliPath` (an absolute executable path). See the [Orbit manifest contract](../../docs/plugin-loader.md#manifest-and-sdk). Credentials belong to the CLI rather than the plugin config. A site/application change invalidates the previous scope's cache.

The query uses `experiment list --owner-type my`, 50 records per page, and excludes ended experiments (status `0`). It continues until a short source page, even when every experiment on a page has ended, rather than trusting CLI versions that substitute the current page length for a missing server total. The cap is 20 pages and 500 displayed experiments; capped lists are labeled as partial. End dates are displayed in Asia/Shanghai. Unknown status values display as unknown rather than being guessed.

This private workspace package depends on [ByteDance feed support](../orbit-byted/README.md). It is independently installed and disabled, keeps its own cache and never imports Meego, Tags, Todo or Home internals.
