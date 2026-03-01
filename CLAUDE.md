# Anyhunt 统一平台

> 本文档是 AI Agent 的核心指南。遵循 [agents.md 规范](https://agents.md/)。

## 项目概述

**Anyhunt** 是一个统一平台，采用「核心产品 + 原子能力」架构：

**核心产品**：

- **Moryflow** - 笔记 AI 工作流 + 网站发布（调用下层原子能力）

**原子能力**：

- **Fetchx** - 网页数据 API（抓取、爬取、数据提取）
- **Memox** - AI 记忆 API（为 AI 应用提供长期记忆）
- **Sandx** - Agent 沙盒（安全隔离的代码执行环境，规划中）

两条业务线分别拥有身份系统、积分钱包和订阅管理（不共享账号/Token/数据库），仅共享 `packages/*` 代码基础设施。

---

## 测试要求（强制）

### 后端测试

1. **单元测试**：使用 Vitest 编写单元测试，覆盖核心业务逻辑
2. **集成测试**：配合本地 Docker 启动的数据库（PostgreSQL、Redis 等）进行测试
3. **测试数据库**：使用 `docker-compose` 启动测试环境

```bash
# 启动测试数据库
docker compose -f deploy/infra/docker-compose.test.yml up -d

# 运行测试
pnpm --filter @anyhunt/anyhunt-server test
pnpm --filter @anyhunt/anyhunt-server test:e2e
```

### 前端测试

1. **单元测试**：使用 Vitest + Testing Library 测试组件和 hooks
2. **E2E 测试**：使用 **Playwright** 无头浏览器进行端到端测试
3. **测试覆盖**：核心用户流程必须有 E2E 测试覆盖

```bash
# 运行单元测试
pnpm --filter @anyhunt/admin test:unit

# 运行 Playwright E2E 测试
pnpm --filter @anyhunt/admin test:e2e
pnpm --filter @anyhunt/console test
pnpm --filter @anyhunt/console test:e2e
```

### 测试环境 Docker Compose

测试用 Docker Compose 文件位于 `deploy/infra/docker-compose.test.yml`，包含：

- PostgreSQL 16（测试数据库）
- Redis 7（测试缓存）

---

## 源仓库地址（迁移参考）

以下是正在迁移到此 Monorepo 的原始仓库：

| 产品              | 绝对路径                          | 说明                                  |
| ----------------- | --------------------------------- | ------------------------------------- |
| Fetchx (原 AIGET) | `/Users/bowling/code/me/fetchx`   | 网页抓取与数据提取平台（仓库已更名）  |
| Memox (原 MEMAI)  | `/Users/bowling/code/me/memai`    | AI 记忆与知识图谱服务                 |
| Moryflow          | `/Users/bowling/code/me/moryflow` | 笔记 AI 工作流 + 网站发布（核心产品） |

---

## 核心同步协议（强制）

1. **原子更新规则**：任何代码变更完成后，必须同步更新相关目录的 CLAUDE.md
2. **递归触发**：文件变更 → 更新文件 Header → 更新所属目录 CLAUDE.md → （若影响全局）更新根 CLAUDE.md
3. **分形自治**：任何子目录的 CLAUDE.md 都应让 AI 能独立理解该模块的上下文
4. **禁止历史包袱**：不做向后兼容，无用代码直接删除/重构，不保留废弃注释
5. **零兼容原则**：除非直接影响用户已有数据，否则一律不兼容旧代码/旧数据结构，按最佳实践重构
6. **CLAUDE.md 创建门槛**：仅当“当前目录（包含所有子目录）”文件数 **> 10** 时，才允许新增 `CLAUDE.md` 及其 `AGENTS.md` 软链接；否则禁止创建，避免文档层级过度碎片化。

> **命名约定**：`CLAUDE.md` 是主文件，`AGENTS.md` 是指向 `CLAUDE.md` 的软链接，用于兼容 agents.md 规范。

---

## 项目结构

### 域名规划

| 服务                     | 域名                | 说明                         |
| ------------------------ | ------------------- | ---------------------------- |
| **Moryflow 主站**        | www.moryflow.com    | 核心产品主入口               |
| **Moryflow Docs**        | docs.moryflow.com   | 产品文档（独立 Docs 项目）   |
| **Moryflow 应用**        | server.moryflow.com | 主应用（Web + API）          |
| **Moryflow 发布站**      | moryflow.app        | 用户发布的网站               |
| **Anyhunt 官网**         | anyhunt.app         | Anyhunt Dev 官网（模块导航） |
| **Anyhunt Dev API**      | server.anyhunt.app  | 统一 API 入口（`/api/v1`）   |
| **Anyhunt Docs**         | docs.anyhunt.app    | 产品文档（独立 Docs 项目）   |
| **Anyhunt CDN**          | cdn.anyhunt.app     | 静态资源/对象存储对外域名    |
| **Anyhunt RSS**          | rss.anyhunt.app     | Digest RSS 入口（可选）      |
| **Anyhunt Status**       | status.anyhunt.app  | 服务状态页（可选）           |
| **Anyhunt Dev 控制台**   | console.anyhunt.app | Anyhunt Dev 控制台（Web）    |
| **Anyhunt Dev 管理后台** | admin.anyhunt.app   | 运营管理（Web）              |

> - Moryflow 是核心产品，拥有独立域名 moryflow.com / moryflow.app
> - Anyhunt Dev 是开发者平台：官网在 `anyhunt.app`，API 在 `server.anyhunt.app`，控制台/后台分别在 `console.anyhunt.app`、`admin.anyhunt.app`
> - API 路径规范：`https://server.anyhunt.app/api/v1/...`（带 `/api` 前缀；不做旧域名兼容/跳转）
> - `moryflow.app` 发布站点仅允许 GET/HEAD；OFFLINE/EXPIRED/404 状态页禁止缓存（`no-store`）

### API Key 前缀

| 类型            | 前缀  | 说明                                                       |
| --------------- | ----- | ---------------------------------------------------------- |
| Moryflow Key    | `mf_` | Moryflow（server.moryflow.com）                            |
| Anyhunt Dev Key | `ah_` | Anyhunt Dev（console.anyhunt.app；Agentsbox/Memox 等能力） |

### 目标 Monorepo 结构

```
Anyhunt/
├── apps/
│   ├── anyhunt/                     # Anyhunt Dev 业务线
│   │   ├── www/                     # Anyhunt Dev 官网（anyhunt.app；模块导航：/fetchx、/memox）
│   │   ├── docs/                    # Anyhunt Dev 文档站（docs.anyhunt.app）
│   │   ├── server/                  # Anyhunt Dev 统一后端（server.anyhunt.app/api/v1）
│   │   ├── console/                 # Anyhunt Dev 控制台（Web）
│   │   ├── admin/                   # Anyhunt Dev 管理后台
│   │   │   ├── www/                 # 管理后台前端
│   │   │   └── server/              # （迁移中）将并入 anyhunt/server
│   │   ├── fetchx/                  # 原子能力：网页抓取
│   │   │   └── (docs only)          # 模块文档与边界说明
│   │   ├── memox/                   # 原子能力：AI 记忆
│   │   │   └── server/              # （迁移中）将并入 anyhunt/server
│   │   └── sandx/                   # 原子能力：Agent 沙盒（规划中）
│   │       ├── server/              # 沙盒执行服务
│   │       └── www/                 # 落地页
│   └── moryflow/                    # Moryflow 核心产品（笔记 AI 工作流）
│       ├── server/                  # 工作流服务
│       ├── mobile/                  # 移动端应用
│       ├── pc/                      # 桌面端应用
│       ├── site-template/           # SSG 网站模板
│       ├── admin/                   # Moryflow 管理后台（Web）
│       ├── docs/                    # Moryflow 文档站（docs.moryflow.com）
│       └── www/                     # 落地页（moryflow.com）
├── packages/
│   ├── ui/                          # 统一 UI 组件库（shadcn/ui）
│   ├── types/                       # 跨产品共享类型
│   ├── api/                         # API 客户端工具
│   ├── config/                      # 共享配置
│   ├── sync/                        # 云同步工具（来自 Moryflow）
│   ├── tiptap/                      # Tiptap 编辑器（来自 Moryflow）
│   ├── agents-core/                 # Agent 核心（来自 Moryflow）
│   ├── agents-*/                    # Agent 相关包
│   └── scraper-core/                # 抓取核心（来自 Fetchx）
├── tooling/
│   ├── eslint-config/               # ESLint 配置
│   └── typescript-config/           # TypeScript 配置
├── deploy/                          # 部署配置目录
│   ├── infra/                       # 基础设施（DB、Redis；含测试环境）
│   └── moryflow/                    # Moryflow 一套 docker compose（4c6g）
├── turbo.json                       # Turborepo 配置
├── pnpm-workspace.yaml
├── package.json
├── CLAUDE.md                        # 本文件
├── AGENTS.md                        # 指向 CLAUDE.md 的软链接
└── docs/design/                     # 统一设计文档（Anyhunt + Moryflow）
```

### 技术栈速查

| 层级         | 技术                                                    |
| ------------ | ------------------------------------------------------- |
| 包管理       | pnpm workspace + Turborepo                              |
| 后端         | NestJS 11 + Prisma 7 + PostgreSQL 16 + Redis 7 + BullMQ |
| 前端         | React 19 + Vite + TailwindCSS v4 + shadcn/ui (Radix)    |
| 表单         | react-hook-form + zod（@hookform/resolvers）            |
| 移动端       | Expo + React Native + uniwind（非 nativewind/tailwind） |
| 桌面端       | Electron + React                                        |
| 认证         | Better Auth                                             |
| 支付         | TBD（当前不作为默认约束）                               |
| AI/LLM       | OpenAI / Anthropic / Google（通过 Vercel AI SDK）       |
| 向量数据库   | pgvector（PostgreSQL 扩展）                             |
| 浏览器自动化 | Playwright                                              |
| 数据校验     | Zod                                                     |
| 邮件         | Resend                                                  |
| 日志         | Pino                                                    |

- pnpm 版本固定为 `9.12.2`（Docker/CI 避免 corepack pnpm@9.14+ 的 depNode.fetching 报错）
- Docker 安装依赖使用 `node-linker=hoisted` 且关闭 `shamefully-hoist`，避免 pnpm link 阶段崩溃
- `onlyBuiltDependencies` 允许 `better-sqlite3` 与 `keytar` 构建脚本执行（Electron native module 需要）
- 使用 `@biomejs/biome` 提供 JSON/JS LSP 与格式化能力
- Docker 构建上下文使用 `.dockerignore` 排除 `node_modules/`、`dist/`、`generated/` 等产物，避免镜像污染与缓存失效

---

## Auth 与配额（当前约束）

当前架构为 **两条业务线**，永不互通（不共享账号/Token/数据库）：

- **Moryflow**：`www.moryflow.com`（营销）+ `server.moryflow.com`（应用+API）
- **Anyhunt Dev**：`console.anyhunt.app`（控制台+API；Agentsbox/Memox 等能力）

计费/订阅暂不作为默认架构约束；Anyhunt Dev 对外能力以 **API Key + 动态限流策略** 为主（详见 `docs/design/anyhunt/core/system-boundaries-and-identity.md`）。

---

## 文档索引

- [`docs/index.md`](./docs/index.md)：docs 总入口。
- [`docs/design/index.md`](./docs/design/index.md)：Design 总索引。
- [`docs/design/anyhunt/core/index.md`](./docs/design/anyhunt/core/index.md)：Anyhunt 核心约束入口。
- [`docs/design/moryflow/core/index.md`](./docs/design/moryflow/core/index.md)：Moryflow 核心约束入口。
- [`docs/design-reorganization-plan.md`](./docs/design-reorganization-plan.md)：docs 重构执行记录。
- `apps/*/CLAUDE.md`、`packages/*/CLAUDE.md`：代码目录细粒度协作说明。

---

## 协作总则

- **语言规范**：
  - **开发者相关（中文）**：文档、代码注释、提交信息、CLAUDE.md 等
  - **用户相关（英文）**：界面文案、报错信息、API 响应消息等用户可见内容
  - **对话沟通（中文）**：与用户交互与协作说明必须使用中文（不改变用户可见文案与接口响应的英文要求）
- **先查后做**：不猜实现，用搜索对照现有代码
- **不定义业务语义**：产品/数据含义先确认需求方
- **复用优先**：现有接口、类型、工具优先复用
- **参考源仓库**：不确定时查看上面列出的原始仓库
- **最佳实践优先**：为可维护性允许破坏性重构（不考虑历史兼容），优先模块化/单一职责；无用代码直接删除
- **根因治理优先（强制）**：禁止补丁式修复（临时分支/局部兜底/重复映射叠加）；修复必须先定位根因，再在事实源、协议边界与职责分层处一次性收口，避免同类问题重复出现
- **交互设计做减法**：尽量减少交互步骤，通过符合用户直觉的设计让界面简洁
- **请求与状态统一（强制）**：统一采用 `Zustand Store + Methods + Functional API Client`；前端组件重构与新建共享业务状态时禁止新增 React Context（Theme/i18n 等非业务上下文除外）；覆盖客户端 HTTP、服务端出站 HTTP 与 WebSocket；具体执行与验收以 `docs/design/anyhunt/core/request-and-state-unification.md` 与 `docs/design/moryflow/core/ui-conversation-and-streaming.md` 为准
- **AI 提交约束**：AI Agent 不得擅自执行 `git commit` / `git push` / `git tag` 等提交/发布操作；除非用户明确批准可以自主提交代码，否则所有改动必须保持为未提交状态（允许放入暂存区供 review）

---

## 部署与重定向（强制）

### TanStack Start（SSR）路由初始化规范

- **禁止在服务端复用 Router 单例**：SSR 必须「每个请求创建一个新的 router」。只能在浏览器端缓存 singleton router。
  - 原因：TanStack Start 在 SSR 时会根据请求推断 `origin/publicHref` 并做 canonical redirect；如果 router 是进程级单例，早期请求（如 IP:端口 健康检查、内网请求）会“污染”后续请求的 Host/Proto，导致 **307 自重定向循环**（监控常见报错：`Maximum number of redirects exceeded`）。
- **推荐模式**：导出 `getRouter()`（或 `createRouter()`），在 `typeof window === 'undefined'` 时永远返回新实例；在浏览器端才做惰性缓存。

### 反向代理 / CDN（Host + Proto）规范

- **NestJS/Express（含 Better Auth 回调、cookie secure 判定）在反代后必须开启 `trust proxy`**：`app.set('trust proxy', 1)`。
  - 作用：让 `req.protocol`/`req.secure`/绝对 URL 推断基于 `X-Forwarded-*`，避免 http/https、域名/IP 不一致导致的重定向与 cookie 异常。
  - 安全边界：如果应用“直接暴露在公网且不经过可信反代”，不应无条件信任 `X-Forwarded-*`；应关闭 `trust proxy` 或限制为反代 IP 段（避免客户端伪造头部）。
- **上游反代必须转发关键头**（至少）：`Host`、`X-Forwarded-Proto`、`X-Forwarded-For`（可选：`X-Forwarded-Host`）。

### Generated 文件规范

- TanStack 生成物（如 `**/.tanstack/**`、`**/routeTree.gen.*`）视为 **generated**：禁止手改，避免格式化/校验导致无意义的 diff 和 Vite 反复 reload。

### Nitro（TanStack Start SSR）打包规范

- **避免 SSR runtime hooks 崩溃（`useRef` 读取 null）**：Nitro 构建必须避免把 React 在多个 SSR chunks 中重复实例化。
  - 现象：线上 SSR 500，日志形如 `Cannot read properties of null (reading 'useRef')`，栈顶常见 `@tanstack/react-store` / `useSyncExternalStoreWithSelector` / `useRouterState`。
  - 原因：React 被拆成多个实例（不同 chunk 各自打包了一份 React），renderer 设置 dispatcher 的 React 实例与组件调用 hooks 的 React 实例不一致。
  - **要求**：TanStack Start 项目在 `vite.config.ts` 中显式配置 `nitro.noExternals=false`（或等价 Nitro 配置），确保 server bundle 不会产生多份 React 实例。

---

## 工作流程

1. **计划**：改动前给出最小范围 plan，说明动机与风险, 在制定计划时存在不确定点,向我提问，需求完全确认之后才能去执行
2. **实施**：聚焦单一问题，不盲改
3. **测试**：新功能必须编写单元测试，修复 bug 需补充回归测试
4. **校验（风险分级）**：按变更风险执行，避免低风险改动重复跑全量流水线：
   - **L0（低风险）**：纯样式/文案/布局微调、无状态流与业务逻辑变更  
     可跳过全量 `lint/typecheck/test:unit`，按需做手工验证
   - **L1（中风险）**：组件交互、状态管理、数据映射、非核心逻辑重构  
     至少运行受影响包的 `typecheck` 与 `test:unit`
   - **L2（高风险）**：核心业务逻辑、跨包接口、后端模块、构建/基础设施改动  
     必须运行以下命令并全部通过：

     ```bash
     pnpm lint
     pnpm typecheck
     pnpm test:unit
     ```

   - 注意：根 `eslint.config.mjs` 会 `import '@moryflow/eslint-config/*'`，因此根 `package.json` 必须包含 `@moryflow/eslint-config`（workspace 依赖），否则 monorepo lint 会直接报 `ERR_MODULE_NOT_FOUND`。

5. **同步**：更新相关 CLAUDE.md（本条强制）

### PR 处理流程（强制）

1. **先同步分支基线**：处理 PR 评论前，先同步最新 `main`（合并或 rebase），确保评论定位与代码行号有效。
2. **收敛评论事实源**：统一使用 GitHub PR review threads 作为事实源，逐条确认 `isResolved/isOutdated`，禁止凭记忆口头状态推进。
3. **先判定是否成立**：每条评论必须先复现或代码走读确认根因；若不成立，回复反证依据；若成立，按“根因治理优先”一次性收口。
4. **禁止补丁式修复**：不加临时分支判断、不叠加兼容映射；直接在事实源模块、协议边界和职责分层处重构到位。
5. **文档与实现同源**：代码改动后，同步更新对应设计文档与相关 `CLAUDE.md`，确保“计划、实现、验收”三者一致。
6. **按风险分级验证**：L0/L1/L2 按本章规则执行校验；未通过不得推进到提交与推送阶段。
7. **提交与推送需用户授权**：遵循“AI 提交约束”，仅在用户明确批准后执行 `git commit` / `git push` / 发布相关操作。
8. **回写 PR 状态闭环**：推送后逐条回复并 resolve 已完成评论，再次核对未解决线程数量为 0（或列出剩余项与处理计划）。

### 测试要求（强制）

- **新功能**：必须编写对应的单元测试
- **Bug 修复**：必须补充回归测试，防止问题复现
- **重构**：确保现有测试全部通过
- **测试覆盖**：核心业务逻辑覆盖率 > 80%

---

## Git 提交规范

### 原子提交（强制）

每个提交只包含**一个逻辑变更**。禁止将多个功能、修复或变更打包到一个提交中。

```bash
# ✅ 正确：每个提交一个逻辑变更
git commit -m "feat(fetchx/server): 添加全页截图选项"
git commit -m "fix(auth): 修复月度配额重置计算"
git commit -m "docs(api): 更新限流文档"

# ❌ 错误：多个不相关变更在一个提交
git commit -m "feat: 添加全页选项、修复配额bug、更新文档"
```

### 提交信息格式

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <description>

[可选正文]

[可选脚注]
```

#### 类型

| 类型       | 说明                           |
| ---------- | ------------------------------ |
| `feat`     | 新功能                         |
| `fix`      | Bug 修复                       |
| `docs`     | 仅文档                         |
| `style`    | 代码风格（格式化，无逻辑变更） |
| `refactor` | 代码重构（无功能/修复）        |
| `perf`     | 性能优化                       |
| `test`     | 添加或更新测试                 |
| `chore`    | 构建、CI、依赖                 |

#### 作用域

使用产品/模块名：`auth`、`fetchx/server`、`memox/console`、`moryflow/mobile`、`ui`、`types` 等。

### 可提交的配置文件

以下配置文件应随代码提交，确保团队协作一致性：

| 文件                          | 说明                                             |
| ----------------------------- | ------------------------------------------------ |
| `.claude/settings.local.json` | Claude Code 本地权限配置，可随需求提交或单独提交 |
| `.claude/commands/*.md`       | 自定义 Claude 命令                               |
| `.claude/agents/*.md`         | 自定义 Agent 配置                                |

---

## 文件头注释规范

关键文件需在开头添加注释：

| 文件类型   | 格式                                 |
| ---------- | ------------------------------------ |
| 服务/逻辑  | `[INPUT]` / `[OUTPUT]` / `[POS]`     |
| React 组件 | `[PROPS]` / `[EMITS]` / `[POS]`      |
| 工具函数集 | `[PROVIDES]` / `[DEPENDS]` / `[POS]` |
| 类型定义   | `[DEFINES]` / `[USED_BY]` / `[POS]`  |

示例：

```typescript
/**
 * [INPUT]: ScreenshotRequest - 截图请求参数
 * [OUTPUT]: ScreenshotResponse - 截图结果或错误
 * [POS]: 截图服务核心，被 screenshot.controller.ts 调用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

// 业务逻辑注释使用中文
// 计算用户本月剩余配额
const remainingQuota = monthlyQuota - usedQuota;

// 但是用户可见的错误信息使用英文
throw new HttpException('Insufficient credits', HttpStatus.PAYMENT_REQUIRED);
```

---

## 目录规范

### 后端模块结构（NestJS）

```
module-name/
├── dto/
│   ├── index.ts                    # DTO 导出
│   └── module-name.schema.ts       # Zod schemas + 推断类型 + DTO 类
├── module-name.module.ts           # NestJS 模块定义
├── module-name.controller.ts       # API 控制器（ApiKeyGuard）
├── module-name-console.controller.ts # 控制台控制器（AuthGuard）[可选]
├── module-name.service.ts          # 业务逻辑
├── module-name.constants.ts        # 常量、枚举、配置
├── module-name.errors.ts           # 自定义 HttpException 错误
├── module-name.types.ts            # 仅外部 API 类型 [可选]
└── index.ts                        # 公共导出
```

### 前端组件结构

```
ComponentName/
├── index.ts              # 导出
├── ComponentName.tsx     # 主组件
├── components/           # 子组件
└── hooks/                # 组件专属 Hooks
```

### 请求与状态管理规范（强制）

#### 前端（Web/PC/Mobile）

1. **状态分层固定**：
   - `store` 仅负责状态与纯 setter（禁止网络请求）
   - `methods` 负责业务编排（登录/刷新/登出/初始化/重试）
   - `api` 仅负责请求与响应解析（不改 UI 状态）
2. **状态容器固定**：全局认证与会话状态统一使用 `zustand`；前端组件重构与新增共享业务状态时禁止新增 React Context（仅允许 Theme/i18n/运行时注入等非业务共享语义）。
3. **取数方式固定**：子组件优先 `useXxxStore(selector)` 就地取数，禁止新增中间“胶水层”仅透传业务 props。
4. **Zustand 快照稳定性（强制）**：
   - 禁止 `useXxxStore((state) => ({ ... }))`、`useXxxStore((state) => ([ ... ]))` 这类 selector 字面量返回新引用。
   - 多字段取数必须改为原子 selector（每个字段单独 `useXxxStore((state) => state.xxx)`）或显式稳定化方案。
   - `useSync*Store(snapshot)` 在 `useLayoutEffect/useEffect` 内写入 store 前，必须先做 `shouldSync(current, snapshot)` 等价判断；无变化禁止 `setSnapshot`。
5. **调用方式固定**：组件仅读取 `useXxxStore(selector)` + 调用 `xxxMethods.*`；避免在页面组件里散落请求逻辑。
6. **Hook 使用边界**：尽量少做“业务编排型自定义 Hook”；除组件局部 UI 复用外，业务流程优先用显式 methods。
7. **API 风格固定**：业务 API 统一使用函数导出：
   - `export async function getJob(id: string): Promise<JobDetail> { ... }`
   - 禁止 Class 风格 `new ApiClient(...)`
   - 禁止 `createServerApiClient` 与 `serverApi.user.xxx` 调用链
8. **鉴权模式显式声明**：请求必须显式区分 `public | bearer | apiKey`，禁止隐式猜测鉴权方式。

#### 服务端（Anyhunt Server / Moryflow Server）

1. **出站 HTTP 统一入口**：业务 service 禁止直写 `fetch`，统一走函数式 `server-http-client`。
2. **SSRF 场景受控**：保留单一安全入口并接入统一请求客户端策略，不允许绕过。
3. **错误与超时统一**：统一 RFC7807 解析、`requestId` 透传、`AbortController` 超时控制；禁止隐式无限重试。

#### 实时通道（WebSocket/SSE）

1. 实时连接统一放在 `features/*/realtime.ts`（或 `lib/<domain>/realtime.ts`）并由 `methods` 编排生命周期。
2. 页面/组件层禁止直接 `new WebSocket(...)`。

### 前端表单规范（强制）

**所有表单必须使用 `react-hook-form` + `zod` 组合**，禁止使用多个 `useState` 管理表单状态。

```typescript
// ✅ 正确：使用 react-hook-form + zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const formSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  limit: z.coerce.number().min(1).max(100).default(10),
});

