---
title: Anyhunt Memox 开放记忆与检索平台架构（Moryflow 替代方案）
date: 2026-03-07
scope: apps/anyhunt/server/src/memory, apps/anyhunt/server/src/sources, apps/anyhunt/server/src/retrieval, apps/anyhunt/server/src/graph, apps/anyhunt/server/src/api-key, apps/moryflow/server/src/sync, apps/moryflow/server/src/memox, apps/moryflow/server/src/search, apps/moryflow/pc/src/main/cloud-sync, apps/moryflow/pc/src/main/app, apps/moryflow/pc/src/shared/ipc
status: active
---

<!--
[INPUT]: Anyhunt Memory 对外售卖目标、Moryflow 统一接入诉求、阶段 A 收口后的现状代码、确认后的“Memox 完整替代 Moryflow vectorize/search”方向
[OUTPUT]: 面向开放 API 的最终目标架构、边界划分、数据模型、API 契约与迁移顺序
[POS]: Anyhunt Features / Memox 开放记忆与检索平台事实源

[PROTOCOL]: 本文件变更需同步更新 `docs/design/anyhunt/features/index.md`、`docs/design/anyhunt/core/system-boundaries-and-identity.md`、`docs/design/anyhunt/core/quota-and-api-keys.md`、`docs/index.md` 与受影响模块 CLAUDE.md。
-->

# Anyhunt Memox 开放记忆与检索平台架构（Moryflow 替代方案）

## 0. 文档目标

本文定义 Memox 的公开架构事实源，覆盖产品定位、替代关系、开放 API 边界与实现约束。

固定结论：

1. `Memox` 的最终定位不是“聊天长期记忆小模块”，而是 **开放的记忆与检索平台**。
2. `Memox` 同时服务 Anyhunt Playground、Moryflow Server 和未来第三方客户。
3. `Moryflow Server` 是 Memox 的第一个正式客户，但**不是特权客户**。
4. `Memox` 完整替代 Moryflow 当前自建的 `apps/moryflow/server/src/vectorize`、`apps/moryflow/server/src/search`、`apps/moryflow/vectorize`。
5. 替代后，Moryflow 上层继续保留“文件搜索体验”，但底层由 Memox 提供统一能力。

---

## 1. 一次性冻结决策

## 1.1 协议主权

1. `Mem0` 只作为 benchmark，不作为 Anyhunt 的协议兼容目标。
2. Anyhunt 对外公开的 Memory / Source / Search / Export / Graph 契约，由 Anyhunt 自己定义和版本化。
3. 任何消费者，包括 Moryflow Server，都必须走同一套公网 API。
4. 禁止再出现“Moryflow 专用 memory 协议”或“Anyhunt 内部专用 retrieval 协议”。

## 1.2 替代关系

1. Memox 最终完整替代 Moryflow 现有 `vectorize/search`。
2. 这些模块不是立即粗暴删除，而是迁移完成后统一下线。
3. 迁移完成后，Moryflow 不再维护独立的文件向量化与文件检索底座。

## 1.3 接入路径

1. `Moryflow PC -> Moryflow Server -> Anyhunt Memox Public API`
2. `Moryflow PC` 不直接持有 Anyhunt API Key。
3. `Moryflow Server` 负责：
   - 用户身份映射
   - 幂等键生成
   - 错误翻译
   - 重试与补偿
   - 本地 DTO 适配
4. `Anyhunt Memox` 负责：
   - 原始检索语义
   - source/file 聚合语义
   - 公开 API 稳定性

## 1.4 开放性约束

1. 所有 Source / Search / Memory 契约必须是通用的，不允许用 Moryflow 私有字段命名。
2. 允许 Moryflow 在 metadata 里带自己的上下文，但 Memox 主模型不能依赖 Moryflow 特有字段存在。
3. 文档中的例子可以用 Moryflow 说明，但设计不能为 Moryflow 特化。

## 1.5 一期、二期与后续

### 一期必须完成

1. Anyhunt 自己先把 Memox 做成可独立对外售卖的开放平台
2. 文件必须 chunk
3. 检索必须支持 `hybrid retrieval`
4. `entities / relations` 进入正式架构，但仅以异步 graph projection 落地
5. 一期只允许完成 `S1 ~ S5`，不并行推进 Moryflow 接入

### 二期必须完成

1. 用 Memox 完整替代 Moryflow `vectorize/search`
2. Moryflow Server 必须以 gateway + outbox bridge 形式接入，不得再维护第二套平台检索语义
3. 必须补齐 `API Key 策略 + scope/source identity 映射 + retrieval/source 稳定文件身份契约 + backfill/replay/搜索投影验证/cutover/故障处理 runbook` 四块事实源
4. 迁移完成后统一删除旧 retrieval stack 与旧 `vectorized*` 契约

### 一期明确不做

1. Moryflow Server / PC 接入
2. 模型级 rerank
3. 公开 graph query API
4. 图谱可视化前端

### 后续保留方向

1. 二阶段模型级 rerank
2. 更丰富的 graph 查询
3. 多租户更细粒度的配额和 SLA

---

## 2. 现状复盘

## 2.1 Memox 当前已有能力

Anyhunt Server 当前已具备：

1. `memory` 域：CRUD、语义搜索、关键词搜索、metadata/filter DSL、history、feedback、export。
2. 平台底座：API Key hash-only、请求日志、OpenAPI、RFC7807 错误体基础。

当前代码事实源：

- `apps/anyhunt/server/src/memory/memory.service.ts`
- `apps/anyhunt/server/src/memory/memory.repository.ts`
- `apps/anyhunt/server/src/sources/knowledge-source-revision.service.ts`
- `apps/anyhunt/server/src/retrieval/retrieval.service.ts`
- `apps/anyhunt/server/src/graph/graph-projection.service.ts`
- `apps/anyhunt/server/prisma/vector/schema.prisma`

## 2.2 Moryflow 当前冻结实现（供二期基线参考）

Moryflow 当前文件搜索与记忆桥接已经冻结为 `workspace content + Memox bridge`：

1. 对外搜索入口继续由 `search.service.ts` 提供。
2. 可检索文件集合由 `search-live-file-projector.service.ts` 基于 `SyncFile` 派生，不再依赖旧 `search-result-filter` 中间层。
3. `workspace-content` 写入 `WorkspaceContentOutbox`，作为后续 projection / bridge 的单一派生事实源。
4. Memox bridge 通过 source bridge / workspace-content projection / search adapter 组合接入当前冻结实现。
5. 旧 `vectorize` worker 与旧搜索过滤中间层已删除，不再作为架构入口。

