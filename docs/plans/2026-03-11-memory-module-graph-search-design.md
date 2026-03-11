# Moryflow PC Memory Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 Moryflow PC 左侧新增独立 `Memory` 模块，并在本期一次性把当前平台已有且对用户有意义的 Memory 能力完整前台化：`Overview / Search / Facts / Graph / Exports` 全部可见、可操作、可验证，同时为后续接入对话流、工作流、MCP 与 Agent runtime 建立统一数据入口。

**Architecture:** 首期采用四层分层架构：Anyhunt 持有 `sources / memory_facts / graph / retrieval / exports` 真相源，Moryflow Server 提供统一 `memory gateway`，PC main 提供统一 `desktopAPI.memory.*` IPC，renderer 只负责模块 UI。首期必须补齐三项关键基础：`graph read API`、`source -> memory_fact` 异步投影链、`MemoryFact` 的来源与证据建模；Search 固定走统一 `retrieval/search`，Facts 固定区分 `manual` 与 `source-derived` 两类，Graph 固定走独立 graph 读模型。

**Tech Stack:** NestJS、Prisma、BullMQ、pgvector、Electron、React、Zustand、Vitest、Playwright

---

## 0. 最终结论

本期 `Memory` 模块应一次性完成以下可见能力：

1. `Overview`
2. `Search`
3. `Facts`
4. `Graph`
5. `Exports`

但“把已有功能全部做出来”的正确方式，不是把当前平台所有低层 API 原样暴露给 PC，而是：

- 把当前对用户有意义的 Memory 能力前台化
- 同时补齐缺失的数据基础与读模型
- 保持 `sources / memory_facts / graph` 三层边界清晰

因此本期必须额外完成：

1. `source -> memory_fact` 正式投影链
2. 独立 `graph read API`
3. Moryflow Server `memory gateway`
4. PC `desktopAPI.memory.*`

## 1. 冻结产品合同

### 1.1 模块目标

在 PC 左侧模块导航中，于 `Skills` 上方新增独立 `Memory` 模块。  
该模块固定承载以下五类用户能力：

1. `Overview`
2. `Search`
3. `Facts`
4. `Graph`
5. `Exports`

本期目标不是做“演示面板”，而是做一个可长期演进的 **Memory Workbench**，用来承接：

- 远端文件记忆检索
- 原子事实浏览与操作
- 关系图谱浏览
- 事实导出

并为未来接入：

- 对话检索
- 工作流引用
- MCP memory tool
- Agent runtime retrieval

预留统一入口。

### 1.2 首期固定范围

本期固定要做完：

- 当前 workspace 对应云端 vault 的 `Overview`
- 当前 workspace 对应云端 vault 的统一搜索
  - `Files`
  - `Facts`
- 当前 workspace 对应 scope 的 `Facts` 视图与操作
- 当前 workspace 对应 scope 的 `Graph` 视图
- 当前 workspace 对应 scope 的 `Exports`

本期固定不做：

- graph 编辑
- entity merge / split
- graph 手工修订
- 跨 workspace 全局 Memory
- 直接接入对话、MCP、Agent runtime

### 1.3 首期边界

#### Sources

- 承担文件、文档、知识源、版本、chunk 的事实源职责
- Search 中 `Files` 结果组必须来自 `sources`

#### Memory Facts

- 承担原子事实、偏好、规则、总结、history、feedback、export 的事实源职责
- Search 中 `Facts` 结果组必须来自 `memory_facts`
- Facts 页主列表必须来自 `MemoryFact`

#### Graph

- 承担实体、关系、observation、evidence 的结构化读模型职责
- Graph 视图必须来自独立 graph read API
- 不允许从搜索结果临时拼装伪图谱

## 2. 当前系统事实

### 2.1 Anyhunt 已存在能力

当前平台已有以下公开能力：

#### `memory/`

- create
- list
- search
- get by id
- update
- delete
- history
- feedback
- batch update
- batch delete
- export create
- export get

对应文件：

