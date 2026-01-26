---
title: Anyhunt Server Memox Core - Mem0 对标改造计划
date: 2026-01-24
scope: apps/anyhunt/server (memory/entity/relation/graph/embedding/vector-prisma + console/www)
status: in_progress
---

<!--
[INPUT]: Mem0 API Reference（https://docs.mem0.ai/api-reference）与 OpenAPI（https://docs.mem0.ai/openapi.json）+ 当前 Memox 实现
[OUTPUT]: Mem0 严格对标的改造计划（接口/字段/逻辑/数据模型/测试/文档）
[POS]: Phase 2 / P1 模块规划（Anyhunt Server：Memox Core）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt Server Memox Core - Mem0 对标改造计划

## 目标与强制约束（来自需求确认）

- **对齐 Mem0 的请求字段与核心数据结构**：接口路径与字段命名（snake_case）对齐；响应仅要求核心数据结构/语义一致，外层包装与状态码沿用当前项目规范。
- **允许新增 Mem0 风格端点**：以 Mem0 API 作为唯一对标规范。
- **enable_graph 必须实现**：Memory 写入时可生成图谱实体/关系。
- **Search Filters 与 Mem0 保持一致**：支持 AND/OR/NOT、比较/包含/通配符等运算。
- **导出存储使用 R2**：支持导出作业与获取导出结果。
- **补齐 Users/Entities 能力**。
- **规范遵循当前项目**：API base、错误格式与响应包装沿用现有项目规范，但核心数据结构与语义对齐 Mem0。
- **仅保留 V1**：当前平台无历史用户与历史版本，所有对标能力统一落在 V1。
- **无历史兼容**：移除旧接口与旧字段（不保留兼容层/旧路径）。
- **DB 可重置**：若结构改动较大，可删除旧迁移并执行 reset/init。
- **Search（Fetchx）不属于 Memox**：`/api/v1/search` 仍归 Fetchx，仅 Mem0 的 memory search 在 Memox 范围内。
- **删除 Graph/Relation 公共 API**：不保留 `/api/v1/graph`、`/api/v1/relations` 对外路径；图谱关系仅由 Memory 输出聚合得到。
- **Entities 语义切换为 Mem0**：entities 仅指 `user/agent/app/run` 等维度；图谱实体只存在于 Memory 输出（`entities/relations`）。
- **鉴权统一为 Bearer**：全局改为 `Authorization: Bearer <API_KEY>`（影响所有 API Key 端点）。
- **Console 仅调用公共 API**：不再使用 `console/*` 的 Memox 专用接口。

## 关键决策与保留点（必须记录，防止遗失）

- **图谱展示策略**：前端通过 `GET /v1/memories`（`output_format=v1.1`）聚合 `entities/relations` 生成图谱视图；不提供服务端 Graph/Relation 查询 API。
- **抽取策略**：`enable_graph=true` 使用现有 LLM 能力抽取实体/关系并回填到 Memory 输出。
- **DB 处理**：确认删除旧迁移并执行 `migrate reset + init`（无历史兼容）。

## 当前实现状态（已同步到代码）

### 已完成

- Memory 全量对齐 Mem0 v1：`create/list/search/get/update/delete/history/batch/feedback/exports` 已实现。
- Filters DSL 已实现：支持 `AND/OR/NOT` 与 `in/gte/lte/gt/lt/ne/contains/icontains/*`，用于 list/search/export。
- `enable_graph` 已实现：基于现有 LLM 抽取 entities/relations。
- Bearer 认证已统一：`Authorization: Bearer <API_KEY>`。
- R2 导出已实现：导出作业写入 R2 并通过 `/v1/exports/get` 获取。
- Entities 语义已切换为 Mem0：仅 `user/agent/app/run`，Graph/Relation 公共 API 已删除。
- 向量库迁移已重置为单一 init（无历史兼容）。

### 仍需标记（暂缓）

- `GET /v1/events/` 与 `GET /v1/memories/events/`（Mem0 OpenAPI 存在，但当前未实现）。
- Organizations/Projects/Webhooks 等平台能力。

## 当前实现需求梳理（基于现有代码）

### 后端（Anyhunt Server）