当前冻结实现的关键代码：

- `apps/moryflow/server/src/search/search.service.ts`
- `apps/moryflow/server/src/search/search-live-file-projector.service.ts`
- `apps/moryflow/server/src/sync/sync-commit.service.ts`
- `apps/moryflow/server/src/memox/memox-source-bridge.service.ts`
- `apps/moryflow/server/src/memox/memox-workspace-content-consumer.service.ts`
- `apps/moryflow/server/src/memox/memox-workspace-content-projection.service.ts`
- `apps/moryflow/server/src/memox/memox-search-adapter.service.ts`
- `apps/moryflow/server/src/memox/legacy-vector-search.client.ts`
- `apps/moryflow/server/src/workspace-content/workspace-content.service.ts`
- `apps/moryflow/server/prisma/schema.prisma`

## 2.3 二期开工时的问题根因

1. 原子记忆与文档检索未分域。
2. 运行时作用域实体与知识图谱实体未分域。
3. Anyhunt 平台检索语义与 Moryflow 本地适配逻辑未分层。
4. “可用”与“可售卖、可开放、可长期维护”未分阶段。

---

## 3. 设计原则（最佳实践）

## 3.1 边界优先于复用

统一的是公开契约、检索编排、鉴权、配额、日志和作业系统；不统一为单表、单模块或单 service。

## 3.2 API 统一，存储分治

Memox 对外是统一平台；内部固定拆分为 `MemoryFact`、`KnowledgeSource`、`KnowledgeSourceRevision`、`SourceChunk`、`GraphEntity`、`GraphRelation` 等独立模型。

## 3.3 Anyhunt 拥有检索语义

`source/file` 聚合结果由 Anyhunt Memox 定义并返回；`Moryflow Server` 只做用户上下文映射和轻量 DTO 适配。

1. Anyhunt 必须提供统一公开检索入口，不能只暴露多个子域接口让客户端自行 merge。
2. `Moryflow Server` 不允许维护第二套“平台级搜索编排”。
3. `/memories/search`、`/sources/search` 可以保留为子域接口，但平台级语义必须由统一检索入口持有。

## 3.4 原始 source 内容由 Anyhunt 持有

原始 source 内容的事实源由 Anyhunt 持有，以支持 `reindex`、`delete`、`export`、`graph projection`、`content normalization` 和 `chunk regeneration`。Moryflow 可以上传 source，但 `blob / normalized text / source revision` 的所有权属于 Anyhunt。

## 3.5 计费和配额不能按 chunk 设计

chunk 是内部检索单位，不是产品计量单位。计费与配额按 `source_count`、`indexed_bytes / indexed_tokens`、ingest job 数量与并发、search request 数量、`export / graph projection` 等重作业次数建模。

---

## 4. 最终边界模型

## 4.1 Bounded Context 划分

### A. Memory Facts

- 职责：长期记忆、偏好、事实、总结、规则，以及 `history / feedback / expiration / update / delete`。
- 公开 API：`POST /api/v1/memories`、`GET /api/v1/memories`、`POST /api/v1/memories/search`、`GET /api/v1/memories/:id`、`PATCH /api/v1/memories/:id`、`DELETE /api/v1/memories/:id`、`GET /api/v1/memories/:id/history`。

### B. Sources

- 职责：文件、文档、网页、转录文本等知识源，以及 source 生命周期、版本、blob、chunk 与 reindex。
- 公开 API：`GET /api/v1/source-identities/:sourceType/:externalId`、`PUT /api/v1/source-identities/:sourceType/:externalId`、`POST /api/v1/sources`、`POST /api/v1/sources/:id/revisions`、`GET /api/v1/sources/:id`、`GET /api/v1/sources/:id/revisions/:revisionId`、`POST /api/v1/source-revisions/:revisionId/finalize`、`POST /api/v1/source-revisions/:revisionId/reindex`、`DELETE /api/v1/sources/:id`。

### C. Retrieval Orchestrator

- 职责：`dense retrieval`、`keyword retrieval`、merge、chunk expansion、source/file aggregation，以及 future rerank extension point。
- 约束：这是编排层，不承担原始数据写入事实源职责。

### D. Scope Registry

- 职责：物化运行时作用域 `user / agent / app / run`，只服务于过滤、统计、控制台和运营观察。
- 约束：它不是 graph entity，不是公开知识图谱 API，本期不作为主开放 API 域暴露。

### E. Graph Projection

- 职责：把 memory/source 中的高价值内容异步抽取为 graph entity / relation，并提供 graph read/query 所需的独立读模型。
- 约束：graph 是独立 bounded context，不和 `ScopeRegistry` 复用表与 API；公开边界只允许 read/query，不允许 graph write CRUD。

### F. Async Jobs

- 职责：`source processing`、`reindex`、`export`、API key cleanup、graph projection。
- 约束：不允许 `fire-and-forget`；所有重作业必须有持久化状态和重试策略。

---

## 5. 最终数据模型

## 5.1 Memory Facts 模型

### `MemoryFact`

职责：原子长期记忆记录。

字段：`id, apiKeyId, userId, agentId, appId, runId, orgId, projectId, content, metadata, categories, keywords, embedding, immutable, expirationDate, timestamp, originKind, sourceId, sourceRevisionId, derivedKey, createdAt, updatedAt`

当前 Prisma 若仍使用历史字段名 `memory`，Phase 2 `Task 2` 直接 rename 为 `content`，不保留双字段兼容。

`MemoryFactHistory` 记录生命周期变化；`MemoryFeedback` 记录用户对检索或记忆质量的反馈。

`MemoryFact` 保留历史、反馈、过期、更新等记忆语义；不与文档 chunk 共表。

冻结约束：

1. `originKind` 固定区分 `MANUAL | SOURCE_DERIVED`。
2. `SOURCE_DERIVED` facts 的来源关系必须是一等字段，不允许只塞进 `metadata`。
3. `SOURCE_DERIVED` facts 不得复用普通 update/delete/batch write 主链。
4. source-derived facts 的 replace/cleanup 以 `(apiKeyId, sourceId, derivedKey)` 为稳定幂等基础。

## 5.2 Sources 模型

### `KnowledgeSource`

职责：source 的稳定身份。

字段：`id, apiKeyId, sourceType, externalId, userId, agentId, appId, runId, orgId, projectId, title, displayPath, mimeType, metadata, currentRevisionId, status, createdAt, updatedAt`

### `KnowledgeSourceRevision`