- `apps/anyhunt/server/src/memory/memory.controller.ts`
- `apps/anyhunt/server/src/memory/memory-batch.controller.ts`
- `apps/anyhunt/server/src/memory/memory-feedback.controller.ts`
- `apps/anyhunt/server/src/memory/memory-export.controller.ts`
- `apps/anyhunt/server/src/memory/dto/memory.schema.ts`

#### `sources/`

- source identity
- source create
- revision create
- finalize
- reindex
- delete
- source search

#### `retrieval/`

- 统一搜索 `memory_facts + sources`
- 返回 `result_kind = source | memory_fact`
- 可附带 `graph_context`

#### `graph/`

- graph projection
- graph context
- source / memory evidence cleanup
- 当前没有独立 graph read/query API

### 2.2 Moryflow 当前已接入能力

Moryflow 当前稳定接入的是：

- source-first 云端文件检索链
- 当前默认文件搜索链是：
  - `Moryflow Server /api/v1/search`
  - `Anyhunt /api/v1/sources/search`

当前尚未正式接入的是：

- `MemoryFact` 用户可见能力
- `Graph` 用户可见能力
- `Exports` 用户可见能力

### 2.3 当前 plan 中最容易出错的地方

深度 review 后，必须冻结以下事实：

1. 现有 `memory/` API 是平台级、偏 Mem0 协议的低层能力，不能直接原样暴露给 PC UI
2. `Facts` 不能简单理解成“已有 MemoryFact 列表”，因为当前 Moryflow 还没有稳定把 source 内容投影成 facts
3. 如果本期要做 `Facts`，就必须补 `source -> memory_fact` 正式投影链
4. `source-derived facts` 和 `manual facts` 不能共用完全相同的编辑语义
5. Search 首期应统一走 `retrieval/search`，而不是在 PC 端分别 fan-out `sources/search + memories/search`
6. `Exports` 当前本质是 **facts export**，不是整个 Memory 模块的全量导出

## 3. 核心设计判断

### 3.1 本期要把“已有能力”全部前台化，但不是“原始 API 全暴露”

本期要前台化的是：

- 用户真正可理解、可使用的 Memory 能力

而不是：

- source identity
- revision finalize
- graph projection queue
- 批量接口的原始平台协议细节

因此本期 UI 必须是产品化封装，不是 OpenAPI playground。

### 3.2 Facts 必须拆成两类

这是本期最关键的冻结决策。

首期 Facts 固定分为两类：

#### A. Manual Facts

- 用户手动创建的事实
- 允许完整 CRUD
- 允许 batch update/delete
- 允许 feedback
- 允许 export

#### B. Source-Derived Facts

- 从 source 内容异步抽取得到的事实
- 允许：
  - list
  - search
  - detail
  - history
  - feedback
  - export
- 不允许：
  - 任意 update
  - 任意 delete

原因：

- source-derived fact 的真相源是 source 内容
- 如果允许用户直接改写 derived fact，本期会立即破坏 source 与 fact 的一致性
- derived fact 的修改应在后续设计为：
  - hide / dismiss
  - correction proposal
  - promote to manual fact
- 这些能力不属于本期范围

因此，本期正确做法是：

- `manual facts` 全 CRUD
- `source-derived facts` 只读 + feedback

### 3.3 Search 固定走统一 Retrieval

Search 首期必须固定走：

- `POST /api/v1/retrieval/search`

而不是：

- `sources/search`
- `memories/search`

分别 fan-out 后在 PC 端拼接

原因：

1. 平台级统一检索语义属于 Anyhunt，不属于 PC
2. 未来对话/MCP/Agent 也需要复用统一检索入口
3. Search 需要天然支持 `Files + Facts` 双组结果

### 3.4 Graph 必须建立在正式读模型上

Graph 视图不能建立在：

- 搜索结果里的 `graph_context`
- 或临时拼装的节点/边

首期必须先补独立 graph read/query API，然后再做 Graph UI。

### 3.5 Exports 固定是 Facts Export

当前平台已有的 export 是：

- `MemoryFactExport`

因此 `Exports` 视图首期冻结为：

