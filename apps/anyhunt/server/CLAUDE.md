# Anyhunt Server

> `@anyhunt/anyhunt-server` - Anyhunt Dev unified API server

## Overview

Backend API + Web Data Engine built with NestJS. Core service for web scraping, crawling, and data extraction.

## 最近更新

- 2026-03-08：`src/redis/redis.service.ts` 新增 `compareAndDelete()` Lua compare-and-delete，`src/sources/knowledge-source-revision.service.ts` 的 per-source lease release 已从 `GET + DEL` 改为原子 compare-delete；source finalize/reindex 不再存在 lease TTL 过期后误删新 owner 锁的 TOCTOU 窗口。
- 2026-03-07：Memox freeze follow-up 收口：`src/sources/knowledge-source.repository.ts` 现对 object 型 `metadata` 更新执行 merge，identity refresh 不再覆盖 `content_hash / storage_revision`；已删除 source identity 会返回结构化 `409 SOURCE_IDENTITY_DELETED`，不再被 resolve / upsert revive。`src/sources/knowledge-source-revision.service.ts` / `knowledge-source-revision.repository.ts` 也已固定采用 revision 状态 CAS + Redis per-source lease（`memox:source-processing-lock:${apiKeyId}:${sourceId}`）收口 finalize/reindex 并发；已有 `currentRevisionId` 的 source 在新 revision 失败时继续保留 last-good 可检索状态。
- 2026-03-07：Memox Round 2 P1 收口：`src/memory/` 的 export create 响应已冻结为 `{ memory_export_id }`，`src/retrieval/` 与 `src/memory/` 控制器现显式挂载 Zod-derived OpenAPI response schema；`scripts/memox-phase2-openapi-load-check.*` 也已升级为同时校验 documented response schema 与 runtime payload。`src/api-key/api-key-cleanup.service.ts` 的 tenant teardown 已下沉到 `src/memox-platform/memox-tenant-teardown.service.ts`，`ApiKeyModule <-> SourcesModule` 循环依赖已消失。
- 2026-03-07：Memox 二期 Step 7 gate 再次收口：`POST /sources`、`POST /sources/:sourceId/revisions`、`POST /source-revisions/:revisionId/finalize`、`POST /source-revisions/:revisionId/reindex`、`POST /exports` 已显式固定 `200 OK`；`scripts/memox-phase2-openapi-load-check.ts` 现通过 `pnpm --filter @anyhunt/anyhunt-server run memox:phase2:openapi-load-check` 执行，并把 revision create/finalize/export create 也纳入 exact status 断言；`.env.example` 同步补入 Step 7 本地 gate 所需变量。
- Memox 二期 Step 7 本地验收（2026-03-07）：`scripts/memox-phase2-openapi-load-check.ts` 现已升级为 contract/load 硬闸门：同时校验 required/forbidden paths、required operations、documented success status，并对 `PUT /source-identities/*`、`POST /sources/search`、`POST /retrieval/search`、`POST /exports/get` 执行运行时精确状态码断言；本地复跑固定让 `EMBEDDING_OPENAI_BASE_URL=http://127.0.0.1:3998/v1` 指向 mock OpenAI，避免 finalize 阶段因外部 embedding 超时失真。本地 `3100` 环境复跑结果为 `source` 6 case / `export` 3 case 全成功，p95 `identity=72.09ms / revision=537.55ms / finalize=357.04ms / sourcesSearch=72.16ms / retrievalSearch=33.62ms / exportCreate=8.41ms / exportReady=321.25ms`。
- Memox 二期 rollback / identity 硬化（2026-03-07）：`src/sources/knowledge-source.repository.ts` 现要求已有 `source-identities` 在每次 resolve / upsert 时重复证明所有已持久化的非空 scope；缺失或不一致都返回 `409 SOURCE_IDENTITY_SCOPE_MISMATCH`，不再允许“省略 scope 继续更新/复活”。
- Memox 二期 graph 关闭策略已真正落地（2026-03-07）：`src/memox-platform/memox-platform.service.ts` 新增 `MEMOX_SOURCE_GRAPH_PROJECTION_ENABLED`，默认 `false`；`src/sources/knowledge-source-revision.service.ts` 与 `src/sources/knowledge-source-deletion.service.ts` 只有在显式打开开关时才会 enqueue graph queue。Moryflow Phase 2 默认 source 写链路不再投 graph。
- Memox 二期 Step 3 配套收口（2026-03-07）：`src/sources/knowledge-source.repository.ts` 在“缺 title 且需要新建 source identity”场景改为返回结构化 `400 SOURCE_IDENTITY_TITLE_REQUIRED`；这是 Moryflow outbox bridge delete no-op 的正式合同，避免 consumer 继续依赖 message 文本判断。
- Memox 二期 Step 1 开工并完成（2026-03-07）：`src/sources/` 新增 `PUT /api/v1/source-identities/:sourceType/:externalId`（稳定 `source_id` resolve/upsert），`src/retrieval/` 的 source 结果补齐 `project_id / external_id / display_path`；主文档 `11.2.5 Task 1` 已同步回写为 `completed`，后续按 Step 2 继续推进 Moryflow `memox` gateway。
- Billing Rules CI 基线补齐（2026-03-07）：`src/billing/__tests__/billing.rules.spec.ts` 现显式覆盖 `memox.source.search` 与 `memox.retrieval.search`，并将 `BILLING_KEYS` 总数断言同步更新为 `17`，避免 CI 继续停留在旧的 `15` 项基线。
- Memox PR review 第三轮收口（2026-03-06）：`IdempotencyService.begin()` 现允许 TTL 已过期的 key 直接复用，即使请求 hash 已变化；`KnowledgeSourceRevisionService.reindex()` 不再双重消耗 finalize + reindex 窗口；source ingest 成功后若 graph queue 短暂不可用，只记录 warn、不再把已 indexed revision/source 回滚成 `FAILED`；`MemoryService.batchUpdate/batchDelete` 与单条写路径统一按 expired=not-found；Console `WebhookApiKeyCard` 在“无 active key”场景改为提示 create，而非误导为 rotate。
- Memox 一期 PR review 收口（2026-03-06）：修复 `KnowledgeSourceRevisionService.finalize()` 在 preflight 异常下泄漏 processing slot；`ApiKeyModule` 现显式注册 `ApiKeyCleanupService/Processor` 并导入 `QueueModule + SourcesModule`，避免 cleanup job 只入队不消费；`IdempotencyService.begin()` 现对并发首请求的唯一键竞争做原子回退；OpenAPI public include 列表已抽到 `src/openapi/openapi-modules.ts` 并补入 `SourcesModule`，避免 live API 漏出文档。
- Memox 一期 review 追加硬化（2026-03-06）：`sources/` 新增结构化 ingest 错误契约（`SOURCE_*_LIMIT_EXCEEDED`、`FINALIZE_RATE_LIMIT_EXCEEDED`、`REINDEX_RATE_LIMIT_EXCEEDED`、`CONCURRENT_PROCESSING_LIMIT_EXCEEDED`、`SOURCE_UPLOAD_WINDOW_EXPIRED`），`KnowledgeSourceRevision` 新增 `pendingUploadExpiresAt` 与小时级 zombie cleanup 队列/processor；主事实源文档已同步冻结 guardrail 错误语义、revision TTL 与导出/ScopeRegistry 口径。
- Memox 一期 review 二次硬化最终收口（2026-03-06）：已使用真实目标连接 `/Users/lin/code/moryflow/apps/anyhunt/server/.env` 对主库与向量库执行零兼容 reset + migrate；主库成功应用 `20260306173000_init`，向量库成功应用 `20260306173100_init`，`prisma migrate status` 两边均为 `Database schema is up to date`。后续又追加向量库增量 migration `20260306195000_source_revision_upload_timeout`（`pendingUploadExpiresAt`）；一期平台侧已恢复为 `completed`。
- Memox 一期 S4 统一检索落地（2026-03-06）：新增 `src/retrieval/` 模块，公开 `POST /api/v1/sources/search` 与 `POST /api/v1/retrieval/search`；实现 memory_fact/source hybrid retrieval、chunk expansion、source/file 聚合与统一 `result_kind/rank/score` 语义，并新增计费键 `memox.source.search`、`memox.retrieval.search`。
- Memox 一期 S2 公开 entity 下线（2026-03-06）：`EntityModule` 已从 `AppModule` 与 OpenAPI public module 列表移除，`src/entity/` 死代码目录已删除；作用域能力仅保留在内部 `scope-registry/` 事实源。
- Memox 一期 S3 删除与 cleanup 收口（2026-03-06）：新增 `KnowledgeSourceDeletionService`、`SourceCleanupProcessor` 与 `memox-source-cleanup` 队列；公开 `GET /api/v1/source-revisions/:revisionId` 与 `DELETE /api/v1/sources/:id`，删除时会清理 raw blob / normalized text 后再硬删除 source 及级联 revision/chunk。
- Memox 一期 S3 uploadSession 主链路落地（2026-03-06）：`src/sources/` 已支持 `upload_blob` revision，`POST /api/v1/sources/:id/revisions` 现返回受控 `uploadSession`；`finalize` 已支持从 raw blob 读取、归一化并写入 normalized text，再完成 chunk replace 与 revision indexed 收口。
- Memox 一期 S3 inline_text API 落地（2026-03-06）：新增 `src/sources/dto/`、`SourcesController`、`SourceRevisionsController` 与 snake_case mapper/HTTP helper；公开 `POST /api/v1/sources`、`GET /api/v1/sources/:id`、`POST /api/v1/sources/:id/revisions`、`GET /api/v1/sources/:id/revisions/:revisionId`、`POST /api/v1/source-revisions/:revisionId/finalize|reindex`，并统一接入 `Idempotency-Key`。
- Memox 一期 S2 sources 域落地（2026-03-06）：向量库新增 `KnowledgeSource / KnowledgeSourceRevision / SourceChunk / Graph*` schema 与 migration；新增 `src/sources/` 模块，完成 source identity、inline_text revision、normalized text R2 存储、结构化 chunking 与 finalize/reindex 编排。
- Memox 一期 S1 收口（2026-03-06）：新增全局 throttler 基座（Redis storage + `apiKey.id` tracker 收口）、统一 `IdempotencyRecord` + `IdempotencyExecutorService`、`POST /memories` 与 `POST /exports` 写接口幂等、OpenAPI 售卖级元信息（server/contact/external docs/auth description），以及 `MemoxPlatformService` 作为 source ingest guardrail 运行时配置事实源；主库新增 migration `20260306144500_add_idempotency_record`。
- Memox 一期服务端收口（2026-03-06）：API Key 回归 hash-only（`keyHash/keyPrefix/keyTail` + create 一次性 `plainKey` + list `keyPreview`）；Memory 默认过滤过期数据、写路径事务化；Export 移除 `schema` 契约并改 BullMQ 异步导出；Entity `total_memories` 改聚合查询去 N+1；Memory DTO 兼容 `categories/fields: string|string[]`。
- Better Auth 错误类型运行时依赖显式化（2026-03-05）：`@anyhunt/anyhunt-server` 显式声明 `better-call@^1.3.2`，与 `src/auth/better-auth.ts` 的 `APIError` 运行时导入保持一致，避免依赖 hoisted transitive dependency 导致潜在 `ERR_MODULE_NOT_FOUND`。
- Better Auth Prisma Adapter 运行时依赖收口（2026-03-05）：`@anyhunt/anyhunt-server` 显式声明 `better-auth@^1.5.3` 与 `@better-auth/prisma-adapter@^1.5.3`，修复 deploy 产物在运行期缺失 `@better-auth/prisma-adapter` 导致 `ERR_MODULE_NOT_FOUND`；Docker builder 在 `deploy --prod` 后新增 `scripts/assert-better-auth-prisma-adapter.mjs` fail-fast 校验（仅基于公共导出做 resolve + import，不依赖 Better Auth 内部目录结构）。
- Prisma runtime 一致性收口（2026-03-02）：`@prisma/client`/`prisma`/`@prisma/adapter-pg` 改为精确版本 `7.2.0`，避免 `pnpm deploy` 产物在运行时安装到更高版本；Docker builder 在 deploy 后新增 `scripts/assert-prisma-runtime-version.cjs` 断言（`generated clientVersion === @prisma/client === prisma`），不一致直接构建失败，防止线上启动期 `Cannot read properties of undefined (reading 'graph')`。
- Docker 依赖闭包构建收口（2026-03-02）：Dockerfile 构建阶段改为执行 `pnpm --filter @anyhunt/anyhunt-server... build`（按依赖图构建 server + 所有运行时依赖包），再 `pnpm --filter @anyhunt/anyhunt-server deploy --prod` 导出运行时目录；避免 `build:packages` 漏构建 `@moryflow/api` 导致容器运行期 `MODULE_NOT_FOUND`。
- Docker workspace 构建链路重构（2026-03-02）：Dockerfile 改为复制完整 workspace，移除手工拷贝 workspace 依赖白名单；`docker-entrypoint.sh` 改为调用本地 `./node_modules/.bin/prisma` 执行双库迁移，避免全局 prisma 依赖漂移。
- LLM thinking 第二轮收敛：`llm/thinking-profile.util.ts` 统一 profile 解析；未传 thinking 默认 `off`（不再隐式从 model capability 自动启用）；DTO/运行时与模型工厂保持同一 thinking 语义边界（2026-02-26）
- Build：Docker 依赖安装显式追加 `--filter @moryflow/types... --filter @moryflow/typescript-config...`，修复 filtered install 下 `packages/types` 缺少 `@moryflow/typescript-config` 导致 `TS6053`（extends 解析失败）
- Build：Docker 构建补齐 `packages/api`/`packages/types`/`packages/sync` 依赖清单与源码复制，构建顺序统一为 `types -> sync -> api -> app`，修复 `@moryflow/api` 解析失败（TS2307）
- Build：容器构建显式复制根 `tsconfig.base.json`，避免 workspace 包构建时报 `TS5083`
- Webhook：签名与发送体统一为同一 `JSON.stringify` 字符串（Digest Processor + Common WebhookService），避免签名材料与实际请求体潜在不一致
- Demo：Turnstile 校验改为 `serverHttpRaw` 解析，放宽对响应 `content-type` 的依赖并保留非 2xx 快速失败
- OpenAPI 文档改为 Scalar 双入口：`/api-reference`（public）与 `/api-reference/internal`（internal），并提供 `/openapi.json` 与 `/openapi-internal.json`
- 修复文档访问 403：`Missing origin` 检查对 OpenAPI/Scalar 路径放行（公网可直接访问，无额外防护）
- Log：修复错误判定与观测质量（仅 4xx/5xx 记录 error 字段、跳过 `/api/v1/admin/logs` 自采集、查询 SQL 统一改为 `$queryRaw + Prisma.sql`、时间参数强制 ISO8601+时区）
- Log：新增统一请求日志模块（`RequestLog` 单表 + 全局采集中间件 + Admin 查询接口 + 30 天清理任务）
- API Key：更新接口补齐 no-store，避免明文 key 被缓存
- LLM：ModelProviderFactory 单测在 isolate=false 下 resetModules 确保 mock 生效
- Agent：请求支持多轮消息（messages），计费估算基于 message 总量
- Agent：新增模型列表接口（`GET /api/v1/agent/models`）
- LLM：对齐 Moryflow AI SDK 模型工厂，新增 Anthropic/Google/OpenRouter 支持
- LLM：扩展 Model 字段（displayName/pricing/tier/limits/capabilitiesJson），支持 OpenRouter reasoning 配置
- LLM/Extract/Digest：清理未使用配置项（responseFormat/upstreamModelId）
- API Key：当前固定为 hash-only 存储（`keyHash/keyPrefix/keyTail`），create 只返回一次性 `plainKey`，列表只返回 `keyPreview`；Bearer 鉴权保持不变
- Digest：路由拆分为 app/public 前缀，移除旧 `/api/v1/console/*` 与 `/api/v1/digest/*`
- Demo：公开接口迁移至 `/api/v1/public/demo/*`
- Browser CDP 连接新增白名单/私网策略环境变量（`.env.example`）
- Browser Streaming/Provider 环境变量补齐（`.env.example`）
- Memox Memory 对齐 Mem0：新增 filters DSL（AND/OR/NOT + gte/lte/in/contains/icontains）、导出/历史/反馈与 Token 认证一致
- 统一响应为 raw JSON + RFC7807 错误体，移除全局 response 包装并补齐 requestId 输出
- Common：补齐 RFC7807 工具函数与 Origin 缺失场景的错误体一致性，避免 500 信息泄露

