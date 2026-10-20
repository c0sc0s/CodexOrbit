<p align="center"><img src="packages/orbit-tags/assets/banner.png" alt="Codex Orbit — Your Codex. Your orbit." width="100%"></p>

# OrbitAI

A local extension platform for the official Codex desktop app.

[简体中文](README.zh-CN.md) · [Installation](docs/distribution.md) · [Architecture](docs/architecture.md) · [Development](docs/development.md)

Install **Orbit**, then choose optional capabilities. Orbit owns the launcher, runtime, plugin registration and lifecycle. **Orbit Tags** provides session tags, local search and naming guidance.

| Package | Responsibility |
| --- | --- |
| [Orbit](packages/orbit/README.md) · `@c0sc0s/orbit` | Installation, launcher, plugins, CDP, service processes and RPC |
| [Orbit Tags](packages/orbit-tags/README.md) · `@c0sc0s/orbit-tags` | Tags, search, sidebar UI and naming hooks |
| [Orbit Todo](packages/orbit-todo/README.md) · `@c0sc0s/orbit-todo` | Personal tasks, nested subtasks, local CLI and agent skill |
| [Orbit Home](packages/orbit-home/README.md) · `@c0sc0s/orbit-home` | Personal homepage with optional plugin modules |
| `website` | Product website |

## Install from npm

Requires macOS, Node.js 22.13+ and the official Codex desktop app. Use the pinned candidate versions below for new-user installation acceptance.

```sh
npm install -g @c0sc0s/orbit@0.5.4
orbit install
orbit plugin install @c0sc0s/orbit-tags@0.9.1
orbit plugin install @c0sc0s/orbit-todo@0.1.0
orbit plugin install @c0sc0s/orbit-home@0.1.0
orbit start
orbit plugin list
orbit doctor
```

All plugins are optional: omit `plugin install` for a zero-plugin installation. If Codex is running without debugging, quit it manually before starting Orbit. Use `~/Applications/Orbit.app` for subsequent launches. Review naming hooks in Codex Plugins; installation does not grant hook trust. See [installation](docs/distribution.md) for source builds and retained legacy Tags data.

The **Todo** entry in the sidebar tools opens a task tree and detail panel; the bundled `todo` skill uses the same local data through its packaged CLI.

## Development

Strict TypeScript compiles to ESM and declarations. The UI uses Preact, Motion and esbuild; search uses local SQLite FTS5. Business plugins use Orbit's public SDK. Orbit has no Tags or SQLite dependency.

```sh
npm run verify
npm run test:package
npm run dev:apply
npm run qa:app
```

The development apply loop installs workspace packages and attaches to an already debug-enabled app. See [source layout](docs/source-layout.md) and [contributing](CONTRIBUTING.md).

## Privacy and limits

Orbit does not modify the signed application, sessions or authentication. Renderer assets and search content stay local. Plugins are trusted code: services have Node privileges, and renderers share Codex's DOM and main thread.

[Compatibility](docs/compatibility.md) records verification coverage and manual release gates. No open-source license is granted.

[Orbit Home](packages/orbit-home/README.md) provides a greeting, local time and optional plugin modules. Customize module visibility; Todo contributes unfinished tasks and Tags contributes session counts. See the [Home architecture](docs/home.md).
