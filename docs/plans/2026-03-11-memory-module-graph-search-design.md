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
7. `source` 的统一公开搜索语义当前属于 `retrieval/`，不是 `sources/`
8. source graph projection 当前默认不保证开启，Graph 不能假设 source evidence 一定已经完整物化
9. derived facts 的只读语义不能只靠 `immutable=true`，必须由平台写路径按 `originKind` 做权限收口
10. Moryflow 当前仍存在 `desktopAPI.cloudSync.search + /api/v1/search` 旧远端文件搜索链；本期完成后必须 cutover 到统一 `memory gateway`

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

并且平台写路径必须同步冻结：

- `originKind=SOURCE_DERIVED` 的事实不得走普通 update/delete/batch write 主链
- 只读语义由平台合同显式控制，不能把权限判断外包给 UI

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
4. `retrieval/search` 必须直接提供稳定双组结果保证，不能只返回全局混排 `top_k`
5. 若平台不能保证双组配额，gateway 不得伪装成满足产品合同

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
- `derivedKey?`

语义：

- `originKind` 决定事实的编辑权限与展示方式
- `sourceId / sourceRevisionId` 承担一等来源关系
- `derivedKey` 作为 source-derived fact 的稳定幂等键
- `MemoryFact` 正文字段统一命名为 `content`；`Task 2` 直接把当前 Prisma 字段 `memory` 重命名为 `content`，不保留双字段兼容

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

首期冻结：

- `Graph` 工作台的必达路径固定为 fact-derived projection
- source graph projection 只作为增强，不作为首期上线前置
- `MemoryFact` 主表只冻结稳定 provenance：`originKind / sourceId / sourceRevisionId / derivedKey`
- fact 到 chunk/source 的多对多 evidence 固定通过 `GraphObservation` 或独立 evidence 关联表达，不在 `MemoryFact` 主表增加单一 chunk 指针
- Graph 冷启动期间若 projection 尚未完成，UI 必须显示 `Graph is building...` 一类明确状态，而不是空白成功态
- 真实数据验收只有在 `projectionStatus=ready` 或 backfill/replay 完成后才允许判定 Graph PASS

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

### 5.3 统一入口预留

本期 `Memory Workbench` 完成后，必须为后续统一入口预留固定接入面：

- 对话流
- 工作流
- MCP
- Agent runtime
- Global Search

冻结原则：

- 模块内统一入口固定落在 `memory gateway -> desktopAPI.memory.*`
- Search 语义固定由 `retrieval/search` 持有
- Global Search 不是独立真相源，只是复用 `Memory Search` 的后续消费方

### 5.4 Overview

Overview 不是自由发挥的概览卡片，必须冻结为统一 DTO。

固定展示块：

- `Scope`
- `Binding`
- `Sync`
- `Indexing`
- `Facts`
- `Graph`

字段来源冻结：

- `Scope / Binding / Sync` 真相源来自 Moryflow
- `Indexing / Facts / Graph` 真相源来自 Anyhunt

一致性冻结：

- `Scope / Binding` 必须强一致
- `Sync` 允许近实时
- `Indexing / Facts / Graph` 允许异步最终一致，但必须返回明确状态

未登录返回：

- 允许进入模块
- `Binding.loggedIn=false`
- 所有 Anyhunt 侧统计返回 `unavailable`

未绑定返回：

- `Binding.loggedIn=true`
- `Binding.bound=false`
- 不发起 Anyhunt 侧 overview 聚合请求
- Memory 子能力显示为 `Not available for this workspace`

### 5.5 Search

Search 固定查当前 workspace 对应云端 vault。

固定双组结果：

- `Files`
- `Facts`

其中：

- `Files` 来自 `retrieval/search` 的 `result_kind=source`
- `Facts` 来自 `retrieval/search` 的 `result_kind=memory_fact`

冻结约束：

- 两组结果必须有独立配额
- 两组结果必须独立返回 `items / returned_count / hasMore`
- 不接受“全局混排后再由 UI 重新分组”的合同
- 组内排序严格遵循服务端返回顺序

点击行为：

- `Files` 有 `localPath` 时打开本地文件
- `Files` 无 `localPath` 时禁用
- `Facts` 打开事实详情

### 5.6 Facts

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

### 5.7 Graph

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

### 5.8 Exports

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

- 与 `retrieval/search` 对齐的统一 `scope`
  - `user_id`
  - `agent_id`
  - `app_id`
  - `run_id`
  - `org_id`
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
- 投影链归属固定在 Anyhunt finalize/reindex 成功后的后处理，不允许 Moryflow Server 再做第二套 facts 投影
- source-derived facts 的 evidence 允许是一对多，不能把 provenance 冻结成单一 chunk 指针语义

#### C. Retrieval 保持统一入口

`retrieval/search` 继续作为 Search 主入口，固定承担：

- files + facts 统一检索
- graph context 可选附带
- 通过统一 `scope` 与 `group_limits` 显式控制结果组
- scope 仍固定收口到当前 workspace 对应 `project_id`

冻结合同：

- 请求必须支持：
  - `query`
  - `scope`
  - `group_limits.sources`
  - `group_limits.memory_facts`
  - `include_graph_context`
- 响应必须返回分组模型：
  - `groups.files.items`
  - `groups.files.returned_count`
  - `groups.files.hasMore`
  - `groups.facts.items`
  - `groups.facts.returned_count`
  - `groups.facts.hasMore`
