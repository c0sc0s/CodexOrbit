---
name: codex-tags-manager
description: Install, update, enable, diagnose, restore, or uninstall the Codex Tags desktop sidebar enhancement. Use when the user asks to set up Codex Tags, check its status, refresh it after an update, remove it, or recover the native Codex sidebar.
---

# Manage Codex Tags

Codex Tags is a reversible local enhancement. It does not modify the official Codex application bundle, `app.asar`, task data, or authentication data.

Resolve the plugin root as the directory two levels above this `SKILL.md`. Run its management script with the same Node.js executable that is running Codex tooling:

```bash
node <plugin-root>/scripts/manage.mjs <command>
```

## Commands

- `install`: copy the versioned runtime into Application Support and create `~/Applications/Codex Tags.app`. This does not restart Codex.
- `status`: report installation, controller, CDP, and injected runtime versions.
- `enable`: install the current plugin runtime, then enable it. If Codex is not already exposing the loopback CDP endpoint, this gracefully quits and relaunches Codex.
- `apply`: hot-apply the installed runtime only when a valid Codex CDP endpoint already exists.
- `restore`: stop the controller and remove the injected UI from the current Codex process.
- `uninstall`: restore first, then remove files owned by Codex Tags. Use only when the user explicitly asks to uninstall.

## Safety rules

1. Run `install` and `status` first for setup or update requests.
2. Before `enable`, if `status` reports `cdp: false`, tell the user that Codex must restart and ask for explicit permission. The current task may be interrupted by that restart.
3. Never reproduce the launcher logic with ad-hoc shell wrappers or edit the official application bundle.
4. Treat a foreign process on the configured CDP port as a hard error; do not stop that process or quit Codex.
5. After `apply` or a permitted `enable`, run `status` and report the active runtime version.
6. Only run `uninstall` after an explicit uninstall request.

