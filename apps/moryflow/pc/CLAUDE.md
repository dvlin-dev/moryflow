# PC App

> Moryflow 桌面端协作入口；仅在目录职责、关键约束、核心入口或引用文档失真时更新。

## 定位

- `apps/moryflow/pc` 是基于 Electron 的桌面端，负责本地工作区、Agent Runtime、文件系统访问、IPC 桥接与云同步客户端。
- 本文件只保留目录级事实；组件模式、通用前端规范与共享状态约束统一回到根 `CLAUDE.md` 与上层文档路由。

## 核心职责

- 主进程负责文件系统、网络、Vault、Agent Runtime、云同步、外链与敏感能力。
- 渲染进程负责工作区 UI、对话界面、设置页与站点/分享相关交互。
- `preload` 与 `src/shared/ipc/` 负责主渲染边界，保证 IPC 契约单一事实源。

## 关键约束

- 主进程与渲染进程严格分离；文件访问、外链打开、网络敏感操作都必须走主进程。
- `preload` 构建必须保持 CJS，避免 Electron sandbox 下 ESM preload 崩溃。
- 全局样式统一走 `/ui/styles`，Electron 专属样式只放 `src/renderer/global.css`；`electron.vite.config.ts` 需维持对应 alias。
- Providers 设置页的连接测试必须基于用户已启用模型的第一个，禁止写死默认模型兜底。
- 用户填写 API Key 或启用模型时，UI 应同步开启对应 provider，避免“已配置但未启用”的伪失效状态。
- Providers 左侧仅保留“会员模型 + Providers”两类，排序只在切换 active provider 时刷新，避免编辑过程跳动。
- 外链打开与窗口导航必须经过主进程 allowlist 校验（`MORYFLOW_EXTERNAL_HOST_ALLOWLIST`）。
- Renderer 核心 hooks 需维持 Vitest + RTL 覆盖；Electron E2E 需覆盖创建 Vault/笔记与主入口链路。

## 高频目录

- `src/main/`：主进程入口、Vault、云同步、Agent Runtime、站点发布、Telegram 通道。
- `src/renderer/`：工作区 UI、聊天界面、设置页与前端状态。
- `src/preload/`：安全桥接层。
- `src/shared/ipc/`：IPC 协议定义与共享类型。
- `tests/`：Electron Playwright E2E 基线。

## 继续阅读

- 工程规范：`../../../docs/reference/engineering-standards.md`
- 测试与验证：`../../../docs/reference/testing-and-validation.md`
- 发布与自动更新：`../../../docs/design/moryflow/runbooks/pc-release-and-auto-update.md`
- 工作区与导航壳层：[docs/design/moryflow/core/pc-navigation-and-workspace-shell.md](../../../docs/design/moryflow/core/pc-navigation-and-workspace-shell.md)
- 权限体系：[docs/design/moryflow/core/pc-permission-architecture.md](../../../docs/design/moryflow/core/pc-permission-architecture.md)
- 对话与流式运行时：[docs/design/moryflow/core/ui-conversation-and-streaming.md](../../../docs/design/moryflow/core/ui-conversation-and-streaming.md)
- Provider 集成要求：[docs/design/moryflow/core/provider-integration-requirements.md](../../../docs/design/moryflow/core/provider-integration-requirements.md)
- 云同步架构：[docs/design/moryflow/core/cloud-sync-architecture.md](../../../docs/design/moryflow/core/cloud-sync-architecture.md)
- Telegram 集成：[docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md](../../../docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md)
- 站点发布模块细节：`src/main/site-publish/CLAUDE.md`
- IPC 契约细节：`src/shared/ipc/CLAUDE.md`
- 主进程细节：`src/main/CLAUDE.md`