- `sources/` 域不再持有单独的产品级 `source search` 真相定义；统一搜索合同固定由 `retrieval/` 持有

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

#### 固定约束：Overview DTO

gateway 必须输出固定 `Overview` 合同：

- `scope`
  - `workspaceId`
  - `workspaceName`
  - `localPath`
  - `vaultId`
  - `projectId`
- `binding`
  - `loggedIn`
  - `bound`
  - `disabledReason?`
- `sync`
  - `engineStatus`
  - `lastSyncAt`
  - `storageUsedBytes`
- `indexing`
  - `sourceCount`
  - `indexedSourceCount`
  - `pendingSourceCount`
  - `failedSourceCount`
  - `lastIndexedAt`
- `facts`
  - `manualCount`
  - `derivedCount`
- `graph`
  - `entityCount`
  - `relationCount`
  - `projectionStatus`
  - `lastProjectedAt`

字段责任冻结：

- `scope / binding / sync` 由 Moryflow 聚合
- `indexing / facts / graph` 由 Anyhunt 专用读模型端点 `GET /api/v1/memories/overview` 提供
- 未登录或未绑定时返回同一 DTO 形状，不允许让 renderer 自己猜缺失字段

实现冻结：

- gateway 不允许临时 fan-out 任意 list/search 接口去猜统计值
- Anyhunt overview 端点必须一次性返回 `indexing / facts / graph` 所需统计与状态

#### 固定约束：Scope Resolver

scope 真相源固定为：

- 当前 active workspace / localPath
- 当前 binding.vaultId
- gateway 解析后的 `projectId`

冻结规则：

- renderer 不传 `vaultId`
- renderer 不传 `projectId`
- PC main 不重建平台 scope
- server 是唯一对 Anyhunt scope 负责的边界

#### 固定约束：Search Cutover

本期完成后，远端搜索只能保留一条主链：

- PC `desktopAPI.memory.search`
- Moryflow Server `memory gateway search`
- Anyhunt `retrieval/search`

因此必须同步 cutover：

- 现有 `desktopAPI.cloudSync.search`
- 现有 Moryflow Server `/api/v1/search`

冻结切换顺序：

1. `PR 3` 先补齐 `memory gateway search` 与 `desktopAPI.memory.search`，旧链仅保留 fallback，不再承接新功能
2. `PR 4 / Task 13` 完成 renderer 全量切换后，再删除旧远端搜索 fallback

不允许长期保留第二套独立远端文件搜索语义。

#### 特别约束：Manual Fact Create 协议

现有平台 `POST /v1/memories` 偏向 messages/infer 协议。  
PC 首期不应把这套原始协议直接暴露给用户。

因此 gateway 必须提供更简单的创建合同，例如：

- `text`
- `metadata`
- `categories`

再由 gateway 负责补齐当前 scope 并映射到底层平台协议。

### 6.3 PC Main

新增统一 IPC：

- `desktopAPI.memory.getOverview()`
- `desktopAPI.memory.search()`
- `desktopAPI.memory.listFacts()`
- `desktopAPI.memory.getFactDetail()`
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
- 不让 renderer 传入平台 scope 字段

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

### 6.5 Global Search 集成（后续阶段）

`Global Search` 不是本期 `Memory Workbench` 的前置条件，而是固定放在模块完成后的最后阶段接入。

冻结范围：

- 保留当前单输入框
- 在同一搜索面板内固定分组展示：
  - `Local Search`
  - `Memory Search`
- `Memory Search` 只查询当前 workspace 对应云端 vault
- `Memory Search` 固定复用 `Memory Workbench Search` 的 retrieval 链，不新增第二套远端搜索协议
- `Local Search` 固定保留现有本地搜索能力：
  - `Threads`
  - `Files`

冻结实现边界：

- 采用 `PC main` 聚合，不在 renderer fan-out
- renderer 不理解本地搜索协议与远端 Memory 搜索协议细节
- `Memory Search` 固定通过 `desktopAPI.globalSearch.query(...)` 聚合入口接入
- `Local Search` 继续使用本地 SQLite FTS
- `Memory Search` 结果固定来源于 Moryflow Server gateway，不允许 PC 直连 Anyhunt
- 现有 `desktopAPI.search.query(...)` 继续只代表本地搜索

冻结返回模型：

- `query`
- `limitPerGroup`
- `local.status`
- `local.items`
- `local.error?`
- `memory.status`
- `memory.items`
- `memory.error?`
- `tookMs`

其中：

- `status` 只允许 `ready | loading | skipped | error`
- `memory.items` 必须补齐 UI 友好字段：
  - `disabled`
  - `localPath`
  - `score`
  - `snippet`

冻结本地组内顺序：

- `Local Search` 组内保持当前顺序：
  - `Threads`
  - `Files`
- 本期不得因为接入 `Memory Search` 回退本地 thread 搜索

冻结渲染与降级：

1. 未登录时：
   - 只显示 `Local Search`
   - 不显示 `Memory Search`
2. 已登录但当前 workspace 未绑定时：
   - 只显示 `Local Search`
   - 不显示 `Memory Search`
3. 已登录且已绑定时：
   - `Local Search` 先返回
   - `Memory Search` 异步补齐
4. `Memory Search` 请求失败时：
   - 只影响 `Memory Search` 分组
   - 该分组显示 `Unavailable`
5. `Memory Search` 命中但无 `localPath` 时：
   - 结果显示但不可点击