- 归属范围：`memory/`、`entity/`、`relation/`、`graph/`、`embedding/`、`vector-prisma/`，以及 memox 计费项（`billing.rules.ts` 的 `memox.memory.*`）。

- 公网 API（API Key，`Authorization: Bearer <apiKey>`）：
  - Memory：`POST /api/v1/memories`（`userId + content + tags/source/importance`）、`POST /api/v1/memories/search`（`query + limit + threshold + userId`）、`GET /api/v1/memories`（`userId + limit/offset`）、`GET /api/v1/memories/:id`、`DELETE /api/v1/memories/:id`、`DELETE /api/v1/memories/user/:userId`。
  - Entity：`POST /api/v1/entities`、`POST /api/v1/entities/batch`、`GET /api/v1/entities`（`userId + type + limit/offset`）、`GET /api/v1/entities/:id`、`DELETE /api/v1/entities/:id`。
  - Entity Filters：`GET /api/v1/entities/filters`。
  - Graph/Relation 公共 API 已删除（图谱由 Memories 响应聚合）。
- Console 前端（API Key 认证）：
  - Memories/Entities/Graph 均通过公网 API 访问与聚合。
- Embedding：OpenAI embedding（`apps/anyhunt/server/src/embedding`），仅被 Memory 创建/搜索调用。
- 存储：pgvector（`apps/anyhunt/server/prisma/vector/schema.prisma`）存 Memory/Entity/Relation。
- 当前接口风格：`/api/v1/*` + camelCase 字段 + 全局响应包装（`success/data/timestamp`）。

### 前端（Anyhunt Console）

- Memox Playground：API Key 直连 `POST /api/v1/memories`、`POST /api/v1/memories/search`，表单字段为 `userId/content/agentId/sessionId/tags/source/importance`。
- Memories/Entities 列表：API Key 直连 `/api/v1/memories` + `/api/v1/entities`。
- Graph 页面：基于 `/api/v1/memories` 返回的 `entities/relations` 聚合渲染。

**结论**：当前实现基于自定义 Memory/Entity/Relation/Graph 语义（camelCase + content/tags/importance/sessionId），与 Mem0 的 API 结构、字段语义与行为差异较大。

## 功能实现与前端接入现状（对标 Mem0）

### 已实现（但字段/协议不一致）

- Memory：create/search/list/get/delete（V1），字段为 `content/userId/agentId/sessionId`，响应结构为 `success/data` 包装。
- Entity/Relation/Graph：提供独立 CRUD 与图谱查询 API（Mem0 并无同名公共 API）。
- Console：Memories/Entities 列表 + 导出（直接返回文件，未走 R2）。

### 未实现（Mem0 必需但缺失）

- `GET /v1/memories/{memory_id}/history/`（History）
- `PUT /v1/memories/{memory_id}/`（Update）
- `DELETE /v1/memories/`（按 filter 删除）
- `PUT /v1/batch/`、`DELETE /v1/batch/`（批量更新/删除）
- `POST /v1/feedback/`
- `POST /v1/exports/` + `POST /v1/exports/get`（R2 导出）
- `GET /v1/entities/filters/`、`GET /v1/events/`（OpenAPI 里存在）
- `enable_graph` 的自动实体/关系抽取

### 前端未接入（Mem0 对标后需要补齐）

- Mem0 的 `messages/infer/async_mode/output_format` 等输入字段与响应结构；
- `entities/relations` 作为 Memory 返回的一部分（`output_format=v1.1`）；
- Exports/History/Feedback 的 Console 管理入口（通过公共 API 调用）。

**结论**：当前实现不符合 Mem0 的接口路径、字段命名、响应结构与能力矩阵，需要整体重构。

## Mem0 规范基准（对标来源）

- API 文档：`https://docs.mem0.ai/api-reference`
- OpenAPI：`https://docs.mem0.ai/openapi.json`
- Base URL：`https://api.mem0.ai/`
- Auth Header：`Authorization: Token <MEM0_API_KEY>`
- 命名风格：snake_case
- 版本：仅 V1（不保留 V2 路由，但需吸收高级 filters 能力）
- 输出格式：`output_format = v1.1`（推荐，结果包裹在 `results`）；`v1.0` 将废弃
- Anyhunt 对标落地：`https://server.anyhunt.app/api/v1`（遵循当前项目 API 规范）

