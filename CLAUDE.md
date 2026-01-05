# Aiget 统一平台

> 本文档是 AI Agent 的核心指南。遵循 [agents.md 规范](https://agents.md/)。

## 项目概述

**Aiget** 是一个统一平台，采用「核心产品 + 原子能力」架构：

**核心产品**：

- **Moryflow** - 笔记 AI 工作流 + 网站发布（调用下层原子能力）

**原子能力**：

- **Fetchx** - 网页数据 API（抓取、爬取、数据提取）
- **Memox** - AI 记忆 API（为 AI 应用提供长期记忆）
- **Sandx** - Agent 沙盒（安全隔离的代码执行环境，规划中）

所有产品共享统一的身份系统、积分钱包和订阅管理。

---

## 源仓库地址（迁移参考）

以下是正在迁移到此 Monorepo 的原始仓库：

| 产品              | 绝对路径                          | 说明                                 |
| ----------------- | --------------------------------- | ------------------------------------ |
| Fetchx (原 AIGET) | `/Users/zhangbaolin/code/me/fetchx`   | 网页抓取与数据提取平台（仓库已更名） |
| Memox (原 MEMAI)  | `/Users/zhangbaolin/code/me/memai`    | AI 记忆与知识图谱服务                |
| Moryflow          | `/Users/zhangbaolin/code/me/moryflow` | 笔记 AI 工作流 + 网站发布（核心产品）|

---

## 核心同步协议（强制）

1. **原子更新规则**：任何代码变更完成后，必须同步更新相关目录的 CLAUDE.md
2. **递归触发**：文件变更 → 更新文件 Header → 更新所属目录 CLAUDE.md → （若影响全局）更新根 CLAUDE.md
3. **分形自治**：任何子目录的 CLAUDE.md 都应让 AI 能独立理解该模块的上下文
4. **禁止历史包袱**：不做向后兼容，无用代码直接删除/重构，不保留废弃注释
5. **零兼容原则**：除非直接影响用户已有数据，否则一律不兼容旧代码/旧数据结构，按最佳实践重构

> **命名约定**：`CLAUDE.md` 是主文件，`AGENTS.md` 是指向 `CLAUDE.md` 的软链接，用于兼容 agents.md 规范。

---

## 项目结构

### 域名规划

| 服务                | 域名                  | 说明                         |
| ------------------- | --------------------- | ---------------------------- |
| **Moryflow 主站**   | moryflow.com          | 核心产品主入口               |
| **Moryflow 发布站** | moryflow.app          | 用户发布的网站               |
| **Aiget 平台**      | aiget.dev             | 统一平台入口                 |
| **统一控制台**      | console.aiget.dev     | 用户管理所有产品             |
| **统一管理后台**    | admin.aiget.dev       | 运营管理                     |
| **统一文档**        | docs.aiget.dev        | 文档站                       |
| **Moryflow API**    | moryflow.aiget.dev    | 核心产品 API 服务            |
| **Fetchx API**      | fetchx.aiget.dev      | 原子能力：网页抓取           |
| **Memox API**       | memox.aiget.dev       | 原子能力：AI 记忆            |
| **Sandx API**       | sandx.aiget.dev       | 原子能力：Agent 沙盒         |

> - Moryflow 是核心产品，拥有独立域名 moryflow.com / moryflow.app
> - Aiget 是基础设施平台，所有 API 服务统一使用 *.aiget.dev 子域名
> - API 路径规范：`{product}.aiget.dev/v1/...`（无 `/api` 前缀）

### API Key 前缀

| 类型          | 前缀  | 说明                 |
| ------------- | ----- | -------------------- |
| 平台 Key      | `ag_` | 可访问所有产品 API   |
| Moryflow Key  | `mf_` | 核心产品             |
| Fetchx Key    | `fx_` | 原子能力：网页抓取   |
| Memox Key     | `mx_` | 原子能力：AI 记忆    |
| Sandx Key     | `sx_` | 原子能力：Agent 沙盒 |

### 目标 Monorepo 结构

```
Aiget/
├── apps/
│   ├── auth/                        # 统一认证服务
│   │   └── server/                  # 认证服务后端
│   ├── console/                     # 统一用户控制台 ⭐
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── dashboard/       # 统一仪表盘
│   │       │   ├── moryflow/        # Moryflow 功能模块（核心）
│   │       │   ├── fetchx/          # Fetchx 功能模块
│   │       │   ├── memox/           # Memox 功能模块
│   │       │   ├── sandx/           # Sandx 功能模块
│   │       │   ├── wallet/          # 钱包管理
│   │       │   ├── subscription/    # 订阅管理
│   │       │   ├── api-keys/        # API Key 管理
│   │       │   └── settings/        # 账户设置
│   │       └── ...
│   ├── admin/                       # 统一管理后台 ⭐
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── users/           # 用户管理
│   │       │   ├── subscriptions/   # 订阅管理
│   │       │   ├── credits/         # 积分管理
│   │       │   ├── moryflow/        # Moryflow 运营（核心）
│   │       │   ├── fetchx/          # Fetchx 运营
│   │       │   ├── memox/           # Memox 运营
│   │       │   ├── sandx/           # Sandx 运营
│   │       │   └── analytics/       # 数据分析
│   │       └── ...
│   ├── moryflow/                    # Moryflow 核心产品（笔记 AI 工作流）
│   │   ├── server/                  # 工作流服务
│   │   ├── mobile/                  # 移动端应用
│   │   ├── pc/                      # 桌面端应用
│   │   ├── site-template/           # SSG 网站模板
│   │   └── www/                     # 落地页（moryflow.com）
│   ├── fetchx/                      # 原子能力：网页抓取
│   │   ├── server/                  # 网页抓取服务
│   │   └── www/                     # 落地页
│   ├── memox/                       # 原子能力：AI 记忆
│   │   ├── server/                  # AI 记忆服务
│   │   └── www/                     # 落地页
│   ├── sandx/                       # 原子能力：Agent 沙盒（规划中）
│   │   ├── server/                  # 沙盒执行服务
│   │   └── www/                     # 落地页
│   └── docs/                        # 统一文档站
├── packages/
│   ├── ui/                          # 统一 UI 组件库（shadcn/ui）
│   ├── types/                       # 跨产品共享类型
│   ├── api/                         # API 客户端工具
│   ├── auth/                        # 认证客户端
│   ├── config/                      # 共享配置
│   ├── sync/                        # 云同步工具（来自 Moryflow）
│   ├── tiptap/                      # Tiptap 编辑器（来自 Moryflow）
│   ├── agents-core/                 # Agent 核心（来自 Moryflow）
│   ├── agents-*/                    # Agent 相关包
│   └── scraper-core/                # 抓取核心（来自 Fetchx）
├── tooling/
│   ├── eslint-config/               # ESLint 配置
│   ├── typescript-config/           # TypeScript 配置
│   └── tailwind-config/             # Tailwind 配置
├── deploy/                          # 部署配置目录
│   ├── templates/                   # Docker/Nginx 模板
│   ├── auth/                        # Auth 认证服务部署
│   ├── console/                     # Console 部署
│   ├── admin/                       # Admin 部署
│   ├── moryflow/                    # Moryflow 服务部署（核心）
│   ├── fetchx/                      # Fetchx 服务部署
│   ├── memox/                       # Memox 服务部署
│   ├── sandx/                       # Sandx 服务部署
│   ├── docs/                        # 文档站部署
│   ├── infra/                       # 基础设施（DB、Redis）
│   └── docker-compose.all.yml       # 全量部署（开发环境）
├── turbo.json                       # Turborepo 配置
├── pnpm-workspace.yaml
├── package.json
├── CLAUDE.md                        # 本文件
├── AGENTS.md                        # 指向 CLAUDE.md 的软链接
└── unified-identity-platform.md     # 架构设计文档
```

### 技术栈速查

| 层级         | 技术                                                    |
| ------------ | ------------------------------------------------------- |
| 包管理       | pnpm workspace + Turborepo                              |
| 后端         | NestJS 11 + Prisma 7 + PostgreSQL 16 + Redis 7 + BullMQ |
| 前端         | React 19 + Vite + TailwindCSS v4 + shadcn/ui (Radix)    |
| 移动端       | Expo + React Native                                     |
| 桌面端       | Electron + React                                        |
| 认证         | Better Auth                                             |
| 支付         | Creem.io                                                |
| AI/LLM       | OpenAI / Anthropic / Google（通过 Vercel AI SDK）       |
| 向量数据库   | pgvector（PostgreSQL 扩展）                             |
| 浏览器自动化 | Playwright                                              |
| 数据校验     | Zod                                                     |
| 邮件         | Resend                                                  |
| 日志         | Pino                                                    |

---

## 统一身份平台

所有产品共享统一的身份层：

### 订阅等级

| 等级    | 月付 | 年付 | 每月积分 | 产品权限                    |
| ------- | ---- | ---- | -------- | --------------------------- |
| FREE    | $0   | -    | 100      | 所有产品基础功能            |
| STARTER | $9   | $99  | 1,000    | 所有产品基础功能            |
| PRO     | $29  | $299 | 5,000    | 所有产品高级功能            |
| MAX     | $99  | -    | 20,000   | 所有产品全部功能 + 优先支持 |

### 积分加油包（按需购买）

| 套餐 | 价格 | 积分   |
| ---- | ---- | ------ |
| 小包 | $10  | 1,000  |
| 中包 | $30  | 3,000  |
| 大包 | $100 | 10,000 |

### 业务规则

- **单点登录**：一个账号可访问所有产品
- **统一钱包**：积分可在任意产品使用
- **积分优先级**：免费积分 → 订阅积分 → 购买积分
- **预扣机制**：操作前扣除积分，失败时退还

---

## 文档索引

| 文档                                                             | 说明                           |
| ---------------------------------------------------------------- | ------------------------------ |
| [`unified-identity-platform.md`](./unified-identity-platform.md) | 统一身份平台架构设计与迁移计划 |
| `apps/*/CLAUDE.md`                                               | 各应用的详细文档               |
| `packages/*/CLAUDE.md`                                           | 各包的详细文档                 |

---

## 协作总则

- **语言规范**：
  - **开发者相关（中文）**：文档、代码注释、提交信息、CLAUDE.md 等
  - **用户相关（英文）**：界面文案、报错信息、API 响应消息等用户可见内容
- **先查后做**：不猜实现，用搜索对照现有代码
- **不定义业务语义**：产品/数据含义先确认需求方
- **复用优先**：现有接口、类型、工具优先复用
- **参考源仓库**：不确定时查看上面列出的原始仓库

---

## 工作流程

1. **计划**：改动前给出最小范围 plan，说明动机与风险
2. **实施**：聚焦单一问题，不盲改
3. **测试**：新功能必须编写单元测试，修复 bug 需补充回归测试
4. **校验**：完成后必须运行以下命令全部通过：
   ```bash
   pnpm lint        # 代码规范检查
   pnpm typecheck   # 类型检查
   pnpm test:unit   # 单元测试
   ```
5. **同步**：更新相关 CLAUDE.md（本条强制）

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
├── module-name-console.controller.ts # 控制台控制器（SessionGuard）[可选]
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

---

## 命名规范

| 类型         | 规范             | 示例                                                            |
| ------------ | ---------------- | --------------------------------------------------------------- |
| 组件/类型    | PascalCase       | `ScreenshotService`                                             |
| 函数/变量    | camelCase        | `handleScreenshot`                                              |
| 常量         | UPPER_SNAKE_CASE | `MAX_CONCURRENT`                                                |
| 组件文件夹   | PascalCase       | `ApiKeyCard/`                                                   |
| 工具文件     | camelCase        | `urlValidator.ts`                                               |
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
pnpm --filter @aiget/moryflow-server test
pnpm --filter @aiget/fetchx-server test
pnpm --filter @aiget/memox-server test
pnpm --filter @aiget/sandx-server test

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint
```

---

## 包命名规范

| 类型     | 模式                     | 示例                                                   |
| -------- | ------------------------ | ------------------------------------------------------ |
| 应用包   | `@aiget/{product}-{app}` | `@aiget/moryflow-server`、`@aiget/fetchx-server`       |
| 共享包   | `@aiget/{name}`          | `@aiget/types`、`@aiget/api`、`@aiget/sync`            |
| UI 包    | `@aiget/ui`              | 唯一                                                   |
| 配置包   | `@aiget/{name}-config`   | `@aiget/eslint-config`                                 |
| Agent 包 | `@aiget/agents-{name}`   | `@aiget/agents-core`                                   |

---

## 包构建规范

### 构建工具：tsc-multi

所有 `packages/` 下的共享包使用 [tsc-multi](https://www.npmjs.com/package/tsc-multi) 构建，支持 ESM/CJS 双格式输出。

### 核心优势

- **自动路径重写**：编译时自动将 `import './foo'` 转换为 `import './foo.js'`
- **双格式输出**：同时生成 `.mjs`（ESM）和 `.cjs`（CJS）
- **无需手写后缀**：源码中保持简洁的无后缀导入

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
  "extends": "@aiget/typescript-config/base.json",
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
| `packages/auth`     | tsc-multi | 认证客户端，需要 ESM/CJS 双格式 |
| `packages/config`   | tsc-multi | 配置工具，需要 ESM/CJS 双格式   |
| `packages/ui`       | 无需构建  | React 组件，由消费方打包        |
| `packages/agents-*` | tsc-multi | Agent 相关包                    |
| `tooling/*`         | 无需构建  | 配置包，直接使用源码            |

### 开发命令

```bash
# 构建单个包
pnpm --filter @aiget/types build

# 构建所有包
pnpm -r build

# 类型检查（不构建）
pnpm typecheck
```

---

_版本: 1.0 | 创建日期: 2026-01-04_