- 当前 scope 的 facts export

不包含：

- Files export
- Graph export

UI 必须明确这个边界，避免误导。

## 4. 关键数据模型修订

### 4.1 必须对 `MemoryFact` 做结构升级

按最佳实践，本期不能只把 source provenance 塞进 `metadata`。  
必须把 `MemoryFact` 升级成能明确表达来源的模型。

推荐新增字段：

- `originKind`
  - `MANUAL`
  - `SOURCE_DERIVED`
- `sourceId?`
- `sourceRevisionId?`
- `sourceChunkId?`
- `derivedKey?`

语义：

- `originKind` 决定事实的编辑权限与展示方式
- `sourceId / sourceRevisionId / sourceChunkId` 承担一等来源关系
- `derivedKey` 作为 source-derived fact 的稳定幂等键

### 4.2 Source-Derived Fact 的替换策略

source-derived facts 必须具备稳定、可重放、可清理的生命周期。

冻结策略：

1. source finalize 成功后，异步抽取 source-derived facts
2. 每条 derived fact 使用稳定 `derivedKey`
3. 以 `(apiKeyId, sourceId, derivedKey)` 作为幂等更新基础
4. 对同一 `sourceId` 上不再出现的旧 derived facts，执行 replace/cleanup
5. derived facts 固定 `immutable=true`

这样才能保证：

- reindex 不会无限累积重复 facts
- rename 不会制造新 facts
- revision 切换后 facts 最终与当前内容对齐

### 4.3 Facts 与 Graph 的证据关系

Graph 不要求只从 facts 投影，也不要求只从 sources 投影。  
但首期必须满足：

- source-derived facts 能回溯到 source evidence
- graph entity / relation 能回溯到 source 或 fact evidence

也就是说：

- source 是原始内容事实源
- fact 是抽取后的原子认知事实源
- graph 是结构化关系读模型

三者关系必须明确，而不能互相替代。

## 5. 产品信息架构

### 5.1 模块位置

- 在 PC 左侧模块导航中新增 `Memory`
- 固定放在 `Skills` 上方
- 与 `Remote Agents / Skills / Sites` 同级

### 5.2 页面结构

`Memory` 模块固定由：

- 顶部 `Overview`
- 二级视图切换：
  - `Search`
  - `Facts`
  - `Graph`
  - `Exports`

组成。

`Search` 是默认落点。  
`Overview` 是固定顶部概览区，不是独立页面。

### 5.3 Search

Search 固定查当前 workspace 对应云端 vault。

固定双组结果：

- `Files`
- `Facts`

其中：

- `Files` 来自 `retrieval/search` 的 `result_kind=source`
- `Facts` 来自 `retrieval/search` 的 `result_kind=memory_fact`

点击行为：

- `Files` 有 `localPath` 时打开本地文件
- `Files` 无 `localPath` 时禁用
- `Facts` 打开事实详情

### 5.4 Facts

Facts 视图固定支持：

- 列表
- 筛选
- 搜索
- 详情
- history
- feedback
- create manual fact
- update/delete manual fact
- batch update/delete manual fact

同时必须清晰区分：

- `Manual`
- `Derived`

推荐 UI 方案：

- 默认 `All`
- 支持按来源筛选 `Manual / Derived`

### 5.5 Graph

Graph 视图固定支持：

- 节点与边浏览
- 平移 / 缩放
- entity detail
- relation detail
- evidence drill-down

不支持：

- graph 编辑
- merge / split
- 人工修边

### 5.6 Exports

Exports 视图固定支持：

- create facts export
- 查看 export 状态
- 拉取 export 结果
- 下载 JSON

文案必须明确：

- 这是 `Facts Export`
- 不是 files export
- 不是 graph export

## 6. 技术方案

### 6.1 Anyhunt 平台

#### A. Graph Read API

新增独立读接口，例如：

- `GET /api/v1/graph/overview`
- `POST /api/v1/graph/query`
- `GET /api/v1/graph/entities/:entityId`

必须支持：