## Responsibilities

- Handle API requests for scraping, crawling, map, extract, search, batch-scrape
- Provide Memox APIs for semantic memory, sources domain, and scope registry
- Manage browser pool for rendering pages
- Process async jobs via BullMQ
- Quota and API key management
- User authentication and authorization
- Digest: topics/subscriptions/inbox + Welcome config (public/admin)

## Constraints

- All controllers must use `version: '1'` for API versioning
- App Session 认证接口统一走 `/api/v1/app/*`（例如 `/app/api-keys`，禁止无版本路径）
- API Key 认证统一使用 `Authorization: Bearer <apiKey>`
- Public 端点必须使用 `@Public()`（不可挂 Session guard）
- ApiKey API 必须使用 `@UseGuards(ApiKeyGuard)`
- Any module that uses `@UseGuards(ApiKeyGuard)` must import `ApiKeyModule` (otherwise Nest will fail to bootstrap with UnknownDependenciesException)
- Console/Admin 统一使用 accessToken（JWT）鉴权，refreshToken 仅在 `/api/v1/auth/refresh` 使用
- Auth Token 规则：access=6h（JWT），refresh=90d（轮换），JWKS=`/api/v1/auth/jwks`
- Memox 一期零兼容 reset 已将旧历史迁移树压平到主库 `20260306173000_init` 与向量库 `20260306173100_init`；后续 schema 演进继续以增量 migration 追加（当前已包含 `20260306195000_source_revision_upload_timeout`），禁止回滚到更早的历史迁移包袱
- URL validation required for SSRF protection
- `ALLOWED_ORIGINS`/`TRUSTED_ORIGINS` 必须覆盖 Console/Admin 域名（`console.anyhunt.app`/`admin.anyhunt.app`）
- 触发实际工作的接口必须先扣费（以 `BillingService` 为事实源）；`@BillingKey(...)` 仅可作声明用途，禁止与 service 扣费逻辑形成双事实源
- 失败退费必须基于 `deduct.breakdown`（按交易分解），异步任务需写入 `quotaBreakdown` 供 worker 退费
- FREE 用户额度为“每日 100 Credits（UTC 天）”，`monthlyQuota=0`
- Payment Webhook 必须事件级去重（`PaymentWebhookEvent`）且校验产品 ID/金额/币种一致性
- Creem 产品映射以 `payment.constants.ts` 为准，`.env.example` 的 JSON 变量仅作占位
- 反代部署必须启用 `trust proxy`（Express）：否则 `req.protocol`/secure cookie/回调 URL 在反代下会被错误识别为 http
- 管理员权限通过 `ADMIN_EMAILS` 邮箱白名单授予（注册后自动标记为 `isAdmin`，已有账号在会话获取阶段补写；不在启动期注入密码）
- Agent + `@openai/agents-core` 集成时，避免将 Playwright 等重类型透传到 `Tool<Context>` / `Agent<TContext>` 泛型推断（容易触发 `tsc` OOM）；优先在 agent 层做类型边界降级
- Agent 访问浏览器能力必须通过 `BrowserAgentPort`（禁止直接依赖 `BrowserSession` / Playwright 类型）
- Agent 任务必须支持硬取消（AbortSignal）与分段配额检查（每 100 credits）
- Agent 的 LLM 能力由 Admin 配置的 `LlmProvider/LlmModel/LlmSettings` 决定；请求可选传 `model`，不传则使用 Admin 默认模型
- Agent 任务状态持久化到 DB（`AgentTask`），实时进度与取消标记使用 Redis；`GET /api/v1/agent/:id` 合并 DB + Redis
- Agent 任务终态更新必须使用 compare-and-set（`updateTaskIfStatus`）以避免取消状态被覆盖；取消后需确保 metrics（creditsUsed/toolCallCount/elapsedMs）落库
- Prisma 迁移 diff 依赖 Shadow DB；本地需设置 `SHADOW_DATABASE_URL` / `VECTOR_SHADOW_DATABASE_URL`（仅本地，不提交）
- `prisma db push` 仅限本地/测试环境使用，生产只允许 `migrate deploy`
- `vitest` 默认只跑单元测试：`*.integration.spec.ts` / `*.e2e.spec.ts` 需显式设置 `RUN_INTEGRATION_TESTS=1` 才会被包含
- Docker 入口使用本地 `node_modules/.bin/prisma` 执行迁移，勿移除 `prisma` 依赖
- Docker 构建依赖 npm 包（不再依赖 workspace Agents SDK），仍需避免跨 stage `COPY node_modules` 导致依赖路径被解引用
- Docker `pnpm deploy --prod` 后必须执行 `scripts/assert-better-auth-prisma-adapter.mjs`，提前阻断 Better Auth Prisma adapter 缺包/公共导出不可加载问题（fail-fast，禁止依赖 `better-auth/dist/*` 内部路径）
- 如果 workspace 包的 `tsconfig` 通过 `extends` 引用根配置（例如 `../../tsconfig.agents.json`），Docker 构建必须一并 `COPY` 根 tsconfig，否则会触发 `TS5083` 并导致编译选项回退
- Docker 构建固定使用 pnpm@9.12.2（避免 corepack pnpm@9.14+ 在容器内出现 depNode.fetching 报错）
- Docker 构建安装依赖使用 `node-linker=hoisted` 且关闭 `shamefully-hoist`，避免 pnpm link 阶段崩溃
- TestContainers 启动主库 + 向量库容器，并执行 `prisma migrate deploy --config prisma.main.config.ts / prisma.vector.config.ts`（Prisma 7 已移除 `--skip-generate`）
- Colima + Testcontainers 本地基线固定为 `DOCKER_HOST=unix:///Users/lin/.colima/default/docker.sock`、`TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`、`TESTCONTAINERS_RYUK_DISABLED=true`；若把 socket override 指向宿主机真实路径，会触发 Ryuk mount 失败

