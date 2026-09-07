<p align="center"><img src="assets/logo.png" alt="Codex Tags 标识" width="128"></p>
<h1 align="center">Codex Tags</h1>
<p align="center">少翻列表，快速找到会话。</p>
<p align="center"><a href="README.md">English</a> · <b>简体中文</b></p>

为 Codex 提供本地会话管理增强：按标签整理会话、搜索正文，并让 Agent 按你的分类规则命名。

> **发布候选版：** npm CLI 已准备好，正式 `latest` 入口仍待冷启动与 Hook 授权验收；发布前请使用下方源码流程。目前仅支持 macOS，需要 Node.js 22+。

## 功能

- **融入侧边栏：** 标签筛选、低干扰的标题标签，以及 Tags 会话看板。
- **本地搜索：** 搜索标题和已索引的用户/助手正文，高亮关键词。
- **自定义分类：** 默认 Feature、Bug、Design、Research 四类；可自定义颜色和可选分类描述。
- **Agent 辅助命名：** 使用 `[Tag]标题`，不带日期；首次提交时获得最新分类规则。
- **三个插件 Skill：** `doctor` 检查健康状态，`initial` 分类已有活跃会话，`rename` 命名当前会话。
- **中英文界面：** 跟随 Codex 当前语言，不翻译用户自己的标签。

## 开始使用

正式发布后，只需两步：

1. 先完成正在运行的 Codex 任务，再执行：
   ```bash
   npx @c0sc0s/codex-tags@latest
   ```
2. 打开 **Codex → Plugins → Codex Tags**，检查并信任/启用 **SessionStart、UserPromptSubmit、SessionEnd**。

之后使用 `~/Applications/Codex Tags.app`，可拖到 Dock 固定。它带参数启动官方 App，不是第二套 Codex。官方入口保持原样，不会自动接管；如果官方 App 已打开但未启用 Tags，请先手动退出。不会安装启动守护进程或自动重启。命名依靠 Agent 遵循指令，不保证每次确定性改名。

**现在从源码体验候选版：**

```bash
git clone https://github.com/c0sc0s/codex-tags.git
cd codex-tags
npm ci
npm run verify
node bin/codex-tags.mjs install
```

随后按上面的步骤授权 Hook。如果 Codex 已打开但未启用 Tags，请先手动退出；安装不会自动重启。

## 命令

发布后：`npx @c0sc0s/codex-tags@latest <命令>`；源码安装：`node bin/codex-tags.mjs <命令>`。

| 命令 | 作用 |
| --- | --- |
| `install`、`on`、`enable` | 安装当前调用的包版本并开启全部组件 |
| `off`、`restore`、`disable` | 停止注入并移除命名插件，保留数据 |
| `status` / `doctor` | 只读查看状态 / 诊断是否就绪 |
| `update` | 安装当前调用的版本；使用 `@latest` 才会获取最新版 |
| `uninstall` | 移除自有组件和索引，保留标签设置 |
| `uninstall --purge` | 进一步移除标签设置和自有缓存 |

操作命令支持 `--json`。Hook 授权必须由用户在 Codex 中手动确认。

## 隐私与兼容性

CLI 安装本地代码，通过 Codex 插件命令注册插件；**不会**修改官方签名应用、会话记录或登录信息。本地 SQLite 索引只向界面返回有限的命中片段。

注入依赖本机调试端口及 Codex 私有 DOM/数据库结构，不是官方侧边栏扩展 API；Codex 更新后可能需要适配。调试权限较高，请只在可信电脑上使用。详见[验证范围与限制](docs/compatibility.md)。

## 开发

```bash
npm run dev:apply   # 构建 → 更新安装文件 → 热应用
npm run verify     # 构建、语法、类型与回归测试
npm run test:package
```

快速调试需要 Codex 已激活且带调试端口运行；目前没有 HMR 服务。

- [本地开发与调试](docs/development.md)
- [安装与发布](docs/distribution.md)
- [架构](docs/architecture.md) · [数据与命名协议](docs/protocol.md)
- [后续规划](docs/roadmap.md) · [更新记录](CHANGELOG.md)

本项目独立开发，不隶属于 OpenAI，也未经其背书。目前没有开放源代码许可授权（`UNLICENSED`）。
