# Orbit Tags

Orbit 的可选插件，提供会话标签、本地搜索和命名指导。

先安装 Orbit。在已构建的 OrbitAI 源码目录执行：

```sh
orbit plugin add ./packages/orbit-tags
orbit start
orbit plugin list
orbit doctor
```

之后使用 `~/Applications/Orbit.app` 启动。在 Codex Plugins 中审核 SessionStart、UserPromptSubmit 和 SessionEnd；命令不会自动授予 hook 信任。

```sh
orbit plugin disable orbit-tags
orbit plugin enable orbit-tags
orbit plugin uninstall orbit-tags
```

Tags 负责渲染层、服务与业务数据。Orbit 负责运行时安装、启动器、注册和共享配置。清单声明兼容 Orbit >=0.5.0 <0.6.0，模块 ID 为 `orbit-tags`，官方命名扩展标识为 `codex-tags@codex-tags-cli`。

禁用保留文件和数据；卸载默认保留数据，不影响 Orbit 和其他插件。命名 hooks 读取分配的数据目录。设置和搜索内容留在本机，不修改官方应用、认证或会话文件。

0.9.0 为尚未发布 npm 的候选版本。发布后可通过 `orbit plugin install @c0sc0s/orbit-tags` 安装，通过 `orbit plugin update orbit-tags` 更新。

详见[安装指南](../../docs/distribution.md)、[服务结构](../../docs/source-layout.md)和[验证范围](../../docs/compatibility.md)。