6. `Memory Search` 命中且有 `localPath` 时：
   - 结果可点击
   - 点击后按本地文件正常打开

## 7. 执行顺序

必须严格按以下顺序推进：

1. 冻结产品与平台合同
2. Anyhunt：补 `MemoryFact` 来源模型
3. Anyhunt：补 `source -> memory_fact` 投影链
4. Anyhunt：补 `graph read API`
5. Anyhunt：收口 `retrieval/search` 双组合同
6. Moryflow Server：补 `memory gateway`
7. PC main：补 `desktopAPI.memory.*`
8. PC renderer：补 `Memory Workbench`
9. Global Search：接入 `Local + Memory`
10. 自动化验证
11. 上线后真实数据验收

原因：

- 如果不先补来源模型，derived facts 会很快失真
- 如果不先补 `source -> memory_fact`，Facts 与 Graph 的 evidence 合同会先天漂移
- 如果不先补 graph read API，Graph 只能做成伪能力
- 如果不先收口 retrieval 双组合同，Search 会被迫在 gateway 或 UI 层补语义
- 如果不先补 gateway，后续对话/MCP 入口就会再次分叉
- 如果不先完成 `Memory Workbench` 主体，Global Search 会被迫直接耦合平台低层协议

## 8. PR 拆分策略

为兼顾“单次尽量多写代码”和“每次 review/验证可控”，本期固定拆为 `4` 个 PR。

原则：

1. 每个 PR 只跨越一个明确层级，避免同一 PR 同时改平台底座、服务端网关和大块 UI。
2. 每个 PR 都必须在合并前完成对应测试、文档回写与最小可验收闭环。
3. `Global Search` 固定放在最后一个 UI PR，一起完成最终用户可见集成，但不得早于 `Memory Workbench` 主体落地。

### PR 1：文档收口 PR

范围：

- 唯一主 plan 冻结
- Anyhunt 设计事实源同步
- 验证 reference 同步
- `memory/graph/memox/workspace` 的 `CLAUDE.md` 同步

目标：

- 形成唯一冻结版主 plan
- 让 design / reference / `CLAUDE.md` 与主 plan 对齐

### PR 2：Anyhunt 基础层 PR

范围：

- `MemoryFact` 来源模型
- `SOURCE_DERIVED` 写路径权限收口
- `source -> memory_fact` 投影链
- `graph read/query API`
- `retrieval/search` 双组合同

目标：

- 先把 `manual / source-derived` 的平台级数据边界做实
- 一次性把 Facts / Graph / Search 所需的 Anyhunt 正式读写基础补齐

内部 review 分段点：

1. 第一段固定 review `Task 2 + Task 3`：来源模型、字段迁移、投影链、幂等与 cleanup
2. 第二段固定 review `Task 4 + Task 5`：overview/graph 读接口、retrieval 双组合同与返回模型

包含任务：

- `Task 2`
- `Task 3`
- `Task 4`
- `Task 5`

当前状态（当前工作区基线）：

- `PR 2` 已完成代码落地、对应单测与类型检查，并已合并到 `main`（`PR #200`）
- `Task 2-5` 已全部落到 Anyhunt 基础层代码
- `memory-entity.integration.spec.ts` 已按 `RUN_INTEGRATION_TESTS=1` 尝试执行，但当前本机缺少可用 container runtime；该条需在具备 TestContainers 运行时的 CI / 容器环境补跑

### PR 3：Moryflow Gateway + PC Main PR

范围：

- Moryflow Server `memory gateway`
- PC main `desktopAPI.memory.*`
- `Memory` 导航接入

目标：

- 一次性打通 `PC -> Server -> Anyhunt` 的正式合同
- 让 renderer 开工前就有稳定的 IPC、DTO 和模块落点

包含任务：

- `Task 6`
- `Task 7`
- `Task 8`

当前状态（当前工作区基线）：

- `Task 6` 已完成：`Moryflow Server memory gateway` 已落地
- `Task 7` 已完成：`desktopAPI.memory.*`、main client 与 IPC handler 已落地
- `Task 8` 已完成：`Memory` 已作为独立模块接入导航与主内容区，并落地最小 overview 占位页
- 下一步固定进入 `PR 4`：开始 `Memory Workbench` renderer UI（先做 `Overview + Search`）
- `PR 3` 开工前不再回头扩写 Anyhunt 基础层；若需补洞，仅处理阻塞 gateway 接入的真实缺陷

### PR 4：Memory Workbench + Global Search UI PR

范围：

- `Overview`
- `Search`
- `Facts`
- `Graph`
- `Exports`
- `Global Search` 的 `Local + Memory`

目标：

- 一次性完成独立 `Memory Workbench` 主体与最终用户可见集成
- 把 UI 层作为完整可 review 的用户功能交付

包含任务：

- `Task 9`
- `Task 10`
- `Task 11`
- `Task 12`
- `Task 13`
- `Task 14`

## 9. 任务清单

### 实现任务共同完成定义

除 `Task 1` 外，所有实现任务都必须满足以下固定完成条件：

1. 代码与测试通过
2. 把本任务新增或变更的验证步骤持续回写到：
   - `docs/reference/cloud-sync-and-memox-validation.md`
   - `docs/reference/cloud-sync-and-memox-production-validation-playbook.md`
3. 若未完成验证回写，则该任务不算完成

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
- 直接将当前 Prisma 文本字段 `memory` 重命名为 `content`
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

### Task 3: 新增 `source -> memory_fact` 异步投影链

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
- 投影链只归 Anyhunt 所有

