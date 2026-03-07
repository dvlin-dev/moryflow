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
3. 必须补齐 `API Key 策略 + scope/source identity 映射 + retrieval/source 稳定文件身份契约 + backfill/replay/cutover/rollback runbook` 四块事实源
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

## 2.2 Moryflow 二期开工时基线（旧栈，现已下线）

Moryflow 当前线上“文件搜索能力”仍由 `vectorize/search` 提供，但文件生命周期真相源已经迁到新的 `sync` 协议：

1. 当前线上搜索仍会把文件写入旧向量索引
2. 旧索引仍是一文件一向量
3. 搜索时按 `userId + vaultId` 过滤，并回查 `syncFile` 过滤已删文件
4. `sync commit` 成功后会写入 `file lifecycle outbox`，作为后续 projection/bridge 的事实源
5. 这意味着二期真正的桥接入口已经从旧 `vectorize` 漂移到 `sync outbox`

当时的关键代码（保留为 phase 2 基线参考；其中旧 `vectorize/search-result-filter` 已在 Step 6 删除）：

- `apps/moryflow/server/src/vectorize/vectorize.processor.ts`
- `apps/moryflow/server/src/search/search.service.ts`
- `apps/moryflow/server/src/search/search-result-filter.service.ts`
- `apps/moryflow/server/src/sync/sync-commit.service.ts`
- `apps/moryflow/server/src/sync/file-lifecycle-outbox-writer.service.ts`
- `apps/moryflow/server/src/sync/file-lifecycle-outbox-lease.service.ts`
- `apps/moryflow/server/src/sync/file-lifecycle-outbox.types.ts`
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
- 公开 API：`PUT /api/v1/source-identities/:sourceType/:externalId`、`POST /api/v1/sources`、`POST /api/v1/sources/:id/revisions`、`GET /api/v1/sources/:id`、`GET /api/v1/sources/:id/revisions/:revisionId`、`POST /api/v1/source-revisions/:revisionId/finalize`、`POST /api/v1/source-revisions/:revisionId/reindex`、`DELETE /api/v1/sources/:id`、`POST /api/v1/sources/search`。

### C. Retrieval Orchestrator

- 职责：`dense retrieval`、`keyword retrieval`、merge、chunk expansion、source/file aggregation，以及 future rerank extension point。
- 约束：这是编排层，不承担原始数据写入事实源职责。

### D. Scope Registry

- 职责：物化运行时作用域 `user / agent / app / run`，只服务于过滤、统计、控制台和运营观察。
- 约束：它不是 graph entity，不是公开知识图谱 API，本期不作为主开放 API 域暴露。

### E. Graph Projection

- 职责：把 memory/source 中的高价值内容异步抽取为 graph entity / relation，并为搜索结果附带 graph context。
- 约束：graph 是独立 bounded context，不和 `ScopeRegistry` 复用表与 API。

### F. Async Jobs

- 职责：`source processing`、`reindex`、`export`、API key cleanup、graph projection。
- 约束：不允许 `fire-and-forget`；所有重作业必须有持久化状态和重试策略。

---

## 5. 最终数据模型

## 5.1 Memory Facts 模型

### `MemoryFact`

职责：原子长期记忆记录。

字段：`id, apiKeyId, userId, agentId, appId, runId, orgId, projectId, content, metadata, categories, keywords, embedding, immutable, expirationDate, timestamp, createdAt, updatedAt`

`MemoryFactHistory` 记录生命周期变化；`MemoryFeedback` 记录用户对检索或记忆质量的反馈。

`MemoryFact` 保留历史、反馈、过期、更新等记忆语义；不与文档 chunk 共表。

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
- 固定语义：接收统一 query，决定搜索域 `memory_facts / sources / all`，执行 dense retrieval + keyword retrieval + merge，返回平台级结果。
- `/memories/search` 与 `/sources/search` 继续作为子域接口保留，但不承担平台级统一语义。

### 请求契约（冻结）

```ts
type RetrievalSearchRequest = {
  query: string;
  domains?: Array<'memory_facts' | 'sources'>; // default: ['memory_facts', 'sources']
  top_k?: number;
  scope?: {
    user_id?: string;
    agent_id?: string;
    app_id?: string;
    run_id?: string;
    org_id?: string;
    project_id?: string;
  };
  metadata?: Record<string, unknown>;
  include_graph_context?: boolean;
};
```

### 响应契约（冻结）

