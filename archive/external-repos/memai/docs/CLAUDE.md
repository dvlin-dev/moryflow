# Memai

> See root [`CLAUDE.md`](../CLAUDE.md) for the main AI Agent guide.

## Documentation Structure

**Memory as a Service** - 语义化记忆存储与检索 API 服务。为 AI 应用提供长期记忆能力，支持向量语义搜索、实体提取、关系图谱。

## 核心同步协议（强制）

1. **原子更新规则**：任何代码变更完成后，必须同步更新相关目录的 CLAUDE.md
2. **递归触发**：文件变更 → 更新文件 Header → 更新所属目录 CLAUDE.md → （若影响全局）更新根 CLAUDE.md
3. **分形自治**：任何子目录的 CLAUDE.md 都应让 AI 能独立理解该模块的上下文
4. **禁止历史包袱**：不做向后兼容，无用代码直接删除/重构，不保留废弃注释

> **命名规范**: `CLAUDE.md` 为主文件。`AGENTS.md` 为指向 `CLAUDE.md` 的软链接（兼容 agents.md 规范）。

## 项目结构

| 目录 | 说明 | 详细规范 |
| --- | --- | --- |
| `apps/server/` | 后端 API + Memory 服务（NestJS） | → `apps/server/CLAUDE.md` |
| `apps/console/` | 用户控制台（React + Vite） | → `apps/console/CLAUDE.md` |
| `apps/admin/` | 管理后台（React + Vite） | → `apps/admin/CLAUDE.md` |
| `packages/ui/` | 共享 UI 组件库 | → `packages/ui/CLAUDE.md` |
| `packages/shared-types/` | 共享类型定义 | → `packages/shared-types/CLAUDE.md` |

### 技术栈速查

| 层级 | 技术 |
| --- | --- |
| 前端 | Vite + React + TypeScript + TailwindCSS + shadcn/ui |
| 后端 | NestJS + Prisma + PostgreSQL + pgvector + Redis + BullMQ |
| 向量嵌入 | OpenAI / Aliyun Embedding API |
| 认证 | Better Auth |
| 支付 | Creem |
| 包管理 | pnpm workspace |

## Adding Documentation

When adding new documentation:

```
apps/server/src/
├── auth/           # 认证模块（Better Auth）
├── user/           # 用户管理
├── api-key/        # API Key 管理
├── quota/          # 配额管理
├── memory/         # Memory 服务（核心）
├── entity/         # 实体提取
├── relation/       # 关系图谱
├── embedding/      # 向量嵌入
├── llm/            # LLM 调用
├── payment/        # 支付处理（Creem）
├── webhook/        # Webhook 通知
├── redis/          # Redis 缓存
├── queue/          # BullMQ 队列
├── prisma/         # 数据库
├── email/          # 邮件服务
├── config/         # 配置（套餐定价等）
├── common/         # 公共守卫、装饰器
├── types/          # 共享类型定义
└── health/         # 健康检查
```

### 核心业务流程

1. **Memory 创建流程**：认证 → 配额检查 → 内容向量化 → 存储 → Webhook 通知
2. **Memory 搜索流程**：认证 → 查询向量化 → 相似度搜索 → 结果排序 → 返回
3. **配额扣减规则**：月度订阅配额优先 → 按量购买配额兜底

### API 端点

```
Memory API (v1):
POST   /v1/memories           # 创建记忆
POST   /v1/memories/search    # 语义搜索
GET    /v1/memories           # 列表查询
GET    /v1/memories/:id       # 获取详情
DELETE /v1/memories/:id       # 删除记忆

Entity API (v1):
POST   /v1/entities           # 创建实体
GET    /v1/entities           # 列表查询
DELETE /v1/entities/:id       # 删除实体

Relation API (v1):
POST   /v1/relations          # 创建关系
GET    /v1/relations          # 列表查询
DELETE /v1/relations/:id      # 删除关系
```

## 文档目录

### 核心规范
| 文档 | 说明 |
|------|------|
| [`TECH_SPEC.md`](./TECH_SPEC.md) | 技术架构 - 模块、流程、数据模型 |
| [`TEST_SPEC.md`](./TEST_SPEC.md) | 测试规范 - 分层策略、命名、工具 |

### API 规范 (`api/`)
| 文档 | 说明 |
|------|------|
| [`unified-response.md`](./api/unified-response.md) | 统一响应格式 |
| [`versioning.md`](./api/versioning.md) | API 路由结构 |

### 迁移指南 (`migration/`)
| 文档 | 说明 |
|------|------|
| [`scalar-openapi.md`](./migration/scalar-openapi.md) | Scalar + Zod 迁移 |
| [`console-refactor.md`](./migration/console-refactor.md) | Console 改造记录 |

### 功能规范 (`specs/`)
| 文档 | 说明 |
|------|------|
| [`claude-md.md`](./specs/claude-md.md) | CLAUDE.md 规范 |
| [`oembed-api.md`](./specs/oembed-api.md) | oEmbed API 设计（规划中）|

## 协作总则

- 全程中文沟通、提交、文档
- 先查后做：不猜实现，用搜索对照现有代码
- 不定义业务语义：产品/数据含义先确认需求方
- 复用优先：现有接口、类型、工具优先复用

## 工作流程