**Step 2: 跑测试确认失败**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/memory/__tests__/source-memory-projection.service.spec.ts \
  src/sources/__tests__/knowledge-source-revision.service.spec.ts
```

Expected: FAIL

**Step 3: 实现投影链**

冻结要求：

- facts 抽取固定复用现有 `memory-llm.service.ts` 的 provider 与运行时配置
- 投影失败不回滚 source indexed，但必须记录 projection 状态与错误
- 单个 source 的抽取调用次数必须有上限，避免大文件无限放大 LLM 成本
- 上线前必须有 backfill/replay 方案，保证已有 source 能补齐 derived facts 与 graph projection

**Step 4: 复跑测试**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/memory/__tests__/source-memory-projection.service.spec.ts \
  src/sources/__tests__/knowledge-source-revision.service.spec.ts
```

Expected: PASS

### Task 4: 新增 Graph Read API 与 Overview Read Model

**Files:**

- Create: `apps/anyhunt/server/src/graph/dto/graph.schema.ts`
- Create: `apps/anyhunt/server/src/graph/graph.controller.ts`
- Create: `apps/anyhunt/server/src/graph/graph-query.service.ts`
- Create: `apps/anyhunt/server/src/graph/graph-overview.service.ts`
- Create: `apps/anyhunt/server/src/memory/memory-overview.service.ts`
- Modify: `apps/anyhunt/server/src/graph/graph.module.ts`
- Modify: `apps/anyhunt/server/src/graph/index.ts`
- Modify: `apps/anyhunt/server/src/memory/memory.controller.ts`
- Test: `apps/anyhunt/server/src/graph/__tests__/graph.controller.spec.ts`
- Test: `apps/anyhunt/server/src/graph/__tests__/graph-query.service.spec.ts`
- Test: `apps/anyhunt/server/src/graph/__tests__/graph-overview.service.spec.ts`
- Test: `apps/anyhunt/server/src/memory/__tests__/memory-overview.service.spec.ts`

**Step 1: 写失败测试**

覆盖：

- graph overview
- query
- entity detail
- evidence summary
- 统一 `scope` 对象
- source / fact evidence 回看
- memory overview 统计读模型

**Step 2: 跑测试确认失败**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/graph/__tests__/graph.controller.spec.ts \
  src/graph/__tests__/graph-query.service.spec.ts \
  src/graph/__tests__/graph-overview.service.spec.ts \
  src/memory/__tests__/memory-overview.service.spec.ts
```

Expected: FAIL

**Step 3: 实现 graph read API 与 overview read model**

冻结要求：

- graph 读接口必须只暴露 read/query，不引入 graph write
- Anyhunt 必须同时提供 `GET /api/v1/memories/overview`，一次性返回 `indexing / facts / graph` 统计与状态
- `memory/overview` 不允许退化成搜索/list 结果上的临时聚合

**Step 4: 复跑测试**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/graph/__tests__/graph.controller.spec.ts \
  src/graph/__tests__/graph-query.service.spec.ts \
  src/graph/__tests__/graph-overview.service.spec.ts \
  src/memory/__tests__/memory-overview.service.spec.ts
```

Expected: PASS

### Task 5: 收口 `retrieval/search` 双组合同

**Files:**

- Modify: `apps/anyhunt/server/src/retrieval/dto/retrieval.schema.ts`
- Modify: `apps/anyhunt/server/src/retrieval/retrieval.service.ts`
- Modify: `apps/anyhunt/server/src/retrieval/retrieval.controller.ts`
- Test: `apps/anyhunt/server/src/retrieval/__tests__/retrieval.service.spec.ts`
- Test: `apps/anyhunt/server/src/retrieval/__tests__/retrieval.controller.spec.ts`

**Step 1: 写失败测试**

覆盖：

- `Files + Facts` 双组独立配额
- 单域高分结果不能饿死另一组
- 分组响应模型 `groups.files / groups.facts`
- 组内顺序保持平台返回顺序

**Step 2: 跑测试确认失败**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/retrieval/__tests__/retrieval.service.spec.ts \
  src/retrieval/__tests__/retrieval.controller.spec.ts
```

Expected: FAIL

**Step 3: 实现 retrieval 双组合同**

**Step 4: 复跑测试**

Run:

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/retrieval/__tests__/retrieval.service.spec.ts \
  src/retrieval/__tests__/retrieval.controller.spec.ts
```

Expected: PASS

### PR 2 当前状态

当前 `PR 2` 已完成 `Task 2-5` 的代码、单测与类型检查闭环。

当前合并状态：

- 已合并到 `main`
- GitHub PR：`#200`

当前基线：

- `Task 2`：已完成
  - `MemoryFact` 新增 `originKind/sourceId/sourceRevisionId/derivedKey`
  - Prisma 主字段已从 `memory` 重命名为 `content`
  - `manual` 与 `source-derived` 的只读边界已在 service/repository/DTO 收口
  - `deleteByFilter` 已复用只读保护；migration 已补 `originKind` 数据约束
- `Task 3`：已完成
  - 已补 `source -> memory_fact` projection queue/service/processor
  - finalize 成功后会异步投影 derived facts，支持 `derivedKey` 幂等与 stale cleanup
  - projection enqueue 失败不会回滚已 indexed revision/source