```ts
type RetrievalSearchResponse = {
  items: Array<MemoryFactResult | SourceResult>;
  total: number;
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

二期补充约束（Moryflow 接入）：

1. `SourceResult` 的稳定文件身份固定为 `project_id + external_id + display_path`；Moryflow gateway 不允许从 `title` / `snippet` 反推文件身份。
2. Phase 2 固定要求平台在 `/sources/search` 与 `/retrieval/search` 的 source 结果中同时返回 `project_id`、`external_id` 与 `display_path`。
3. Moryflow Server 必须通过 gateway 把平台结果适配成面向 PC 的 C 端合同；PC 不直接消费 Memox 原始响应。

### `score` 语义（冻结）

1. `score` 是平台在当前响应内排序后的统一归一化分数。
2. `score` 只保证在同一次响应内可比较。
3. 不保证跨请求、跨时间、跨实现版本稳定。
4. 平台级排序以 `rank` 和返回顺序为准，客户端不应自行重建排序。
5. 当前实现使用 `min-max normalization -> [0, 1]`，但这只是实现细节，不构成开放 API 的兼容承诺。

## 6.3 Memory API

- 端点：`POST /api/v1/memories`、`GET /api/v1/memories`、`POST /api/v1/memories/search`、`GET /api/v1/memories/:id`、`PATCH /api/v1/memories/:id`、`DELETE /api/v1/memories/:id`、`GET /api/v1/memories/:id/history`
- 固定语义：返回 `MemoryFact` 级结果，支持 `user_id / agent_id / app_id / run_id / org_id / project_id / metadata` 过滤，支持 history 与 feedback。

## 6.4 Source API

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

直接返回 source/file 级结果：`source_id, source_type, project_id, external_id, display_path, title, score, snippet, matched_chunks, metadata`。聚合语义由 Anyhunt 定义；Moryflow Server 不保留第二套文件搜索定义权。

## 6.5 Scope API

本期不作为主公开 API 暴露：运行时作用域是内部投影，不是开放知识模型；如需公开，应以后续 `Context / Scopes` 独立域提供，不复用 `Entity` 命名；当前公开 `entity` 路由必须迁出或下线。

## 6.6 Graph API

本期不公开 graph query API；只允许 graph context 附带在检索响应中，且 graph 结果只用于内部增强和调试。

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

本期纳入并严格限制边界：纳入 `GraphEntity / GraphRelation / GraphObservation / GraphProjectionJob / retrieval graph_context`；不纳入独立公开 graph query API、图谱可视化前端与对每个 document chunk 同步抽图。

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

## 10.1 当前仓库状态（2026-03-07）

当前仓库已完成旧 retrieval stack 下线：

- `apps/moryflow/server/src/vectorize` 已删除；
- `VectorizedFile` 与 `UserStorageUsage.vectorizedCount` 已从 Prisma schema 与迁移链路删除；
- `apps/moryflow/server/src/quota`、`apps/moryflow/server/src/admin-storage`、`apps/moryflow/pc/src/main/cloud-sync/api/*`、`apps/moryflow/pc/src/main/app/ipc-handlers.ts`、`apps/moryflow/pc/src/shared/ipc/cloud-sync.ts`、`packages/api/src/cloud-sync/types.ts` 已去掉旧 `vectorized*` 合同；
- `apps/moryflow/server/src/search` 继续保留，但只作为 Memox-backed 的公网 gateway，不再承载旧 vectorize 语义；
- 旧链路只剩 `apps/moryflow/server/src/memox/legacy-vector-search.client.ts` 这一条 cutover-only legacy baseline 客户端：查询用于 shadow compare / rollback，写入只保留最小 upsert/delete 镜像，不恢复旧 worker / projection / quota 栈。

## 10.2 Moryflow Server 新职责

二期新增 `memox` gateway / bridge 模块，固定承担 Anyhunt Memox API 调用与鉴权、source ingest / finalize / delete 编排、source search / retrieval search adapter、Moryflow 用户身份与 scope 映射、幂等 / 重试 / 补偿 / cutover observability、轻量 DTO 适配、outbox 事件消费与回放，以及面对 PC 的搜索结果兼容适配。`sync` 继续拥有文件生命周期真相源；Memox 只消费它，不反向侵入 `diff/commit/recovery`；Moryflow Server 不保留第二套平台级检索协议。

## 10.3 二期桥接边界

- Moryflow `sync` 的稳定事实源固定为 `receipt-only commit + file lifecycle outbox`，不是旧 `vectorize.queueFromSync()`。
- 二期链路固定为 `Moryflow PC -> Moryflow Server sync -> sync commit -> file lifecycle outbox -> memox bridge consumer -> Anyhunt sources/revisions/finalize/delete`，以及 `Moryflow source-first search adapter -> Anyhunt sources/search`（`retrieval/search` 仅保留给后续混合召回）。
- `sync` 仍只负责 `diff / commit / object verify / staged apply / recovery / orphan cleanup`。
- Memox bridge 不允许绕过 outbox 直接从 PC 或 `sync` 临时状态拼写 source。
- 二期必须显式定义一致性模型：删除后多久不可搜到、新提交后多久可搜到、rename/path update 何时生效；否则不能切流。

## 10.4 最终删除结果（已完成）

本轮已完成的删除范围固定为：

- 旧 `vectorize` worker / controller / reconcile / projection 代码；
- `VectorizedFile` 表与 `UserStorageUsage.vectorizedCount`；
- Admin / Quota / PC / shared / packages 中全部旧 `vectorized*` 用量与接口合同；
- `search-result-filter.service.ts` 这类为旧双轨基线服务的中间层。

未删除的只有：

- `apps/moryflow/server/src/search`：继续作为 Moryflow 自身 `POST /api/v1/search` 网关；
- `apps/moryflow/server/src/memox/legacy-vector-search.client.ts`：cutover-only legacy baseline 客户端；查询用于 shadow compare / rollback，写入只保留最小 upsert/delete 镜像，不恢复旧 vectorize 栈。

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

`graph/` 模块、`GraphProcessor`、`memox-graph-projection` 队列、memory fact / source revision 的 graph projection / cleanup job、canonical merge、orphan prune、`GraphObservation` 证据模型、`graph_context` 附带能力，以及 graph query API 关闭与低置信度策略收口已落地。

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

1. 当前 Moryflow Markdown 笔记固定写成 `source_type = note_markdown`。
2. `user_id = Moryflow userId`
3. `project_id = Moryflow vaultId`
4. `external_id = Moryflow fileId`
5. `display_path = sync` 当前 canonical path
6. `title =` 当前文件标题
7. `metadata.source_origin = 'moryflow_sync'`
8. `metadata.content_hash =` 当前 `contentHash`
9. `metadata.storage_revision =` 当前 `storageRevision`
10. rename 只更新 `title / display_path / metadata`，不更换 `external_id`；若 `storageRevision + contentHash` 未变化，bridge 只做 source identity update，不创建 revision / finalize / reindex；delete 走 `DELETE /api/v1/sources/:id`，不通过 revoke API key 表达单文件删除。
11. Moryflow gateway 固定优先调用 `PUT /api/v1/source-identities/:sourceType/:externalId` 解析或 upsert source identity；不以 `POST /api/v1/sources` 作为主接入路径。
12. `source_id` 只属于 Memox 资源标识；Moryflow 不新建本地 `source_id -> fileId` 长期事实表，最多做可丢弃缓存，稳定映射始终回到 `source_type + external_id`。
13. `file_deleted` 若在 Memox 侧尚未存在对应 source，按幂等删除处理为 no-op success；不得因“未找到 source”阻塞 replay / backfill。
14. `source-identities` 一旦创建，scope 字段即冻结；后续 resolve / upsert 必须重复证明所有已持久化的非空 scope 字段；若同一 `(apiKeyId, sourceType, externalId)` 被尝试改绑到其他 `user_id / project_id / org_id / ...`，或调用方省略了已持久化 scope，平台都必须返回结构化 `409 SOURCE_IDENTITY_SCOPE_MISMATCH`，禁止静默迁移。

#### C. 不可变正文读取合同

1. bridge 只允许按 `userId + vaultId + fileId + storageRevision` 读取文件正文快照；禁止按 `path` 或“当前最新对象”读取。
2. 读取完成后必须校验 `contentHash`；只有 `storageRevision` 与 `contentHash` 同时匹配，才允许创建 revision 并 finalize。
3. 任一字段不匹配都必须视为代际漂移并失败重试；禁止把可疑正文提交给 Memox finalize。

#### D. 平台搜索返回契约

1. `/api/v1/sources/search` 与 `/api/v1/retrieval/search` 的 source 结果必须同时返回：`source_id`、`source_type`、`project_id`、`external_id`、`display_path`、`title`、`snippet`、`matched_chunks`、`score`、`rank`、`metadata`。
2. Moryflow gateway 固定使用 `project_id + external_id` 作为稳定文件身份，使用 `display_path` 作为当前展示路径；禁止从 `title`、`snippet` 或 chunk 内容反推文件身份。
3. 平台排序以 `rank` 和返回顺序为准；Moryflow PC 不重建排序。
4. Moryflow Phase 2 的文件搜索默认走 `/api/v1/sources/search`；`/api/v1/retrieval/search` 只保留给未来 memory + source 混合召回场景，不作为 PC 默认读路径。
5. 搜索 scope 固定为：单 vault 搜索传 `user_id + project_id`；全局搜索只传 `user_id`，不允许把 vault 过滤逻辑下沉到 PC。

#### E. Moryflow gateway -> PC 搜索合同

1. gateway 对 PC 返回最小 C 端搜索合同：`fileId`、`title`、`path`、`snippet`、`score`，以及跨 vault 搜索时必带的 `vaultId`。
2. 映射固定为：`fileId = external_id`、`path = display_path`、`title = title`、`snippet = snippet`、`score = score`、`vaultId = project_id`。
3. PC 搜索结果展示固定为：标题主文案、路径次文案、snippet 辅助文案；仅在跨 vault 搜索时展示 vault 上下文；`localPath` 只作为本地打开能力，不作为身份事实源。
4. 当 `fileId -> localPath` 尚未在本地索引解析时，结果仍可展示，但不得伪造本地路径。

#### F. Graph 策略（Phase 2 固定）

1. 在 graph canonical merge 仍按 `apiKeyId` 归并的当前实现下，Moryflow Phase 2 固定关闭 graph：source / memory 写入不启用 graph projection，搜索请求固定 `include_graph_context = false`。
2. graph 不是 Phase 2 的用户体验合同，也不是 cutover 验收前置；后续只有在 graph 隔离不再依赖单服务 `apiKeyId` 时才允许对 Moryflow 打开。

#### G. 一致性与用户体验合同

1. 删除文件后，搜索结果最终必须不可见；稳态下删除泄漏数为 `0`。
2. rename 后，搜索结果最终必须显示最新 `display_path`；禁止长期显示旧路径。
3. 新提交文件最终必须可检索；一致性延迟以最终可见为准，不要求同步强一致。
4. staging cutover 的验收阈值固定为：golden queries 的预期 `fileId` 命中率 `100%`（Top 5 内）、删除泄漏 `0`、`project_id + external_id -> display_path` 错配 `0`、新增可检索/删除消失/rename 生效的 `p95 <= 15s`。

#### H. Cutover 事实源

1. `backfill / replay / cutover / rollback` 的唯一 runbook 为 `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`。
2. 二期实现、演练和上线闸门都以该 runbook 为准，不再依赖口头步骤。

#### I. 文档职责分工（固定）

1. 本文是二期唯一架构事实源，负责冻结：边界、合同、执行范围、阶段顺序、完成标准。
2. `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md` 是二期唯一切流 runbook，只负责：`backfill / replay / drift check / cutover / rollback`。
3. 任何实现细节若影响架构合同，先改本文；任何演练细节若影响切流步骤，改 runbook；禁止两边各写一套不同口径。

### 当前状态（2026-03-07 复核）

- 状态：`in_progress`
- 启动前置条件：一期 `S1 ~ S5` 必须全部完成并通过平台侧验收
- 二期范围：处理 Moryflow 接入、旧 retrieval stack 下线、全链路上线门槛
- 本轮复核结论：二期方向继续成立，但实施入口必须从“旧 vectorize 入队”改成“`sync outbox -> memox bridge -> source-first search adapter`”
- 本节已冻结二期合同：服务 API Key 策略、scope/source identity 映射、平台稳定文件身份返回、gateway -> PC 最小搜索合同，以及 cutover runbook。
- 当前执行进度：Step 1 ~ Step 6 与 Step 7 的本地可控闸门已完成；当前只剩真实 staging cutover rehearsal 与 Moryflow Server staging dogfooding，受外部 Anyhunt staging 不可达阻塞。

### 11.2.1 S6：Moryflow Server 接入 Memox

目标：让 Moryflow 成为 Memox 的第一正式客户，同时保持 `sync` 与检索各司其职，不重新发明私有协议。

必须完成：

1. 新建 `memox` gateway 模块
2. 新建 outbox consumer，消费 `file lifecycle outbox` 的 claim / ack 协议
3. 落实已冻结的 `fileId / vaultId / path / storageRevision / contentHash -> KnowledgeSource / Revision` 映射
4. 定义 bridge 读取文件正文的合同（必须按 `storageRevision` / `contentHash` 保证代际正确）
5. 用 outbox 驱动 `source identity resolve/upsert -> revision create -> finalize -> delete`
6. 替换文件搜索调用链，统一走 Memox source-first search adapter（默认 `POST /api/v1/sources/search`）
7. 补齐对 PC 兼容的搜索结果适配（稳定文件身份、标题、路径映射）
8. 若后续存在长期 memory 写入链路，再接入 `memory/`；不得把它和文件检索迁移绑成单一前置
9. 保持 Moryflow 只做身份映射、幂等、补偿和 DTO 适配
10. 明确删除/rename/new commit 的一致性与重试语义

交付结果：

1. Moryflow Server 不再拥有独立平台级 retrieval stack
2. `sync` 仍是文件生命周期真相源，Memox 成为唯一检索底座
3. Moryflow 成功 dogfood Memox 公网 API

### 11.2.2 S7：下线 Moryflow 旧 retrieval stack

目标：完成迁移闭环，真正去掉旧系统，而不是长期双轨。

必须完成：

1. 先完成全量 backfill / replay，再切断所有新搜索流量
2. 删除旧 worker 与旧 server module
3. 删除 `VectorizedFile` 相关表
4. 删除旧 `vectorizedCount` quota / usage / admin contract
5. 清理 `apps/moryflow/pc/src/main/cloud-sync/api/*`、`packages/api`、PC IPC、renderer/shared types 中旧 search/vectorized 概念
6. 清理 `vectorizeEnabled` 等旧概念
7. 更新文案、手册、部署说明与运维 runbook

交付结果：

1. 仓库里只剩一套正式 retrieval stack
2. 运维、产品、代码、文档不再分叉
3. 所有 `vectorized*` 口径从代码、数据库、Admin、PC 合同中删除

### 11.2.3 S8：上线门槛

必须全部通过：

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:unit`
4. `@anyhunt/anyhunt-server` integration / e2e
5. `@moryflow/server` 相关测试
6. `@moryflow/pc` 相关测试
7. outbox consumer 的 claim / ack / retry / DLQ / replay 回归
8. backfill / cutover rehearsal 与 drift check
9. 删除后不可检索、新提交最终可检索、rename 路径生效的搜索一致性回归
10. source ingest / finalize / reindex / delete / search / export 压测
11. graph projection / canonical merge / idempotency / rate limit 回归
12. OpenAPI snapshot 审核
13. Moryflow Server staging dogfooding

### 11.2.4 当前阻塞项（2026-03-07）

1. Step 7 的本地可控闸门已补齐：`apps/moryflow/server/scripts/memox-phase2-local-rehearsal.ts` 已完成 full-stack cutover rehearsal，`apps/anyhunt/server/scripts/memox-phase2-openapi-load-check.ts` 已完成 OpenAPI snapshot 与 `source ingest/finalize/search/export` load check；rollback rehearsal 也已用 local legacy mock baseline 跑通。
2. `@anyhunt/anyhunt-server` integration / e2e 已在 Colima 场景下实测通过；当前固定前置为 `DOCKER_HOST=unix:///Users/lin/.colima/default/docker.sock`、`TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`、`TESTCONTAINERS_RYUK_DISABLED=true`。若本地镜像缓存被清空，需先确保 `postgres:16-alpine`、`pgvector/pgvector:pg16`、`redis:7-alpine`、`testcontainers/ryuk:0.14.0` 可被当前 Docker 运行时拉取或已预热。
3. 当前唯一未完成闸门是“真实 staging cutover rehearsal + Moryflow Server staging dogfooding”：`https://server.anyhunt.app` 在 2026-03-07 实测不可达/返回 `502`，外部 legacy `VECTORIZE_API_URL` 也不可用，因此当前只能给出本地可控环境证据，不能声称 staging 已通过。

### 11.2.5 可执行实施清单（2026-03-07）

执行顺序固定为：`把冻结合同落到平台 DTO/响应 -> 搭建 gateway/bridge -> 打通 source lifecycle -> 打通 search adapter -> backfill/replay/cutover -> 删除旧栈 -> 全量验收`。上一阶段未验收通过前，不进入下一阶段。

#### 唯一执行顺序（直接开工用）

1. Step 1：先做 Anyhunt 平台合同收口，只交付 `source-identities` endpoint、稳定 source search DTO、唯一 reindex 契约；这一阶段未完成，Moryflow 侧不得开 bridge。
2. Step 2：再做 Moryflow `memox` gateway，只收口 API 调用、身份映射、错误翻译、幂等规则；此阶段仍不切用户搜索流量。
3. Step 3：接 outbox consumer，把 `file_upserted / file_deleted` 桥接到 `source identity -> revision -> finalize -> delete`；此阶段只允许写 Memox，不允许替换 PC 搜索。
4. Step 4：替换搜索读链到 `sources/search`，先在 gateway 完成 DTO 适配，再替换 PC / shared 类型；此阶段保留 legacy baseline 的 query 能力，为 Step 5 的 drift compare 与 rollback rehearsal 做准备。
5. Step 5：执行 backfill、replay、shadow compare、drift check；任一阈值不达标，不进入切流。
6. Step 6：切流后进入 stabilization window；默认热路径继续只走 Memox，legacy baseline 不再常驻镜像。若要做 rollback compare / failure recovery rehearsal，必须显式准备可用的 legacy baseline（含 `VECTORIZE_API_URL`）并按 runbook 执行 rehydrate / 对比；稳定观测通过后再删除旧 `vectorize`、`VectorizedFile`、`vectorizedCount` 与 admin/quota/PC 旧合同；`/api/v1/search` 默认保留为 Memox-backed gateway。
7. Step 7：最后跑全量验收与 staging dogfooding，全部通过后，二期才算完成。

#### Task 1：把冻结合同落到平台 DTO 与 runbook

目标：把已经冻结的二期合同落到平台 DTO、核心文档和 cutover runbook，确保后续开发直接按合同编码，而不是继续靠口头约定。

- 状态：`completed`

主要文件：

- `docs/design/anyhunt/core/system-boundaries-and-identity.md`
- `docs/design/anyhunt/core/quota-and-api-keys.md`
- `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
- `apps/anyhunt/server/src/sources/sources.controller.ts`
- `apps/anyhunt/server/src/retrieval/dto/retrieval.schema.ts`
- `apps/anyhunt/server/src/sources/dto/sources.schema.ts`

执行清单：

1. 新增 `PUT /api/v1/source-identities/:sourceType/:externalId`，使 source identity 可按 `(apiKeyId, sourceType, externalId)` 幂等 resolve / upsert，并返回稳定 `source_id`。
2. 在平台 DTO 中补齐 `project_id / external_id / display_path`，并保证 `/sources/search` 与 `/retrieval/search` 对 source 结果使用同一稳定字段集合。
3. 确认 `POST /api/v1/source-revisions/:revisionId/reindex` 是唯一公开 reindex 契约；删除文档内对 `POST /api/v1/sources/:id/reindex` 的残余口径。
4. 把 `Moryflow Server -> Memox` 的服务 key、source identity、不可变正文读取合同、graph 关闭策略和 C 端搜索合同回写到事实源。
5. 用独立 runbook 冻结 `backfill / replay / cutover / rollback`，包括 drift check、恢复触发条件与动作。

阶段完成标准：

1. 文档层不再存在 `API Key / identity / stable file identity / cutover` 的口头空白区。
2. `retrieval` / `sources` DTO 已能表达 Moryflow 所需稳定字段，且 source identity resolve / upsert 与 graph 关闭策略已成文。

执行结果（2026-03-07）：

1. Anyhunt 已新增 `PUT /api/v1/source-identities/:sourceType/:externalId`，并固定返回稳定 `source_id`。
2. `/api/v1/sources/search` 与 `/api/v1/retrieval/search` 的 source 结果已补齐 `project_id / external_id / display_path`。
3. `POST /api/v1/source-revisions/:revisionId/reindex` 继续作为唯一公开 reindex 契约，二期文档中已去除旧口径残留。
4. 主文档、runbook、core 约束与索引入口已对齐同一二期合同。
5. 本阶段代码验证已完成：
   - `pnpm --filter @anyhunt/anyhunt-server typecheck`
   - `pnpm exec vitest run src/sources/__tests__/source-identities.controller.spec.ts src/sources/__tests__/knowledge-source.service.spec.ts src/retrieval/__tests__/source-search.service.spec.ts src/retrieval/__tests__/retrieval.service.spec.ts src/retrieval/__tests__/retrieval.controller.spec.ts src/sources/__tests__/sources.controller.spec.ts`

#### Task 2：搭建 Moryflow Server 的 `memox` gateway 骨架

目标：让 Moryflow Server 只负责 Memox API 编排、身份映射和 DTO 适配，不复活第二套检索协议。

- 状态：`completed`

建议文件：

- Create: `apps/moryflow/server/src/memox/memox.module.ts`
- Create: `apps/moryflow/server/src/memox/memox.client.ts`
- Create: `apps/moryflow/server/src/memox/memox-source-bridge.service.ts`
- Create: `apps/moryflow/server/src/memox/memox-search-adapter.service.ts`
- Create: `apps/moryflow/server/src/memox/dto/memox.dto.ts`
- Modify: `apps/moryflow/server/src/app.module.ts`
- Test: `apps/moryflow/server/src/memox/*.spec.ts`

执行清单：

1. 新建独立 `memox` 模块，封装 Anyhunt 公网 API 调用、认证头、超时、request id、RFC7807 错误解析。
2. 把 scope/source identity 映射集中在 `memox` 模块内，不允许散落在 `sync`、`search`、`vectorize` 多处。
3. 明确 gateway 的幂等键生成规则与补偿入口，禁止直接在业务层临时拼接。
4. 在模块级测试里锁定 API 调用合同、错误语义与重试边界。

阶段完成标准：

1. `memox` 模块可以独立被 `sync` 与搜索适配层复用。
2. Moryflow Server 侧不再需要新增任何“私有 memory/search 协议”。

执行结果（2026-03-07）：

1. `apps/moryflow/server/src/memox/` 已新增 `memox.module.ts`、`memox.client.ts`、`memox-source-bridge.service.ts`、`memox-search-adapter.service.ts` 与 `dto/memox.dto.ts`。
2. `MemoxClient` 已统一收口 Anyhunt 公网 API 的 base URL、服务 API Key、超时、`X-Request-Id`、`Idempotency-Key` 与 RFC7807 错误翻译。
3. `MemoxSourceBridgeService` 已固定 Moryflow -> Memox 的 source identity 映射、搜索 scope 映射，以及 lifecycle idempotency family 生成规则。
4. `MemoxSearchAdapterService` 已把 `/api/v1/sources/search` 固定成 Phase 2 默认读路径，并输出面向后续 PC 适配的文件级合同：`fileId / vaultId / title / path / snippet / score`。
5. `apps/moryflow/server/src/app.module.ts` 已接入 `MemoxModule`，但当前仍未替换生产搜索流量。
6. 本阶段代码验证已完成：
   - `pnpm exec vitest run src/memox/memox.client.spec.ts src/memox/memox-source-bridge.service.spec.ts src/memox/memox-search-adapter.service.spec.ts`
   - `pnpm --filter @moryflow/server typecheck`

#### Task 3：用 outbox 打通 source lifecycle bridge

目标：以 `sync commit -> file lifecycle outbox` 为唯一入口，把文件 upsert/delete 正式桥接到 Memox `sources/revisions/finalize/delete`。

- 状态：`completed`

主要文件：

- Modify: `apps/moryflow/server/src/sync/sync-commit.service.ts`
- Modify: `apps/moryflow/server/src/sync/file-lifecycle-outbox-writer.service.ts`
- Modify: `apps/moryflow/server/src/sync/file-lifecycle-outbox-lease.service.ts`
- Create: `apps/moryflow/server/src/sync/file-lifecycle-outbox.types.ts`
- Modify: `apps/moryflow/server/src/sync/sync-internal-outbox.controller.ts`
- Modify: `apps/anyhunt/server/src/sources/knowledge-source.repository.ts`
- Create: `apps/moryflow/server/src/memox/memox-outbox-consumer.service.ts`
- Create: `apps/moryflow/server/src/memox/memox-outbox-consumer.processor.ts`
- Create: `apps/moryflow/server/src/memox/memox-outbox-drain.service.ts`
- Test: `apps/moryflow/server/src/sync/file-lifecycle-outbox-writer.service.spec.ts`
- Test: `apps/moryflow/server/src/sync/file-lifecycle-outbox-lease.service.spec.ts`
- Test: `apps/moryflow/server/src/memox/memox-outbox-consumer.service.spec.ts`
- Test: `apps/moryflow/server/src/memox/memox-outbox-drain.service.spec.ts`
- Test: `apps/anyhunt/server/src/sources/__tests__/knowledge-source.repository.spec.ts`

执行清单：

1. 消费 `claim / ack` 协议，不允许 bridge 绕过 outbox 直接读 PC 临时状态。
2. 为 `file_upserted / file_deleted` 定义稳定映射：source identity resolve/upsert、revision create、finalize、delete、重复事件回放。
3. 定义 bridge 读取正文的合同，保证 `storageRevision / contentHash` 代际正确，避免把旧对象 finalize 成新 revision。
4. 打通 claim / ack / retry / DLQ / replay 观测指标，保证 cutover 前能演练失败补偿。

阶段完成标准：

1. 新 commit 最终可在 Memox 建立或更新对应 source / revision。
2. 删除事件最终能在 Memox 清除 source 可检索状态。
3. outbox consumer 可安全回放且幂等。

执行结果（2026-03-07）：

1. `FileLifecycleOutboxWriterService` 现在会把 `file_upserted` 的上一代 `previousPath / previousContentHash / previousStorageRevision` 一并写入 outbox payload，rename-only 判断不再猜测当前对象状态。
2. `MemoxOutboxConsumerService` 已落地正式 bridge：固定消费 `claim / ack` 协议，按 `source identity -> revision create -> finalize -> delete` 桥接，并在读取正文时强制校验 `storageRevision + contentHash`。
3. `MemoxOutboxConsumerProcessor` + `MemoxOutboxDrainService` 已接入 `MemoxModule`；当前 server 会按固定批次把 backlog 送入 Bull drain job，再由 consumer 处理并只在 Memox mutation 成功后 ack。
4. consumer 现会先回查 `SyncFile` 真相源；若事件代际/路径已落后于当前文件状态，`file_upserted` / `file_deleted` 都按幂等 no-op 跳过，避免旧事件重试把 Memox source 回退到历史版本。
5. rename-only upsert 现固定先刷新 source identity；若 Memox 当前 revision 已与文件代际对齐，则只跳过 Memox 侧 revision/finalize，但 rollback window 内仍会继续刷新 legacy baseline 镜像；delete 若 Memox 侧尚无 source，会通过 Anyhunt 结构化错误码 `SOURCE_IDENTITY_TITLE_REQUIRED` 收口成 no-op success，不阻塞 replay。
6. Anyhunt `resolveSourceIdentity()` 在“缺 title 且需要新建 source”场景已返回结构化 `400 SOURCE_IDENTITY_TITLE_REQUIRED`，删除桥接不再依赖脆弱字符串匹配。
7. `FileLifecycleOutboxLeaseService` 现作为唯一 lease state machine，集中管理 `attemptCount / lastAttemptAt / lastErrorCode / lastErrorMessage / deadLetteredAt`；retryable failure 固定走 outbox-native backoff，poison 或最终失败事件进入 DLQ。
8. Anyhunt `resolveSourceIdentity()` 现固定冻结 scope 字段；已存在 source 只允许更新 title/path/mime/metadata，且每次 resolve / upsert 都必须重复证明已持久化的非空 scope，禁止把同一 `external_id` 迁移到其他 `project_id/user_id`，也禁止省略既有 scope 后继续更新。
9. 本阶段代码验证已完成：
   - `pnpm exec vitest run src/sync/file-lifecycle-outbox-writer.service.spec.ts src/sync/file-lifecycle-outbox-lease.service.spec.ts src/memox/memox.client.spec.ts src/memox/memox-source-bridge.service.spec.ts src/memox/memox-search-adapter.service.spec.ts src/memox/memox-outbox-consumer.service.spec.ts src/memox/memox-outbox-consumer.processor.spec.ts src/memox/memox-outbox-drain.service.spec.ts src/sync/sync.service.spec.ts`
   - `pnpm exec vitest run src/sources/__tests__/source-identities.controller.spec.ts src/sources/__tests__/knowledge-source.repository.spec.ts src/sources/__tests__/knowledge-source.service.spec.ts`
   - `pnpm --filter @moryflow/server typecheck`
   - `pnpm --filter @anyhunt/anyhunt-server typecheck`

#### Task 4：替换搜索调用链并补齐 PC 兼容合同

目标：把现有搜索从 Moryflow `vectorize/search` 切到 Memox `sources/search`（Phase 2 默认读路径），同时保持 PC 现有体验不崩；`/retrieval/search` 仅保留给后续混合召回场景。

- 状态：`completed`

主要文件：

- Modify: `apps/moryflow/server/src/search/search.service.ts`
- Create: `apps/moryflow/server/src/search/search-backend.service.ts`
- Create: `apps/moryflow/server/src/search/search-live-file-projector.service.ts`
- Modify: `apps/moryflow/server/src/search/search.module.ts`
- Modify: `apps/moryflow/server/src/search/dto/search.dto.ts`
- Modify: `apps/moryflow/pc/src/main/cloud-sync/api/client.ts`
- Modify: `apps/moryflow/pc/src/main/cloud-sync/api/types.ts`
- Modify: `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
- Modify: `apps/moryflow/pc/src/shared/ipc/cloud-sync.ts`
- Modify: `packages/api/src/cloud-sync/types.ts`
- Test: `apps/moryflow/server/src/search/search.service.spec.ts`
- Test: `apps/moryflow/server/src/search/search-backend.service.spec.ts`
- Test: `apps/moryflow/server/src/search/search-live-file-projector.service.spec.ts`

执行清单：

1. 平台侧补齐稳定文件身份字段；Moryflow 不允许再从 `title` / `snippet` 反推文件身份。
2. Moryflow Server 搜索服务改为默认调用 Memox `POST /api/v1/sources/search`，并在 gateway 内完成 DTO 适配；不得把 `memory_fact` 混入当前 PC 文件搜索默认结果。
3. `apps/moryflow/pc/src/main/cloud-sync/api/client.ts` 停止直打旧 `/api/v1/search`。
4. `apps/moryflow/pc/src/main/cloud-sync/api/types.ts`、`apps/moryflow/pc/src/shared/ipc/cloud-sync.ts`、`packages/api/src/cloud-sync/types.ts` 去掉旧 `vectorized` / 旧 search result 依赖，改成新合同。
5. 明确 rename、删除、同名文件、路径变化时 PC 最终展示规则。

阶段完成标准：

1. 旧搜索结果形状只在 Moryflow gateway 内部短暂存在，PC 与共享类型已收口到新合同。
2. Moryflow 搜索调用链不再依赖 `VectorizeClient`。

执行结果（2026-03-07）：

1. `SearchService` 已降为搜索应用编排层；`SearchBackendService` 负责默认调用 `MemoxSearchAdapterService.searchFiles()` 或在 rollback window 内切到 `legacy_vector_baseline`，Moryflow server 的文件搜索主链路现在固定走 Anyhunt `POST /api/v1/sources/search`，不再依赖 `VectorizeClient`。
2. `SearchResponseDto`、`packages/api` 与 PC shared IPC 类型已统一升级为文件级合同：`fileId / vaultId / title / path / snippet / score`；`localPath` 继续只作为桌面端打开能力附加字段。
3. `apps/moryflow/pc/src/main/cloud-sync/api/client.ts` 现在消费的是同一套 Memox-backed 文件搜索结果形状；即使 gateway 入口路径仍保持 Moryflow 自己的 `/api/v1/search`，其底层已不再走旧 vectorize 语义。
4. `SearchLiveFileProjectorService` 现会在返回前重新校验 `SyncFile(isDeleted=false)` 活跃集，并以本地真相源覆盖 `vaultId / title / path`；outbox 延迟或桥接漂移不会直接把已删文件、旧路径暴露给用户。
5. 文件级搜索结果形状已在 gateway、PC API、shared IPC 与 `packages/api` 之间统一；后续 Step 5 的 shadow compare 直接由 `legacy-vector-search.client.ts` 与 `MemoxSearchAdapterService` 对照，不再依赖额外结果过滤层。
6. rollback window 内，`SearchBackendService` 已支持 `MORYFLOW_SEARCH_BACKEND=legacy_vector_baseline` 临时切回 external legacy baseline；切回后仍会复用同一套 `SyncFile` 活跃集过滤与本地字段覆盖，不把已删文件或旧路径暴露给用户。
7. 本阶段代码验证已完成：
   - `pnpm exec vitest run src/search/search.service.spec.ts src/search/search-backend.service.spec.ts src/search/search-live-file-projector.service.spec.ts`
   - `pnpm --filter @moryflow/server typecheck`
   - `pnpm --filter @moryflow/pc typecheck`

#### Task 5：完成 backfill / replay / cutover 演练

目标：在不破坏现网检索的前提下，把历史文件补齐到 Memox，并验证新旧结果 drift 可控。

主要文件：

- Modify: `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
- Modify: `apps/moryflow/server/src/memox/memox-outbox-consumer.service.ts`
- Add: `apps/moryflow/server/src/memox/memox-cutover.service.ts`
- Test: `apps/moryflow/server/src/memox/*.spec.ts`
- Test: `apps/anyhunt/server/src/retrieval/__tests__/source-search.service.spec.ts`

执行清单：

1. 实现历史文件 backfill 作业：固定扫描范围、批次大小、失败重试、幂等键与断点续跑。
2. 实现 replay 流程：在 backfill 完成后回放 outbox，补齐 backfill 期间新增变更。
3. 执行 cutover rehearsal：同 query 集上对比旧搜索与 Memox 搜索，记录 drift、缺失、重复、删除延迟。
4. 固化 rollback：legacy baseline 不再由默认热路径常驻双写维持；默认 Memox 模式下只保留 compare / rehydrate / 显式 rollback backend 这组冷恢复能力。故障时若要回切，必须先确认 `VECTORIZE_API_URL` 指向的 baseline 已完成 rehydrate 且健康，再显式切到 `MORYFLOW_SEARCH_BACKEND=legacy_vector_baseline`；若根因位于写入合同，仍必须先停 ack、修复合同、必要时清理 Memox 数据，再重新 backfill+replay。

阶段完成标准：

1. 有可重复执行的 rehearsal 步骤与成功阈值。
2. drift check 有明确通过标准，而不是人工“看起来差不多”。

执行结果（2026-03-07）：

1. `src/memox/memox-cutover.service.ts` 已落地 Step 5 控制面：`backfillBatch()` 固定扫描 `SyncFile(isDeleted=false)`，以 Redis key `memox:phase2:backfill-state` 持久化 checkpoint，并复用 `MemoxOutboxConsumerService.upsertFile()` 执行历史回填。
2. `MemoxOutboxConsumerService` 已升级为可复用回放内核：公开 `upsertFile()` / `deleteFile()`；`file_upserted` 固定先写稳定 identity，再按需 `revision create -> finalize`，最后用 `source-identity-materialize` 幂等键把 `content_hash / storage_revision` 物化回 source metadata。
3. rename-only upsert 现在固定先刷新 identity；若 Memox 当前 `current_revision_id + metadata(content_hash/storage_revision)` 已与文件代际对齐，则只跳过 Memox 侧 revision/finalize；若 Memox 尚未对齐当前代际，则即便是 rename-only，也必须补建 revision 并 finalize。legacy baseline 只在显式 rollback backend 下跟随写链刷新，不再作为默认热路径镜像。
4. `replayOutbox()` 的 `drained` 判定现要求 `failedIds = 0`、`deadLetteredIds = 0` 且 `FileLifecycleOutbox.processedAt IS NULL` 为 `0`；不会再把“暂时没有可 claim 但仍有 leased backlog / DLQ backlog”误判成 replay 已清空。
5. `shadowCompare()` 已固定为 `LegacyVectorSearchClient.query(filter.vaultId?) + 当前 SyncFile 活跃集过滤` 对比 `MemoxSearchAdapterService.searchFiles()`，输出 `expectedHitRate / deletedLeakCount / pathMismatchCount`，作为 cutover rehearsal 的统一 drift report 事实源。
6. `MemoxRuntimeConfigService` 已在模块启动期 fail-fast 校验 `MEMOX_API_BASE_URL / MEMOX_API_KEY / MEMOX_REQUEST_TIMEOUT_MS`，并冻结 `MORYFLOW_SEARCH_BACKEND=memox|legacy_vector_baseline`；只有显式启用 `legacy_vector_baseline` 时才要求 `VECTORIZE_API_URL`，且 `MEMOX_API_BASE_URL` / `VECTORIZE_API_URL` 都必须是 origin-only。这样 clean memox-only 部署不再被 legacy URL 反向卡死，但 rollback backend 仍保持 fail-fast。
7. `legacy-vector-search.client.ts` 现在只承担 Step 5 shadow compare / rollback query，以及显式 `legacy_vector_baseline` backend 下的最小 upsert/delete 同步；它不再是默认 memox 热路径的常驻双写依赖。Moryflow 不恢复旧 vectorize 栈，但保留可执行的 runtime rollback 读侧切换。
8. outbox failure state 现要求“落库成功才算处理完成”：`failClaimedEvent()` 若持久化失败，batch 会向上抛错交给 Bull 重试；Memox 侧确定性 `4xx` 也已改为直接进 DLQ，不再空耗 5 次 lease retry。
9. outbox drain 现固定为“5 秒一次调度 + 单个 drain job 最多连续处理 10 个 batch \* 20 条事件”，健康情况下每轮可吃掉最多 200 条 backlog，不再把“单 job 只吃一批”当成稳定吞吐上限。
10. `apps/moryflow/server/scripts/memox-phase2-local-rehearsal.ts` 已在本地可控环境实测通过：脚本现启动即显式要求 `MEMOX_API_KEY + VECTORIZE_API_URL`，因为 full rehearsal 固定包含 `shadowCompare()` 与 rollback rehearsal；首轮 sync 产生 3 个 `upload`；随后 backfill 按全局 `SyncFile(isDeleted=false)` 扫描 12 个活跃文件并在 2 个 batch 完成；初始与 mutation 后 `shadowCompare()` 均达到 `expectedHitRate=1 / deletedLeakCount=0 / pathMismatchCount=0`。
11. mutation 回放实测已通过：第二轮 sync 只产生 `beta rename + gamma delete + delta add` 3 个动作，`replayOutbox()` 返回 `claimed=3 / acknowledged=3 / failedIds=[] / deadLetteredIds=[]`；报告中的 `drained=false` 代表全局 backlog 指示位未清零，不代表当前 vault 演练失败。
12. delete bridge 现已修复 frozen scope lookup：`file_deleted` 会通过 `MemoxSourceBridgeService.buildSourceIdentityLookupInput()` 重复提交 `user_id + project_id + external_id`，不再因空 `body={}` 触发 `409 SOURCE_IDENTITY_SCOPE_MISMATCH` 并把删除事件送入 DLQ；对应 spec 已补齐。
13. 本地 Moryflow / Anyhunt 搜索结果已一致命中：`delta -> archive/delta.md`、`beta -> projects/beta-renamed.md`、`gamma -> 空结果`；当前 vault 下 6 条 outbox 事件均 `processedAt != null` 且无 `deadLetteredAt`。
14. 本阶段代码验证已完成：

- `pnpm exec vitest run src/memox/memox-source-bridge.service.spec.ts src/memox/memox-outbox-consumer.service.spec.ts src/memox/memox-cutover.service.spec.ts`
- `pnpm --filter @moryflow/server typecheck`

#### Task 6：下线旧 retrieval stack 与旧管理面合同

目标：完成 S7，真正删掉旧栈，而不是长期双轨。

主要文件：

- Delete: `apps/moryflow/server/src/vectorize/*`
- Add: `apps/moryflow/server/src/memox/legacy-vector-search.client.ts`
- Modify: `apps/moryflow/server/prisma/schema.prisma`
- Modify: `apps/moryflow/server/src/quota/quota.service.ts`
- Modify: `apps/moryflow/server/src/quota/dto/quota.dto.ts`
- Modify: `apps/moryflow/server/src/admin-storage/admin-storage.controller.ts`
- Modify: `apps/moryflow/server/src/admin-storage/admin-storage.service.ts`
- Modify: `apps/moryflow/server/src/admin-storage/dto/admin-storage.dto.ts`
- Modify: `apps/moryflow/pc/src/main/cloud-sync/api/*`
- Modify: `packages/api/src/cloud-sync/types.ts`

执行清单：

1. 切断旧 vectorize worker、旧 reconcile job 与旧 projection 表的新流量；`/api/v1/search` 保留为 Memox-backed gateway。
2. 删除 `VectorizedFile` 表与相关 quota/admin 统计口径。
3. 清理 `vectorizedCount`、`vectorizeEnabled`、旧 usage 结构与后台接口。
4. 清理所有 PC / shared / packages 类型里的旧 `vectorized*` 字段与兼容分支。
5. 同步更新官网文案、运维手册、部署说明。

阶段完成标准：

1. 仓库中不再存在正式在用的 `vectorize/search` 生产链路。
2. Admin、Quota、PC、共享类型、文档口径全部切到 Memox 新链路。

执行结果（2026-03-07）：

1. `apps/moryflow/server/src/vectorize/*` 与 `search-result-filter.service.ts` 已删除；Moryflow Server 不再保留旧 vectorize worker、controller、reconcile 或 projection 代码。
2. `apps/moryflow/server/src/search` 现仅保留 Memox-backed `POST /api/v1/search` gateway；旧双轨 search 实现与对应基线服务已下线。
3. Prisma schema 与迁移已删除 `VectorizedFile`、`UserStorageUsage.vectorizedCount`；Admin Storage 与 Quota 合同同步删除所有 `vectorized*` 统计与接口。
4. `packages/api`、PC `cloud-sync` API 类型、shared IPC 与 `cloud-sync:getUsage` 返回形状已统一删掉旧 `vectorized` 用量字段，仅保留 `storage + fileLimit + plan`。
5. 旧链路只保留 `src/memox/legacy-vector-search.client.ts` 这一条 cutover-only legacy baseline 客户端：读侧用于 shadow compare / rollback，写侧只保留最小 upsert/delete 镜像，不恢复旧 vectorize 栈。
6. 本阶段代码验证已完成：
   - `pnpm exec vitest run src/quota/quota.service.spec.ts src/memox/memox-source-bridge.service.spec.ts src/memox/memox-outbox-consumer.service.spec.ts src/memox/memox-cutover.service.spec.ts`
   - `pnpm --filter @moryflow/server typecheck`
   - `pnpm --filter @moryflow/pc typecheck`

#### Task 7：执行全量验收与上线闸门

目标：按 S8 把所有验证从“模块可用”升级到“迁移可上线”。

稳定结论：

1. 本地可控闸门已完成：根级校验、`@moryflow/server` E2E、`@anyhunt/anyhunt-server` integration / e2e、`@moryflow/pc` 单测、rollback rehearsal、Step 7 OpenAPI / payload 闸门均已在仓库内验证通过。
2. 真正仍未完成的只有外部环境闸门：staging cutover rehearsal 与 Moryflow Server staging dogfooding。
3. Step 7 的命令、证据、性能数据与外部阻塞统一记录在 `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`；本主文档不再重复维护过程态状态板。

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