职责：某个 source 的具体内容版本。

字段：`id, sourceId, checksum, userId, agentId, appId, runId, orgId, projectId, contentBytes, contentTokens, normalizedTextR2Key, blobR2Key, status, createdAt, indexedAt`

### `SourceChunk`

职责：真正用于检索的 chunk 记录。

字段：`id, sourceId, revisionId, apiKeyId, userId, agentId, appId, runId, orgId, projectId, chunkIndex, chunkCount, headingPath, content, tokenCount, metadata, keywords, embedding, createdAt, updatedAt`

`MemoryFact` 承载记忆语义；`KnowledgeSource + Revision + SourceChunk` 承载文档检索语义；两者不共表。

## 5.3 Scope Registry 模型

### `ScopeRegistry`

职责：运行时作用域投影。

字段：`id, apiKeyId, scopeType(user|agent|app|run), scopeId, metadata, name, orgId, projectId`

- 它是运行时作用域，不是 graph entity。
- 当前 `entity/` 模块向此方向重构，不扩展成图谱实体系统。
- `userId / agentId / appId / runId / orgId / projectId` 仍直接保存在 `MemoryFact` 与 `KnowledgeSource` 主记录上。
- `ScopeRegistry` 只做物化统计、管理视图和运营观察，不进入主检索热路径必需 join。
- `lastSeenAt / memoryFactCount / sourceCount` 定义为派生视图指标，不要求物理落表，也不能反向成为主检索事实源。

## 5.4 Graph 模型

### `GraphEntity`

职责：知识图谱实体。

字段：`id, apiKeyId, entityType, canonicalName, aliases, metadata, lastSeenAt`

### `GraphRelation`

职责：知识图谱关系。

字段：`id, apiKeyId, fromEntityId, toEntityId, relationType, confidence, evidenceSourceId, evidenceMemoryFactId, createdAt, updatedAt`

### `GraphObservation`

保留抽取证据、调试和 explainability；不再把实体/关系快照塞进 `MemoryFact.entities/relations` 这类主表 JSON 字段。

### Canonical Merge 规则（本期必须冻结）

- 作用域：canonical entity 只在同一 `apiKeyId` 内归并，不跨 key 合并；canonical key 固定为 `entityType + normalizedCanonicalName`。
- 规范化：`normalizedCanonicalName` 至少执行 `trim -> Unicode normalize -> lower-case -> collapse whitespace`。
- 准入：低置信度 observation 不直接创建 canonical entity，必须先挂 observation；alias 只追加到 canonical entity，不单独升格。
- 引用：relation 永远引用 canonical entity id；文件路径、标题变动优先按 `sourceId` 归并，不按标题字符串归并。
- 边界：`normalizedCanonicalName` 不同即视为不同 canonical entity，本期不做自动 entity merge；同一 alias 在同一 `apiKeyId` 下可暂时指向多个 canonical entity，歧义依赖 observation 置信度与 graph context 排序，本期不做人工合并流。

## 5.5 幂等与作业模型

- `IdempotencyRecord`：公开写接口幂等保证。
- `SourceProcessingJob`：`source normalize / chunk / embed / index`。
- `ReindexJob`：版本重建与 chunk 重算。
- `MemoryExportJob`：导出。
- `ApiKeyCleanupJob`：删除 API Key 后的持久化清理。

本期冻结：

1. 必须是 durable queue job，不能退化成进程内 fire-and-forget。
2. 清理范围必须覆盖 `MemoryFact* / KnowledgeSource* / SourceChunk / Graph* / R2 source blobs / normalized text`。
3. 主库保留 `ApiKeyCleanupTask` 作为运行事实源，至少记录 `status / attempts / lastError / completedAt`。
4. worker 失败后必须依赖 BullMQ 重试与恢复扫描继续补偿；失败不允许静默吞掉。
5. 运营可见性与手动 retry runbook 需要保留，但本期仍以内部运维流程为准，不额外开放公网 API。

- `GraphProjectionJob`：异步 graph 物化。

---

## 6. 开放 API 契约

## 6.1 认证

- Header：`Authorization: Bearer <apiKey>`
- API Key 继续 hash-only 存储
- Moryflow Server 也是普通公网 API 客户

## 6.2 Platform Retrieval API

- 统一公开检索入口：`POST /api/v1/retrieval/search`
- 固定语义：接收统一 query 与统一 scope，执行 dense retrieval + keyword retrieval + merge，并以稳定分组结果返回 `files + facts`。
- `/memories/search` 与 `/sources/search` 继续作为子域接口保留，但不承担平台级统一语义。

### 请求契约（冻结）

```ts
type RetrievalSearchRequest = {
  query: string;
  scope?: {
    user_id?: string;
    agent_id?: string;
    app_id?: string;
    run_id?: string;
    org_id?: string;
    project_id?: string;
  };
  group_limits?: {
    sources?: number;
    memory_facts?: number;
  };
  metadata?: Record<string, unknown>;
  include_graph_context?: boolean;
};
```

### 响应契约（冻结）

```ts
type RetrievalSearchResponse = {
  groups: {
    files: {
      items: SourceResult[];
      returned_count: number;
      hasMore: boolean;
    };
    facts: {
      items: MemoryFactResult[];
      returned_count: number;
      hasMore: boolean;
    };
  };
};

type MemoryFactResult = {
  result_kind: 'memory_fact';
  id: string;
  score: number;
  rank: number;
  memory_fact_id: string;
  content: string;
  metadata: Record<string, unknown> | null;
  graph_context?: GraphContext;
};

type SourceResult = {
  result_kind: 'source';
  id: string;
  score: number;
  rank: number;
  source_id: string;
  source_type: string;
  project_id: string | null;
  external_id: string | null;
  display_path: string | null;
  title: string;
  snippet: string;
  matched_chunks: Array<{ chunk_id: string; chunk_index: number }>;
  metadata: Record<string, unknown> | null;
  graph_context?: GraphContext;
};
```

Moryflow 接入补充约束（冻结）：

1. `SourceResult` 的稳定文件身份固定为 `project_id + external_id + display_path`；Moryflow gateway 不允许从 `title` / `snippet` 反推文件身份。
2. Phase 2 固定要求平台在 `/sources/search` 与 `/retrieval/search` 的 source 结果中同时返回 `project_id`、`external_id` 与 `display_path`。
3. Moryflow Server 必须通过 gateway 把平台结果适配成面向 PC 的 C 端合同；PC 不直接消费 Memox 原始响应。
4. `retrieval/search` 必须直接保证 `files` 与 `facts` 的独立配额；不接受全局混排 `top_k` 后让 gateway/UI 补救。