- `Task 4`：已完成
  - 已补 `graph read/query API`
  - 已补 `GET /api/v1/memories/overview`
  - graph/entity detail 与 memory overview 已支持统一 scope 读模型
  - scoped entity detail 无作用域内 evidence 时固定返回 `404`
  - overview facts 统计与 graph scope memory 过滤已对齐“未过期 memory”语义
  - graph query / detail 已改为基于 `GraphObservation -> evidenceSource/evidenceMemory` 正式 relation filter，不再先物化 source/memory ID 列表
  - graph query / detail 的 `evidence_summary` 已改为精确计数，不再受 recent observation `take` 截断
- `Task 5`：已完成
  - `retrieval/search` 已冻结为 `scope + group_limits + groups.files/groups.facts`
  - 双组配额已在平台侧保证，不再依赖 gateway/UI 补语义
  - 分组计数字段已收口为 `returned_count`，不再伪装为全量 `total`
  - Phase 2 load-check 已切到新 retrieval 请求/响应合同
  - Phase 2 OpenAPI gate 已补 `GET /api/v1/memories/overview`、`GET /api/v1/graph/overview`、`POST /api/v1/graph/query`、`GET /api/v1/graph/entities/{entityId}`

已通过验证：

```bash
pnpm install --frozen-lockfile
pnpm --filter @anyhunt/anyhunt-server typecheck
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/memory/__tests__/memory.service.spec.ts \
  src/memory/__tests__/source-memory-projection.service.spec.ts \
  src/sources/__tests__/knowledge-source-revision.service.spec.ts \
  src/graph/__tests__/graph.controller.spec.ts \
  src/graph/__tests__/graph-query.service.spec.ts \
  src/graph/__tests__/graph-overview.service.spec.ts \
  src/memory/__tests__/memory-overview.service.spec.ts \
  src/retrieval/__tests__/retrieval.service.spec.ts \
  src/retrieval/__tests__/retrieval.controller.spec.ts \
  test/memox-phase2-openapi-load-check.utils.spec.ts
git diff --check -- \
  apps/anyhunt/server/prisma/vector/schema.prisma \
  apps/anyhunt/server/prisma/vector/migrations/20260311120000_memory_fact_origin_fields/migration.sql \
  apps/anyhunt/server/src/memory \
  apps/anyhunt/server/src/sources/knowledge-source-revision.service.ts \
  apps/anyhunt/server/src/sources/__tests__/knowledge-source-revision.service.spec.ts \
  apps/anyhunt/server/src/graph \
  apps/anyhunt/server/src/retrieval
```

当前结果：

- typecheck：PASS
- PR 2 相关单测：PASS（`10` files / `61` tests）
- diff check：PASS

当前唯一 blocker：

- `RUN_INTEGRATION_TESTS=1 pnpm --filter @anyhunt/anyhunt-server test -- src/memory/__tests__/memory-entity.integration.spec.ts`
  - 在当前环境中失败
  - 根因不是用例断言，而是 `testcontainers` 无可用 container runtime：`Could not find a working container runtime strategy`
  - 因此 PR 2 的集成测试状态固定记录为“测试代码已进入执行，当前环境被容器运行时阻断”

### Task 6: Moryflow Server 新增统一 `memory gateway`

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
- fact detail by id
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
- `memory.client.ts` 固定作为现有 `memox.client.ts` / 共享 HTTP provider 的领域适配层，不允许新建第二套 Anyhunt HTTP client
- `PR 3` 只补新链并保留旧 `/api/v1/search` fallback；旧链删除延后到 `Task 13`

**Step 4: 复跑测试**

Run:

```bash
pnpm --filter @moryflow/server test -- \
  src/memory/memory.service.spec.ts \
  src/memory/memory.controller.spec.ts
```

Expected: PASS

### Task 6 当前状态

- 已完成：
  - 新增 `apps/moryflow/server/src/memory/*`，落地统一 `memory gateway`
  - `memory.client.ts` 复用现有 `MemoxClient.requestJson(...)`，没有新建第二套 Anyhunt HTTP client
  - `overview / search / facts / history / feedback / graph / exports` 已统一收口到 Moryflow Server
  - manual fact create 已固定映射为简化合同 `text -> messages + infer=false + async_mode=false`
  - derived fact update/delete 已在 gateway 边界直接收口为只读冲突，不再把底层协议直接泄漏给上层
  - `search` 已固定走 Anyhunt `retrieval/search`
  - `searchRetrieval()` 已显式把 `includeGraphContext` 映射为 Anyhunt `include_graph_context`，不再让 graph context 请求静默失效
  - `createFact()` / `createExport()` 已补齐 Anyhunt 必需的 `Idempotency-Key`，不再因缺 header 被 upstream 拒绝
  - `feedbackFact()` controller body 已从 `Omit<>` 改为真实 DTO class，`vaultId / feedback / reason` 会继续经过 `nestjs-zod` 校验
  - retrieval 返回后的 fact detail hydrate 已改成 best-effort；单条 stale / upstream 失败不再打挂整次 Search
  - graph entity detail 已补齐 metadata scope 透传，不再比 graph query 拿到更宽的 evidence 作用域
  - `listFacts()` 已增加 upstream pagination 上限；manual facts 稀疏时不再无限翻页，超限会保守返回 `hasMore=true`
  - `createExport()` 已向 Anyhunt 下推 `filters.user_id`，不再先做 project 级导出再由 gateway 过滤
  - feedback 返回 `null` 时会保持 `null` 语义，不再被错误映射成 `positive`
  - memory gateway 已对齐 Anyhunt 真实 memory contract：`list` 读取原始数组返回、`create` 读取 `{ results: [...] }` envelope、`history` 读取 `old_content/new_content`
  - `createFact()` 已改为先消费 Anyhunt create result envelope，再回拉正式 memory detail；不再把 create event 误当成完整 fact DTO
  - `PR 3` 当前仍保留旧 `/api/v1/search` fallback，尚未删除
