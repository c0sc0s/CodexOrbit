# Better Work Tree

A native-sized worktree icon in the active chat’s composer toolbar opens a hover panel showing the worktree status, complete Git branch and absolute working directory. It sits after the native controls; no worktree text is added to the chat header. Hover or keyboard focus opens the panel, and clicking pins it open. Click the directory to copy it. Escape, outside interaction, navigation and unload dismiss the panel without changing drafts. Metadata refreshes every three seconds and on opening.

```sh
npm run build
node packages/orbit/dist/cli.js plugin add ./packages/orbit-workspace
node packages/orbit/dist/cli.js start --attach
```

The registered plugin ID is `better-work-tree`, with the display name **Better Work Tree** in Codex Plugins. Orbit migrates the existing `orbit-workspace` registration in place, preserving its enabled state and assigned data directory. The npm workspace retains its internal package name. No hooks or agent instructions are installed.

## Directory selection

The service resolves the default from schema-checked `thread-workspace-state-v1:<threadId>.applied.cwd`, then the latest complete `turn_context.payload.cwd`, then read-only `threads.cwd`. Pending directories, project roots and permission roots never override this selection. Captured `git_branch` is not used.

The latest supported `exec_command` declaration supplies its explicit absolute `workdir`, taking precedence over the default. Direct function-call JSON and `exec` JavaScript orchestration are supported. A static AST parser extracts literal paths, simple immutable bindings, concatenations and template literals, plus single-parameter maps over arrays of up to four entries. It never executes code. Calls without workdir produce a default-directory record, so an older override cannot stick. Unresolved values are unknown rather than default. Multiple explicit directories do not become an arbitrary single selection: the same compact indicator shows “多个工作目录” and no branch.

This is recorded command-start metadata. Shell commands can subsequently change directories or use absolute paths, so the indicator does not claim to identify every file read or written. Git is probed at verification time in the selected directory with explicit `-C`, no optional locks, bounded output and three-second timeouts. Detached HEAD shows a commit identifier.

## Boundaries and verification

The service never writes Codex files or calls a mutating endpoint. Desktop state reads are capped at 8 MiB. Rollout discovery uses the catalog's path, verifies its canonical location under local `sessions`/`archived_sessions` and checks the filename's thread ID. It examines at most the last 8 MiB, growing backward from 128 KiB, and consumes complete turn-context and tool-call metadata. Tool parsing is capped at 128 KiB and 20,000 visited AST nodes per call. Conversation bodies, instructions, command text and tool results are never returned or logged. Caches retain at most eight extracted records and only workspace entries from desktop state.

Only one unambiguous local chat with visible composer controls is supported. Remote identities are not mapped to local UUIDs. New local chats keep the icon and show pending metadata until the conversation starts. Missing or ambiguous composer controls suppress the icon. Navigation cancels stale requests; hidden windows stop querying. Private selectors remain in Tags' build-time host adapter without a runtime Tags dependency. Disabling removes only the owned icon and panel without changing native titles, buttons or drafts.

Run `npm test -w @c0sc0s/orbit-workspace`, `node scripts/test-workspace-package.mjs` and `node packages/orbit-workspace/scripts/qa-runtime.mjs`. The live check compares the visible saved thread, composer placement, native icon size, hover panel, worktree status, directory and branch with an independent local service read, and checks panel placement inside the viewport. Optional `--screenshot <absolute-path>` captures the panel; `--toolbar-screenshot <absolute-path>` captures its composer controls. It never sends messages or changes Git state.

Bump `RUNTIME_VERSION` and manifest `runtimeVersion` together after renderer changes.