- `user_id`
- `project_id`
- 节点/边分页与限制
- evidence summary
- source / fact evidence 回看

#### B. Source -> MemoryFact Projection Pipeline

新增正式异步投影链：

- finalize source revision
- extract facts
- upsert derived facts
- cleanup stale derived facts

冻结约束：

- facts 投影失败不回滚 source indexed 成功
- facts 投影是 source 的异步增强层
- derived facts 的事实源仍是 source 内容

#### C. Retrieval 保持统一入口

`retrieval/search` 继续作为 Search 主入口，固定承担：

- files + facts 统一检索
- graph context 可选附带
- 通过 `include_sources` / `include_memory_facts` 显式控制结果组
- scope 仍固定收口到当前 workspace 对应 `project_id`

### 6.2 Moryflow Server

新增独立 `memory gateway`，不要继续把所有能力塞进现有 `memox-search-adapter`。

gateway 必须承载：

- overview
- search
- facts list/detail/create/update/delete
- batch ops
- history
- feedback
- graph query
- export create/get

关键约束：

- PC 不直接持有 Anyhunt API key
- gateway 统一做 scope 解析、DTO 适配、错误翻译
- gateway 返回的是 PC 友好的合同，而不是平台原始协议

#### 特别约束：Manual Fact Create 协议

现有平台 `POST /v1/memories` 偏向 messages/infer 协议。  
PC 首期不应把这套原始协议直接暴露给用户。

因此 gateway 必须提供更简单的创建合同，例如：

- `text`
- `metadata`
- `categories`
- `projectId`

再由 gateway 负责映射到底层平台协议。

### 6.3 PC Main

新增统一 IPC：

- `desktopAPI.memory.getOverview()`
- `desktopAPI.memory.search()`
- `desktopAPI.memory.listFacts()`
- `desktopAPI.memory.createFact()`
- `desktopAPI.memory.updateFact()`
- `desktopAPI.memory.deleteFact()`
- `desktopAPI.memory.batchUpdateFacts()`
- `desktopAPI.memory.batchDeleteFacts()`
- `desktopAPI.memory.getFactHistory()`
- `desktopAPI.memory.feedbackFact()`
- `desktopAPI.memory.queryGraph()`
- `desktopAPI.memory.getEntityDetail()`
- `desktopAPI.memory.createExport()`
- `desktopAPI.memory.getExport()`

PC main 负责：

- 当前 workspace / vault scope 收口
- 登录态检查
- 统一错误语义
- 不让 renderer 理解平台契约细节

### 6.4 PC Renderer

新增 `Memory Workbench`：

- 顶部 `Overview`
- `Search`
- `Facts`
- `Graph`
- `Exports`
- 统一详情抽屉

详情层固定承载：

- file detail
- fact detail
- entity detail
- relation detail

## 7. 执行顺序

必须严格按以下顺序推进：

1. 冻结产品与平台合同
2. Anyhunt：补 `MemoryFact` 来源模型
3. Anyhunt：补 `graph read API`
4. Anyhunt：补 `source -> memory_fact` 投影链
5. Moryflow Server：补 `memory gateway`
6. PC main：补 `desktopAPI.memory.*`
7. PC renderer：补 `Memory Workbench`
8. 自动化验证
9. 上线后真实数据验收

原因：

- 如果不先补来源模型，derived facts 会很快失真
- 如果不先补 graph read API，Graph 只能做成伪能力
- 如果不先补 gateway，后续对话/MCP 入口就会再次分叉

## 8. 任务清单

### Task 1: 冻结合同与事实源