> 计划以 Mem0 OpenAPI + 文档为唯一真源；若 OpenAPI 与文档不一致，以文档为准并记录差异。

## Code Review 发现（按严重度排序）

### P0（必须优先修复）

1. **SQL 注入风险：MemoryRepository 使用 `$queryRawUnsafe` 且拼接用户输入**
   - 位置：`apps/anyhunt/server/src/memory/memory.repository.ts:31`、`apps/anyhunt/server/src/memory/memory.repository.ts:84`
   - 触发点：`userId/agentId/sessionId/source/tags/metadata` 直接拼接进 SQL；`apiKeyId` 与 `metadata` 亦未参数化。
   - 影响：可被构造输入绕过过滤或执行任意 SQL，导致跨租户数据泄露/破坏。
   - 最佳实践：用参数化 `$queryRaw` + `Prisma.sql` 或改用 Prisma `create/findMany`，对 `vector` 检索使用安全的 `queryRaw` 参数绑定。
   - **状态**：已修复（改为参数化 SQL + DSL 过滤器）。

### P1（功能缺失/严重不一致）

1. **接口与字段体系与 Mem0 差异过大，无法直接兼容**
   - 现状：`content/userId/agentId/sessionId/tags/importance` + camelCase + `success/data` 包装。
   - Mem0：`memory/messages/user_id/agent_id/app_id/run_id/metadata/categories/keywords` + snake_case + 事件数组/原始数组输出。
   - 影响：任意 Mem0 SDK/示例调用无法直接复用，现有 Console/Playground 也需大改。
   - **状态**：已修复（字段/端点已对齐）。

2. **Mem0 必需能力缺失**
   - 缺失：`history/update/delete-by-filter/batch/feedback/exports`、`entities/filters`、`events`。
   - 影响：能力矩阵不完整，无法对标 Mem0 的核心流程（尤其 history/feedback/export）。
   - **状态**：除 `events` 外已补齐；`events` 暂缓。

3. **`enable_graph` 未实现，Graph 结构与 Mem0 输出不一致**
   - 现状：Graph 依赖手动 Entity/Relation CRUD；Memory 写入不触发实体/关系抽取。
   - 影响：Mem0 的 `output_format=v1.1` 语义无法复刻，Graph 与 Memory 脱节。
   - **状态**：已修复（LLM 抽取 entities/relations）。

4. **鉴权协议不一致（Bearer vs Token）**
   - 现状：`Authorization: Bearer <apiKey>`（服务端 guard 与 Console ApiKeyClient）。
   - Mem0：`Authorization: Token <apiKey>`。
   - 影响：文档与 SDK/示例对齐困难，增加迁移成本。
   - **状态**：已确认使用 Bearer 并同步文档。

5. **导出未走 R2，仍为同步导出**
   - 现状：Console 直接返回 CSV/JSON，未异步作业、未落 R2。
   - 影响：与 Mem0 的导出模型和平台能力不一致。
   - **状态**：已修复（R2 export）。

6. **Search Filters DSL 缺失**
   - 现状：仅支持 `userId/agentId/sessionId` 过滤，无 `filters` 逻辑与比较操作。
   - 影响：无法对齐 Mem0 的高级过滤与可组合查询能力。
   - **状态**：已修复（DSL 已实现）。

7. **Entities 语义与 Mem0 不一致，Graph/Relation 公共 API 需删除**
   - 现状：`/entities` 对外暴露图谱实体；`/graph`、`/relations` 对外暴露图谱查询与关系 CRUD。
   - Mem0：entities 仅指 `user/agent/app/run` 等归属维度；图谱仅作为 memory 输出。
   - 影响：与 Mem0 定位冲突，需删除公共接口并迁移到 memory 输出聚合。
   - **状态**：已修复（实体语义切换 + 公共 API 删除）。

### P2（最佳实践与体验问题）

1. **Graph 查询存在 N+1 与串行瓶颈**
   - 位置：`apps/anyhunt/server/src/graph/graph.service.ts`
   - 现状：遍历与邻居查询按节点逐个 `findById`。
   - 影响：大图谱时延明显增长，可改为批量预取或一次性 join。