- 已通过验证：

```bash
pnpm --filter @moryflow/server test -- \
  src/memory/memory.client.spec.ts \
  src/memory/memory.service.spec.ts \
  src/memory/memory.controller.spec.ts
pnpm --filter @moryflow/server typecheck
```

- 当前结果：
  - `memory.client.spec.ts` / `memory.service.spec.ts` / `memory.controller.spec.ts`：PASS（`17` tests）
  - `@moryflow/server typecheck`：PASS

### Task 7: PC Main 新增 `desktopAPI.memory.*`

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
- fact detail IPC
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

### Task 7 当前状态

- 已完成：
  - 新增 `apps/moryflow/pc/src/main/memory/api/client.ts`
  - 新增 `apps/moryflow/pc/src/main/app/memory-ipc-handlers.ts`
  - 新增 `apps/moryflow/pc/src/shared/ipc/memory.ts`
  - `desktopAPI.memory.*` 与 preload bridge 已接通
  - PC main 已固定从 active workspace + binding 解析当前 `vaultId` scope
  - `getOverview()` 已补齐本地 `scope / binding / sync`，再与 server `overview` 聚合为最终上层合同
  - usage 查询已改成 best-effort，不再因 cloud usage 抖动导致整个 Memory overview 失败
  - `getEntityDetail()` 已升级为显式输入对象，metadata scope 会贯通 `desktopAPI -> main -> server`
  - `getEntityDetail()` 的依赖注入类型与 IPC 合同已同步包含 `metadata`，不再出现运行时支持但类型缺失的漂移
  - `listFacts()` 已切到显式 body 查询链路，不再把 `categories/page/pageSize` 等复杂筛选长期塞进 GET query string
  - 未登录 / 未绑定时 `getOverview()` 返回同形状 disabled DTO；其余 IPC 走 fail-fast
- 已通过验证：

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/memory/api/client.test.ts \
  src/main/app/memory-ipc-handlers.test.ts
pnpm --filter @moryflow/pc exec tsc --noEmit
```

- 当前结果：
  - `memory/api/client.test.ts` / `memory-ipc-handlers.test.ts`：PASS（`9` tests）
  - `@moryflow/pc tsc --noEmit`：PASS

### Task 8: 导航接入 `Memory`

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
  src/renderer/workspace/components/workspace-shell-main-content.test.tsx \
  src/renderer/workspace/components/sidebar/components/modules-nav.test.tsx
```

Expected: PASS

### Task 8 当前状态

- 已完成：
  - `Memory` 已新增为独立 `module destination`
  - Home Modules 顺序已固定为 `Remote Agents -> Memory -> Skills -> Sites`
  - renderer 主区已接入 `MemoryPage`
  - `MemoryPage` 已通过 `desktopAPI.memory.getOverview()` 打通正式 `Memory Workbench` 基础链路
  - 停留在 `Memory` 模块时，active workspace 切换会自动重新拉取 overview，不再保留旧 workspace 数据
  - 占位页错误提取已与 hook 的 string error 语义对齐，不再把真实错误文案退回兜底文案
  - `Task 8` 的占位页已在后续 `PR 4` 中被正式 `Memory Workbench` 替换
- 已通过验证：

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/memory/api/client.test.ts \
  src/main/app/memory-ipc-handlers.test.ts \
  src/renderer/workspace/navigation/modules-registry.test.ts \
  src/renderer/workspace/components/workspace-shell-main-content.test.tsx \
  src/renderer/workspace/components/sidebar/components/modules-nav.test.tsx \
  src/renderer/workspace/components/memory/use-memory.test.tsx \
  src/renderer/workspace/components/memory/const.test.ts
