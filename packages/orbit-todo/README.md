# Orbit Todo

A local personal task center inside Codex. Nested subtasks appear in a two-pane tree/detail view. People and agents operate on the same SQLite database.

Build from the repository root, then register the independent plugin:

```sh
npm run build
node packages/orbit/dist/cli.js plugin add ./packages/orbit-todo
node packages/orbit/dist/cli.js start --attach
```

Codex must have the owned local debugging endpoint; see [development](../../docs/development.md). The **Todo** entry in the sidebar's tools group opens the panel. It uses `@c0sc0s/orbit/ui` for the native button template, icon sizing and tooltip lifecycle. The centered dialog follows Tags' host theme tokens, header, controls, focus behavior and reduced-motion support. Navigation replacement remounts the entry without duplicating peer tools. It supports title/project search, unfinished/all/completed filters, nested tasks, descriptions, due dates, parent reassignment, deletion with undo, and opening an explicitly associated conversation. Task details show a visible delete action; task and subtask rows also reveal delete on hover or keyboard focus. Descriptions display readable text and links, with a separate edit action. Imported Feishu source footers appear as a compact source link and remain intact when editing. Its shadow root uses no private Codex selectors and is removed on unload.

The official Codex extension bundles the `todo` skill. New conversations discover it after registration. Run the packaged CLI without a global installation:

```sh
node packages/orbit-todo/bin/orbit-todo.mjs --help
node packages/orbit-todo/bin/orbit-todo.mjs list --status open
node packages/orbit-todo/bin/orbit-todo.mjs create --title "Prepare release" --request-id release-unique-key
node packages/orbit-todo/bin/orbit-todo.mjs get <uuid>
node packages/orbit-todo/bin/orbit-todo.mjs update <uuid> --if-revision 1 --status doing
```

`create --stdin` accepts nested `children` and an optional `parentId` for atomic decomposition. `update --stdin` accepts a partial JSON patch. Commands return JSON and nonzero status on failure; `--help` returns text. Listing returns up to 200 summaries per page; `get` includes the description. Updates, delete and restore require the current revision. `delete` moves the subtree to trash; `archive` remains a compatible alias, and `list --archived` lists trash. Reusing the exact create request and `requestId` returns its original result; a different payload with the same key fails.

Data lives in Orbit's assigned `data/orbit-todo/tasks.sqlite`, resolved by the installed package's `orbit-installation.json`. Source CLI use falls back to `ORBIT_HOME` or the standard Orbit root. `info` reports the exact path. `--data-dir` and `ORBIT_TODO_DATA_DIR` select isolated stores. CLI access remains subject to the agent's sandbox permissions. A future MCP adapter can expose the same domain operations.

Transactions and revision checks protect concurrent changes. The service detects external CLI writes within one second and broadcasts small invalidations. Unsaved detail drafts survive task selection, filter changes, closing/reopening the panel, and incoming updates within the current window. Drafts are held in memory until saved; unloading the plugin or restarting Codex does not retain them. Changes to different fields merge into the draft; changes to the same field require an explicit choice before saving. Descriptions are plain text. No network service, transcript scan, automatic task execution, attachment upload or conversation-body logging is used.

Hierarchy is limited to 16 levels. Completing a parent requires all active descendants to be complete. Reopening a descendant or creating unfinished children reopens completed ancestors. Progress counts immediate active children. Delete retains the active subtree in trash; restoring it preserves independently deleted descendants. There is no permanent purge operation.

## Interaction rules

| View or action | Behavior |
| --- | --- |
| Unfinished | Only `todo` and `doing` tasks, in their hierarchy. |
| All | All active tasks, in their hierarchy. |
| Completed | Only `done` tasks, in a flat list with their parent path. Unfinished ancestors are never added as results. |
| Search | Intersects the selected status with title/project matches. Results show the parent path without adding nonmatching tasks. |
| Counts | Count matching tasks including subtasks; `unfinished + completed = all`. Trash is separate. |
| Editing | Save/cancel applies to that task. Other tasks and quick capture remain available. Related destructive/status actions wait for drafts in their branch to be saved. Status and parent choices use Orbit's themed, keyboard-accessible selector; their popup follows the app palette even when native system controls use another color scheme. |
| Parent completion | The UI confirms before completing unfinished descendants, then commits the group atomically. Undo restores each changed task's former status. Concurrent changes abort the operation rather than overwrite data. The CLI's ordinary `update --status done` retains its strict descendant check. |
| Deletion undo | Undo reveals and selects the recovered task, expanding its ancestors. The task panel has no trash view. The CLI retains archived listing and restore for agent access. |
| Quick capture | **新建任务** expands and focuses an inline form. Enter creates, and Escape collapses it while retaining the draft. Creation keeps input focus for repeated capture and reveals the new unfinished task. Uncertain responses retry the same idempotency key. Adding a child to a completed parent reopens and reveals the parent. |
| Layout | The list uses a compact search/action row and status tabs. Selecting a task expands a detail pane; returning to the list keeps detail drafts. At narrow widths, list and detail use separate views with a return action. |
| Due dates | Visible in the list; overdue unfinished tasks receive an overdue color. These dates do not schedule a notification. |

The renderer separates list projection (`task-view`), paginated snapshots and writes (`use-task-store`), draft reconciliation (`task-editor`), and detail editing (`task-detail`). Tests cover mixed status trees, search intersections, draft navigation/conflicts, completion and recovery, uncertain creation responses, and stale revisions. This is a local personal task center; reminders, recurring tasks, and automatic Feishu synchronization are not implemented.

When Orbit Home is enabled, Todo contributes an unfinished-task view through `@c0sc0s/orbit/ui`. The section uses the same task store and completion/undo operations as the panel; titles open the existing editor. Disabling Todo unregisters the section without changing its tasks.