**Files:**
- Modify: `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- Modify: `docs/reference/cloud-sync-and-memox-validation.md`
- Modify: `docs/reference/cloud-sync-and-memox-production-validation-playbook.md`
- Modify: `apps/anyhunt/server/src/memory/CLAUDE.md`
- Modify: `apps/anyhunt/server/src/graph/CLAUDE.md`
- Modify: `apps/moryflow/server/src/memox/CLAUDE.md`
- Modify: `apps/moryflow/pc/src/renderer/workspace/CLAUDE.md`

**Step 1: 冻结架构合同**

写明：

- `Memory Workbench = Overview + Search + Facts + Graph + Exports`
- Search 固定走统一 `retrieval/search`
- Facts 固定分 `manual / source-derived`
- source-derived facts 只读 + feedback
- Exports 固定是 facts export
- `graph/` 模块边界正式从“仅内部 projection/context”升级为“包含公开 read/query API”

**Step 2: 冻结验证文档结构**

固定开发期验证与线上真实数据验收章节。

**Step 3: 校验文档**

Run:

```bash
git diff --check -- \
  docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md \
  docs/reference/cloud-sync-and-memox-validation.md \
  docs/reference/cloud-sync-and-memox-production-validation-playbook.md \
  apps/anyhunt/server/src/memory/CLAUDE.md \
  apps/anyhunt/server/src/graph/CLAUDE.md \
  apps/moryflow/server/src/memox/CLAUDE.md \
  apps/moryflow/pc/src/renderer/workspace/CLAUDE.md
```

Expected: PASS

### Task 2: 扩展 `MemoryFact` 来源模型

**Files:**
- Modify: `apps/anyhunt/server/prisma/vector/schema.prisma`
- Create: `apps/anyhunt/server/prisma/vector/migrations/<timestamp>_memory_fact_origin_fields/migration.sql`
- Modify: `apps/anyhunt/server/src/memory/memory.repository.ts`
- Modify: `apps/anyhunt/server/src/memory/memory.service.ts`
- Modify: `apps/anyhunt/server/src/memory/dto/memory.schema.ts`
- Test: `apps/anyhunt/server/src/memory/__tests__/memory-entity.integration.spec.ts`
- Test: `apps/anyhunt/server/src/memory/__tests__/memory.service.spec.ts`

**Step 1: 写失败测试**

覆盖：

- `manual` 与 `source-derived` 的来源区分
- source provenance 字段持久化
- derived facts `immutable=true`

**Step 2: 跑测试确认失败**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/memory/__tests__/memory-entity.integration.spec.ts \
  src/memory/__tests__/memory.service.spec.ts
```

Expected: FAIL

**Step 3: 实现 schema 与 service 收口**

要求：

- 为 `MemoryFact` 增加来源字段
- 不把 provenance 塞进 `metadata` 充当主事实源
- derived fact 默认只读

**Step 4: 复跑测试**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/memory/__tests__/memory-entity.integration.spec.ts \
  src/memory/__tests__/memory.service.spec.ts
```

Expected: PASS

### Task 3: 新增 Graph Read API

**Files:**
- Create: `apps/anyhunt/server/src/graph/dto/graph.schema.ts`
- Create: `apps/anyhunt/server/src/graph/graph.controller.ts`
- Create: `apps/anyhunt/server/src/graph/graph-query.service.ts`
- Create: `apps/anyhunt/server/src/graph/graph-overview.service.ts`
- Modify: `apps/anyhunt/server/src/graph/graph.module.ts`
- Modify: `apps/anyhunt/server/src/graph/index.ts`
- Test: `apps/anyhunt/server/src/graph/__tests__/graph.controller.spec.ts`
- Test: `apps/anyhunt/server/src/graph/__tests__/graph-query.service.spec.ts`
- Test: `apps/anyhunt/server/src/graph/__tests__/graph-overview.service.spec.ts`

**Step 1: 写失败测试**

覆盖：

- overview
- query
- entity detail
- evidence summary
- `user_id + project_id` scope

**Step 2: 跑测试确认失败**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/graph/__tests__/graph.controller.spec.ts \
  src/graph/__tests__/graph-query.service.spec.ts \
  src/graph/__tests__/graph-overview.service.spec.ts
```

Expected: FAIL

**Step 3: 实现 graph read API**

**Step 4: 复跑测试**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/graph/__tests__/graph.controller.spec.ts \
  src/graph/__tests__/graph-query.service.spec.ts \
  src/graph/__tests__/graph-overview.service.spec.ts