## 数据库架构（双库分离）

采用**主库 + 向量库**分离架构，实现性能隔离和独立扩展：

| 数据库 | 连接变量              | Schema 路径      | 用途                                                                                                    |
| ------ | --------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| 主库   | `DATABASE_URL`        | `prisma/main/`   | 业务数据（User、ApiKey、Job 等）                                                                        |
| 向量库 | `VECTOR_DATABASE_URL` | `prisma/vector/` | Memox 数据（MemoryFact、KnowledgeSource/Revision/Chunk、ScopeRegistry、Graph、History/Feedback/Export） |

### 关键设计

- **软引用**：向量库中的 `apiKeyId` 无外键约束，通过应用层保证一致性
- **跨库查询**：仅在需要主库 ApiKey 补充信息时由应用层组装
- **删除清理**：删除 ApiKey 时异步清理向量库关联数据（fail-safe）

### Prisma 命令

```bash
# Migrate 使用的配置文件：
# - prisma.main.config.ts
# - prisma.vector.config.ts

# 生成两个库的 Client
pnpm --filter @anyhunt/anyhunt-server prisma:generate

# 生成迁移（空库初始化，create-only）
pnpm exec prisma migrate dev --config prisma.main.config.ts --name init --create-only
pnpm exec prisma migrate dev --config prisma.vector.config.ts --name init --create-only

# 部署迁移（生产/CI）
pnpm exec prisma migrate deploy --config prisma.main.config.ts
pnpm exec prisma migrate deploy --config prisma.vector.config.ts

# 分别推送 Schema
pnpm --filter @anyhunt/anyhunt-server prisma:push:main
pnpm --filter @anyhunt/anyhunt-server prisma:push:vector

# 打开 Studio（默认主库）
pnpm --filter @anyhunt/anyhunt-server prisma:studio
pnpm --filter @anyhunt/anyhunt-server prisma:studio:vector
```

