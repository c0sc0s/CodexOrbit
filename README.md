<p align="center"><img src="assets/logo.png" alt="Codex Tags logo" width="128"></p>
<h1 align="center">Codex Tags</h1>
<p align="center">Less scrolling. More finding.</p>
<p align="center"><b>English</b> · <a href="README.zh-CN.md">简体中文</a></p>

An independent, local-first enhancement for Codex: organize sessions with tags, search conversation text, and give the agent your classification rules.

> **Release candidate:** the npm CLI is prepared, but public `latest` is pending cold-start and hook-authorization acceptance. Use the source workflow below until publication. macOS only; Node.js 22+ required.

## Features

- **Native-aligned sidebar:** tag filtering, quiet title labels, and a Tags dashboard.
- **Local search:** titles and indexed user/assistant text, with highlighted matches.
- **Your vocabulary:** Feature, Bug, Design, Research defaults; custom colors and optional classification descriptions.
- **Agent-assisted naming:** `[Tag]Title`, without dates. First prompts receive current classification guidance.
- **Three plugin skills:** `doctor` checks health; `initial` classifies existing active sessions; `rename` names the current session.
- **English and Chinese UI:** follows Codex's language without translating user-defined tags.

## Get started

Once published, onboarding is two steps:

1. Finish active Codex tasks, then run:
   ```bash
   npx @c0sc0s/codex-tags@latest
   ```
2. Open **Codex → Plugins → Codex Tags** and review/trust **SessionStart**, **UserPromptSubmit**, and **SessionEnd**.

Open `~/Applications/Codex Tags.app` for Tags, and drag it to the Dock for quick access. It launches the official app with Tags enabled; it is not another Codex installation. The official entry stays unmodified. If Codex is already open without Tags, quit it first: there is no automatic restart or launch supervisor. Naming is an agent instruction, not a guaranteed title rewrite.

**Try the candidate from source:**

```bash
git clone https://github.com/c0sc0s/codex-tags.git
cd codex-tags
npm ci
npm run verify
node bin/codex-tags.mjs install
```

Then review the hooks as above. Quit Codex before installation if it is open without Tags; installation never restarts it.

## Commands

After publication: `npx @c0sc0s/codex-tags@latest <command>`. From source: `node bin/codex-tags.mjs <command>`.

| Command | Effect |
| --- | --- |
| `install`, `on`, `enable` | Install this package version and activate all components |
| `off`, `restore`, `disable` | Stop injection and remove the naming plugin; keep data |
| `status` / `doctor` | Inspect state / diagnose readiness without changes |
| `update` | Install the invoked version; use `@latest` to fetch the newest |
| `uninstall` | Remove owned components and index; keep tag settings |
| `uninstall --purge` | Also remove settings and owned caches |

Operational commands support `--json`. Hook trust remains a manual Codex security decision.

## Privacy and compatibility

The CLI installs local code and registers the plugin through Codex's plugin commands. It does **not** patch the signed app, edit transcripts, or change authentication data. A local SQLite index supplies bounded matching snippets to the UI.

Injection relies on a loopback debugging endpoint and private Codex DOM/database interfaces—not an official sidebar extension API. Future Codex updates can require adapter changes. Debugging access is powerful; use only on a trusted machine. See [verified coverage and limitations](docs/compatibility.md).

## Development

```bash
npm run dev:apply   # build → refresh installed files → hot-apply
npm run verify     # build, syntax, types, regression tests
npm run test:package
```

The fast loop requires an already activated, debug-enabled app. No HMR server is used.

- [Development and debugging](docs/development.md)
- [Installation and release](docs/distribution.md)
- [Architecture](docs/architecture.md) · [Data and naming protocol](docs/protocol.md)
- [Roadmap](docs/roadmap.md) · [Changelog](CHANGELOG.md)

Not affiliated with or endorsed by OpenAI. No open-source license is currently granted (`UNLICENSED`).