```

Expected: PASS

### Task 4: 新增 `source -> memory_fact` 异步投影链

**Files:**
- Create: `apps/anyhunt/server/src/memory/source-memory-projection.service.ts`
- Create: `apps/anyhunt/server/src/memory/source-memory-projection.processor.ts`
- Create: `apps/anyhunt/server/src/memory/source-memory-projection.types.ts`
- Modify: `apps/anyhunt/server/src/memory/memory.module.ts`
- Modify: `apps/anyhunt/server/src/sources/knowledge-source-revision.service.ts`
- Test: `apps/anyhunt/server/src/memory/__tests__/source-memory-projection.service.spec.ts`
- Test: `apps/anyhunt/server/src/sources/__tests__/knowledge-source-revision.service.spec.ts`

**Step 1: 写失败测试**

覆盖：

- finalize 后投影 derived facts
- derivedKey 幂等更新
- 同 source reindex 不重复堆积 facts
- stale derived facts cleanup
- 投影失败不回滚 source indexed

**Step 2: 跑测试确认失败**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/memory/__tests__/source-memory-projection.service.spec.ts \
  src/sources/__tests__/knowledge-source-revision.service.spec.ts
```

Expected: FAIL

**Step 3: 实现投影链**

**Step 4: 复跑测试**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/memory/__tests__/source-memory-projection.service.spec.ts \
  src/sources/__tests__/knowledge-source-revision.service.spec.ts
```

Expected: PASS

### Task 5: Moryflow Server 新增统一 `memory gateway`

**Files:**
- Create: `apps/moryflow/server/src/memory/memory.client.ts`
- Create: `apps/moryflow/server/src/memory/memory.service.ts`
- Create: `apps/moryflow/server/src/memory/memory.controller.ts`
- Create: `apps/moryflow/server/src/memory/memory.module.ts`
- Create: `apps/moryflow/server/src/memory/dto/memory.dto.ts`
- Modify: `apps/moryflow/server/src/app.module.ts`
- Test: `apps/moryflow/server/src/memory/memory.service.spec.ts`
- Test: `apps/moryflow/server/src/memory/memory.controller.spec.ts`

**Step 1: 写失败测试**

覆盖：

- overview
- unified search
- manual fact CRUD
- read-only derived fact detail
- history
- feedback
- graph query
- export create/get

**Step 2: 跑测试确认失败**

Run:

```bash
pnpm --filter @moryflow/server test -- \
  src/memory/memory.service.spec.ts \
  src/memory/memory.controller.spec.ts
```

Expected: FAIL

**Step 3: 实现 gateway**

关键要求：

- Search 走统一 retrieval
- Manual fact create 不暴露底层 messages/infer 协议
- Derived fact 在 gateway 层即体现只读语义

**Step 4: 复跑测试**

Run:

```bash
pnpm --filter @moryflow/server test -- \
  src/memory/memory.service.spec.ts \
  src/memory/memory.controller.spec.ts
```

Expected: PASS

### Task 6: PC Main 新增 `desktopAPI.memory.*`

**Files:**
- Create: `apps/moryflow/pc/src/main/memory/index.ts`
- Create: `apps/moryflow/pc/src/main/memory/api/client.ts`
- Create: `apps/moryflow/pc/src/main/app/memory-ipc-handlers.ts`
- Create: `apps/moryflow/pc/src/shared/ipc/memory.ts`
- Modify: `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`
- Modify: `apps/moryflow/pc/src/main/index.ts`
- Test: `apps/moryflow/pc/src/main/app/memory-ipc-handlers.test.ts`

**Step 1: 写失败测试**

覆盖：

- workspace / vault scope 解析
- overview/search/facts/graph/exports IPC
- 未登录 / 未绑定 fail-safe

**Step 2: 跑测试确认失败**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/app/memory-ipc-handlers.test.ts
```

Expected: FAIL

**Step 3: 实现 IPC**

