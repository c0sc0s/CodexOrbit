# OrbitAI

为官方 Codex 桌面应用提供本地扩展能力。

[English](README.md) · [安装指南](docs/distribution.md) · [架构](docs/architecture.md) · [开发指南](docs/development.md)

先安装 **Orbit**，再按需安装能力。Orbit 负责启动器、运行时、插件注册和生命周期。**Orbit Tags** 提供会话标签、本地搜索与命名指导。

| 包 | 职责 |
| --- | --- |
| [Orbit](packages/orbit/README.md) · `@c0sc0s/orbit` | 安装、启动器、插件、CDP、服务进程和 RPC |
| [Orbit Tags](packages/orbit-tags/README.zh-CN.md) · `@c0sc0s/orbit-tags` | 标签、搜索、侧边栏 UI 和命名 hooks |
| `website` | 产品网站 |

## 从源码目录安装

需要 macOS、Node.js 22.13+ 和官方 Codex 桌面应用。Orbit 0.5.0 与 Tags 0.9.0 为尚未发布 npm 的候选版本，请使用本地包。

```sh
npm ci
npm run verify
npm pack -w @c0sc0s/orbit
npm install -g ./c0sc0s-orbit-0.5.0.tgz
orbit install
orbit plugin add ./packages/orbit-tags
orbit start
orbit doctor
```

Tags 为可选能力：跳过 `plugin add` 即可得到无插件的 Orbit。如果 Codex 已启动但未开启调试，请手动退出后再启动 Orbit。之后使用 `~/Applications/Orbit.app` 启动。在 Codex Plugins 中审核命名 hooks；安装不会自动授予信任。

## 开发

严格 TypeScript 编译为 ESM 和类型声明。UI 使用 Preact、Motion、esbuild，搜索使用本地 SQLite FTS5。业务插件使用 Orbit 公共 SDK；Orbit 不依赖 Tags 或 SQLite。

```sh
npm run verify
npm run test:package
npm run dev:apply
npm run qa:app
```

开发应用流程会安装工作区包并连接已开启调试的应用。详见[源码结构](docs/source-layout.md)与[贡献指南](CONTRIBUTING.md)。

## 隐私与限制

不会修改应用签名、会话或认证数据。渲染资源和搜索内容留在本机。插件属于可信代码：服务拥有 Node 权限，渲染插件共享 Codex DOM 和主线程。

[兼容性说明](docs/compatibility.md)记录验证范围与手动发布验收项。项目未授予开源许可。
