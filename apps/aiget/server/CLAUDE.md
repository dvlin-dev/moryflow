# Aiget Server

> @aiget/aiget-server - Aiget Dev unified API server

## Overview

Backend API + Web Data Engine built with NestJS. Core service for web scraping, crawling, and data extraction.

## Responsibilities

- Handle API requests for scraping, crawling, map, extract, search, batch-scrape
- Provide Memox APIs for semantic memory and knowledge graph
- Manage browser pool for rendering pages
- Process async jobs via BullMQ
- Quota and API key management
- User authentication and authorization

## Constraints

- All controllers must use `version: '1'` for API versioning
- Public API endpoints must use `@Public()` + `ApiKeyGuard` (avoid Better Auth session guard)
- Use `SessionGuard` for console endpoints
- URL validation required for SSRF protection
- 触发实际工作的接口必须先扣费（通过 `BillingService` + `@BillingKey(...)`），再执行任务
- Agent + `@aiget/agents-core` 集成时，避免将 Playwright 等重类型透传到 `Tool<Context>` / `Agent<TContext>` 泛型推断（容易触发 `tsc` OOM）；优先在 agent 层做类型边界降级
- Agent 访问浏览器能力必须通过 `BrowserAgentPort`（禁止直接依赖 `BrowserSession` / Playwright 类型）
- Agent 任务必须支持硬取消（AbortSignal）与分段配额检查（每 100 credits）
- Agent 分段扣费/结算逻辑需要单测覆盖，参考 `src/agent/__tests__/agent.service.spec.ts`
- Agent 任务状态持久化到 DB（`AgentTask`），实时进度与取消标记使用 Redis；`GET /api/v1/agent/:id` 合并 DB + Redis
- Agent 失败不扣积分（checkpoint 全退），用户主动取消按已消耗扣费
- `vitest` 默认只跑单元测试：`*.integration.spec.ts` / `*.e2e.spec.ts` 需显式设置 `RUN_INTEGRATION_TESTS=1` 才会被包含
- Docker 入口使用本地 `node_modules/.bin/prisma` 执行迁移，勿移除 `prisma` 依赖
- Docker 构建固定使用 pnpm@9.12.2（避免 corepack pnpm@9.14+ 在容器内出现 depNode.fetching 报错）
- Docker 构建安装依赖使用 `node-linker=hoisted` 且关闭 `shamefully-hoist`，避免 pnpm link 阶段崩溃

## 数据库架构（双库分离）

采用**主库 + 向量库**分离架构，实现性能隔离和独立扩展：

| 数据库 | 连接变量              | Schema 路径      | 用途                                   |
| ------ | --------------------- | ---------------- | -------------------------------------- |
| 主库   | `DATABASE_URL`        | `prisma/main/`   | 业务数据（User、ApiKey、Job 等）       |
| 向量库 | `VECTOR_DATABASE_URL` | `prisma/vector/` | Memox 数据（Memory、Entity、Relation） |

### 关键设计

- **软引用**：向量库中的 `apiKeyId` 无外键约束，通过应用层保证一致性
- **跨库查询**：Console 接口需要跨库查询（主库 ApiKey + 向量库 Memox），在应用层组装
- **删除清理**：删除 ApiKey 时异步清理向量库关联数据（fail-safe）

### Prisma 命令

```bash
# Migrate 使用的配置文件：
# - prisma.main.config.ts
# - prisma.vector.config.ts

# 生成两个库的 Client
pnpm --filter @aiget/aiget-server prisma:generate

# 生成迁移（空库初始化，create-only）
pnpm exec prisma migrate dev --config prisma.main.config.ts --name init --create-only
pnpm exec prisma migrate dev --config prisma.vector.config.ts --name init --create-only

# 部署迁移（生产/CI）
pnpm exec prisma migrate deploy --config prisma.main.config.ts
pnpm exec prisma migrate deploy --config prisma.vector.config.ts

# 分别推送 Schema
pnpm --filter @aiget/aiget-server prisma:push:main
pnpm --filter @aiget/aiget-server prisma:push:vector

# 打开 Studio（默认主库）
pnpm --filter @aiget/aiget-server prisma:studio
pnpm --filter @aiget/aiget-server prisma:studio:vector
```

## Module Structure