## Module Structure

| Module            | Files | Description                                         | CLAUDE.md                 |
| ----------------- | ----- | --------------------------------------------------- | ------------------------- |
| `scraper/`        | 24    | Core scraping engine                                | `src/scraper/CLAUDE.md`   |
| `common/`         | 22    | Shared guards, decorators, pipes, validators        | `src/common/CLAUDE.md`    |
| `llm/`            | -     | Admin LLM Providers/Models + runtime routing        | `src/llm/CLAUDE.md`       |
| `agent/`          | -     | L3 Agent API + Browser Tools                        | `src/agent/CLAUDE.md`     |
| `digest/`         | -     | Intelligent Digest (subscriptions/inbox)            | `src/digest/CLAUDE.md`    |
| `admin/`          | 16    | Admin dashboard APIs                                | `src/admin/CLAUDE.md`     |
| `log/`            | 8     | Unified request logs + analytics + cleanup          | -                         |
| `oembed/`         | 18    | oEmbed provider support                             | `src/oembed/CLAUDE.md`    |
| `billing/`        | 5     | Billing rules + deduct/refund                       | -                         |
| `quota/`          | 14    | Quota management                                    | `src/quota/CLAUDE.md`     |
| `api-key/`        | 13    | API key management                                  | `src/api-key/CLAUDE.md`   |
| `memory/`         | 10    | MemoryFact API（公开 `/memories` 契约）             | `src/memory/CLAUDE.md`    |
| `sources/`        | 21    | Knowledge sources / revisions / chunks / public API | `src/sources/CLAUDE.md`   |
| `scope-registry/` | 5     | ScopeRegistry internal fact source                  | -                         |
| `retrieval/`      | 13    | Unified retrieval orchestration                     | `src/retrieval/CLAUDE.md` |
| `graph/`          | 8     | Graph projection / context / observation            | `src/graph/CLAUDE.md`     |
| `embedding/`      | 4     | Embeddings generation (Memox)                       | `src/embedding/CLAUDE.md` |
| `crawler/`        | 11    | Multi-page crawling                                 | `src/crawler/CLAUDE.md`   |
| `auth/`           | 10    | Authentication (Better Auth)                        | `src/auth/CLAUDE.md`      |
| `payment/`        | 10    | Payment processing (Creem)                          | -                         |
| `webhook/`        | 10    | Webhook notifications                               | `src/webhook/CLAUDE.md`   |
| `extract/`        | 9     | AI-powered data extraction                          | -                         |
| `batch-scrape/`   | 9     | Bulk URL processing                                 | -                         |
| `user/`           | 9     | User management                                     | -                         |
| `map/`            | 8     | URL discovery                                       | -                         |
| `storage/`        | 7     | Cloudflare R2 storage                               | -                         |
| `search/`         | 6     | Web search API                                      | -                         |
| `browser/`        | 6     | Browser pool management                             | `src/browser/CLAUDE.md`   |
| `demo/`           | 5     | Playground demo API                                 | -                         |
| `redis/`          | 4     | Redis caching                                       | -                         |
| `health/`         | 3     | Health check endpoints                              | -                         |
| `email/`          | 3     | Email service                                       | -                         |
| `queue/`          | 3     | BullMQ queue config                                 | -                         |
| `prisma/`         | 3     | 主库连接（PrismaService）                           | -                         |
| `vector-prisma/`  | 3     | 向量库连接（VectorPrismaService）                   | -                         |
| `config/`         | 2     | Pricing configuration                               | -                         |
| `memox-platform/` | 4     | Memox 平台 guardrail/runtime config                 | -                         |
| `types/`          | 6     | Shared type definitions                             | -                         |
| `openapi/`        | 7     | OpenAPI 配置、模块注册表与 Scalar 文档入口          | -                         |

