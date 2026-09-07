# Compatibility policy

Codex Tags integrates with private Codex renderer DOM and therefore cannot promise compatibility with every future Codex build.

Each release must:

- record the tested Codex application version
- verify required stable `data-*` anchors before mutation
- disable only the enhancement when an adapter check fails
- preserve native title content and attributes for exact restoration
- keep the launcher, compact tag filtering, title rendering, search, IME, menus, scrolling, collapsed groups, and restore path in the real-app smoke matrix
- expose the detected adapter and last error through `status`

Compatibility failures must never trigger edits to the official application bundle. A failed injection leaves the original sidebar operational.