| Module           | Files | Description                                  | CLAUDE.md                 |
| ---------------- | ----- | -------------------------------------------- | ------------------------- |
| `scraper/`       | 24    | Core scraping engine                         | `src/scraper/CLAUDE.md`   |
| `common/`        | 22    | Shared guards, decorators, pipes, validators | `src/common/CLAUDE.md`    |
| `agent/`         | 8     | L3 Agent API + Browser Tools                 | -                         |
| `admin/`         | 16    | Admin dashboard APIs                         | -                         |
| `oembed/`        | 18    | oEmbed provider support                      | -                         |
| `billing/`       | 5     | Billing rules + deduct/refund                | -                         |
| `quota/`         | 14    | Quota management                             | `src/quota/CLAUDE.md`     |
| `api-key/`       | 13    | API key management                           | `src/api-key/CLAUDE.md`   |
| `memory/`        | 10    | Semantic memory API (Memox)                  | `src/memory/CLAUDE.md`    |
| `entity/`        | 10    | Knowledge graph entities (Memox)             | `src/entity/CLAUDE.md`    |
| `relation/`      | 9     | Knowledge graph relations (Memox)            | `src/relation/CLAUDE.md`  |
| `graph/`         | 7     | Knowledge graph traversal (Memox)            | `src/graph/CLAUDE.md`     |
| `embedding/`     | 4     | Embeddings generation (Memox)                | `src/embedding/CLAUDE.md` |
| `crawler/`       | 11    | Multi-page crawling                          | `src/crawler/CLAUDE.md`   |
| `auth/`          | 10    | Authentication (Better Auth)                 | `src/auth/CLAUDE.md`      |
| `payment/`       | 10    | Payment processing (Creem)                   | -                         |
| `webhook/`       | 10    | Webhook notifications                        | -                         |
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
@UseGuards(ApiKeyGuard) // For public API
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
pnpm --filter @aiget/aiget-server prisma:generate

# 4. 安装 Playwright 浏览器（必须，用于网页抓取）
pnpm exec playwright install chromium

# 5. 启动开发服务器
pnpm dev:aiget
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
pnpm dev:aiget

# 2. 检查健康状态
curl http://localhost:3000/health
# 期望响应: {"status":"ok","services":{"database":true,"redis":true}}

# 3. 检查 Swagger 文档
open http://localhost:3000/api-docs
```

### 环境变量说明

| 变量                          | 必需 | 说明                                                                           |
| ----------------------------- | ---- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`                | ✅   | 主库 PostgreSQL 连接字符串                                                     |
| `VECTOR_DATABASE_URL`         | ✅   | 向量库 PostgreSQL（pgvector）连接字符串                                        |
| `REDIS_URL`                   | ✅   | Redis 连接字符串                                                               |
| `BETTER_AUTH_SECRET`          | ✅   | Better Auth 密钥                                                               |
| `BETTER_AUTH_URL`             | ✅   | 服务公网 URL（生产建议 `https://server.aiget.dev`）                            |
| `ADMIN_PASSWORD`              | ✅   | 管理后台登录密码                                                               |
| `ALLOWED_ORIGINS`             | ✅   | CORS 允许来源（逗号分隔）                                                      |
| `TRUSTED_ORIGINS`             | ✅   | Better Auth 信任来源（逗号分隔）                                               |
| `SERVER_URL`                  | ✅   | 服务公网 URL（用于预签名 URL 与回调地址，生产建议 `https://server.aiget.dev`） |
| `OPENAI_API_KEY`              | ❌   | AI 提取功能（可选）                                                            |
| `R2_*`                        | ❌   | 云存储配置（可选）                                                             |
| `BILLING_RULE_OVERRIDES_JSON` | ❌   | 扣费规则覆盖（JSON，对应 `src/billing/billing.rules.ts`）                      |
| `BROWSER_*`                   | ❌   | 浏览器池配置（池大小/预热/空闲回收）                                           |

---

## Test Commands

```bash
pnpm --filter @aiget/aiget-server test        # All tests
pnpm --filter @aiget/aiget-server test:unit   # Unit tests only
pnpm --filter @aiget/aiget-server test:cov    # With coverage
pnpm --filter @aiget/aiget-server test:ci     # CI full test (需要 Docker)
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
RUN_INTEGRATION_TESTS=1 pnpm --filter @aiget/aiget-server test
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

| 端点                   | 方法 | 认证            | 说明         |
| ---------------------- | ---- | --------------- | ------------ |
| `/health`              | GET  | 无              | 健康检查     |
| `/api/v1/scrape`       | POST | API Key         | 单页抓取     |
| `/api/v1/crawl`        | POST | API Key         | 多页爬取     |
| `/api/v1/map`          | POST | API Key         | URL 发现     |
| `/api/v1/extract`      | POST | API Key         | AI 数据提取  |
| `/api/v1/search`       | POST | API Key         | 网页搜索     |
| `/api/v1/batch/scrape` | POST | API Key         | 批量抓取     |
| `/api/v1/oembed`       | POST | Session         | oEmbed 获取  |
| `/api/v1/console/*`    | \*   | Session         | 控制台 API   |
| `/api/v1/admin/*`      | \*   | Session + Admin | 管理后台 API |
| `/api/v1/demo/*`       | POST | Captcha         | 演示 API     |

---

_版本: 2.1 | 更新日期: 2026-01-08_