**Step 4: 复跑测试**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/app/memory-ipc-handlers.test.ts
```

Expected: PASS

### Task 7: 导航接入 `Memory`

**Files:**
- Modify: `apps/moryflow/pc/src/renderer/workspace/navigation/state.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/navigation/modules-registry.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/navigation/layout-resolver.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/index.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/const.ts`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/use-memory.ts`
- Test: `apps/moryflow/pc/src/renderer/workspace/navigation/modules-registry.test.ts`
- Test: `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.test.tsx`

**Step 1: 写失败测试**

覆盖：

- `Memory` 在 `Skills` 上方
- 为独立 module destination
- 模块切换正确

**Step 2: 跑测试确认失败**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/navigation/modules-registry.test.ts \
  src/renderer/workspace/components/workspace-shell-main-content.test.tsx
```

Expected: FAIL

**Step 3: 实现导航**

**Step 4: 复跑测试**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/navigation/modules-registry.test.ts \
  src/renderer/workspace/components/workspace-shell-main-content.test.tsx
```

Expected: PASS

### Task 8: 实现 `Overview + Search`

**Files:**
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-overview.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-search-view.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-search-results.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-source-detail.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-fact-detail.tsx`
- Test: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-search-view.test.tsx`

**Step 1: 写失败测试**

覆盖：

- Search 默认双组 `Files + Facts`
- Files 点击行为正确
- Facts 点击进入详情
- Overview 正确展示 counts/status

**Step 2: 跑测试确认失败**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/components/memory/memory-search-view.test.tsx
```

Expected: FAIL

**Step 3: 实现 Overview + Search**

**Step 4: 复跑测试**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/components/memory/memory-search-view.test.tsx
```

Expected: PASS

### Task 9: 实现 `Facts`

**Files:**
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-facts-view.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-fact-editor.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-fact-history.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-fact-feedback.tsx`
- Test: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-facts-view.test.tsx`

**Step 1: 写失败测试**

覆盖：

- facts list
- 来源筛选 `All / Manual / Derived`
- manual fact CRUD
- manual batch ops
- derived fact 只读
- history
- feedback

**Step 2: 跑测试确认失败**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/components/memory/memory-facts-view.test.tsx
```

Expected: FAIL

**Step 3: 实现 Facts**

**Step 4: 复跑测试**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/components/memory/memory-facts-view.test.tsx
```

Expected: PASS

### Task 10: 实现 `Graph`

**Files:**
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-graph-view.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-graph-canvas.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-entity-detail.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-relation-detail.tsx`
- Test: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-graph-view.test.tsx`

**Step 1: 写失败测试**

覆盖：

- 图谱渲染
- entity / relation detail
- evidence drill-down

**Step 2: 跑测试确认失败**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/components/memory/memory-graph-view.test.tsx
```

Expected: FAIL

**Step 3: 实现 Graph**

**Step 4: 复跑测试**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/components/memory/memory-graph-view.test.tsx
```

Expected: PASS

### Task 11: 实现 `Exports`

**Files:**
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-exports-view.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-export-detail.tsx`
- Test: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-exports-view.test.tsx`

**Step 1: 写失败测试**

覆盖：

- create export
- get export
- 下载 export 结果
- 文案明确为 facts export

**Step 2: 跑测试确认失败**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/components/memory/memory-exports-view.test.tsx
```

Expected: FAIL

**Step 3: 实现 Exports**

**Step 4: 复跑测试**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/components/memory/memory-exports-view.test.tsx
```

Expected: PASS

### Task 12: 冻结开发期验证与线上真实数据验收

**Files:**
- Modify: `docs/reference/cloud-sync-and-memox-validation.md`
- Modify: `docs/reference/cloud-sync-and-memox-production-validation-playbook.md`
- Modify: `apps/anyhunt/server/src/memory/CLAUDE.md`
- Modify: `apps/anyhunt/server/src/graph/CLAUDE.md`
- Modify: `apps/moryflow/server/src/memox/CLAUDE.md`
- Modify: `apps/moryflow/pc/src/renderer/workspace/CLAUDE.md`

**Step 1: 写入开发期验证**

固定记录：

- 来源模型验证
- graph API 验证
- source -> fact 投影验证
- gateway / IPC 验证
- Search / Facts / Graph / Exports UI 验证

