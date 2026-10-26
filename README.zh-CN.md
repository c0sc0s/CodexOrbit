<p align="center"><img src="packages/orbit-tags/assets/banner.png" alt="Codex Orbit — 你的 Codex，你的轨道。" width="100%"></p>

# OrbitAI

为官方 Codex 桌面应用提供本地扩展能力。

[English](README.md) · [安装指南](docs/distribution.md) · [架构](docs/architecture.md) · [开发指南](docs/development.md)

先安装 **Orbit**，再按需安装能力。Orbit 负责启动器、运行时、插件注册和生命周期。**Orbit Tags** 提供会话标签、本地搜索与命名指导。

| 包 | 职责 |
| --- | --- |
| [Orbit](packages/orbit/README.md) · `@c0sc0s/orbit` | 安装、启动器、插件、CDP、服务进程和 RPC |
| [Orbit Tags](packages/orbit-tags/README.zh-CN.md) · `@c0sc0s/orbit-tags` | 标签、搜索、侧边栏 UI 和命名 hooks |
| [Orbit Todo](packages/orbit-todo/README.md) · `@c0sc0s/orbit-todo` | 跨会话个人任务、嵌套子任务、本地 CLI 与 Agent Skill |
| [Orbit Home](packages/orbit-home/README.md) · `@c0sc0s/orbit-home` | 个人首页与可选插件模块 |
| [Orbit Context](packages/orbit-context/README.md) · `@c0sc0s/orbit-context` | 紧凑的上下文悬停卡片、本地构成估算与来源明细（发布候选） |
| `website` | 产品网站 |

## 从 npm 安装

需要 macOS、Node.js 22.13+ 和官方 Codex 桌面应用。下面的固定版本包含 Home 和 Todo，用于新用户安装验收。

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

所有插件均为可选能力：跳过 `plugin install` 即可得到无插件的 Orbit。如果 Codex 已启动但未开启调试，请手动退出后再启动 Orbit。之后使用 `~/Applications/Orbit.app` 启动。在 Codex Plugins 中审核命名 hooks；安装不会自动授予信任。源码构建及旧版 Tags 数据的保留方式见[安装指南](docs/distribution.md)。

点击侧边工具区的“Todo”打开任务树和详情；随插件提供的 `todo` Skill 通过 CLI 维护同一份本地数据。

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

[兼容性说明](docs/compatibility.md)记录验证范围与手动发布验收项。

[Orbit Home](packages/orbit-home/README.md) 提供问候、时间和可选插件模块，可通过「首页设置」图标设置显隐。Todo 提供未完成任务，Tags 提供各标签的会话统计。参见 [Home 架构](docs/home.md)。

## 许可证

除另有注明外，本项目采用 [MIT 许可证](LICENSE)。随包分发的字体保留其 [SIL Open Font License 声明](packages/orbit-home/fonts/README.md)。