2. **Embedding 维度固定 1536 为当前约束（已确认）**
   - 位置：`apps/anyhunt/server/prisma/vector/schema.prisma` + `apps/anyhunt/server/src/embedding/embedding.service.ts`
   - 说明：短期不更换 embedding 模型，维度暂时写死；此项不作为问题追踪。

## 目标接口清单（Mem0 全量对标）

### Memory API（必须实现，仅 V1）

- `POST /v1/memories/`（Add Memories）
  - 请求：MemoryInput（含 `messages`, `infer`, `async_mode`, `enable_graph`, `output_format`, `includes`, `excludes`, `custom_instructions`, `custom_categories`, `timestamp`, `immutable`, `expiration_date`, `user_id/agent_id/app_id/run_id/org_id/project_id` 等）
  - 响应：`[{ id, event, data: { memory } }]`
- `GET /v1/memories/`（Get Memories v1）
  - 查询参数：`user_id`, `agent_id`, `app_id`, `run_id`, `metadata`, `categories`, `org_id`, `project_id`, `fields`, `keywords`, `page`, `page_size`, `start_date`, `end_date`
  - 增强能力：吸收 Mem0 高级 filters 的 DSL（AND/OR/NOT + 比较运算），保持能力一致
  - 响应：核心结构一致（`id`, `memory`, `created_at`, `updated_at` 等），允许包装字段差异
- `DELETE /v1/memories/`（Delete Memories by filter）
  - 查询参数：`user_id`, `agent_id`, `app_id`, `run_id`, `metadata`, `org_id`, `project_id`
- `POST /v1/memories/search/`（Search v1）
  - 请求：`query`, `top_k`, `metadata`, `categories`, `fields`, `filter_memories`, `keyword_search`, `only_metadata_based_search`, `rerank`, `user_id/agent_id/app_id/run_id/org_id/project_id`, `output_format`
  - 增强能力：支持 Mem0 高级 filters DSL、`threshold`、`score` 等能力（但仍保持 V1 路由）
  - 响应：核心结构一致（`memories`/`results` 的语义一致），允许包装字段差异
- `GET /v1/memories/{memory_id}/`（Get Memory）
- `PUT /v1/memories/{memory_id}/`（Update Memory）
- `DELETE /v1/memories/{memory_id}/`（Delete Memory）
- `GET /v1/memories/{memory_id}/history/`（Memory History）
- `PUT /v1/batch/`（Batch Update, max 1000）
- `DELETE /v1/batch/`（Batch Delete, max 1000）
- `POST /v1/feedback/`（Feedback）
- `POST /v1/exports/`（Create Export Job）
- `POST /v1/exports/get`（Get Export）
- `GET /v1/memories/{entity_type}/{entity_id}/`（Mem0 OpenAPI 存在，响应未定义）
- `GET /v1/memories/events/`（Mem0 OpenAPI 存在，响应未定义）

> 以上为**强制对标**。仅保留 V1，`/api/v1/memories` 为最终路径，不保留旧版本或旧字段。

### Entities / Users（必须实现，仅 V1）

- `GET /v1/entities/`（Get Users/Entities）
  - 返回：`[{ id, name, type, total_memories, owner, organization, metadata, created_at, updated_at }]`
- `GET /v1/entities/{entity_type}/{entity_id}/`（Get Entity Details，承接 Mem0 高级能力）
- `DELETE /v1/entities/{entity_type}/{entity_id}/`（Delete Entity，承接 Mem0 高级能力）
- `POST /v1/users/`（Create User）
- `GET /v1/entities/filters/`（OpenAPI 存在但文档不清晰，需要补齐行为定义）

### 平台化能力（暂缓，但需在文档标注）

- `GET /v1/events/`（事件列表）
- Organizations/Projects（`/api/v1/orgs/*`）
- Webhooks（`/api/v1/webhooks/*`）

### 明确删除（不再对外提供）

- `/api/v1/graph`（公共图谱查询）
- `/api/v1/relations`（公共关系 CRUD）

## 关键字段对齐（Mem0 → Anyhunt 统一）