**Step 2: 写入线上真实数据验收**

固定按真实线上数据验收：

- Overview
- Search Files
- Search Facts
- manual fact create/update/delete
- derived fact read-only + feedback
- Graph nodes / relations / evidence
- facts export create/get/download

**Step 3: 文档校验**

Run:

```bash
git diff --check -- \
  docs/reference/cloud-sync-and-memox-validation.md \
  docs/reference/cloud-sync-and-memox-production-validation-playbook.md \
  apps/anyhunt/server/src/memory/CLAUDE.md \
  apps/anyhunt/server/src/graph/CLAUDE.md \
  apps/moryflow/server/src/memox/CLAUDE.md \
  apps/moryflow/pc/src/renderer/workspace/CLAUDE.md
```

Expected: PASS

## 9. 总体验证矩阵

### Anyhunt Server

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/memory/__tests__/memory-entity.integration.spec.ts \
  src/memory/__tests__/memory.service.spec.ts \
  src/memory/__tests__/source-memory-projection.service.spec.ts \
  src/graph/__tests__/graph.controller.spec.ts \
  src/graph/__tests__/graph-query.service.spec.ts \
  src/graph/__tests__/graph-overview.service.spec.ts \
  src/sources/__tests__/knowledge-source-revision.service.spec.ts

pnpm --filter @anyhunt/anyhunt-server exec tsc --noEmit
```

### Moryflow Server

Run:

```bash
pnpm --filter @moryflow/server test -- \
  src/memory/memory.service.spec.ts \
  src/memory/memory.controller.spec.ts

pnpm --filter @moryflow/server typecheck
```

### Moryflow PC

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/app/memory-ipc-handlers.test.ts \
  src/renderer/workspace/navigation/modules-registry.test.ts \
  src/renderer/workspace/components/workspace-shell-main-content.test.tsx \
  src/renderer/workspace/components/memory/memory-search-view.test.tsx \
  src/renderer/workspace/components/memory/memory-facts-view.test.tsx \
  src/renderer/workspace/components/memory/memory-graph-view.test.tsx \
  src/renderer/workspace/components/memory/memory-exports-view.test.tsx
```

### 文档

Run:

```bash
git diff --check
```

## 10. 上线后真实数据验收

上线后必须按文档用真实线上数据完成验收，最小通过标准固定为：

1. `Memory` 模块能进入
2. `Overview` 显示真实 workspace / vault / sync / index / facts / graph 状态
3. `Search` 同时返回 `Files + Facts`
4. `Facts` 视图明确区分 `Manual / Derived`
5. `Manual` facts 可执行 create/update/delete
6. `Derived` facts 保持只读，但可 feedback
7. `Graph` 能展示真实节点、边与 evidence
8. `Exports` 能 create/get/download facts export
9. 任一子能力失败时局部降级，不污染整个模块

上线后真实数据验收统一记录在：

- `docs/reference/cloud-sync-and-memox-production-validation-playbook.md`

## 11. 风险控制

- facts 投影失败不回滚 source indexed 成功
- derived facts 必须有稳定 provenance 与 replace 语义
- graph 读取必须建立在正式 graph read API 上
- Search 必须走统一 retrieval，不在 PC 重建平台搜索语义
- PC 不得直连 Anyhunt
- 本期不为赶进度而牺牲 future dialog / MCP 的统一入口

## 12. 终态

本计划完成后，Moryflow PC 将具备一个真正完整的 `Memory Workbench`：

- `Overview`：看当前 scope 的状态与覆盖范围
- `Search`：统一检索 `Files + Facts`
- `Facts`：完整操作 manual facts，并浏览/反馈 derived facts
- `Graph`：浏览结构化关系与证据
- `Exports`：导出当前 scope 的 facts

同时，Anyhunt 的来源模型、graph 读接口、Moryflow Server `memory gateway` 与 PC `desktopAPI.memory.*` 会成为未来对话流、工作流、MCP 与 Agent runtime 接入 Memory 能力的统一基础设施。