### `score` 语义（冻结）

1. `score` 是平台在当前响应内排序后的统一归一化分数。
2. `score` 只保证在同一次响应内可比较。
3. 不保证跨请求、跨时间、跨实现版本稳定。
4. 平台级排序以 `rank` 和返回顺序为准，客户端不应自行重建排序。
5. 当前实现使用 `min-max normalization -> [0, 1]`，但这只是实现细节，不构成开放 API 的兼容承诺。

## 6.2A Platform Overview API

- 统一读模型端点：`GET /api/v1/memories/overview`
- 固定语义：在统一 `scope` 下，一次性返回 `indexing / facts / graph` 的统计与状态，供 Moryflow `Overview` DTO 使用。
- 冻结约束：
  1. 不允许由 Moryflow gateway 临时 fan-out 任意 list/search 接口来猜统计值。
  2. `graph.projectionStatus` 与 `lastProjectedAt` 必须来自 Anyhunt 正式读模型。
  3. Graph 真实验收只有在 `projectionStatus=ready` 或 backfill/replay 完成后才允许判定 PASS。

## 6.3 Memory API

- 端点：`POST /api/v1/memories`、`GET /api/v1/memories`、`POST /api/v1/memories/search`、`GET /api/v1/memories/:id`、`PATCH /api/v1/memories/:id`、`DELETE /api/v1/memories/:id`、`GET /api/v1/memories/:id/history`
- 固定语义：返回 `MemoryFact` 级结果，支持 `user_id / agent_id / app_id / run_id / org_id / project_id / metadata` 过滤，支持 history 与 feedback。

## 6.4 Source API

### Source Identity Lookup（只读）

`GET /api/v1/source-identities/:sourceType/:externalId`

- 这是 source identity 的只读 lookup 入口；它只按 `(apiKeyId, sourceType, externalId)` 查询现有 source，不得隐式创建。
- lookup 请求固定只接受 scope 证明字段：`user_id`、`agent_id`、`app_id`、`run_id`、`org_id`、`project_id`。
- 若 identity 不存在，返回 `404 SOURCE_IDENTITY_NOT_FOUND`；若已持久化 scope 与调用方证明不一致，返回 `409 SOURCE_IDENTITY_SCOPE_MISMATCH`。

### Source Identity Resolve / Upsert（Phase 2 首选）

`PUT /api/v1/source-identities/:sourceType/:externalId`

- 这是外部生产者接入 source lifecycle 的首选入口；它按 `(apiKeyId, sourceType, externalId)` 解析稳定 source identity，并幂等创建或更新 source。
- 请求体只允许更新 identity 层字段：`title`、`display_path`、`mime_type`、`user_id`、`agent_id`、`app_id`、`run_id`、`org_id`、`project_id`、`metadata`。
- 返回固定包含稳定 `source_id`，供后续 `revision create / finalize / delete` 复用。
- `POST /api/v1/sources` 保留为通用低层创建接口；Moryflow Phase 2 不以它作为主入口。

### Source 创建

`POST /api/v1/sources`：只创建 source 身份，不隐式创建 revision；声明 source 元数据，返回 `source_id`，不直接承载大文件内容。

### Source Revision 创建

`POST /api/v1/sources/:id/revisions`：公开摄入核心入口。revision 是正式公开资源，不再藏成 source 内部状态机；本期仅支持 `inline_text | upload_blob`。

### Source 内容提交（冻结为单一路径）

- 路径 1：`POST /api/v1/sources/:id/revisions` 直接携带小文本内容。
- 路径 2：`POST /api/v1/sources/:id/revisions` 返回 `uploadSession(uploadUrl, headers, expiresAt, revisionId)`，客户端随后直接向受控上传地址上传 blob。
- 禁止保留第二种 blob 提交路径；不再定义 `PUT /api/v1/sources/:id/blob` 这类平行契约。

### Source Revision 生命周期

- 生命周期端点：`GET /api/v1/sources/:id`、`GET /api/v1/sources/:id/revisions/:revisionId`、`POST /api/v1/source-revisions/:revisionId/finalize`、`POST /api/v1/source-revisions/:revisionId/reindex`、`DELETE /api/v1/sources/:id`。
- `KnowledgeSource` 是身份资源；`KnowledgeSourceRevision` 是内容版本资源；finalize / reindex 挂在 revision 资源上；`GET /api/v1/source-revisions/:revisionId` 必须返回 `pending_upload_expires_at`。

### Revision Timeout 与 Zombie Cleanup（本期冻结）

1. `uploadSession.expiresAt` 只约束上传 URL；`pending_upload_expires_at` 约束 revision 生命周期，两者不能混为一谈。
2. `upload_blob` revision 创建后必须写入 `pendingUploadExpiresAt`；本期默认 TTL 为 24 小时。
3. `PENDING_UPLOAD` revision 超时后，`finalize` 必须返回 `409 SOURCE_UPLOAD_WINDOW_EXPIRED`。
4. 平台必须有小时级 cleanup job 扫描超时 `PENDING_UPLOAD` revision。
5. cleanup job 必须先删除 raw blob / normalized text（如存在），再硬删除过期 revision，避免留下 R2 孤儿对象与僵尸 revision。
6. cleanup job 必须幂等；重复执行只能得到同一最终状态。

### Source Search

`POST /api/v1/sources/search`

直接返回 source/file 级结果：`source_id, source_type, project_id, external_id, display_path, title, score, snippet, matched_chunks, metadata`。它是 source 域子接口，不承担平台级统一搜索语义；统一搜索真相源固定由 `retrieval/search` 持有。

## 6.5 Scope API

本期不作为主公开 API 暴露：运行时作用域是内部投影，不是开放知识模型；如需公开，应以后续 `Context / Scopes` 独立域提供，不复用 `Entity` 命名；当前公开 `entity` 路由必须迁出或下线。

## 6.6 Graph API

Graph 正式公开边界固定为 read/query API，不开放 graph write API。

冻结约束：

1. `graph_context` 继续作为 retrieval 附带能力存在。
2. 面向 Moryflow Memory Workbench，平台必须提供独立 `graph read/query API`。
3. graph read/query 必须接受与 retrieval 对齐的统一 `scope`。
4. graph read/query 只读，不提供 merge/split/edit 等写能力。

## 6.7 Export API