- 字段命名：全部使用 snake_case（`user_id`, `agent_id`, `app_id`, `run_id`, `created_at`）。
- 主要字段：
  - `memory`（替代 `content`）
  - `messages`（保存原始对话输入）
  - `metadata`（JSON）
  - `categories` / `keywords`
  - `hash`（内容哈希）
  - `immutable` / `expiration_date`
  - `output_format`（v1.0 默认）
- `version`（保留字段，当前仅接受 v1）
- `org_id` / `project_id`（即使平台功能未启用，也需字段对齐）
- 鉴权：`Authorization: Bearer <API_KEY>`。

## 字段清单（对标 Mem0，作为 DTO 设计依据）

### MemoryInput（POST /v1/memories/）

- 归属字段：`user_id`, `agent_id`, `app_id`, `run_id`, `org_id`, `project_id`
- 内容字段：`messages`（role/content 数组）或 `memory/text`（infer=false）
- 行为控制：`infer`（默认 true）、`async_mode`（默认 true）、`output_format`（默认 v1.1）、`version`（仅 v1）
- 约束/策略：`includes`, `excludes`, `custom_instructions`, `custom_categories`
- 元信息：`metadata`, `timestamp`（Unix）、`immutable`, `expiration_date`
- 图谱：`enable_graph`（文档存在，OpenAPI 未显式列出，但需支持）

### MemorySearchInput（POST /v1/memories/search/，含高级 filters）

- 必填：`query`
- 过滤：`user_id`, `agent_id`, `app_id`, `run_id`, `metadata`, `categories`, `keywords`, `start_date`, `end_date`
- 控制：`top_k`, `threshold`, `rerank`, `fields`, `filter_memories`, `keyword_search`, `only_metadata_based_search`, `output_format`
- 组织维度：`org_id`, `project_id`
- Filters DSL：
  - 逻辑：`AND` / `OR` / `NOT`
  - 比较：`in`, `gte`, `lte`, `gt`, `lt`, `ne`, `contains`, `icontains`, `*`
  - categories 支持 `contains` / `in`

### MemoryGetInput（GET /v1/memories/，含高级 filters）

- 基础过滤：`user_id`, `agent_id`, `app_id`, `run_id`, `metadata`, `categories`, `keywords`, `start_date`, `end_date`
- 分页：`page`, `page_size`
- 控制：`fields`, `output_format`
- 组织维度：`org_id`, `project_id`
- 高级过滤：`filters`（JSON 字符串，支持 DSL；GET 语义下承载复杂过滤）

### 关键响应结构（核心结构一致）

- Add：`[{ id, event, data: { memory } }]`
- Search：`{ memories: [{ id, memory, metadata, score, created_at, updated_at, user_id, agent_id, ... }] }`
- Get：`{ results: [...], total }` 或等价结构（核心字段一致）
- History：`[{ id, memory_id, input, old_memory, new_memory, user_id, event, metadata, created_at, updated_at }]`
- 允许包装字段差异：仅要求核心字段与语义一致（如 `results`/`memories` 的语义一致）

## 核心逻辑改造计划（重点）

### 1) Memory 写入（POST /v1/memories/）

- 输入：
  - 优先处理 `messages`（role+content），用于 inference。
  - 支持 `infer=false` 时直接存储 `memory`/`text`。
  - 支持 `includes` / `excludes` / `custom_instructions` / `custom_categories` 参与抽取。
  - 支持 `async_mode`（默认 true）。
  - 支持 `enable_graph`：写入时抽取实体/关系。
- 处理流程（拟）：
  1. 校验输入 → 生成事件记录（ADD）
  2. 生成 embedding（或队列异步）
  3. 推理/抽取 memories（infer=true）
  4. 存储 Memory + MemoryHistory
  5. 如 enable_graph → 实体/关系写入
  6. 返回事件数组（事件状态统一记录，便于后续 Events API）

### 2) Memory 搜索（POST /v1/memories/search/）

- 核心要求：
  - 支持 AND/OR/NOT 逻辑与比较操作（in/gte/lte/gt/lt/ne/contains/icontains/\*）。
  - `threshold`, `top_k`, `rerank` 与 `fields`。
  - 输出包含 `score`。
