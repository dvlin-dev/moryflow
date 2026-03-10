# Anyhunt Server

> `@anyhunt/anyhunt-server`，Anyhunt Dev 统一后端入口。

## 定位

- 对外承接 Fetchx、Memox、Agent Browser、Digest、Console/Admin 的统一 API。
- 基于 NestJS + Prisma + Redis + BullMQ，负责同步请求、异步任务、鉴权、扣费与运行时编排。
- 当前目录只保留服务级事实；模块内细节以下游 `src/*/CLAUDE.md` 与 design 文档为准。

## 职责

- Web 数据能力：`scrape`、`crawl`、`map`、`extract`、`search`、`oembed`。
- Memox 能力：`memory`、`sources`、`retrieval`、`graph`、`scope-registry`。
- 平台能力：`auth`、`api-key`、`quota`、`billing`、`payment`、`webhook`、`log`。
- Agent Browser / Agent Runtime：浏览器池、工具接入、任务状态、实时进度。
- Digest：topics、subscriptions、inbox 与公开/管理配置。

## 当前事实

- 服务采用**主库 + 向量库**双库分离：`prisma/main` 承载业务数据，`prisma/vector` 承载 Memox 数据。
- Memox Phase 2 的 operator/load-check 环境变量前缀已统一为 `ANYHUNT_*`；Step 7 gate 脚本与 `.env.example` 不再使用 `MEMOX_*` gate 口径。
- Memox 线上自动化验收的固定脚本入口是 `scripts/memox-phase2-openapi-load-check.ts` 与 `scripts/memox-production-smoke-check.ts`；前者负责 OpenAPI/负载门，后者只负责 Anyhunt 侧 source 生命周期 smoke，并要求失败路径也执行 best-effort cleanup。
- 认证分两条链路：
  - 公网能力统一走 `/api/v1/*`，API Key 使用 `Authorization: Bearer <apiKey>`。
  - Console/Admin 会话能力统一走 `/api/v1/app/*`，使用 access JWT；refresh token 仅用于 `/api/v1/auth/refresh`。
- Browser / Agent 能力已经成为服务级核心能力，不能再视作附属 playground。
- 扣费、退款、任务状态、取消与 metrics 必须以服务内事实源为准，禁止在控制器或前端复制业务规则。

## 关键约束

- 所有控制器必须使用 `version: '1'`。
- `@Public()` 只用于真正公开端点；ApiKey 端点必须显式挂 `ApiKeyGuard`，且所属模块必须导入 `ApiKeyModule`。
- 触发实际工作的接口必须先扣费；退款必须基于 `deduct.breakdown`，异步任务需落 `quotaBreakdown`。
- FREE 用户额度固定为“每日 100 Credits（UTC 天）”，`monthlyQuota=0`。
- Payment Webhook 必须事件级去重，并校验产品 ID、金额与币种一致性。
- 反向代理部署必须启用 `trust proxy`，否则协议、回调 URL 与 secure cookie 判断会失真。
- Agent 访问浏览器必须通过 `BrowserAgentPort`，禁止把 `BrowserSession` / Playwright 类型直接暴露给 agent 层。
- Agent 任务必须支持 `AbortSignal`、分段配额检查、Redis 实时状态，以及基于 compare-and-set 的终态更新。
- 生产环境禁止 `prisma db push`；迁移基线只保留 init，部署统一使用 `migrate deploy`。
- Docker 构建继续固定 pnpm `9.12.2` + `node-linker=hoisted`，并保留 Prisma / Better Auth 的 fail-fast 断言链路。

## 关键目录与入口

- `src/app.module.ts`：服务总装配入口。
- `src/common/`：guards、pipes、filters、HTTP 客户端与通用基础设施。
- `src/auth/`、`src/api-key/`、`src/quota/`、`src/billing/`、`src/payment/`：身份、配额、计费主链路。
- `src/browser/`、`src/agent/`：浏览器池、Agent Runtime 与工具接入。
- `src/memory/`、`src/sources/`、`src/retrieval/`、`src/graph/`：Memox 主链路。
- `prisma/main/`、`prisma/vector/`：双库 schema 与迁移基线。

## 继续阅读

- 协作规则：`../../../docs/reference/collaboration-and-delivery.md`
- 测试与验证：`../../../docs/reference/testing-and-validation.md`
- `src/common/CLAUDE.md`：共享守卫、HTTP、校验与错误边界。
- `src/browser/CLAUDE.md`：浏览器池、CDP、安全策略与观测口径。
- `src/agent/CLAUDE.md`：Agent Runtime、任务状态、工具与取消协议。
- `src/sources/CLAUDE.md`：Knowledge source / revision / chunk 状态机。
- `docs/design/anyhunt/core/system-boundaries-and-identity.md`：Anyhunt 业务边界与身份体系。
- `docs/design/anyhunt/core/quota-and-api-keys.md`：额度、API Key 与计费契约。
- `docs/design/anyhunt/features/agent-browser-architecture.md`：Agent Browser 主架构。
- `docs/design/anyhunt/features/agent-browser-governance.md`：Agent Browser 治理、风控与策略边界。
- `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`：Memox 当前实现与集成基线。
