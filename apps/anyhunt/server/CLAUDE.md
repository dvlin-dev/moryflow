# Anyhunt Server

> `@anyhunt/anyhunt-server` - Anyhunt Dev unified API server

## Overview

Backend API + Web Data Engine built with NestJS. Core service for web scraping, crawling, and data extraction.

## 最近更新

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
- API Key：改为明文 `keyValue` 存储 + Bearer 鉴权（列表返回 key，响应 no-store）
- Digest：路由拆分为 app/public 前缀，移除旧 `/api/v1/console/*` 与 `/api/v1/digest/*`
- Demo：公开接口迁移至 `/api/v1/public/demo/*`
- Browser CDP 连接新增白名单/私网策略环境变量（`.env.example`）
- Browser Streaming/Provider 环境变量补齐（`.env.example`）
- Memox Memory 对齐 Mem0：新增 filters DSL（AND/OR/NOT + gte/lte/in/contains/icontains）、导出/历史/反馈与 Token 认证一致
- 统一响应为 raw JSON + RFC7807 错误体，移除全局 response 包装并补齐 requestId 输出
- Common：补齐 RFC7807 工具函数与 Origin 缺失场景的错误体一致性，避免 500 信息泄露

## Responsibilities

- Handle API requests for scraping, crawling, map, extract, search, batch-scrape
- Provide Memox APIs for semantic memory and Mem0 entities
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
- 本次重置后仅保留 init 迁移（不保留历史迁移文件）
- URL validation required for SSRF protection
- `ALLOWED_ORIGINS`/`TRUSTED_ORIGINS` 必须覆盖 Console/Admin 域名（`console.anyhunt.app`/`admin.anyhunt.app`）
- 触发实际工作的接口必须先扣费（通过 `BillingService` + `@BillingKey(...)`），再执行任务
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
- 如果 workspace 包的 `tsconfig` 通过 `extends` 引用根配置（例如 `../../tsconfig.agents.json`），Docker 构建必须一并 `COPY` 根 tsconfig，否则会触发 `TS5083` 并导致编译选项回退
- Docker 构建固定使用 pnpm@9.12.2（避免 corepack pnpm@9.14+ 在容器内出现 depNode.fetching 报错）
- Docker 构建安装依赖使用 `node-linker=hoisted` 且关闭 `shamefully-hoist`，避免 pnpm link 阶段崩溃
- TestContainers 启动主库 + 向量库容器，并执行 `prisma migrate deploy --config prisma.main.config.ts / prisma.vector.config.ts`（Prisma 7 已移除 `--skip-generate`）

## 数据库架构（双库分离）

采用**主库 + 向量库**分离架构，实现性能隔离和独立扩展：

| 数据库 | 连接变量              | Schema 路径      | 用途                                                       |
| ------ | --------------------- | ---------------- | ---------------------------------------------------------- |
| 主库   | `DATABASE_URL`        | `prisma/main/`   | 业务数据（User、ApiKey、Job 等）                           |
| 向量库 | `VECTOR_DATABASE_URL` | `prisma/vector/` | Memox 数据（Memory、MemoxEntity、History/Feedback/Export） |

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

| Module           | Files | Description                                  | CLAUDE.md                 |
| ---------------- | ----- | -------------------------------------------- | ------------------------- |
| `scraper/`       | 24    | Core scraping engine                         | `src/scraper/CLAUDE.md`   |
| `common/`        | 22    | Shared guards, decorators, pipes, validators | `src/common/CLAUDE.md`    |
| `llm/`           | -     | Admin LLM Providers/Models + runtime routing | `src/llm/CLAUDE.md`       |
| `agent/`         | -     | L3 Agent API + Browser Tools                 | `src/agent/CLAUDE.md`     |
| `digest/`        | -     | Intelligent Digest (subscriptions/inbox)     | `src/digest/CLAUDE.md`    |
| `admin/`         | 16    | Admin dashboard APIs                         | `src/admin/CLAUDE.md`     |
| `log/`           | 8     | Unified request logs + analytics + cleanup   | -                         |
| `oembed/`        | 18    | oEmbed provider support                      | `src/oembed/CLAUDE.md`    |
| `billing/`       | 5     | Billing rules + deduct/refund                | -                         |
| `quota/`         | 14    | Quota management                             | `src/quota/CLAUDE.md`     |
| `api-key/`       | 13    | API key management                           | `src/api-key/CLAUDE.md`   |
| `memory/`        | 10    | Semantic memory API (Memox)                  | `src/memory/CLAUDE.md`    |
| `entity/`        | 10    | Mem0 entities (user/agent/app/run)           | `src/entity/CLAUDE.md`    |
| `embedding/`     | 4     | Embeddings generation (Memox)                | `src/embedding/CLAUDE.md` |
| `crawler/`       | 11    | Multi-page crawling                          | `src/crawler/CLAUDE.md`   |
| `auth/`          | 10    | Authentication (Better Auth)                 | `src/auth/CLAUDE.md`      |
| `payment/`       | 10    | Payment processing (Creem)                   | -                         |
| `webhook/`       | 10    | Webhook notifications                        | `src/webhook/CLAUDE.md`   |
| `extract/`       | 9     | AI-powered data extraction                   | -                         |
| `batch-scrape/`  | 9     | Bulk URL processing                          | -                         |
| `user/`          | 9     | User management                              | -                         |
| `map/`           | 8     | URL discovery                                | -                         |
| `storage/`       | 7     | Cloudflare R2 storage                        | -                         |
| `search/`        | 6     | Web search API                               | -                         |
| `browser/`       | 6     | Browser pool management                      | `src/browser/CLAUDE.md`   |
| `demo/`          | 5     | Playground demo API                          | -                         |
| `redis/`         | 4     | Redis caching                                | -                         |
| `health/`        | 3     | Health check endpoints                       | -                         |
| `email/`         | 3     | Email service                                | -                         |
| `queue/`         | 3     | BullMQ queue config                          | -                         |
| `prisma/`        | 3     | 主库连接（PrismaService）                    | -                         |
| `vector-prisma/` | 3     | 向量库连接（VectorPrismaService）            | -                         |
| `config/`        | 2     | Pricing configuration                        | -                         |
| `types/`         | 6     | Shared type definitions                      | -                         |
| `openapi/`       | 6     | OpenAPI 配置与 Scalar 文档入口               | -                         |

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

**要求：** 本地需要安装 Docker Desktop 或 Docker Engine

```bash
# 运行集成测试（自动启动容器）
RUN_INTEGRATION_TESTS=1 pnpm --filter @anyhunt/anyhunt-server test
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