- 处理流程（拟）：
  1. 解析 filters AST → 转换为 DB filter + post-filter
  2. 生成 query embedding
  3. 向量检索 + 结构过滤 + rerank
  4. 输出 `memories` 数组

### 3) Memory 获取（GET /v1/memories/）

- 支持 filters + pagination。
- `output_format=v1.1` 时附带 Graph Memory（entities/relations）。

### 4) Memory 更新 / 删除 / 批量操作

- Update：更新 `memory/text` + `metadata`，重算 embedding，写入 history（UPDATE）。
- Delete：物理删除（无兼容要求），写入 history（DELETE）。
- Batch：批量限制 1000，返回 Mem0 风格 message。

### 5) History / Feedback / Exports

- History：读取 MemoryHistory 记录。
- Feedback：落表（memory_id + feedback + reason）。
- Export：
  - `POST /v1/exports/` 创建任务 → 异步构建 JSON → 存入 R2。
  - `POST /v1/exports/get` 读取最新导出结果（读取 R2 JSON 并返回对象）。

### 6) Graph Memory（enable_graph）

- 抽取策略：
  - 初期用 LLM/规则抽取（实体、关系、confidence）。
  - 写入 `Entity` / `Relation` 表（可复用现有表，但字段需对齐）。
- 返回策略：
  - 仅在 `output_format=v1.1` 时返回 entities/relations。
  - Graph 数据结构与 Mem0 示例一致（`entities`/`relations`）。

## 数据模型调整（允许重置）

- Memory 表：新增/重命名字段（`memory`, `messages`, `metadata`, `categories`, `keywords`, `hash`, `immutable`, `expiration_date`, `timestamp`, `owner`, `org_id`, `project_id`）。
- History 表：记录 `event`, `old_memory`, `new_memory`, `input`, `metadata`。
- Feedback 表：记录 `memory_id`, `feedback`, `feedback_reason`。
- Export 表：记录 export job + R2 key + schema + filters。
- Entities/Relations 表：调整字段与 Mem0 输出一致（`type`, `name`, `metadata`, `owner`, `organization`）。

**迁移策略**：

- 删除旧迁移文件 → `prisma migrate reset` → 重新 init。无用户数据，无兼容压力。

## 前端 / 文档同步计划

- Console：
  - Playground / Graph 页面切换到公共 API（Token 认证）与 snake_case 字段。
  - Graph 页面改为 `output_format=v1.1` 聚合 memories 的 `entities/relations` 生成图谱视图。
  - Entities 列表改为 Mem0 结构（`total_memories`, `owner`, `organization`），不再使用图谱实体语义。
  - 移除对已删除接口的调用（`/api/v1/graph`、`/api/v1/relations`、旧 `console/*` Memox 专用接口）。
  - Memory/Entities/Exports/History/Feedback 的页面与类型全部改为 Mem0 数据结构。
- www：
  - Memox landing 的示例请求全部改为 Mem0 风格（Token header + V1）。
- Docs：
  - 更新 `docs/architecture/*` 中 API base 与 Memox path 说明。

## 执行顺序（不写大量代码，仅计划）

1. 定义 Mem0 对标 DTO + API 路由（移除旧接口）。
2. 重构 Memory/Entity/Relation/Graph 数据模型。
3. 实现 create/search/get/update/delete/batch/history/feedback/export。
4. enable_graph + Graph 输出格式接入。
5. Console + www 接入更新。
6. 测试补齐（单元 + 集成 + E2E）。

## 测试计划（必须）

- Unit：filters 解析、search 评分、history/feedback/export。
- Integration：pgvector + R2 导出链路。
- E2E：Memox Playground / Graph 页面完整流程。

## 延期项（记录但暂不做）

- `/v1/events/`（事件列表）
- `/api/v1/orgs/*`（组织/项目）
- `/api/v1/webhooks/*`（Webhook）

> 以上延期项需在后续阶段补齐，但当前不实现。

## 行为准则（执行时必须遵守）

- 不做历史兼容，旧接口/旧结构直接删除。
- 数据结构若大改，允许直接 reset 数据库。
- 删除旧迁移文件后重新 init。