- 端点：`POST /api/v1/exports`、`POST /api/v1/exports/get`
- 固定语义：`POST /api/v1/exports` 负责创建异步导出作业，并固定返回 `{ memory_export_id }`；作业完成后，`POST /api/v1/exports/get` 按 `memory_export_id`（或最近一次完成态 filter 命中）返回平台对象存储中的完成态 `application/json` 内容；导出文件名固定为 `memox-export-<exportId>.json`；读取侧继续分页拉取、上传侧继续流式写入对象存储；增量导出与 JSONL 不在本期范围。

## 6.8 幂等与错误

### 幂等

必须支持 `Idempotency-Key` 的写接口：`POST /memories`、`POST /sources`、`POST /sources/:id/revisions`、`POST /source-revisions/:revisionId/finalize`、`POST /source-revisions/:revisionId/reindex`、`POST /exports`。

### 错误

统一 RFC7807：`status`、`code`、`message`、`request_id`、`details`、可选 `errors[]`。

### Ingest Guardrail Error Contract（本期冻结）

`sources/` 域必须输出结构化 RFC7807 错误，不允许退化成通用 `400`：

- `413 SOURCE_SIZE_LIMIT_EXCEEDED`：`details.guardrail=max_source_bytes`，并返回 `details.limit`、`details.current`。
- `413 SOURCE_TOKEN_LIMIT_EXCEEDED`：`details.guardrail=max_normalized_tokens_per_revision`，并返回 `details.limit`、`details.current`。
- `413 SOURCE_CHUNK_LIMIT_EXCEEDED`：`details.guardrail=max_chunks_per_revision`，并返回 `details.limit`、`details.current`。
- `429 FINALIZE_RATE_LIMIT_EXCEEDED`：`details.guardrail=max_finalize_requests_per_api_key_per_window`，并返回 `details.limit`、`details.current`、`details.retryAfter`。
- `429 REINDEX_RATE_LIMIT_EXCEEDED`：`details.guardrail=max_reindex_per_source_per_window`，并返回 `details.limit`、`details.current`、`details.retryAfter`。
- `503 CONCURRENT_PROCESSING_LIMIT_EXCEEDED`：`details.guardrail=max_concurrent_source_jobs_per_api_key`，并返回 `details.limit`、`details.current`、`details.retryAfter`。
- `409 SOURCE_UPLOAD_WINDOW_EXPIRED`：返回 `details.expiredAt`。
- 语义冻结：`413` 为永久拒绝，客户端不自动重试；`429/503` 为可恢复压力错误，客户端结合 `retryAfter` 退避；`409 SOURCE_UPLOAD_WINDOW_EXPIRED` 表示 revision 生命周期失效，客户端必须重新创建 revision。

---

## 7. 检索与 chunk 最佳实践

## 7.1 检索流水线（本期冻结）

本期检索流水线固定为 `query normalization -> dense semantic retrieval -> keyword retrieval -> candidate merge -> chunk expansion -> source/file aggregation -> final response shaping`。模型级 rerank 只保留为后续扩展位。

## 7.2 Chunking 原则

- 冻结原则：结构优先切分、固定窗口只做兜底、轻 overlap、chunk 是检索单位而 source/file 是体验单位。
- 参数：`soft_target_tokens=700`、`hard_max_tokens=1000`、`min_chunk_tokens=200`、`forced_split_overlap_tokens=120`。
- Markdown / Note 切分优先级：`heading -> paragraph -> list block -> table block -> code block`。
- 其他纯文本切分优先级：`paragraph -> sentence -> fixed token window`。
- 删除与重建：必须基于 `sourceId`、`revisionId` 和 chunk 层级 ID；禁止依赖 metadata filter 作为主删除路径。

## 7.3 Rerank

- 本期不实现模型级 rerank。
- 当前 Anyhunt Memory API 已有 `rerank` 参数与启发式实现，但它只是过渡能力，不纳入本期正式方案与验收标准。
- 后续方向：二阶段模型级 rerank、专用 reranker 或小模型优先、`provider abstraction + fallback` 一次性设计。

## 7.4 Ingestion Guardrail（本期必须冻结）

本期固定 ingest guardrail：`max_source_bytes`、`max_normalized_tokens_per_revision`、`max_chunks_per_revision`、`max_concurrent_source_jobs_per_apiKey`、`max_reindex_per_source_per_window`、`max_finalize_requests_per_apiKey_per_window`；这些限制属于公开 API 契约的一部分，不能等到实现时再临时决定。

---

## 8. Graph / Entities / Relations

## 8.1 本期是否纳入

本期纳入并严格限制边界：纳入 `GraphEntity / GraphRelation / GraphObservation / GraphProjectionJob / retrieval graph_context`，以及面向 Moryflow Memory Workbench 的只读 `graph read/query API`；不纳入图谱写接口、图谱可视化编辑前端与对每个 document chunk 同步抽图。

## 8.2 为什么不能复用现有 `entity/` 模块

当前 `entity/` 模块语义固定为运行时作用域 `user / agent / app / run`，不是知识图谱实体；因此现有 `entity/` 只应重构成 `scope-registry`，graph entity / relation 必须使用独立模块。

## 8.3 Graph 的作用

本期 graph 只负责增强上下文、提供 explainability、为后续图谱能力打底；不负责主检索排序。

---

## 9. 配额与计费

## 9.1 本期计量单位

本期配额按 `request_count`、`source_count`、`indexed_bytes`、`indexed_tokens`、`active_processing_jobs`、`export_jobs`、`graph_projection_jobs` 建模。

## 9.2 Source 摄入资源模型

除计量单位外，还必须冻结 source ingest 保护模型：每个 API key 的并发 source processing job 数、每小时可创建 source 数、每个 source 在固定窗口内的 reindex 次数、单次 finalize 可接受的最大文本与 blob 大小，以及单次 source 可接受的最大 chunk 数；这些限制都属于平台级策略模型，不散落在业务逻辑里。

## 9.3 明确禁止

禁止按 chunk 数对外收费、把 chunk 数作为主产品限额，或把内部索引实现细节暴露成产品计费单位。

---

## 10. 二期：Moryflow 迁移与下线

## 10.1 当前仓库状态（2026-03-08）

当前仓库已完成旧 retrieval stack 下线：