pnpm --filter @moryflow/pc exec tsc --noEmit
```

- 当前结果：
  - PR 3 renderer/main 回归测试：PASS（`7` files / `21` tests）
  - `@moryflow/pc tsc --noEmit`：PASS

### Task 9: 实现 `Overview + Search`

### Task 9 当前状态

- 已完成：
  - renderer 已在 `apps/moryflow/pc/src/renderer/workspace/components/memory/index.tsx` 收口为正式 `Memory Workbench`
  - `Overview` 已固定展示 `scope / binding / sync / indexing / facts / graph`
  - `Search` 已固定调用 `desktopAPI.memory.search({ includeGraphContext: true })`
  - Search 结果固定分组为 `Memory Files + Facts`
  - `Memory Files` 会优先映射到本地文件打开动作；`Facts` 会直接拉取事实详情
  - active workspace 切换时，`Overview / Search / Facts / Graph / Exports` 的缓存状态会统一失效并按当前 tab 重拉，避免新旧 workspace 数据混显
  - 跨入口 pending intent 已固定绑定 `workspaceScopeKey`；切换 workspace 时只清理 scope 不匹配的旧 intent，不会误丢新 workspace 的 `Global Search -> Facts/Search` 跳转
  - same-scope 的跨入口 pending intent 不再触发整页 `Memory Workbench` 状态清空，避免 `Global Search -> Facts` 造成 Workbench 数据闪空与重复加载
  - Workbench 内 write / detail actions 已统一写入可见错误状态，不再产生无声失败或 unhandled rejection
  - `openFact / createFact` 等异步 detail / mutation 结果已增加 workspace scope guard；切换 workspace 后旧响应不会回填到新 scope
  - Graph 查询已固定采用 debounce + 过期响应丢弃，避免每次击键都直打 API
  - Workbench Search 的 `Memory Files` 已与 Global Search 统一：仅当存在 `localPath` 且未被标记 `disabled` 时才允许打开
  - `Memory Files` 的本地路径已保持 native path 原样，不再在 renderer 侧单点改写分隔符，避免 Windows 下 tab/path 匹配漂移
- 实际文件：
  - `apps/moryflow/pc/src/renderer/workspace/components/memory/index.tsx`
  - `apps/moryflow/pc/src/renderer/workspace/components/memory/use-memory.ts`
  - `apps/moryflow/pc/src/renderer/workspace/components/memory/helpers.ts`
  - `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-workbench-store.ts`
  - `apps/moryflow/pc/src/renderer/workspace/components/memory/index.test.tsx`

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
- Overview 正确展示固定 DTO 字段与降级状态

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

### Task 10: 实现 `Facts`

### Task 10 当前状态

- 已完成：
  - `Facts` 已接通 list / detail / create / update / delete / batchDelete / history / feedback
  - 手动事实支持内联编辑与删除
  - `source-derived` 事实固定标记为只读，不能编辑或加入批量删除
  - 已补齐跨入口选中事实能力，供 `Global Search -> Facts` 直接落到详情
- 实际文件：
  - `apps/moryflow/pc/src/renderer/workspace/components/memory/index.tsx`
  - `apps/moryflow/pc/src/renderer/workspace/components/memory/use-memory.ts`
  - `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-workbench-store.ts`
  - `apps/moryflow/pc/src/renderer/workspace/components/memory/index.test.tsx`

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

### Task 11: 实现 `Graph`

### Task 11 当前状态

- 已完成：
  - `Graph` 已接通 `desktopAPI.memory.queryGraph()` 与 `getEntityDetail()`
  - 主区已展示实体列表、关系详情与 recent observations evidence drill-down
  - graph 空结果时保留 build/read 状态，不再回退到临时拼装视图
- 实际文件：
  - `apps/moryflow/pc/src/renderer/workspace/components/memory/index.tsx`
  - `apps/moryflow/pc/src/renderer/workspace/components/memory/use-memory.ts`
  - `apps/moryflow/pc/src/renderer/workspace/components/memory/index.test.tsx`

**Files:**

- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-graph-view.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-graph-canvas.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-entity-detail.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-relation-detail.tsx`
- Test: `apps/moryflow/pc/src/renderer/workspace/components/memory/memory-graph-view.test.tsx`

**Step 1: 写失败测试**

覆盖：

- 图谱渲染
- cold start `Graph is building...` 状态
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

### Task 12: 实现 `Exports`

### Task 12 当前状态

- 已完成：
  - `Exports` 已接通 `createExport()` 与 `getExport()`
  - 当前 UI 文案已固定为 `facts export`
  - 导出结果会回显当前导出的 facts 明细，避免用户误判为空任务
- 实际文件：
  - `apps/moryflow/pc/src/renderer/workspace/components/memory/index.tsx`
  - `apps/moryflow/pc/src/renderer/workspace/components/memory/use-memory.ts`
  - `apps/moryflow/pc/src/renderer/workspace/components/memory/index.test.tsx`

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

### Task 13: 集成 `Global Search` 的 `Local + Memory`

### Task 13 当前状态

- 已完成：
  - `Global Search` 已固定并列查询 `Local Search + Memory Search`
  - 分组固定为 `Threads / Files / Memory Files / Facts`
  - `Memory Search` 失败时不会清空本地结果；该分组会显式显示 `Unavailable`，本地搜索能力保持不回退
  - 点击 `Memory Files` 仅在存在本地映射且结果未禁用时才可打开；无 `localPath` 或被标记 `disabled` 的结果固定禁用，不再伪装成可点击结果
  - 点击 `Facts` 会路由到 `Memory -> Facts`
  - `Memory Search` 与 Workbench Search 共用同一套文件可打开判定，避免两处 UI 语义漂移
  - 旧 `desktopAPI.cloudSync.search -> /api/v1/search` 远端文件搜索链已从 PC IPC / preload / client 移除，完成 cutover
- 实际文件：
  - `apps/moryflow/pc/src/renderer/components/global-search/const.ts`
  - `apps/moryflow/pc/src/renderer/components/global-search/index.tsx`
  - `apps/moryflow/pc/src/renderer/components/global-search/use-global-search.ts`
  - `apps/moryflow/pc/src/renderer/components/global-search/index.test.tsx`
  - `apps/moryflow/pc/src/renderer/components/global-search/use-global-search.test.tsx`
  - `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-overlays.tsx`
  - `apps/moryflow/pc/src/preload/index.ts`
  - `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`
  - `apps/moryflow/pc/src/main/app/cloud-sync-ipc-handlers.ts`
  - `apps/moryflow/pc/src/main/app/cloud-sync-ipc-handlers.test.ts`
  - `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
  - `apps/moryflow/pc/src/main/cloud-sync/api/client.ts`

**Files:**

- Create: `apps/moryflow/pc/src/main/global-search/index.ts`
- Create: `apps/moryflow/pc/src/shared/ipc/global-search.ts`
- Modify: `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
- Modify: `apps/moryflow/pc/src/main/cloud-sync/api/client.ts`
- Modify: `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`
- Modify: `apps/moryflow/pc/src/renderer/components/global-search/use-global-search.ts`
- Modify: `apps/moryflow/pc/src/renderer/components/global-search/*`
- Test: `apps/moryflow/pc/src/main/global-search/global-search.service.test.ts`
- Test: `apps/moryflow/pc/src/renderer/components/global-search/use-global-search.test.tsx`