type FormValues = z.infer<typeof formSchema>;

function MyForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: '', limit: 10 },
  });

  const onSubmit = (values: FormValues) => { /* ... */ };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField control={form.control} name="url" render={({ field }) => (
          <FormItem>
            <FormLabel>URL</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </form>
    </Form>
  );
}

// ❌ 错误：使用多个 useState 管理表单
function BadForm() {
  const [url, setUrl] = useState('');
  const [limit, setLimit] = useState(10);
  // ... 难以维护，无类型安全
}
```

**核心原则**：

1. Schema 定义在独立文件（如 `schemas.ts`），类型通过 `z.infer<>` 派生
2. 使用 `/ui` 的 Form 组件（Form, FormField, FormItem, FormLabel, FormControl, FormMessage）
3. 数字字段使用 `z.coerce.number()` 自动转换
4. 折叠状态等 UI 状态可以单独用 `useState`，但表单数据必须走 react-hook-form

---

## Zod 导入规范（强制）

项目使用 **Zod v4**，但前端和后端使用不同的导入方式：

| 场景                                | 导入方式                     | 原因                                                      |
| ----------------------------------- | ---------------------------- | --------------------------------------------------------- |
| **前端表单**（console, www, admin） | `import { z } from 'zod/v3'` | 兼容 `@hookform/resolvers` 类型（已并入 design 核心规范） |
| **后端 server**                     | `import { z } from 'zod'`    | 原生 Zod v4，支持 `z.toJSONSchema()` 等新特性             |

**注意**：

- `zod/v3` 是 Zod v4 提供的兼容层，运行时仍使用 v4 引擎，仅类型签名与 v3 兼容
- 后端不要使用 `zod/v3`，会导致类型身份冲突、增加 TypeScript 推断成本
- 前端不使用 `zod/v3` 会在 Docker 构建时出现 `_zod.version.minor` 类型不兼容错误

---

## 类型与 DTO 规范（Zod 优先）

### 核心原则：单一数据源

**所有请求/响应类型必须使用 `z.infer<>` 从 Zod schema 派生。** 禁止定义重复的 TypeScript 接口。

```typescript
// dto/memory.schema.ts
import { z } from 'zod';
import { createZodDto } from '@wahyubucil/nestjs-zod-openapi';