## Common Patterns

### Module File Structure

```
module-name/
├── dto/
│   ├── index.ts
│   └── module-name.dto.ts
├── __tests__/
│   └── module-name.service.spec.ts
├── module-name.module.ts
├── module-name.controller.ts
├── module-name.service.ts
├── module-name.constants.ts
├── module-name.errors.ts
├── module-name.types.ts
└── index.ts
```

### Controller Pattern

```typescript
@Controller({ path: 'endpoint', version: '1' })
@UseGuards(ApiKeyGuard) // For ApiKey API
export class ModuleController {
  @Get()
  @ApiOperation({ summary: 'Description' })
  async method(@Body() dto: RequestDto): Promise<ResponseDto> {}
}
```

## Dependencies

```
apps/server
├── @nestjs/* - Framework
├── @prisma/client - Database ORM
├── bullmq - Job queue
├── ioredis - Redis client
├── playwright - Browser automation
├── sharp - Image processing
├── better-auth - Authentication
└── zod - Schema validation
```

## 本地开发环境

### 环境要求

- Node.js >= 20
- pnpm >= 9
- PostgreSQL 16（远程或本地）
- Redis 7（远程或本地）
- Playwright 浏览器

### 首次设置

```bash
# 1. 安装依赖（在 monorepo 根目录）
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入数据库、Redis 等配置

# 3. 生成 Prisma Client（可选：`build` / `lint` / `typecheck` / `test*` 会自动生成；不需要本地 DB）
pnpm --filter @anyhunt/anyhunt-server prisma:generate

# 4. 安装 Playwright 浏览器（必须，用于网页抓取）
pnpm exec playwright install chromium

# 5. 启动开发服务器
pnpm dev:anyhunt
```