- `apps/moryflow/server/src/vectorize` 已删除；
- `VectorizedFile` 与 `UserStorageUsage.vectorizedCount` 已从 Prisma schema 与迁移链路删除；
- `apps/moryflow/server/src/quota`、`apps/moryflow/server/src/admin-storage`、`apps/moryflow/pc/src/main/cloud-sync/api/*`、`apps/moryflow/pc/src/main/app/ipc/register-handlers.ts`、`apps/moryflow/pc/src/shared/ipc/cloud-sync.ts`、`packages/api/src/cloud-sync/types.ts` 已去掉旧 `vectorized*` 合同；
- `apps/moryflow/server/src/search` 继续保留，但只作为 Memox-backed 的公网 gateway，不再承载旧 vectorize 语义；
- `apps/moryflow/server/src/memox` 现只保留 Anyhunt Memox gateway / bridge / cutover 入口；第二套搜索后端与旧基线客户端已删除，Moryflow 文件搜索与写链固定只走 Anyhunt Memox。

## 10.2 Moryflow Server 新职责

二期新增两层明确边界：

1. `memox/` 固定只负责 Anyhunt source lifecycle bridge、outbox、cutover 与 source-first 搜索适配，不承接 PC Memory Workbench 合同。
2. 新增独立 `memory gateway`，固定承担面向 PC 的 `overview / search / facts / graph / exports` 合同、scope 解析、DTO 适配与错误翻译。

`memory gateway` 新建的 `memory.client.ts` 固定复用现有 `MemoxClient` 或同一底层 HTTP provider，不允许再维护第二套 Anyhunt HTTP client / config 注入链路。

`Cloud Sync` 继续拥有 transport 生命周期真相源；Memox 只消费 `workspace content`，不反向侵入 `diff/commit/recovery`；Moryflow Server 不保留第二套平台级检索协议。

## 10.3 二期桥接边界

- Moryflow `workspace content` 的稳定事实源固定为 `WorkspaceContentOutbox`，不是旧 `vectorize.queueFromSync()` 或 `sync file lifecycle outbox`。
- 二期写链固定为 `Moryflow PC -> Moryflow Server workspace-content -> WorkspaceContentOutbox -> memox bridge consumer -> Anyhunt sources/revisions/finalize/delete`。
- 二期读链分两段：
  - cutover 前基线：`Moryflow source-first search adapter -> Anyhunt sources/search`
  - 冻结终态：`Moryflow memory gateway -> Anyhunt retrieval/search`
- `sync` 仍只负责 `diff / commit / object verify / staged apply / recovery / orphan cleanup`。
- Memox bridge 不允许绕过 outbox 直接从 PC 或 `sync` 临时状态拼写 source。
- 二期必须显式定义一致性模型：删除后多久不可搜到、新提交后多久可搜到、rename/path update 何时生效；否则不能切流。

## 10.4 最终删除结果（已完成）

本轮已完成的删除范围固定为：

- 旧 `vectorize` worker / controller / reconcile / projection 代码；
- `VectorizedFile` 表与 `UserStorageUsage.vectorizedCount`；
- Admin / Quota / PC / shared / packages 中全部旧 `vectorized*` 用量与接口合同；
- 旧双轨基线里的搜索过滤中间层。

保留的只有：

- `apps/moryflow/server/src/search`：继续作为 Moryflow 自身 `POST /api/v1/search` 网关；
- `apps/moryflow/server/src/memox/*`：继续作为 Anyhunt Memox gateway / bridge / cutover 控制面；不再保留第二套搜索后端或旧基线路径。

## 10.5 文案同步

`apps/moryflow/www/src/components/landing/WhyLocalSection.tsx` 中 “Mory's memory only exists on your computer” 与二期事实冲突；迁移时必须同步改写。

---

## 11. 一次性执行蓝图（两期）

执行顺序按依赖固定；不并行混做平台底座与 Moryflow 接入。

### 分期原则

1. **一期只做 Anyhunt Memox 平台**：只推进 `S1 ~ S5`，目标是把 Memox 做成可独立对外开放、可售卖、可被第三方消费的开放平台。
2. **二期才做 Moryflow 接入**：`S6 ~ S8` 必须等一期完成后再启动；Moryflow 是一期后的第一正式客户，不与平台底座改造并行推进。
3. **本次一期允许直接重置 Anyhunt Server 主库与向量库**：当前无真实用户，不保留历史兼容；如需清空并重建 `DATABASE_URL / VECTOR_DATABASE_URL` 对应库以收口 schema 与 migration，可直接执行，但该准则仅适用于本次 Memox 一期平台整改。

## 11.1 一期：Anyhunt Memox 平台

- 状态：`completed`
- 范围：只包含 `S1 ~ S5`；不包含 `Moryflow Server / PC` 接入和旧 `vectorize/search` 下线。
- 数据库事实：主库当前 migration 为 `20260306173000_init`；向量库当前 migration 为 `20260306173100_init` 与 `20260306195000_source_revision_upload_timeout`。一期收口时已完成零兼容 reset + migrate，后续 `pendingUploadExpiresAt` 以增量 migration 追加；当前仓库不再保留旧历史迁移树。
- 验证事实：`@anyhunt/anyhunt-server` 针对 guards、log、idempotency、memory、retrieval、graph、sources、scope-registry 的定向单测通过；`typecheck` 通过；受影响文件 `eslint --no-warn-ignored` 通过；主库/向量库 `prisma migrate status` 通过。

### 11.1.1 S1：平台底座与公共约束先落地

全局 throttler、`apiKey.id` tracker / `ah_` key `sha256` fallback tracker、request-log 路由分组、统一幂等主链路、OpenAPI 售卖级元信息、source ingest guardrail 运行时配置模型，以及主库基线 migration `20260306173000_init` 已落地。

### 11.1.2 S2：领域模型分治重构

`ScopeRegistry` 已替代原 `MemoxEntity`，旧 `entity/` 公网适配层已移除；`KnowledgeSource / KnowledgeSourceRevision / SourceChunk` 底层事实源与编排、`MemoryFact*` 正式持久化模型、`GraphEntity / GraphRelation / GraphObservation`、projection job、异步抽取与 observation-first cleanup 已落地。

### 11.1.3 S3：开放 Source 摄入契约落地

`sources` / `source-revisions` 的 create / read / finalize / reindex / status 公开契约与 `Idempotency-Key` 接入、`upload_blob / uploadSession` 与 finalize 主链路、`DELETE /api/v1/sources/:id` 与 cleanup queue、source ingest guardrail、结构化 RFC7807 错误契约、`pending_upload_expires_at` 生命周期和小时级 zombie revision cleanup 已落地。

### 11.1.4 S4：统一公开检索语义落地