// Schema 定义
export const CreateMemorySchema = z
  .object({
    content: z.string().min(1).max(10000),
    metadata: z.record(z.unknown()).optional(),
  })
  .openapi('CreateMemoryRequest');

// 类型推断（单一数据源）
export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;

// NestJS 用 DTO 类
export class CreateMemoryDto extends createZodDto(CreateMemorySchema) {}
```

### 反模式

```typescript
// ❌ 错误：重复类型定义
export interface CreateMemoryInput {
  content: string;
} // types.ts
export const CreateMemorySchema = z.object({ content: z.string() }); // schema.ts
// 现在有两个数据源了！

// ✅ 正确：单一数据源
export const CreateMemorySchema = z.object({ content: z.string() });
export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;
```

---

## 代码原则

### 核心原则

1. **单一职责（SRP）**：每个函数/组件只做一件事
2. **开放封闭（OCP）**：对扩展开放，对修改封闭
3. **最小知识（LoD）**：只与直接依赖交互，避免深层调用
4. **依赖倒置（DIP）**：依赖抽象而非具体实现
5. **组合优于继承**：用 Hooks 和组合模式复用逻辑
6. **先查后做**：不确定的事情要联网搜索，使用最新的库版本

### 代码实践

1. **纯函数优先**：逻辑尽量实现为纯函数，便于测试
2. **提前返回**：early return 减少嵌套，提高可读性
3. **职责分离**：常量、工具、逻辑、UI 各司其职
4. **DRY 原则**：相同逻辑抽离复用，不重复自己
5. **避免过早优化**：先保证正确性和可读性

### 禁止事项

1. **不要历史兼容**：无用代码直接删除/重构
2. **不保留废弃注释**：禁止 `// deprecated`、`// removed`、`_unused` 等
3. **不猜测实现**：先搜索确认，再动手修改
4. **不写兼容层**：禁止 `legacyX`、`oldX`、`x_v1` 等内部代码模式
5. **不做补丁式修复**：禁止“新增一层兜底/映射/开关”掩盖根因；必须回到事实源和协议边界做根治

