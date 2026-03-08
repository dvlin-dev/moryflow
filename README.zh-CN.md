# Moryflow

[English](./README.md) | [简体中文](./README.zh-CN.md)

Moryflow 是一个以本地优先为核心的 AI 工作流产品，覆盖写作、思考、同步和网站发布。本仓库以 Moryflow 为主产品，同时承载 Anyhunt Dev 这个协作能力平台。两条产品线共享 `packages/*` 基础设施，但不共享身份、计费或用户数据。

## 仓库包含什么

这个 monorepo 当前主要承载两条产品线：

- **Moryflow**：主产品，聚焦笔记、AI 工作流、云同步和静态网站发布
- **Anyhunt Dev**：协作能力平台，承载 Fetchx、Memox、agent/browser 等能力模块

整体结构可以概括为：

```text
apps/
├── moryflow/
│   ├── pc/              # Electron 桌面端
│   ├── server/          # Moryflow 后端与 API
│   ├── mobile/          # Expo 移动端
│   ├── www/             # 官网
│   ├── publish-worker/  # 发布站点的 Cloudflare Worker
│   ├── site-template/   # 静态站点模板系统
│   ├── admin/
│   └── docs/
├── anyhunt/
│   ├── server/
│   ├── console/
│   ├── www/
│   ├── admin/
│   └── docs/
packages/
└── 两条产品线共享的基础设施层
```

## 架构相关的开源基础与可复用模块

整个仓库建立在一组成熟的开源技术之上：

- **前端**：React 19、Vite、Tailwind CSS v4、Tiptap
- **桌面端**：Electron
- **移动端**：Expo、React Native
- **后端**：NestJS、Prisma、PostgreSQL、Redis、BullMQ
- **AI Runtime**：Vercel AI SDK、OpenAI Agents Core、MCP
- **认证与校验**：Better Auth、Zod
- **部署**：Cloudflare Workers、R2、KV、Docker

仓库里也有一批偏“开源基础设施形态”的共享包，作为两条产品线的公共能力层：

| 包                         | 作用                                |
| -------------------------- | ----------------------------------- |
| `@moryflow/agents-runtime` | 共享的 Agent Runtime 核心           |
| `@moryflow/agents-tools`   | 本地与运行时工具层                  |
| `@moryflow/agents-mcp`     | MCP 接入层                          |
| `@moryflow/model-bank`     | 模型与 provider 注册表、参数 schema |
| `@moryflow/api`            | 共享 API 契约与客户端               |
| `@moryflow/sync`           | 云同步契约与共享逻辑                |
| `@moryflow/tiptap`         | 编辑器扩展与相关工具                |
| `@moryflow/ui`             | 共享 UI 组件                        |

## Moryflow

Moryflow 是当前仓库的主叙事。它把本地笔记、AI 原生工作流、云同步和轻量网站发布收敛到同一个产品面里。

### 产品核心

- **本地优先工作区**：用户直接在自己的 Vault 中工作，文件控制权在本地
- **AI 原生笔记流**：聊天、工具、skills、subagents、MCP、多模型接入都直接内置在产品中
- **跨端同步**：PC 与 Mobile 共享 server-authoritative 的云同步架构
- **发布到 Web**：本地 Markdown 可以直接发布到 `moryflow.app`

### 架构分层

Moryflow 当前主要分成几个清晰的运行层：

- **`apps/moryflow/pc`**：当前最完整、最核心的产品入口。负责本地工作区、编辑器、Agent Runtime、MCP 管理、Telegram 接入和站点发布界面。
- **`apps/moryflow/server`**：后端服务，承载认证、同步、发布、支付/积分基础、语音服务和产品 API。
- **`apps/moryflow/mobile`**：移动端，已经具备编辑器、聊天和云同步基础，并尽量复用共享契约。
- **`apps/moryflow/www`**：官网，部署在 `www.moryflow.com`。
- **`apps/moryflow/publish-worker`**：负责公开发布站点边缘访问的 Cloudflare Worker。
- **`apps/moryflow/site-template`**：站点发布链路使用的模板与渲染系统。

对应的线上域名职责是：

- `www.moryflow.com`：官网入口
- `server.moryflow.com`：应用/API 后端
- `moryflow.app`：用户发布站点域名

### 当前已经实现的能力

结合当前代码实现，Moryflow 已经具备这些核心能力：

- 本地 Vault 管理与 Markdown 为中心的笔记编辑
- 桌面端 Notion-like 编辑器能力，以及移动端编辑器基础
- 内置 AI Chat，支持 tools、skills、subagents、MCP 和多 provider / 多模型
- 覆盖桌面端与移动端的 server-authoritative 云同步链路
- 从 Markdown 到公开页面的静态站点发布流程
- 桌面端 Telegram 集成，包括 runtime、路由、pairing 和流式回复支持
- 官网、后端 API 以及支撑整个产品族的共享包基础设施

### 当前规划

当前的规划重点已经不再是补最基础的架构，而是继续往产品能力层推进：

- 文件版本历史与更完整的内容生命周期管理
- 跨端语音输入与语音转写工作流
- 更完整的订阅、积分与 entitlement 产品体验
- 更清晰的自动化与订阅引导体验
- 基于共享 Agent / 平台能力继续扩展外部集成
- 持续补强移动端产品面，使其逐步接近桌面端能力

## Anyhunt Dev

Anyhunt Dev 是同一仓库中的子平台，不是当前 README 的主角，但它对理解整个仓库仍然重要，因为 Moryflow 的一部分能力基础设施就是与它协同演进的。

Anyhunt 当前主要覆盖：

- 面向开发者的 API 与控制台体系
- Fetchx、Memox、agent/browser 等能力模块
- API Key、quota、billing 与公网能力交付等平台基础设施

最关键的边界是：

- **Moryflow** 和 **Anyhunt Dev** 是两条独立业务线
- 两者**不共享**账号、Token、数据库和计费
- 两者**共享** `packages/*` 中的部分基础设施代码

## 开发

### 根目录

```bash
pnpm install
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

### 常用入口

```bash
# Moryflow 桌面端
pnpm dev:moryflow:pc

# Anyhunt 后端
pnpm dev:anyhunt

# Anyhunt Web 应用
pnpm dev:anyhunt:www
pnpm dev:console
pnpm dev:admin
```

## 文档入口

- 仓库上下文：[`docs/reference/repository-context.md`](./docs/reference/repository-context.md)
- Moryflow Core：[`docs/design/moryflow/core/index.md`](./docs/design/moryflow/core/index.md)
- Moryflow Features：[`docs/design/moryflow/features/index.md`](./docs/design/moryflow/features/index.md)
- Anyhunt Core：[`docs/design/anyhunt/core/index.md`](./docs/design/anyhunt/core/index.md)
- Reference 索引：[`docs/reference/index.md`](./docs/reference/index.md)