### Playwright 浏览器说明

Fetchx 使用 Playwright 进行网页渲染和抓取，**必须安装浏览器才能正常工作**。

#### 安装时机

| 场景                 | 是否需要安装        |
| -------------------- | ------------------- |
| 首次克隆项目         | ✅ 必须             |
| 升级 Playwright 版本 | ✅ 必须             |
| CI/CD 环境           | ✅ 必须（每次构建） |
| 切换机器开发         | ✅ 必须             |
| 仅修改非抓取相关代码 | ❌ 可选             |

#### 安装命令

```bash
# 只安装 Chromium（推荐，体积最小）
pnpm exec playwright install chromium

# 安装所有浏览器（包括 Firefox、WebKit）
pnpm exec playwright install

# 安装浏览器及系统依赖（Linux 服务器）
pnpm exec playwright install --with-deps chromium
```

#### 常见问题

**问题：启动时报错 `Executable doesn't exist at ...`**

```
browserType.launch: Executable doesn't exist at /Users/.../chromium_headless_shell-1200/...
```

**解决：** 运行 `pnpm exec playwright install chromium`

**问题：Linux 服务器缺少系统依赖**
**解决：** 使用 `--with-deps` 参数安装

### 验证服务是否正常

```bash
# 1. 启动服务
pnpm dev:anyhunt

# 2. 检查健康状态
curl http://localhost:3000/health
# 期望响应: {"status":"ok","services":{"database":true,"redis":true}}

# 3. 检查部署版本（用于排查“线上仍是旧版本导致 404”）
curl http://localhost:3000/health/version

# 4. 检查 API 文档（Scalar）
open http://localhost:3000/api-reference
open http://localhost:3000/api-reference/internal
curl http://localhost:3000/openapi.json
curl http://localhost:3000/openapi-internal.json
```