---

## 命名规范

| 类型         | 规范             | 示例                                                               |
| ------------ | ---------------- | ------------------------------------------------------------------ |
| 组件/类型    | PascalCase       | `ScreenshotService`                                                |
| 函数/变量    | camelCase        | `handleScreenshot`                                                 |
| 常量         | UPPER_SNAKE_CASE | `MAX_CONCURRENT`                                                   |
| 组件文件夹   | PascalCase       | `ApiKeyCard/`                                                      |
| 工具文件     | camelCase        | `urlValidator.ts`                                                  |
| API Key 前缀 | 产品特定         | `mf_`（moryflow）、`fx_`（fetchx）、`mx_`（memox）、`sx_`（sandx） |

---

## UI/UX 风格规范

### 设计风格

**参考标准：Notion / Arc**

- 圆润边角，统一使用 shadcn/ui 默认圆角
- 黑白灰为主色调，彩色克制使用
- 留白即设计，避免拥挤
- 阴影微妙克制
- 动效自然流畅
- 图标统一使用 Lucide（`lucide-react`），直接组件调用，禁止 `@hugeicons/*` / `@tabler/icons-react`

### 主题色变量

```css
/* 侧边栏 */
--sidebar-foreground: oklch(0.35 0 0); /* 未选中文字：深灰 */
--sidebar-primary: oklch(0.65 0.18 45); /* 选中文字：橙色 */

/* 强调色 */
--primary: oklch(0.25 0 0); /* 主色：深灰/黑 */
```