`retrieval/` 模块、`POST /api/v1/sources/search`、`POST /api/v1/retrieval/search`、Anyhunt 持有的 source/file 聚合语义与统一 request/response schema、dense retrieval、keyword retrieval、candidate merge、chunk expansion、snippet 生成、source/file aggregation、`ScopeRegistry` 不进入主检索热路径，以及显式可选并按 memory/source 域批量加载的 `include_graph_context` 已落地。

### 11.1.5 S5：Graph 与 Explainability 基础落地

`graph/` 模块、`GraphProcessor`、`memox-graph-projection` 队列、memory fact / source revision 的 graph projection / cleanup job、canonical merge、orphan prune、`GraphObservation` 证据模型、`graph_context` 附带能力，以及低置信度策略收口已落地。后续面向 Moryflow Memory Workbench 的只读 graph read/query API 在此基础上继续扩展，不引入 graph 写边界。

### 11.1.6 一期补充硬化

主库 `ApiKeyCleanupTask` + BullMQ durable cleanup job、graph cleanup、retrieval 契约、`include_graph_context`、source ingest guardrail runtime enforcement、graph low-confidence gate、source ingest 结构化错误契约、`pending_upload_expires_at`、小时级 zombie revision cleanup、`ScopeRegistry` / 导出契约 / graph canonical conflict 口径回写，以及 `finalize` processing slot 生命周期、`ApiKeyCleanupProcessor`、并发 `Idempotency-Key` 竞争与 `SourcesModule` OpenAPI 注册的收口修复已完成。

## 11.2 二期：Moryflow 接入与旧栈下线

### 二期冻结合同（2026-03-07）

#### A. `Moryflow Server -> Memox` API Key 策略

1. 固定采用“每环境一个服务 API Key”：`dev / staging / prod` 各自独立，`Moryflow PC` 不直接持有 Anyhunt API Key。
2. `apiKeyId` 只表达“环境级隔离”，不表达单用户隔离；cleanup、request log 与 graph canonical merge 都按该 `apiKeyId` 收口。
3. rotate 固定采用双 key：签发新 key -> 切换 `Moryflow Server` -> 验证通过 -> revoke 旧 key。
4. 泄露处置固定为：先把旧 key 限流降为 0 或停用，再切新 key 并 revoke 旧 key；如需清理具体用户或 vault 数据，走业务 scope 删除链路，不通过 revoke 服务 key 达成。

#### B. Moryflow -> Memox source identity 映射与首选写路径

1. 当前 Moryflow Markdown 笔记固定写成 `source_type = moryflow_workspace_markdown_v1`。
2. `user_id = Moryflow userId`
3. `project_id = Moryflow workspaceId`
4. `external_id = Moryflow documentId`
5. `display_path =` 当前 workspace canonical path
6. `title =` 当前文件标题
7. `metadata.source_origin = 'moryflow_workspace_content'`
8. `metadata.content_hash / storage_revision` 属于 revision lifecycle metadata，只能在对应 revision finalize 成功后 materialize 到 source identity
9. rename 只更新 `title / display_path / metadata`，不更换 `external_id`；upsert 固定先做 read-only identity lookup，再做 stable identity update；若 lookup 证明 `contentHash` 未变化，则不创建 revision / finalize / reindex；否则执行 revision create/finalize，并在成功后 materialize lifecycle metadata；delete 走 `DELETE /api/v1/sources/:id`，不通过 revoke API key 表达单文件删除。
10. Moryflow gateway 固定优先调用 `PUT /api/v1/source-identities/:sourceType/:externalId` 解析或 upsert source identity；不以 `POST /api/v1/sources` 作为主接入路径。
11. `source_id` 只属于 Memox 资源标识；Moryflow 不新建本地 `source_id -> fileId` 长期事实表，最多做可丢弃缓存，稳定映射始终回到 `source_type + external_id`。
12. `file_deleted` 若在 Memox 侧尚未存在对应 source，按幂等删除处理为 no-op success；不得因“未找到 source”阻塞 replay / backfill。
13. `source-identities` 一旦创建，scope 字段即冻结；后续 resolve / upsert 必须重复证明所有已持久化的非空 scope 字段；若同一 `(apiKeyId, sourceType, externalId)` 被尝试改绑到其他 `user_id / project_id / org_id / ...`，或调用方省略了已持久化 scope，平台都必须返回结构化 `409 SOURCE_IDENTITY_SCOPE_MISMATCH`，禁止静默迁移。

#### C. 不可变正文读取合同

1. bridge 正文输入固定支持两种模式：`inline_text` 或 `sync_object_ref`；禁止按 `path` 或“当前最新对象”读取。
2. `sync_object_ref` 模式下，读取固定按 `userId + vaultId + fileId + storageRevision` 拉取文件正文快照。
3. 读取完成后必须校验 `contentHash`；只有 `storageRevision` 与 `contentHash` 同时匹配，才允许创建 revision 并 finalize。
4. 任一字段不匹配都必须视为代际漂移并失败重试；禁止把可疑正文提交给 Memox finalize。

#### D. 平台搜索返回契约

1. `/api/v1/sources/search` 与 `/api/v1/retrieval/search` 的 source 结果必须同时返回：`source_id`、`source_type`、`project_id`、`external_id`、`display_path`、`title`、`snippet`、`matched_chunks`、`score`、`rank`、`metadata`。
2. Moryflow gateway 固定使用 `project_id(workspaceId) + external_id(documentId)` 作为稳定文件身份，使用 `display_path` 作为当前展示路径；禁止从 `title`、`snippet` 或 chunk 内容反推文件身份。
3. 平台排序以 `rank` 和返回顺序为准；Moryflow PC 不重建排序。
4. Moryflow Phase 2 的 Memory Workbench Search 与后续 Global Search memory group 固定走 `/api/v1/retrieval/search`；不再为 PC 保留第二套独立远端文件搜索主链。
5. 搜索 scope 固定为：单 workspace 搜索传 `user_id + project_id`；全局搜索只传 `user_id`，不允许把 workspace 过滤逻辑下沉到 PC。

#### E. Moryflow gateway -> PC 搜索合同

1. gateway 对 PC 返回 `Memory Workbench` 固定搜索合同：`groups.files` 与 `groups.facts`。
2. `groups.files` 项固定包含：`fileId`、`title`、`path`、`snippet`、`score`、`localPath?`、`disabled`。
3. `groups.facts` 项固定包含：`factId`、`content`、`originKind`、`score`、`snippet`、`sourceTitle?`。
4. `localPath` 只作为本地打开能力，不作为身份事实源；若无法解析本地路径，结果仍可展示但必须 `disabled=true`。
5. gateway 固定负责 scope 解析；renderer 与 PC main 不传 `projectId` 或其他平台 scope 字段。