### 环境变量说明

| 变量                                    | 必需 | 说明                                                                             |
| --------------------------------------- | ---- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`                          | ✅   | 主库 PostgreSQL 连接字符串                                                       |
| `VECTOR_DATABASE_URL`                   | ✅   | 向量库 PostgreSQL（pgvector）连接字符串                                          |
| `REDIS_URL`                             | ✅   | Redis 连接字符串                                                                 |
| `BETTER_AUTH_SECRET`                    | ✅   | Better Auth 密钥                                                                 |
| `BETTER_AUTH_URL`                       | ✅   | 服务公网 URL（生产建议 `https://server.anyhunt.app`）                            |
| `BETTER_AUTH_RATE_LIMIT_WINDOW_SECONDS` | ❌   | Better Auth 限流窗口（秒，默认 `60`）                                            |
| `BETTER_AUTH_RATE_LIMIT_MAX`            | ❌   | Better Auth 限流次数（默认 `120`）                                               |
| `ADMIN_EMAILS`                          | ✅   | 管理员邮箱白名单（逗号分隔，注册后自动授予管理员权限）                           |
| `ALLOWED_ORIGINS`                       | ✅   | CORS 允许来源（逗号分隔）                                                        |
| `TRUSTED_ORIGINS`                       | ✅   | Better Auth 信任来源（逗号分隔）                                                 |
| `TRUST_PROXY`                           | ❌   | Express trust proxy 设置（默认 `1`；支持 `true/false/数字`）                     |
| `REQUEST_LOG_RETENTION_DAYS`            | ❌   | 请求日志保留天数（默认 `30`）                                                    |
| `SERVER_URL`                            | ✅   | 服务公网 URL（用于预签名 URL 与回调地址，生产建议 `https://server.anyhunt.app`） |
| `ANYHUNT_LLM_SECRET_KEY`                | ❌   | 用于加密存储在 DB 的 provider apiKey（Admin LLM 配置必需；base64(32 bytes)）     |
| `EMBEDDING_OPENAI_API_KEY`              | ✅   | Embedding 模块 OpenAI-compatible API Key（未配置则 embedding 会失败）            |
| `EMBEDDING_OPENAI_BASE_URL`             | ❌   | Embedding 模块 OpenAI-compatible baseURL（空字符串视为未配置）                   |
| `EMBEDDING_OPENAI_MODEL`                | ❌   | Embedding 模块默认模型（默认 `text-embedding-3-small`）                          |
| `R2_*`                                  | ❌   | 云存储配置（可选）                                                               |
| `R2_PUBLIC_URL`                         | ❌   | CDN Base URL（生产固定 `https://cdn.anyhunt.app`）                               |
| `RESEND_API_KEY`                        | ❌   | Resend API Key（不启用邮件可留空）                                               |
| `EMAIL_FROM`                            | ❌   | 发件人地址（默认 `Anyhunt <noreply@anyhunt.app>`）                               |
| `BILLING_RULE_OVERRIDES_JSON`           | ❌   | 扣费规则覆盖（JSON，对应 `src/billing/billing.rules.ts`）                        |
| `BROWSER_*`                             | ❌   | 浏览器池配置（池大小/预热/空闲回收）                                             |

