# Orbit ByteDance Meego

`orbit-byted-meego` adds **我的 Bug** to Orbit Home and native **@ Meego** content search to the composer. It fetches the signed-in user's cross-space personal pending work and retains only `issue` work items in `OPEN` or `IN PROGRESS`. The personal-work endpoint supplies the current assignee semantics; this plugin does not confuse the creator or an unused custom Assignee field with the current operator.

## Setup

Install `bytedcli` through the company tooling and complete its independent Meego login in a terminal:

```sh
bytedcli meego login
```

From this repository:

```sh
npm run build
node packages/orbit/dist/cli.js plugin add ./packages/orbit-byted-meego
node packages/orbit/dist/cli.js start --attach
```

Orbit Home is the optional display host. Install it separately with `node packages/orbit/dist/cli.js plugin add ./packages/orbit-home`. Native mentions work even when Home is hidden. Refreshes run every five minutes and from the section's refresh control. Missing login or network access displays a recovery message while retaining the previous cache.

## Find and reference Bugs

Home groups work into **处理中** and **待处理**, with title/ID search and a project selector. The project scope is saved locally and shared across windows. Counts follow that project scope; search and status tabs are temporary view filters.

In the conversation composer, type **@**, choose **Meego**, and search by title, ID or project. Selecting a result attaches its full source-linked Bug content using the host's native resource mechanism. You review and send the draft yourself. The native provider advertises `openai/mentions`, a read-only app-visible search tool, and a resource reader; it never edits the conversation DOM or sends a message.

Home uses one hover surface per row. Click a title to preview, or reveal the row action on hover/keyboard focus. The preview can copy up to five references, with optional recent discussion. The heading keeps only the count and refresh action; repeated counts, update timestamps and external-link controls are omitted.

References include the source URL, project, current status, problem description, available severity/priority/version/operator metadata and retrieval time. Home copies can optionally include up to three recent text comments. Description and comments are rendered as text, including Markdown and attachment links; Meego's inline style spans are removed outside code examples. The plugin does not download attachments or execute work-item markup. Descriptions are capped at 16,000 characters and comments at 2,000 each, with explicit truncation markers. Comment retrieval is bounded to five pages and marks incomplete results.

The bundled local MCP server uses the official OpenAI extensions SDK. Native search shares the saved project scope, applies its search query locally, and caches list results in process memory for 30 seconds. Superseded search requests do not cancel the shared refresh, which has a 45-second limit. It reads only its own plugin registration in Orbit's `loader.json` to obtain CLI configuration and its data directory. A custom platform root uses `ORBIT_HOME`, matching the Orbit installer. It does not read Codex authentication or conversation storage. Detail resource requests accept only exact URIs from the current personal pending list.

Only list metadata and project preferences are persisted. Home previews cache details in renderer memory for up to two minutes (20 entries); native mention selections fetch details on demand. Selecting a Bug reads its work item, and enabling recent discussion in Home also reads its comments. No conversation content is sent to Meego or the CLI.

## Configuration

The module's optional `config` accepts `cliPath` (an absolute executable path) and `projectKeys` (an array of exact space keys, default all spaces). An empty array selects no spaces. Configure module values through the [Orbit manifest contract](../../docs/plugin-loader.md#manifest-and-sdk); do not put tokens in config. Changes to the query scope invalidate the previous scope's cache.

The endpoint is `https://meego.larkoffice.com`. Lists use `todo list --action todo --todo-scope all`, 50 records per page, deduplicate by space and work-item ID, and whitelist only `OPEN` / `IN PROGRESS`. Other statuses, including resolved or unknown states, are omitted. Pagination is bounded at 20 pages and 500 Bug rows. A bounded result is labeled as partial instead of reporting a complete count. Detail RPCs accept only IDs present in the personal pending list.

This private workspace package does not publish internal integration details to npm. It depends only on Orbit's public contracts and the [ByteDance feed support library](../orbit-byted/README.md). It does not query Tags, Todo, transcripts or another plugin's service.