### Tailwind CSS v4 注意事项

1. **Data 属性变体**：Radix UI 使用 `data-[state=active]:` 而非 `data-active:`
2. **颜色透明度**：oklch 修饰符可能不生效，使用内联样式
3. **CSS 变量配置**：在 `globals.css` 的 `@theme inline` 块中定义
4. **样式入口**：应用统一 `@import '@moryflow/ui/styles'`，并在应用内补充 `@source` 扫描路径

---

## 安全规范

- **SSRF 防护**：URL 必须通过 `url-validator.ts` 校验
- **私有 IP 屏蔽**：禁止 localhost、内网 IP、云元数据端点
- **API Key 存储**：仅存储 SHA256 哈希，明文仅在创建时显示一次

---

## 测试命令

```bash
# 运行所有测试
pnpm test

# 运行特定产品测试
pnpm --filter @moryflow/server test
pnpm --filter @anyhunt/anyhunt-server test
pnpm --filter @anyhunt/sandx-server test

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint
```

---

## 包命名规范

| 类型     | 模式                       | 示例                                                 |
| -------- | -------------------------- | ---------------------------------------------------- |
| 应用包   | `@anyhunt/{product}-{app}` | `@moryflow/server`、`@anyhunt/anyhunt-server`        |
| 共享包   | `@anyhunt/{name}`          | `@moryflow/types`、`@moryflow/api`、`@moryflow/sync` |
| UI 包    | `@moryflow/ui`             | 唯一                                                 |
| 配置包   | `@anyhunt/{name}-config`   | `@moryflow/eslint-config`                            |
| Agent 包 | `@anyhunt/agents-{name}`   | `@moryflow/agents-runtime`                           |