---

## Test Commands

```bash
pnpm --filter @anyhunt/anyhunt-server test        # All tests
pnpm --filter @anyhunt/anyhunt-server test:unit   # Unit tests only
pnpm --filter @anyhunt/anyhunt-server test:cov    # With coverage
pnpm --filter @anyhunt/anyhunt-server test:ci     # CI full test (需要 Docker)
```

### 测试类型

| 类型     | 命令               | 依赖   | 说明                                  |
| -------- | ------------------ | ------ | ------------------------------------- |
| 单元测试 | `test:unit`        | 无     | 纯逻辑测试，Mock 外部依赖             |
| 集成测试 | `test:integration` | Docker | 使用 Testcontainers 启动真实 DB/Redis |
| E2E 测试 | `test:e2e`         | Docker | 完整 API 流程测试                     |

### 集成测试环境

集成测试使用 [Testcontainers](https://testcontainers.com/) 自动启动：

- PostgreSQL 容器
- Redis 容器

**要求：** 本地需要安装 Docker Desktop 或 Docker Engine；Colima 环境请固定使用下面这组变量

```bash
# 运行集成测试（自动启动容器）
RUN_INTEGRATION_TESTS=1 pnpm --filter @anyhunt/anyhunt-server test

# Colima 推荐基线（integration / e2e）
DOCKER_HOST=unix:///Users/lin/.colima/default/docker.sock \
TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock \
TESTCONTAINERS_RYUK_DISABLED=true \
pnpm --filter @anyhunt/anyhunt-server test:integration

DOCKER_HOST=unix:///Users/lin/.colima/default/docker.sock \
TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock \
TESTCONTAINERS_RYUK_DISABLED=true \
pnpm --filter @anyhunt/anyhunt-server test:e2e
```

---

## Common Modification Scenarios

| Scenario              | Files to Modify                               | Notes                      |
| --------------------- | --------------------------------------------- | -------------------------- |
| Add new API endpoint  | `*.controller.ts`, `*.service.ts`, `dto/*.ts` | Add DTO with Zod schema    |
| Add new scrape format | `scraper/transformers/`                       | Create new transformer     |
| Add rate limiting     | `common/guards/`                              | Extend throttler guard     |
| Add new payment flow  | `payment/`                                    | Update webhook handler too |

---

## API 端点概览

| 端点                    | 方法 | 认证            | 说明         |
| ----------------------- | ---- | --------------- | ------------ |
| `/health`               | GET  | 无              | 健康检查     |
| `/api/v1/scrape`        | POST | API Key         | 单页抓取     |
| `/api/v1/crawl`         | POST | API Key         | 多页爬取     |
| `/api/v1/map`           | POST | API Key         | URL 发现     |
| `/api/v1/extract`       | POST | API Key         | AI 数据提取  |
| `/api/v1/search`        | POST | API Key         | 网页搜索     |
| `/api/v1/batch/scrape`  | POST | API Key         | 批量抓取     |
| `/api/v1/oembed`        | POST | Session         | oEmbed 获取  |
| `/api/v1/app/*`         | \*   | Session         | App API      |
| `/api/v1/admin/*`       | \*   | Session + Admin | 管理后台 API |
| `/api/v1/public/demo/*` | POST | Captcha         | 演示 API     |

---

_版本: 2.1 | 更新日期: 2026-01-08_