**Step 1: 写失败测试**

覆盖：

- 未登录时只显示 `Local Search`
- 未绑定时只显示 `Local Search`
- 已绑定时 `Local Search` 先返回、`Memory Search` 异步补齐
- `Memory Search` 失败时显示 `Unavailable`
- 有 `localPath` 时可点击、无 `localPath` 时禁用
- `Local Search` 保留现有 `Threads -> Files` 顺序

**Step 2: 跑测试确认失败**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/global-search/global-search.service.test.ts \
  src/renderer/components/global-search/use-global-search.test.tsx
```

Expected: FAIL

**Step 3: 实现 Global Search 聚合**

关键要求：

- 只新增独立聚合入口，不偷偷扩展现有本地搜索 IPC 语义
- 本地与远端结果固定分组展示，不混排
- `Memory Search` 固定复用 `memory gateway`
- 远端失败不得阻塞或清空本地结果
- 不再通过 `desktopAPI.cloudSync.search` 挂接新的远端搜索语义
- 在 renderer 全量切换完成的同一任务里删除旧远端搜索 fallback，完成最终 cutover

**Step 4: 复跑测试**

Run:

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/global-search/global-search.service.test.ts \
  src/renderer/components/global-search/use-global-search.test.tsx
```

Expected: PASS

### Task 14: 冻结开发期验证与线上真实数据验收

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
- retrieval 双组合同验证
- gateway / IPC 验证
- Search / Facts / Graph / Exports UI 验证
- Global Search `Local + Memory` 聚合验证
- `PR 2 -> stages 1-4`
- `PR 3 -> stages 5-6 + Task 8 导航接入`
- `PR 4 -> stages 7-8 + 最终 cutover`

**Step 2: 写入线上真实数据验收**

固定按真实线上数据验收：

- Overview
- Search Files
- Search Facts
- manual fact create/update/delete
- derived fact read-only + feedback
- Graph nodes / relations / evidence
- facts export create/get/download
- Global Search `Local Search + Memory Search`
- Graph 验收前置：Anyhunt `memory/overview.graph.projectionStatus=ready` 或既有 source backfill/replay 已完成
- 当前阶段如需直接执行线上环境变量升级、数据库 migration 或生产验证，固定使用：
  - `/Users/lin/code/moryflow/apps/moryflow/server/.env`
  - `/Users/lin/code/moryflow/apps/anyhunt/server/.env`
- 上述执行授权仅覆盖本期 `Memory Workbench` 相关 Anyhunt / Moryflow Server 变更；每次实际执行后必须持续回写 validation / production playbook

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

## 10. 总体验证矩阵

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
  src/retrieval/__tests__/retrieval.service.spec.ts \
  src/retrieval/__tests__/retrieval.controller.spec.ts \
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
  src/main/global-search/global-search.service.test.ts \
  src/renderer/workspace/navigation/modules-registry.test.ts \
  src/renderer/workspace/components/workspace-shell-main-content.test.tsx \
  src/renderer/components/global-search/use-global-search.test.tsx \
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

## 11. 上线后真实数据验收

上线后必须按文档用真实线上数据完成验收，最小通过标准固定为：

1. `Memory` 模块能进入
2. `Overview` 显示真实 workspace / vault / sync / index / facts / graph 状态
3. `Search` 同时返回 `Files + Facts`
4. `Facts` 视图明确区分 `Manual / Derived`
5. `Manual` facts 可执行 create/update/delete
6. `Derived` facts 保持只读，但可 feedback
7. `Graph` 能展示真实节点、边与 evidence
8. `Exports` 能 create/get/download facts export
9. `Global Search` 能稳定分组展示 `Local Search + Memory Search`
10. `Global Search` 保持现有本地 `Threads -> Files` 能力不回退
11. 任一子能力失败时局部降级，不污染整个模块

上线后真实数据验收统一记录在：

- `docs/reference/cloud-sync-and-memox-production-validation-playbook.md`

## 12. 风险控制

- facts 投影失败不回滚 source indexed 成功
- derived facts 必须有稳定 provenance 与 replace 语义
- graph 读取必须建立在正式 graph read API 上
- Search 必须走统一 retrieval，不在 PC 重建平台搜索语义
- PC 不得直连 Anyhunt
- 本期不为赶进度而牺牲 future dialog / MCP 的统一入口

## 13. 终态

本计划完成后，Moryflow PC 将具备一个真正完整的 `Memory Workbench`：

- `Overview`：看当前 scope 的状态与覆盖范围
- `Search`：统一检索 `Files + Facts`
- `Facts`：完整操作 manual facts，并浏览/反馈 derived facts
- `Graph`：浏览结构化关系与证据
- `Exports`：导出当前 scope 的 facts

同时，Anyhunt 的来源模型、graph 读接口、Moryflow Server `memory gateway` 与 PC `desktopAPI.memory.*` 会成为未来对话流、工作流、MCP 与 Agent runtime 接入 Memory 能力的统一基础设施。