---

## 包构建规范

### 构建工具：tsc-multi

所有 `packages/` 下的共享包使用 [tsc-multi](https://www.npmjs.com/package/tsc-multi) 构建，支持 ESM/CJS 双格式输出。

### 核心优势

- **自动路径重写**：编译时自动将 `import './foo'` 转换为 `import './foo.js'`
- **双格式输出**：同时生成 `.mjs`（ESM）和 `.cjs`（CJS）
- **无需手写后缀**：源码中保持简洁的无后缀导入

### CI 依赖说明

模型与 thinking 规则共享包已统一到 `@moryflow/model-bank`，构建链路仅保留 `tsc-multi`（`build:agents` -> `build:packages`）。不再依赖 `@moryflow/model-registry-data` 与 `prepare:model-registry-data`。

Electron 相关依赖（`electron-builder` → `@electron/rebuild`）会间接依赖 `@electron/node-gyp`；为避免 CI 走 `git@github.com` 的 SSH clone（无 key 会失败），根 `pnpm.overrides` 固定 `@electron/node-gyp=10.2.0-electron.1`（从 npm registry 安装）。

### 配置文件：tsc-multi.json

每个需要构建的包在根目录创建 `tsc-multi.json`：

```json
{
  "targets": [
    { "extname": ".mjs", "module": "ESNext", "moduleResolution": "Bundler" },
    {
      "extname": ".cjs",
      "module": "CommonJS",
      "moduleResolution": "Node",
      "verbatimModuleSyntax": false
    }
  ]
}
```

运行非默认配置文件时使用 `tsc-multi --config ./path/to/tsc-multi.json`（不要用 `-p`）。

### package.json 配置

```json
{
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "scripts": {
    "build": "tsc-multi",
    "typecheck": "tsc --noEmit"
  }
}
```

### tsconfig.json 配置

```json
{
  "extends": "@moryflow/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### 导入规范

```typescript
// ✅ 正确：源码中不带后缀
export * from './common';
import { ApiError } from './client';

// ❌ 错误：不要手动添加 .js 后缀
export * from './common.js';
import { ApiError } from './client.js';
```

### 包类型分类

| 类型                | 构建方式  | 说明                            |
| ------------------- | --------- | ------------------------------- |
| `packages/types`    | tsc-multi | 纯类型包，需要构建供外部使用    |
| `packages/api`      | tsc-multi | API 客户端，需要 ESM/CJS 双格式 |
| `packages/config`   | tsc-multi | 配置工具，需要 ESM/CJS 双格式   |
| `packages/ui`       | 无需构建  | React 组件，由消费方打包        |
| `packages/agents-*` | tsc-multi | Agent 相关包                    |
| `tooling/*`         | 无需构建  | 配置包，直接使用源码            |

### 开发命令

```bash
# 构建单个包
pnpm --filter @moryflow/types build

# 构建所有包
pnpm -r build

# 类型检查（不构建）
pnpm typecheck
```

---

_版本: 1.2 | 更新日期: 2026-02-07_
