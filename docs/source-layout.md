# Source structure and dependency rules

OrbitAI uses two independently versioned packages. Directory boundaries describe execution environments and ownership; they are not additional npm packages. `npm run check` validates imports using a TypeScript-capable AST parser and rejects runtime import cycles.

## Orbit

```text
packages/orbit/
├── src/
│   ├── index.ts                 # Public low-level package exports
│   ├── cli.ts                   # Stable executable entry
│   ├── sdk/contracts.ts         # Business plugin API, no Node dependencies
│   ├── cli/                    # Pure argument parsing and command orchestration
│   ├── installation/           # Platform files, locking, updates, recovery and migration
│   ├── plugins/                # Plugin manifests, registry installs and official extensions
│   ├── config/                 # Manifest validation and local entry resolution
│   ├── platform/               # Codex process checks and macOS launcher
│   ├── host/                   # Daemon ownership and plugin/window orchestration
│   ├── cdp/                    # CDP connections, targets and injection expressions
│   ├── renderer/               # Kernel and RPC transport executed inside Codex
│   ├── service/                # Service adapter, child process and worker entry
│   ├── protocol/               # Internal IPC and transport contracts
│   └── lifecycle/              # Shared cancellation and bounded cleanup
├── assets/                     # Platform logo and application icon
├── scripts/                    # Reproducible icon conversion
└── test/{cli,host,installation,platform,renderer,service,sdk}/
```

Business modules import types from `@c0sc0s/orbit/sdk`. Root exports serve launchers and infrastructure consumers. Package `exports` maps public paths to generated files; consumers must not depend on a directory under `dist/` or sibling source files.

The CLI parses arguments without starting processes, then orchestrates the application. The host creates service modules and synchronizes them with discovered renderer targets. A service adapter bridges CDP bindings to its Node child process. Each worker supplies a scoped SDK context to the business service. The renderer kernel supplies its own SDK context to the injected UI.

The SDK is dependency-free. Shared lifecycle and protocol code depend only on contracts. Renderer code cannot import host, platform, service or Node modules. Service implementation can use configuration and CDP adapters, but cannot import host orchestration. Configuration does not depend on the host. `host` and `cli` are composition layers. Runtime dependency cycles are rejected even when individual layer edges are allowed.

The renderer kernel is serialized into an injection expression; its runtime helpers must be explicitly supplied rather than captured through module imports. Serialized-kernel tests exercise the compiled output in an isolated JavaScript context.

## Orbit Tags

```text
packages/orbit-tags/
├── bin/                        # Public CLI and compatibility entrypoint
├── scripts/                    # Orbit compatibility client and build tooling
├── hooks/                      # Naming lifecycle entrypoints
├── runtime/
│   ├── src/
│   │   ├── controller.ts       # Read-only Tags diagnostics
│   │   ├── shared/             # Tag model, title format, wire protocol, version
│   │   ├── host/               # Orbit lifecycle/diagnostic compatibility adapters
│   │   ├── service/
│   │   │   ├── activate.ts     # Service composition and SDK registration
│   │   │   ├── router.ts       # Validated business message routing
│   │   │   ├── settings/       # Atomic settings persistence
│   │   │   ├── catalog/        # Local session and sidebar membership reads
│   │   │   ├── search/         # Text extraction and SQLite search index
│   │   │   └── update/         # Update status and detached installation worker
│   │   └── injected/           # Browser UI and sole private Codex DOM adapter
│   ├── test/{node,ui}/
│   └── dist/injected.js        # Tracked browser bundle
└── dist/                       # Generated Node output; not committed
```

`shared` has no service, host or browser dependencies. The UI and service share contracts, not implementations. Both use the type-only Orbit SDK entry; they cannot import low-level Orbit implementation APIs. Node services own storage and file access. Private Codex selectors remain in `runtime/src/injected/codex-dom-adapter.ts`.

Orbit snapshots the business package without flattening its compiled hierarchy. The plugin manifest loads `dist/runtime/src/service/activate.js`; the diagnostic controller does not write platform configuration. Tags uses module ID `orbit-tags`; its package snapshot records the assigned data directory. See [installation ownership](orbit-platform-design.md).

## Verification and change discipline

- `npm run build`: clean only each package's generated Node directory, build Orbit first, then Tags and its browser bundle.
- `npm run check`: syntax, package boundaries, source-layer dependencies, runtime cycles and documentation links.
- `npm run typecheck`: strict implementation checks and public SDK contract tests.
- Browser typechecks explicitly exclude Node ambient types, preventing accidental use of Node globals in renderer code.
- `npm test`: architecture-checker regressions, compiled Node tests and browser UI tests.
- `npm run test:package`: install real tarballs outside the workspace and test exported APIs, worker execution, SQLite and naming hooks.
- `npm run dev:apply` and `npm run qa:app`: install, hot-apply and validate in an already debug-enabled Codex.

Do not create generic `utils` or `common` buckets for new business logic. Place code with its owner; add a shared contract only when both execution environments genuinely require it. A new sibling feature gets a business package and its own service/UI, not a branch inside Orbit.