1. **计划**：改动前给出最小范围 plan，说明动机与风险
2. **实施**：聚焦单一问题，不盲改
3. **校验**：本地跑 lint/typecheck（`pnpm typecheck`），通过再提交
4. **同步**：更新相关 CLAUDE.md（本条强制）

## 文件头注释规范

关键文件需在开头添加注释，格式根据文件类型选择：

| 文件类型 | 格式 |
| --- | --- |
| 服务/逻辑 | `[INPUT]` / `[OUTPUT]` / `[POS]` |
| React 组件 | `[PROPS]` / `[EMITS]` / `[POS]` |
| 工具函数集 | `[PROVIDES]` / `[DEPENDS]` / `[POS]` |
| 类型定义 | `[DEFINES]` / `[USED_BY]` / `[POS]` |

示例：

```typescript
/**
 * [INPUT]: MemoryCreateRequest - Memory 创建请求参数
 * [OUTPUT]: MemoryResponse - Memory 结果或错误
 * [POS]: Memory 服务核心，被 memory.controller.ts 调用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */
```

## 目录规范

组件或模块目录结构：

- `index.ts` - 入口/导出
- `*.controller.ts` - 路由控制器（后端）
- `*.service.ts` - 业务逻辑
- `*.module.ts` - NestJS 模块定义
- `*.types.ts` - 模块类型定义（必须独立文件）
- `*.constants.ts` - 模块常量配置（必须独立文件）
- `dto/` - 数据传输对象（使用 Zod）
- `components/` - 子组件（前端）

## 类型与 DTO 规范

### DTO 验证（强制使用 Zod）

所有请求 DTO 必须使用 Zod schema 进行运行时验证：

```typescript
// ✅ 正确：使用 Zod schema
// dto/create-memory.dto.ts
import { z } from 'zod';

export const createMemorySchema = z.object({
  content: z.string().min(1).max(10000),
  userId: z.string().min(1),
  agentId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateMemoryDto = z.infer<typeof createMemorySchema>;
```

### 类型文件组织（禁止内联）

类型定义必须放在独立的 `*.types.ts` 文件中，禁止在业务代码中内联定义。

## 代码原则

### 核心原则

1. **单一职责（SRP）**：每个函数/组件只做一件事
2. **开放封闭（OCP）**：对扩展开放，对修改封闭
3. **最小知识（LoD）**：只与直接依赖交互，避免深层调用
4. **依赖倒置（DIP）**：依赖抽象而非具体实现
5. **组合优于继承**：用 Hooks 和组合模式复用逻辑

### 禁止事项

1. **不要历史兼容**：无用代码直接删除/重构
2. **不保留废弃注释**：禁止 `// deprecated`、`// removed`、`_unused` 等
3. **不猜测实现**：先搜索确认，再动手修改

### 零兼容原则（强制）

**默认不兼容旧代码/数据，直接按最佳实践重构。**

| 场景 | 处理方式 |
| --- | --- |
| **用户数据**（数据库记录、用户文件） | ⚠️ 唯一需要兼容的场景，必须写迁移脚本 |
| **内部代码**（函数、类、模块） | ❌ 不兼容，直接重构/删除/重写 |
| **内部类型**（接口、DTO、常量） | ❌ 不兼容，直接改名/重构 |
| **配置文件**（非用户配置） | ❌ 不兼容，直接更新格式 |
| **API 内部调用**（服务间通信） | ❌ 不兼容，同步更新调用方 |
| **测试数据/Mock** | ❌ 不兼容，直接删除重写 |

**判断标准**：
- 问自己："这个改动会不会丢失用户已有的数据？"
- 如果是 → 写迁移脚本
- 如果否 → 直接重构，不要留任何兼容代码

## 命名规范

| 类型 | 规范 | 示例 |
| --- | --- | --- |
| 组件/类型 | PascalCase | `MemoryService` |
| 函数/变量 | camelCase | `handleCreateMemory` |
| 常量 | UPPER_SNAKE_CASE | `MAX_CONTENT_LENGTH` |
| API Key 前缀 | `mm_` | `mm_abc123...` |

## 语言规范

| 场景 | 语言 | 说明 |
| --- | --- | --- |
| 文档/注释/提交 | 中文 | 沟通一致性 |
| 代码标识符 | 英文 | 编程惯例 |
| API 错误码 | 英文 | `QUOTA_EXCEEDED` |
| 用户界面（UI） | 英文 | 面向国外用户 |

## UI/UX 样式规范

### 设计风格

**Boxy and Sharp** - 方正锐利的设计风格。所有 UI 元素采用直角，禁止圆角。整体色调为柔和的黑白灰，强调色为橙色。

### 圆角规范（强制）

**全局禁止圆角**，所有组件必须使用 `rounded-none`。

## 关键业务规则

### 套餐与配额

| 套餐 | 月费 | 月度配额 |
| --- | --- | --- |
| FREE | $0 | 1,000 |
| HOBBY | $19 | 50,000 |
| ENTERPRISE | 定制 | 无限制 |

### Webhook 事件

| 事件 | 说明 |
| --- | --- |
| `memory.created` | Memory 创建成功 |
| `memory.updated` | Memory 更新成功 |
| `memory.deleted` | Memory 删除成功 |

### 安全要点

- **API Key 存储**：仅存储 SHA256 hash，明文仅创建时显示一次
- **数据隔离**：所有数据按 API Key 隔离，防止越权访问

---

*版本: 2.1 | 更新: 2026-01*