#### F. Graph 策略（Phase 2 固定）

1. source graph projection 默认只作为增强，不是 Moryflow Memory Workbench 上线前置。
2. Memory Workbench `Graph` 视图的首期必达路径固定建立在 `fact-derived projection + graph read/query API` 上。
3. graph 仍不是云同步写链成功的前置条件；graph queue 短暂故障不得回滚 source indexed 成功。

#### G. 一致性与用户体验合同

1. 删除文件后，搜索结果最终必须不可见；稳态下删除泄漏数为 `0`。
2. rename 后，搜索结果最终必须显示最新 `display_path`；禁止长期显示旧路径。
3. 新提交文件最终必须可检索；一致性延迟以最终可见为准，不要求同步强一致。
4. staging cutover 的验收阈值固定为：golden queries 的预期 `fileId` 命中率 `100%`（Top 5 内）、删除泄漏 `0`、`project_id + external_id -> display_path` 错配 `0`、新增可检索/删除消失/rename 生效的 `p95 <= 15s`。

#### H. Cutover 事实源

1. `backfill / replay / 搜索投影验证 / cutover / 故障处理` 的唯一 runbook 为 `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`。
2. 二期实现、演练和上线闸门都以该 runbook 为准，不再依赖口头步骤。

#### I. 文档职责分工（固定）

1. 本文是二期唯一架构事实源，负责冻结：边界、合同、执行范围、阶段顺序、完成标准。
2. `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md` 是二期唯一切流 runbook，只负责：`backfill / replay / 搜索投影验证 / cutover / 故障处理`。
3. 任何实现细节若影响架构合同，先改本文；任何演练细节若影响切流步骤，改 runbook；禁止两边各写一套不同口径。

### 当前状态（当前交付基线）

- 状态：`completed`
- Memox 开放平台与 Moryflow 接入已经完成交付；当前文档只保留最终边界、合同与当前实现基线。
- 写链唯一正式入口固定为 `sync outbox -> memox bridge -> source identities / revisions / finalize`。
- 读链正式收口为 `memory gateway -> retrieval/search`；旧 Moryflow 远端文件搜索主链已不再作为正式前台入口存在。

### 11.2.1 当前交付基线

1. Anyhunt 平台公开合同已经冻结并上线：`source-identities`、`sources/revisions/finalize/reindex`、`retrieval/search`、`graph read/query`、`memory exports` 都以同一套公网 API 对外提供，不再区分“平台内部协议”和“Moryflow 专用协议”。
2. Anyhunt `sources`、`memory facts`、`graph`、`retrieval` 已完成长期结构收口：source 写侧由 `source identity + revision + finalize` 持有，`retrieval/search` 直接保证 `groups.files + groups.facts`，`GraphObservation` 作为图证据事实源保留 explainability，`source-derived` facts 只读。
3. Moryflow Server 已固定为唯一 `memory gateway`：负责 scope 解析、DTO 适配、错误翻译、幂等键与 local-path 映射；不再维护第二套平台级搜索编排。
4. PC main 已固定以 `desktopAPI.memory.*` 作为唯一记忆入口；renderer 不再直连 Anyhunt，也不再传递平台 scope。
5. `Memory Workbench` 已作为正式前台模块交付，固定包含 `Overview / Search / Facts / Graph / Exports`；`Facts` 区分 `manual / source-derived`，`Graph` 固定走正式 graph read/query API，`Exports` 当前只做 facts export。
6. `Global Search` 已完成 `Local + Memory` cutover：前台正式分组固定为 `Threads / Files / Memory Files / Facts`，memory 搜索固定走 `desktopAPI.memory.search -> memory gateway -> retrieval/search`，旧 `desktopAPI.cloudSync.search -> /api/v1/search` 远端搜索链已删除。
7. 与旧栈相关的 `vectorize`、`vectorized*`、旧搜索后端与空目录 importer 已从正式主链移除；相关配额/存储统计也已回归 `Vault / SyncFile` 真相源。

### 11.2.2 当前验证基线

1. 本地与仓库级验证基线仍要求覆盖：`lint`、`typecheck`、受影响单测/集成测试、OpenAPI / load-check、outbox / graph / export 回归。
2. 生产验收与桌面端真实验收的唯一事实源已迁到：
   - `docs/reference/cloud-sync-and-memox-validation.md`
   - `docs/reference/cloud-sync-and-memox-production-validation-playbook.md`
3. 当前这两份 reference 文档已经记录：
   - `Memory Workbench API` 线上专项通过
   - `Phase B` 桌面端 `create/update/delete/search/graph/export` 真机复验通过
   - `cloud-sync` 生产 harness 与 membership auth context 最终回归通过

### 11.2.3 后续变更约束

1. 后续新增前台记忆入口（对话流、工作流、MCP、Agent runtime）仍必须优先复用 `memory gateway + desktopAPI.memory.*`，不旁路到 Anyhunt。
2. `retrieval/search` 仍是 Moryflow memory file/fact 搜索的唯一平台入口；不允许重新引入第二套远端文件搜索主链。
3. `SourceResult` 的稳定文件身份仍固定为 `project_id + external_id + display_path`；Moryflow 任何新入口都不得从标题或 snippet 反推文件身份。
4. 生产验收若出现新 blocker，应继续优先回写到 reference/runbook，不在本文恢复过程态日志。

---

## 12. 最终结论

1. Memox 应该做成开放的记忆与检索平台，而不是 Moryflow 附属模块。
2. Moryflow 是第一正式客户，但不拥有特权协议。
3. 最佳实践不是“把一切塞进同一张 Memory 表”，而是“公开 API 统一、内部存储分治”。
4. 最佳实践不是继续保留 `vectorize/search` 与 Memox 并存，而是彻底替代。
5. 最佳实践不是把 `Entity` 混成一个概念，而是明确拆成：
   - `ScopeRegistry`
   - `GraphEntity / GraphRelation`
6. 最佳实践不是让 Moryflow Server 自己定义文件聚合搜索语义，而是由 Anyhunt 公网 API 自己定义并输出。
7. 二期真正的实施入口应是 `Moryflow sync outbox -> Memox sources/retrieval bridge`，而不是继续围绕旧 `vectorize` queue 设计。

这套方案的目标不是“先接上”，而是：

- 一次性把方向做对
- 后面不再做第二轮架构返工
- 让 Memox 真正成为可对外售卖、可被 Moryflow 与外部客户共同消费的平台
