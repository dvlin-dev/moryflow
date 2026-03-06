---
title: Anyhunt Memox 开放记忆与检索平台架构（Moryflow 替代方案）
date: 2026-03-06
scope: apps/anyhunt/server/src/memory, apps/anyhunt/server/src/entity, apps/anyhunt/server/src/api-key, apps/moryflow/server/src/vectorize, apps/moryflow/server/src/search, apps/moryflow/vectorize, apps/moryflow/pc
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

本文不是阶段 A 的改动记录，而是新的架构事实源。

这份文档解决 4 件事：

1. 定义 Memox 的最终产品形态
2. 解释为什么它可以并且应该替代 Moryflow 现有 `vectorize/search`
3. 给出开放 API 的正式边界，避免被 Moryflow 绑死
4. 给出后续代码重构时必须遵守的模块化与单一职责设计

核心结论先说：

1. `Memox` 的最终定位不是“聊天长期记忆小模块”，而是 **开放的记忆与检索平台**。
2. `Memox` 必须同时服务：
   - Anyhunt 自己的 Playground
   - Moryflow Server
   - 未来第三方客户
3. `Moryflow Server` 是 Memox 的第一个正式客户，但**不是特权客户**。
4. `Memox` 将完整替代 Moryflow 当前自建的：
   - `apps/moryflow/server/src/vectorize`
   - `apps/moryflow/server/src/search`
   - `apps/moryflow/vectorize`
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

## 1.5 本期与后续

### 本期必须完成

1. 用 Memox 吸收并替代 Moryflow `vectorize/search`
2. 文件必须 chunk
3. 检索必须支持 `hybrid retrieval`
4. `entities / relations` 进入正式架构，但仅以异步 graph projection 落地

### 本期明确不做

1. 模型级 rerank
2. 公开 graph query API
3. 图谱可视化前端

### 后续保留方向

1. 二阶段模型级 rerank
2. 更丰富的 graph 查询
3. 多租户更细粒度的配额和 SLA

---

## 2. 现状复盘

## 2.1 Memox 当前已有能力

Anyhunt Server 当前已有：

1. Memory CRUD
2. 语义搜索
3. 关键词搜索
4. metadata/filter DSL
5. history
6. feedback
7. export
8. API Key hash-only
9. 请求日志、OpenAPI、RFC7807 错误体基础

当前代码事实源：

- [memory.service.ts](/Users/lin/.codex/worktrees/9309/moryflow/apps/anyhunt/server/src/memory/memory.service.ts)
- [memory.repository.ts](/Users/lin/.codex/worktrees/9309/moryflow/apps/anyhunt/server/src/memory/memory.repository.ts)
- [schema.prisma](/Users/lin/.codex/worktrees/9309/moryflow/apps/anyhunt/server/prisma/vector/schema.prisma)

## 2.2 Moryflow 当前已有能力

Moryflow 当前的 `vectorize/search` 链路本质是“文件检索系统”：

1. 文件上传或 sync commit 后入队向量化
2. 一文件一向量写入向量索引
3. 搜索时按 `userId + vaultId` 过滤
4. 返回 `fileId/title/score`

关键代码：

- [vectorize.processor.ts](/Users/lin/.codex/worktrees/9309/moryflow/apps/moryflow/server/src/vectorize/vectorize.processor.ts#L58)
- [search.service.ts](/Users/lin/.codex/worktrees/9309/moryflow/apps/moryflow/server/src/search/search.service.ts#L30)
- [search.dto.ts](/Users/lin/.codex/worktrees/9309/moryflow/apps/moryflow/server/src/search/dto/search.dto.ts#L20)
- [schema.prisma#L443](/Users/lin/.codex/worktrees/9309/moryflow/apps/moryflow/server/prisma/schema.prisma#L443)

## 2.3 当前问题的根因

当前最大的问题不是“少一个字段”，而是边界没有切开：

1. 把“原子记忆”和“文档检索”混成一个概念
2. 把“运行时作用域实体”和“知识图谱实体”混成一个概念
3. 把“Anyhunt 公网检索语义”和“Moryflow 自己的适配逻辑”混成一个概念
4. 把“能用”和“可售卖、可开放、可长期维护”混成一个目标

这 4 个边界不切开，后续无论怎么实现，都会重新长回大而杂的服务。

---

## 3. 设计原则（最佳实践）

## 3.1 边界优先于复用

统一底座不意味着把所有东西塞进一个表、一个 service、一个 API。真正的统一是：

1. 统一开放契约
2. 统一检索编排
3. 统一鉴权、配额、日志、作业系统

而不是：

- 所有数据都进同一张表
- 所有职责都进同一个模块

## 3.2 API 统一，存储分治

Memox 对外是一个平台，但内部必须拆开不同数据类型：

1. 原子记忆是原子记忆
2. 文档 source 是文档 source
3. chunk 是 chunk
4. graph entity / relation 是 graph entity / relation

对外统一，不代表内部不分层。

## 3.3 Anyhunt 拥有检索语义

`source/file` 聚合结果必须由 Anyhunt Memox 自己定义并返回。

原因：

1. 如果让 Moryflow Server 自己定义文件聚合规则，就又形成第二套检索语义
2. 对外客户和 Moryflow 的搜索结果会漂移
3. 这违背“开放 API + Moryflow dogfooding”的目标

所以：

- `Anyhunt` 负责检索语义
- `Moryflow Server` 只做用户上下文映射和轻量 DTO 适配

进一步冻结：

1. Anyhunt 必须提供统一公开检索入口，不能只暴露多个子域接口让客户端自行 merge。
2. `Moryflow Server` 不允许维护第二套“平台级搜索编排”。
3. `/memories/search`、`/sources/search` 可以保留为子域接口，但平台级语义必须由统一检索入口持有。

## 3.4 原始 source 内容由 Anyhunt 持有

为了支持：

1. reindex
2. delete
3. export
4. graph projection
5. content normalization
6. chunk regeneration

原始 source 内容的事实源必须由 Anyhunt 持有，而不是长期依附在 Moryflow 存储实现里。

这意味着：

- Moryflow 可以上传 source 到 Anyhunt
- 但最终 source blob / normalized text / source revision 的所有权属于 Anyhunt

## 3.5 计费和配额不能按 chunk 设计

chunk 是内部技术实现，不是产品计量单位。

正确做法是按：

1. source 数量
2. indexed bytes / indexed tokens
3. ingest job 数量与并发
4. search request 数量
5. export / graph projection 等重作业次数

计费或限额绝不能直接按 chunk 数暴露给用户。

---

## 4. 最终边界模型

## 4.1 Bounded Context 划分

### A. Memory Facts

职责：

- 存长期记忆、偏好、事实、总结、规则
- 支持 history、feedback、expiration、update/delete

公开 API：

- `POST /api/v1/memories`
- `GET /api/v1/memories`
- `POST /api/v1/memories/search`
- `GET /api/v1/memories/:id`
- `PATCH /api/v1/memories/:id`
- `DELETE /api/v1/memories/:id`
- `GET /api/v1/memories/:id/history`

### B. Sources

职责：

- 承载文件、文档、网页、转录文本等知识源
- 拥有 source 生命周期、版本、blob、chunk 与 reindex

公开 API：

- `POST /api/v1/sources`
- `GET /api/v1/sources/:id`
- `DELETE /api/v1/sources/:id`
- `POST /api/v1/sources/:id/reindex`
- `POST /api/v1/sources/search`

### C. Retrieval Orchestrator

职责：

- dense retrieval
- keyword retrieval
- merge
- chunk expansion
- source/file aggregation
- future rerank extension point

说明：

- 这是编排层，不直接承担原始数据写入事实源职责。

### D. Scope Registry

职责：

- 物化运行时作用域：`user / agent / app / run`
- 只服务于过滤、统计、控制台和运营观察

重要：

- 它不是 graph entity
- 它不是公开知识图谱 API
- 它本期不应作为主开放 API 域暴露

### E. Graph Projection

职责：

- 把 memory/source 中的高价值内容异步抽取为 graph entity / relation
- 为搜索结果附带 graph context

说明：

- graph 是独立 bounded context
- 不和 Scope Registry 复用表与 API

### F. Async Jobs

职责：

- source processing
- reindex
- export
- API key cleanup
- graph projection

说明：

- 不再允许 fire-and-forget
- 所有重作业都必须有持久化状态和重试策略

---

## 5. 最终数据模型

## 5.1 Memory Facts 模型

### `MemoryFact`

职责：原子长期记忆记录。

建议字段：

1. `id`
2. `apiKeyId`
3. `userId`
4. `agentId`
5. `appId`
6. `runId`
7. `orgId`
8. `projectId`
9. `content`
10. `metadata`
11. `categories`
12. `keywords`
13. `embedding`
14. `immutable`
15. `expirationDate`
16. `timestamp`
17. `createdAt`
18. `updatedAt`

### `MemoryFactHistory`

职责：记录 `MemoryFact` 的生命周期变化。

### `MemoryFeedback`

职责：记住用户对检索或记忆质量的反馈。

### 结论

`MemoryFact` 保留历史、反馈、过期、更新这些“记忆语义”。这和文档 chunk 不是一类对象，不应该共表。

## 5.2 Sources 模型

### `KnowledgeSource`

职责：source 的稳定身份。

建议字段：

1. `id`
2. `apiKeyId`
3. `sourceType`
4. `externalId`
5. `userId`
6. `agentId`
7. `appId`
8. `runId`
9. `orgId`
10. `projectId`
11. `title`
12. `displayPath`
13. `mimeType`
14. `metadata`
15. `currentRevisionId`
16. `status`
17. `createdAt`
18. `updatedAt`

### `KnowledgeSourceRevision`

职责：某个 source 的具体内容版本。

建议字段：

1. `id`
2. `sourceId`
3. `checksum`
4. `userId`
5. `agentId`
6. `appId`
7. `runId`
8. `orgId`
9. `projectId`
10. `contentBytes`
11. `contentTokens`
12. `normalizedTextR2Key`
13. `blobR2Key`
14. `status`
15. `createdAt`
16. `indexedAt`

### `SourceChunk`

职责：真正用于检索的 chunk 记录。

建议字段：

1. `id`
2. `sourceId`
3. `revisionId`
4. `apiKeyId`
5. `userId`
6. `agentId`
7. `appId`
8. `runId`
9. `orgId`
10. `projectId`
11. `chunkIndex`
12. `chunkCount`
13. `headingPath`
14. `content`
15. `tokenCount`
16. `metadata`
17. `keywords`
18. `embedding`
19. `createdAt`
20. `updatedAt`

### 结论

最佳实践不是把文档 chunk 硬塞进 `MemoryFact` 表，而是：

- `MemoryFact` 承载记忆语义
- `KnowledgeSource + Revision + SourceChunk` 承载文档检索语义

对外仍然是统一平台，但内部模型必须分开。

## 5.3 Scope Registry 模型

### `ScopeRegistry`

职责：运行时作用域投影。

建议字段：

1. `id`
2. `apiKeyId`
3. `scopeType`（`user | agent | app | run`）
4. `scopeId`
5. `metadata`
6. `name`
7. `orgId`
8. `projectId`

说明：

- 这是运行时作用域，不是 graph entity
- 当前 `entity/` 模块应向这个方向重构，而不是扩展成图谱实体系统
- `userId / agentId / appId / runId / orgId / projectId` 这些过滤字段仍直接保存在 `MemoryFact` 与 `KnowledgeSource` 主记录上
- `ScopeRegistry` 只做物化统计、管理视图和运营观察，不进入主检索热路径的必需 join
- `lastSeenAt / memoryFactCount / sourceCount` 这类字段在本期定义为派生视图指标，不要求物理落表；可以由读模型实时聚合或异步物化，但不能反向成为主检索事实源

## 5.4 Graph 模型

### `GraphEntity`

职责：知识图谱实体。

建议字段：

1. `id`
2. `apiKeyId`
3. `entityType`
4. `canonicalName`
5. `aliases`
6. `metadata`
7. `lastSeenAt`

### `GraphRelation`

职责：知识图谱关系。

建议字段：

1. `id`
2. `apiKeyId`
3. `fromEntityId`
4. `toEntityId`
5. `relationType`
6. `confidence`
7. `evidenceSourceId`
8. `evidenceMemoryFactId`
9. `createdAt`
10. `updatedAt`

### `GraphObservation`

职责：保留抽取证据、调试和 explainability。

说明：

- 如果还想保留“某条内容抽出了哪些 entities/relations”的快照，不应继续塞在 `MemoryFact.entities/relations` 这种主表 JSON 字段里。
- 更干净的做法是独立 observation / evidence 模型。

### Canonical Merge 规则（本期必须冻结）

为了避免 graph 退化成重复实体堆积，本期至少冻结以下 canonical merge 规则：

1. canonical entity 只在同一 `apiKeyId` 内归并，不跨 key 合并。
2. canonical key 由 `entityType + normalizedCanonicalName` 决定。
3. `normalizedCanonicalName` 至少执行：
   - trim
   - Unicode normalize
   - lower-case
   - collapse whitespace
4. 低置信度 observation 不能直接创建 canonical entity，必须先挂为 observation。
5. alias 只追加到 canonical entity，不单独升格为新 entity。
6. relation 永远引用 canonical entity id，不引用 observation 临时 id。
7. 文件路径、标题变动优先通过 `sourceId` 归并，不通过标题字符串归并。
8. `normalizedCanonicalName` 不同即视为不同 canonical entity；本期不做自动 entity merge。
9. 同一个 alias 允许在同一 `apiKeyId` 下暂时指向多个 canonical entity；歧义消解依赖 observation 置信度与 graph context 排序，不在本期做人工合并流。

## 5.5 幂等与作业模型

### `IdempotencyRecord`

职责：公开写接口的幂等保证。

### `SourceProcessingJob`

职责：source normalize / chunk / embed / index。

### `ReindexJob`

职责：版本重建与 chunk 重算。

### `MemoryExportJob`

职责：导出。

### `ApiKeyCleanupJob`

职责：删除 API Key 后的持久化清理。

本期冻结：

1. 必须是 durable queue job，不能退化成进程内 fire-and-forget。
2. 清理范围必须覆盖 `MemoryFact* / KnowledgeSource* / SourceChunk / Graph* / R2 source blobs / normalized text`。
3. 主库保留 `ApiKeyCleanupTask` 作为运行事实源，至少记录 `status / attempts / lastError / completedAt`。
4. worker 失败后必须依赖 BullMQ 重试与恢复扫描继续补偿；失败不允许静默吞掉。
5. 运营可见性与手动 retry runbook 需要保留，但本期仍以内部运维流程为准，不额外开放公网 API。

### `GraphProjectionJob`

职责：异步 graph 物化。

---

## 6. 开放 API 契约

## 6.1 认证

固定：

- Header：`Authorization: Bearer <apiKey>`
- API Key 继续 hash-only 存储
- Moryflow Server 也只是普通公网 API 客户

## 6.2 Platform Retrieval API

平台级统一检索入口：

1. `POST /api/v1/retrieval/search`

职责：

1. 接收统一 query
2. 决定搜索域：
   - `memory_facts`
   - `sources`
   - `all`
3. 执行 dense retrieval + keyword retrieval + merge
4. 返回平台级结果

说明：

1. 这是 Anyhunt 统一检索语义的唯一公开事实源。
2. Moryflow Server 与未来第三方客户都应优先使用这一入口。
3. `/memories/search` 与 `/sources/search` 作为子域专用接口保留，但不再承担平台级统一语义。

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
  title: string;
  snippet: string;
  matched_chunks: Array<{ chunk_id: string; chunk_index: number }>;
  metadata: Record<string, unknown> | null;
  graph_context?: GraphContext;
};
```

### `score` 语义（冻结）

1. `score` 是平台在当前响应内排序后的统一归一化分数。
2. `score` 只保证在同一次响应内可比较。
3. 不保证跨请求、跨时间、跨实现版本稳定。
4. 平台级排序以 `rank` 和返回顺序为准，客户端不应自行重建排序。
5. 当前实现使用 `min-max normalization -> [0, 1]`，但这只是实现细节，不构成开放 API 的兼容承诺。

## 6.3 Memory API

面向原子长期记忆：

1. `POST /api/v1/memories`
2. `GET /api/v1/memories`
3. `POST /api/v1/memories/search`
4. `GET /api/v1/memories/:id`
5. `PATCH /api/v1/memories/:id`
6. `DELETE /api/v1/memories/:id`
7. `GET /api/v1/memories/:id/history`

特性：

- 返回 `MemoryFact` 级结果
- 支持 `user_id/agent_id/app_id/run_id/org_id/project_id/metadata` 过滤
- 支持 history 与 feedback

## 6.4 Source API

面向开放知识源摄入：

### Source 创建

`POST /api/v1/sources`

请求只负责创建 source 身份，不再隐式创建 revision。

1. 声明 source 元数据
2. 返回 `source_id`
3. 不直接承载大文件内容

### Source Revision 创建

`POST /api/v1/sources/:id/revisions`

这是公开摄入的核心入口。revision 是正式公开资源，不再藏成 source 内部状态机。

本期建议支持两种模式：

1. `inline_text`
   - 小文本直接提交
2. `upload_blob`
   - 大文件先创建 source，再获取受控上传会话

### Source 内容提交（冻结为单一路径）

最佳实践收敛为两种固定路径，但 `upload_blob` 只允许一种实现：

1. `POST /api/v1/sources/:id/revisions` 直接携带小文本内容
2. `POST /api/v1/sources/:id/revisions` 返回 `uploadSession`
   - `uploadSession.uploadUrl`
   - `uploadSession.headers`
   - `uploadSession.expiresAt`
   - `uploadSession.revisionId`
   - 客户端随后直接向受控上传地址上传 blob

禁止保留第二种 blob 提交路径；不再定义 `PUT /api/v1/sources/:id/blob` 这类平行契约。

### Source Revision 生命周期

1. `GET /api/v1/sources/:id`
2. `GET /api/v1/sources/:id/revisions/:revisionId`
3. `POST /api/v1/source-revisions/:revisionId/finalize`
4. `POST /api/v1/source-revisions/:revisionId/reindex`
5. `DELETE /api/v1/sources/:id`

说明：

1. `KnowledgeSource` 是身份资源。
2. `KnowledgeSourceRevision` 是内容版本资源。
3. finalize / reindex 都应该挂在 revision 资源上，而不是继续挂在 source 身份上。
4. `GET /api/v1/source-revisions/:revisionId` 必须返回 `pending_upload_expires_at`，让客户端知道 upload window 是否仍然有效。

### Revision Timeout 与 Zombie Cleanup（本期冻结）

1. `uploadSession.expiresAt` 只约束上传 URL；`pending_upload_expires_at` 约束 revision 生命周期，两者不能混为一谈。
2. `upload_blob` revision 创建后必须写入 `pendingUploadExpiresAt`；本期默认 TTL 为 24 小时。
3. `PENDING_UPLOAD` revision 超时后，`finalize` 必须返回 `409 SOURCE_UPLOAD_WINDOW_EXPIRED`。
4. 平台必须有小时级 cleanup job 扫描超时 `PENDING_UPLOAD` revision。
5. cleanup job 必须先删除 raw blob / normalized text（如存在），再硬删除过期 revision，避免留下 R2 孤儿对象与僵尸 revision。
6. cleanup job 必须幂等；重复执行只能得到同一最终状态。

### Source Search

`POST /api/v1/sources/search`

这是正式公开契约，直接返回 source/file 级结果：

1. `source_id`
2. `source_type`
3. `title`
4. `score`
5. `snippet`
6. `matched_chunks`
7. `metadata`

这里必须由 Anyhunt 自己定义聚合语义；Moryflow Server 不再拥有第二套文件搜索定义权。

## 6.5 Scope API

本期建议：

- **不作为主公开 API 暴露**

原因：

1. 运行时作用域是内部投影，不是开放知识模型
2. 外部客户不应该被迫理解 `user/app/run/agent` 投影表
3. 需要时可在后续以 `Context/Scopes` 独立域公开，而不是复用 `Entity` 命名
4. 当前公开 `entity` 路由不应长期保留，必须迁出或下线

## 6.6 Graph API

本期建议：

- **不公开 graph query API**

本期只允许：

1. graph context 附带在检索响应中
2. graph 结果用于内部增强和调试

## 6.7 Export API

1. `POST /api/v1/memory-exports`
2. `GET /api/v1/memory-exports/:id`
3. `GET /api/v1/memory-exports/:id/download`

本期冻结：

1. 导出格式为 `application/json`，文件名为 `memox-export-<exportId>.json`。
2. 导出作业必须异步执行，不允许同步拼装大响应。
3. 读取采用分页拉取，上传采用流式写入对象存储，避免把整份导出内容一次性堆到内存。
4. `download` 返回的是平台对象存储中的完成态 JSON 内容；增量导出与 JSONL 不在本期范围。

## 6.8 幂等与错误

### 幂等

下列写接口必须支持 `Idempotency-Key`：

1. `POST /memories`
2. `POST /sources`
3. `POST /sources/:id/revisions`
4. `POST /source-revisions/:revisionId/finalize`
5. `POST /source-revisions/:revisionId/reindex`
6. `POST /memory-exports`

### 错误

统一 RFC7807：

1. `status`
2. `code`
3. `message`
4. `request_id`
5. `details`
6. 可选 `errors[]`

### Ingest Guardrail Error Contract（本期冻结）

`sources/` 域对外必须输出结构化 RFC7807 错误，不允许退化成通用 `400`：

1. `413 SOURCE_SIZE_LIMIT_EXCEEDED`
   - `details.guardrail = max_source_bytes`
   - `details.limit`
   - `details.current`
2. `413 SOURCE_TOKEN_LIMIT_EXCEEDED`
   - `details.guardrail = max_normalized_tokens_per_revision`
   - `details.limit`
   - `details.current`
3. `413 SOURCE_CHUNK_LIMIT_EXCEEDED`
   - `details.guardrail = max_chunks_per_revision`
   - `details.limit`
   - `details.current`
4. `429 FINALIZE_RATE_LIMIT_EXCEEDED`
   - `details.guardrail = max_finalize_requests_per_api_key_per_window`
   - `details.limit`
   - `details.current`
   - `details.retryAfter`
5. `429 REINDEX_RATE_LIMIT_EXCEEDED`
   - `details.guardrail = max_reindex_per_source_per_window`
   - `details.limit`
   - `details.current`
   - `details.retryAfter`
6. `503 CONCURRENT_PROCESSING_LIMIT_EXCEEDED`
   - `details.guardrail = max_concurrent_source_jobs_per_api_key`
   - `details.limit`
   - `details.current`
   - `details.retryAfter`
7. `409 SOURCE_UPLOAD_WINDOW_EXPIRED`
   - `details.expiredAt`

约束：

1. `413` 表示永久拒绝，客户端不应自动重试。
2. `429/503` 表示可恢复压力错误，客户端应结合 `retryAfter` 做退避。
3. `409 SOURCE_UPLOAD_WINDOW_EXPIRED` 表示 revision 生命周期已失效，客户端必须重新创建 revision，而不是继续重试旧 revision。

---

## 7. 检索与 chunk 最佳实践

## 7.1 检索流水线（本期冻结）

本期正式检索流水线为：

1. query normalization
2. dense semantic retrieval
3. keyword retrieval
4. candidate merge（RRF 或等价融合）
5. chunk expansion
6. source/file aggregation
7. final response shaping

说明：

- 模型级 rerank 作为未来扩展位保留，不进入本期实现范围。

## 7.2 Chunking 原则

参考：

- OpenAI file search / retrieval 文档
- Pinecone chunking 与 data modeling 文档

本期冻结规则：

1. 结构优先切分
2. 固定窗口只做兜底
3. 轻 overlap
4. chunk 是检索单位，source/file 是体验单位

### 建议参数

1. `soft_target_tokens = 700`
2. `hard_max_tokens = 1000`
3. `min_chunk_tokens = 200`
4. `forced_split_overlap_tokens = 120`

### 结构化切分优先级

#### Markdown / Note

1. heading
2. paragraph
3. list block
4. table block
5. code block

#### 其他纯文本

1. paragraph
2. sentence
3. fixed token window

### 删除与重建

必须基于：

1. `sourceId`
2. `revisionId`
3. chunk 层级 ID

禁止依赖 metadata filter 作为主删除路径。

## 7.3 Rerank

### 本期状态

本期不实现模型级 rerank。

### 当前代码状态

当前 Anyhunt Memory API 已有 `rerank` 参数与启发式实现，但它只是过渡能力，不纳入本期正式方案与验收标准。

### 未来方向

未来推荐：

1. 二阶段模型级 rerank
2. 专用 reranker 或小模型优先
3. provider abstraction + fallback 一次性设计

但这些都放到后续版本。

## 7.4 Ingestion Guardrail（本期必须冻结）

开放平台如果没有摄入护栏，后续一定会留下性能和滥用债务。本期至少冻结以下 guardrail：

1. `max_source_bytes`
2. `max_normalized_tokens_per_revision`
3. `max_chunks_per_revision`
4. `max_concurrent_source_jobs_per_apiKey`
5. `max_reindex_per_source_per_window`
6. `max_finalize_requests_per_apiKey_per_window`

这些限制属于公开 API 契约的一部分，不能等到实现时再临时决定。

---

## 8. Graph / Entities / Relations

## 8.1 本期是否纳入

我的最终建议：**纳入，但严格限制边界。**

### 本期纳入

1. `GraphEntity`
2. `GraphRelation`
3. `GraphObservation`
4. `GraphProjectionJob`
5. 检索结果中的 graph context

### 本期不纳入

1. 独立公开 graph query API
2. 图谱可视化前端
3. 对每个 document chunk 同步抽图

## 8.2 为什么不能复用现有 `entity/` 模块

因为当前 `entity/` 模块的语义是：

- `user`
- `agent`
- `app`
- `run`

这是运行时作用域，不是知识图谱实体。

所以：

- 现有 `entity/` 应重构成 `scope-registry`
- graph entity / relation 必须新建独立模块

## 8.3 Graph 的作用

本期 graph 的作用是：

1. 增强上下文
2. 提供 explainability
3. 为未来图谱能力打底

本期 graph **不负责主检索排序**。

---

## 9. 配额与计费

## 9.1 本期计量单位

本期建议按以下维度建模配额：

1. `request_count`
2. `source_count`
3. `indexed_bytes`
4. `indexed_tokens`
5. `active_processing_jobs`
6. `export_jobs`
7. `graph_projection_jobs`

## 9.2 Source 摄入资源模型

除了计量单位，还必须定义 source ingest 的保护模型：

1. 每个 API key 同时进行中的 source processing job 数
2. 每小时可创建的 source 数
3. 每个 source 在固定时间窗口内的 reindex 次数
4. 单次 finalize 可接受的最大文本与 blob 大小
5. 单次 source 可接受的最大 chunk 数

这些都应该落到平台级策略模型，而不是散在业务逻辑里。

## 9.3 明确禁止

1. 禁止按 chunk 数对外收费
2. 禁止把 chunk 数作为主产品限额
3. 禁止把内部索引实现细节暴露成产品计费单位

---

## 10. 二期：Moryflow 迁移与下线

## 10.1 保留到迁移完成前

暂时保留：

1. `apps/moryflow/server/src/vectorize`
2. `apps/moryflow/server/src/search`
3. `apps/moryflow/vectorize`
4. `apps/moryflow/pc/src/main/cloud-sync/*` 里 vectorize 调度逻辑

原因：

- 迁移完成前它们仍提供当前线上能力
- 不能在 Memox 替代链路完成前直接删除

## 10.2 Moryflow Server 新职责

新增 `memox` gateway 模块，承担：

1. source ingest
2. source search
3. atomic memory write/search
4. 身份映射
5. 幂等与补偿
6. 轻量 DTO 适配

说明：

- 不再由 Moryflow Server 自己定义文件聚合检索语义
- 只适配，不拥有第二套搜索协议

## 10.3 最终删除

迁移完成后删除：

1. `apps/moryflow/server/src/vectorize`
2. `apps/moryflow/server/src/search`
3. `apps/moryflow/vectorize`
4. `VectorizedFile` 相关表
5. 旧 `vectorizedCount` 相关 quota 字段
6. PC 端 `vectorizeEnabled` 概念（若新能力改由 source indexing 统一承担）

## 10.4 文案同步

Moryflow 当前官网有文案：

- “Mory's memory only exists on your computer”
- [WhyLocalSection.tsx](/Users/lin/.codex/worktrees/9309/moryflow/apps/moryflow/www/src/components/landing/WhyLocalSection.tsx#L12)

如果接入云端 Memox，这个说法会与事实冲突，必须一起重写。

---

## 11. 一次性执行蓝图（现拆分为两期）

下面的顺序已经按依赖关系收口，后续实现必须按这个顺序执行，禁止跳步并行把复杂度重新打散。

### 分期原则

1. **一期只做 Anyhunt Memox 平台**：只允许推进 `S1 ~ S5`。
2. **二期才做 Moryflow 接入**：`S6 ~ S8` 必须等一期完成后再启动。
3. 当前阶段的唯一目标是把 Memox 平台本身做成可独立对外开放、可售卖、可被第三方消费的开放平台。
4. Moryflow 是一期之后的第一个正式客户，不再与平台底座改造并行推进。
5. **仅限本需求允许直接重置 Anyhunt Server 主库与向量库**：当前无真实用户，不保留历史兼容；若需要清空并重建 `DATABASE_URL / VECTOR_DATABASE_URL` 对应库来收口 schema 与 migration，可直接执行，但该准则仅适用于本次 Memox 一期平台整改。

## 11.1 一期：Anyhunt Memox 平台

### 当前进度（2026-03-06）

- 状态：`completed`
- 已完成：`S1` 全部收口（限流基座、请求日志分组、幂等基础设施、`POST /memories` / `POST /exports` 幂等主链路、OpenAPI 售卖级元信息、source ingest guardrail 运行时配置模型）
- 已完成：`S3` 全部收口（source identity、revision 写路径、`upload_blob/uploadSession`、blob -> normalized text finalize、revision 直查、source 删除与 cleanup queue）
- 已完成：`S4` 主要主链路（`/api/v1/sources/search`、`/api/v1/retrieval/search`、hybrid retrieval、chunk expansion、source/file 聚合）
- 已完成：`S2` 全部收口（`MemoryFact*` 持久化模型、`ScopeRegistry`、`sources/` 底层事实源、graph 持久化域、旧 `entity` 公网路由删除）
- 已完成：`S5`（`GraphProjectionJob`、canonical merge、`GraphObservation`、retrieval graph context）
- 已完成：review 阻塞项代码修复（durable `ApiKeyCleanupTask` + BullMQ cleanup job、`GraphObservation` 事实源 cleanup、`include_graph_context` 显式契约 + batch graph context、source ingest guardrail 运行时 enforcement、graph low-confidence gate）
- 已完成：review 追加硬化（source ingest 结构化错误契约、`pending_upload_expires_at` + 小时级 zombie revision cleanup、`ScopeRegistry`/导出契约/graph canonical conflict 口径回写）
- 已完成：主库/向量库 migration 体系压缩为单基线 init 迁移
- 已完成：真实目标库零兼容 reset + migrate 验证；使用 `/Users/lin/code/moryflow/apps/anyhunt/server/.env` 中的目标连接，对主库执行 `DROP SCHEMA public CASCADE` 后应用 `20260306173000_init`，对向量库在空 `public schema` 上应用 `20260306173100_init`，`prisma migrate status` 已确认两边都为 `Database schema is up to date`
- 明确不在本期：`Moryflow Server / PC` 接入、旧 `vectorize/search` 下线

验证：

- `pnpm --filter @anyhunt/anyhunt-server test -- src/common/guards/redis-throttler.storage.spec.ts src/common/guards/throttle.config.spec.ts src/common/guards/user-throttler.guard.spec.ts src/log/__tests__/request-log.middleware.spec.ts src/idempotency/__tests__/idempotency.service.spec.ts src/idempotency/__tests__/idempotency-executor.service.spec.ts src/memory/__tests__/memory.controller.spec.ts src/memory/__tests__/memory-export.controller.spec.ts src/memox-platform/__tests__/memox-platform.service.spec.ts src/openapi/__tests__/openapi.service.spec.ts` ✅
- `pnpm --filter @anyhunt/anyhunt-server test -- src/log/__tests__/request-log.middleware.spec.ts src/api-key/__tests__/api-key.service.spec.ts src/memory/__tests__/memory.service.spec.ts src/memory/__tests__/memory.controller.spec.ts src/memory/__tests__/memory-export.controller.spec.ts src/retrieval/__tests__/memory-fact-search.service.spec.ts src/retrieval/__tests__/source-search.service.spec.ts src/retrieval/__tests__/retrieval.service.spec.ts src/retrieval/__tests__/retrieval.controller.spec.ts src/graph/__tests__/graph-context.service.spec.ts src/graph/__tests__/graph-projection.service.spec.ts src/sources/__tests__/knowledge-source-revision.service.spec.ts src/sources/__tests__/knowledge-source-deletion.service.spec.ts src/sources/__tests__/sources.controller.spec.ts src/sources/__tests__/source-revisions.controller.spec.ts src/sources/__tests__/source-cleanup.processor.spec.ts src/scope-registry/__tests__/scope-registry.service.spec.ts src/memory/filters/__tests__/memory-filter.builder.spec.ts` ✅
- `pnpm --filter @anyhunt/anyhunt-server typecheck` ✅
- `pnpm --filter @anyhunt/anyhunt-server exec eslint --no-warn-ignored <affected files>` ✅
- `pnpm --filter @anyhunt/anyhunt-server exec prisma migrate status --config prisma.main.config.ts` ✅
- `pnpm --filter @anyhunt/anyhunt-server exec prisma migrate status --config prisma.vector.config.ts` ✅

### 11.1.1 S1：平台底座与公共约束先落地

#### 当前进度（2026-03-06）

- `[x]` 已完成：全局 throttler 基础设施（Redis storage + throttle config + AppModule 装配）
- `[x]` 已完成：tracker 规则收口（优先 `apiKey.id`，全局 guard 阶段对 `ah_` key 使用 `sha256` 作为 fallback tracker）
- `[x]` 已完成：request-log 的 Memox 路由分组修正（`retrieval/memories/sources/source-revisions`）
- `[x]` 已完成：`Idempotency-Key` 基础设施（主库 `IdempotencyRecord` + `idempotency/` 通用服务）
- `[x]` 已完成：可复用幂等执行器（`IdempotencyExecutorService` + `IdempotencyKey` decorator）
- `[x]` 已完成：`POST /memories` 接入幂等主链路（首次执行 / 回放 / 处理中冲突）
- `[x]` 已完成：`POST /exports` 接入同一幂等链路
- `[x]` 已完成：OpenAPI 补齐到售卖级（生产/本地 server、contact、external docs、鉴权说明）
- `[x]` 已完成：source ingest guardrail 运行时配置模型落地（`MemoxPlatformService`）
- `[x]` 已完成：主库 migration `20260306144500_add_idempotency_record`

验证：

- `pnpm --filter @anyhunt/anyhunt-server test -- src/common/guards/redis-throttler.storage.spec.ts src/common/guards/throttle.config.spec.ts src/common/guards/user-throttler.guard.spec.ts src/log/__tests__/request-log.middleware.spec.ts src/idempotency/__tests__/idempotency.service.spec.ts src/idempotency/__tests__/idempotency-executor.service.spec.ts src/memory/__tests__/memory.controller.spec.ts src/memory/__tests__/memory-export.controller.spec.ts src/memox-platform/__tests__/memox-platform.service.spec.ts src/openapi/__tests__/openapi.service.spec.ts` ✅
- `pnpm --filter @anyhunt/anyhunt-server typecheck` ✅
- `pnpm --filter @anyhunt/anyhunt-server exec eslint --no-warn-ignored <affected files>` ✅

目标：先把开放平台最底层的公共约束做实，避免后续每个业务模块重复补洞。

必须完成：

1. 全局 throttler 真正生效
2. `apiKeyId` 维度限流
3. `Idempotency-Key` 基础设施
4. 请求日志 route group 修正
5. RFC7807 错误体在新域保持一致
6. OpenAPI 基础能力补齐到售卖级
7. source ingest guardrail 配置模型落地

交付结果：

1. 平台已有统一限流、幂等、错误、日志、OpenAPI 基座
2. 后续 `MemoryFact / Source / Retrieval` 域不再各自发明一套基础设施
3. 一期后续阶段可以直接复用 `IdempotencyExecutorService` 与 `MemoxPlatformService`

### 11.1.2 S2：领域模型分治重构

#### 当前进度（2026-03-06）

- `[x]` 已完成：`ScopeRegistry` 底层事实源落地（替代原 `MemoxEntity`）
- `[x]` 已完成：旧 `entity/` 公网适配层已从 App/OpenAPI 入口移除，死代码目录已删除
- `[x]` 已完成：`KnowledgeSource / KnowledgeSourceRevision / SourceChunk` 底层事实源、迁移文件、Nest 模块、inline_text revision 主链路、结构化 chunking 与 revision finalize/reindex 编排落地
- `[x]` 已完成：`MemoryFact / MemoryFactHistory / MemoryFactFeedback / MemoryFactExport` 持久化模型正式更名；主表新增 `graphEnabled` 语义字段，移除 `entities/relations` 图谱快照字段
- `[x]` 已完成：`GraphEntity / GraphRelation / GraphObservation` 运行时模块与 projection job 落地
- `[x]` 已完成：memory graph 不再走主表 JSON 快照；改为 `graphEnabled` 控制的异步正文抽取 + `GraphObservation` 证据落库
- `[x]` 已完成：`GraphObservation` 真正成为 graph cleanup 的事实源；cleanup 改为删 observation 后 prune orphan relation/entity，不再直接按 evidence 字段硬删 canonical relation

验证：

- `pnpm --filter @anyhunt/anyhunt-server test -- src/scope-registry/__tests__/scope-registry.service.spec.ts src/api-key/__tests__/api-key.service.spec.ts src/memory/__tests__/memory.service.spec.ts src/graph/__tests__/graph-context.service.spec.ts src/graph/__tests__/graph-projection.service.spec.ts src/sources/__tests__/knowledge-source-revision.service.spec.ts src/sources/__tests__/knowledge-source-deletion.service.spec.ts src/memory/filters/__tests__/memory-filter.builder.spec.ts` ✅
- `pnpm --filter @anyhunt/anyhunt-server exec eslint --no-warn-ignored <affected files>` ✅
- `pnpm --filter @anyhunt/anyhunt-server exec tsc --noEmit` ✅

目标：把内部事实源一次性拆开，避免继续在单表/单模块里堆职责。

必须完成：

1. `MemoryFact` 域落地
2. `KnowledgeSource` 域落地
3. `KnowledgeSourceRevision` 域落地
4. `SourceChunk` 域落地
5. `ScopeRegistry` 从现有 `entity/` 重构出来
6. `GraphEntity / GraphRelation / GraphObservation` 域落地
7. async jobs 显式建模
8. 当前公开 `entity` 路由迁为内部 `scope-registry` 管理接口或直接删除

交付结果：

1. `memory/` 不再承担文档检索与 graph 主职责
2. `entity/` 不再混用作用域实体与图谱实体
3. 后续开放 API 可以稳定映射到清晰的内部事实源

### 11.1.3 S3：开放 Source 摄入契约落地

#### 当前进度（2026-03-06）

- `[x]` 已完成：`POST /api/v1/sources` 与 `GET /api/v1/sources/:id` 公开 source identity 契约落地
- `[x]` 已完成：`POST /api/v1/sources/:id/revisions`、`GET /api/v1/sources/:id/revisions/:revisionId`、`POST /api/v1/source-revisions/:revisionId/finalize`、`POST /api/v1/source-revisions/:revisionId/reindex` 落地，并统一接入 `Idempotency-Key`
- `[x]` 已完成：`upload_blob` / `uploadSession` 受控上传路径，且 finalize 已接通 blob -> normalized text -> chunk replace 的主链路
- `[x]` 已完成：`GET /api/v1/source-revisions/:revisionId` 作为 revision status 直查接口补齐
- `[x]` 已完成：`DELETE /api/v1/sources/:id` 与 cleanup queue 落地；删除后会清理 raw blob / normalized text，再硬删除 source 及其级联 revision/chunk
- `[x]` 已完成：source ingest guardrail 的并发/重试窗口/频率限制落到运行时（finalize/reindex window + concurrent source processing slot）
- `[x]` 已完成：source ingest 结构化 RFC7807 错误契约（`413/429/503/409` + guardrail details）与 `pending_upload_expires_at` 生命周期
- `[x]` 已完成：小时级 zombie revision cleanup；过期 `PENDING_UPLOAD` revision 会删除对象存储残留并硬删除 revision

验证：

- `pnpm --filter @anyhunt/anyhunt-server test -- src/sources/__tests__/knowledge-source-revision.service.spec.ts src/sources/__tests__/source-revisions.controller.spec.ts` ✅
- `pnpm --filter @anyhunt/anyhunt-server test -- src/sources/__tests__/sources.controller.spec.ts src/sources/__tests__/source-revisions.controller.spec.ts src/sources/__tests__/knowledge-source-deletion.service.spec.ts src/sources/__tests__/source-cleanup.processor.spec.ts` ✅
- `pnpm --filter @anyhunt/anyhunt-server exec eslint --no-warn-ignored <affected files>` ✅
- `pnpm --filter @anyhunt/anyhunt-server exec tsc --noEmit` ✅

目标：让开放平台真正拥有 source 内容所有权与摄入生命周期。

必须完成：

1. `POST /sources` 的 source identity 契约落地
2. `POST /sources/:id/revisions` 契约落地
3. 单一路径 `uploadSession` 方案落地
4. `source-revisions/:revisionId/finalize` / `reindex` / `status` 落地
5. Anyhunt 接管 source blob 与 normalized text
6. revision/checksum/source ownership 规则落地
7. ingest guardrail 真正挂到运行时策略

交付结果：

1. source 不再依附 Moryflow 私有存储实现
2. `reindex / delete / export / graph projection` 有稳定事实源

### 11.1.4 S4：统一公开检索语义落地

#### 当前进度（2026-03-06）

- `[x]` 已完成：新增 `retrieval/` 模块，公开 `POST /api/v1/sources/search` 与 `POST /api/v1/retrieval/search`
- `[x]` 已完成：`sources/search` 由 Anyhunt 持有 source/file 聚合语义，不再下放给客户端或 Moryflow Server
- `[x]` 已完成：统一 request/response schema 落地（`result_kind = source | memory_fact`、`rank`、同响应内归一化 `score`）
- `[x]` 已完成：dense retrieval + keyword retrieval + candidate merge 落地
- `[x]` 已完成：chunk expansion 与 snippet 生成落地
- `[x]` 已完成：source/file aggregation 落地
- `[x]` 已完成：`ScopeRegistry` 未进入主检索热路径；检索仍直接落在 `MemoryFact` / `SourceChunk + KnowledgeSource` 主记录上
- `[x]` 已完成：公开契约与实现重新对齐，`include_graph_context` 成为显式可选项；graph context 改为按 memory/source 域批量加载

验证：

- `pnpm --filter @anyhunt/anyhunt-server test -- src/retrieval/__tests__/memory-fact-search.service.spec.ts src/retrieval/__tests__/source-search.service.spec.ts src/retrieval/__tests__/retrieval.service.spec.ts src/retrieval/__tests__/retrieval.controller.spec.ts` ✅
- `pnpm --filter @anyhunt/anyhunt-server exec tsc --noEmit` ✅
- `pnpm --filter @anyhunt/anyhunt-server exec eslint --no-warn-ignored <affected files>` ✅

目标：把 Anyhunt 自己的检索语义做成正式开放契约，而不是让客户端自己拼。

必须完成：

1. `POST /api/v1/retrieval/search` 落地
2. `/memories/search` 与 `/sources/search` 收敛为子域接口
3. 平台级 request/response 判别联合 schema 落地
4. dense retrieval + keyword retrieval + merge 落地
5. chunk expansion 落地
6. source/file aggregation 落地
7. `ScopeRegistry` 不进入主检索热路径的规则落实到实现

交付结果：

1. Anyhunt 持有唯一平台级搜索语义
2. Moryflow Server 与第三方客户拿到同一套搜索行为

### 11.1.5 S5：Graph 与 Explainability 基础落地

#### 当前进度（2026-03-06）

- `[x]` 已完成：新增 `graph/` 模块与 `GraphProcessor`，落地 `memox-graph-projection` 队列
- `[x]` 已完成：memory fact 与 source revision 的 graph projection / cleanup job 编排
- `[x]` 已完成：canonical entity / relation merge 与 orphan prune
- `[x]` 已完成：`GraphObservation` 证据模型落地
- `[x]` 已完成：`retrieval/search` 与 `sources/search` 结果附带 `graph_context`
- `[x]` 已完成：graph query API 继续关闭，不对外开放
- `[x]` 已完成：canonical merge 与低置信度策略对齐文档承诺；低置信 observation 不再直接升格 canonical entity / relation

### 11.1.6 本轮 Review 阻塞项（2026-03-06）

1. `[x]` 已修复：删除 API Key 改为主库 `ApiKeyCleanupTask` + BullMQ durable cleanup job；清理范围覆盖 `MemoryFact* / KnowledgeSource* / SourceChunk / Graph* / R2 source blobs`
2. `[x]` 已修复：graph cleanup 改为 observation-first；删除 evidence 后只 prune orphan canonical relation/entity，不再误删共享 relation
3. `[x]` 已修复：retrieval 契约与实现重新对齐；`include_graph_context` 可选且 graph context 改为 batch attach
4. `[x]` 已修复：source ingest guardrail 运行时 enforcement 已落地；窗口与并发限制不再只是配置事实源
5. `[x]` 已修复：graph low-confidence gate 已实现；低置信 observation 不再直接创建 canonical entity / relation
6. `[x]` 已完成代码与文件层收口：主库/向量库 migrations 已压缩为单基线 init，且真实目标库零兼容 reset + migrate 已完成；主库当前为 `20260306173000_init`，向量库当前为 `20260306173100_init`，两边 `prisma migrate status` 均为 `Database schema is up to date`

验证：

- `pnpm --filter @anyhunt/anyhunt-server test -- src/graph/__tests__/graph-context.service.spec.ts src/graph/__tests__/graph-projection.service.spec.ts src/retrieval/__tests__/retrieval.service.spec.ts` ✅
- `pnpm --filter @anyhunt/anyhunt-server exec tsc --noEmit` ✅
- `pnpm --filter @anyhunt/anyhunt-server exec eslint --no-warn-ignored <affected files>` ✅

目标：在不扩大公开面前提下，把 graph 的长期正确架构先打好。

必须完成：

1. `GraphProjectionJob` 落地
2. canonical merge 规则落地
3. `GraphObservation` 证据模型落地
4. 检索结果可附带 graph context
5. 保持 graph query API 关闭

交付结果：

1. graph 能增强检索与解释性
2. 不会因为本期过度暴露图谱 API 而把边界做乱

## 11.2 二期：Moryflow 接入与旧栈下线

### 当前状态（2026-03-06）

- 状态：`not_started`
- 启动前置条件：一期 `S1 ~ S5` 必须全部完成并通过平台侧验收
- 二期范围：只处理 Moryflow 接入、旧 retrieval stack 下线、全链路上线门槛

### 11.2.1 S6：Moryflow Server 接入 Memox

目标：让 Moryflow 成为 Memox 的第一正式客户，同时不重新发明私有协议。

必须完成：

1. 新建 `memox` gateway 模块
2. 替换文件搜索调用链
3. 替换向量化入队链路
4. 替换长期 memory 写入链路
5. 保持上层文件搜索体验不变
6. 保持 Moryflow 只做身份映射、幂等、补偿和 DTO 适配

交付结果：

1. Moryflow Server 不再拥有独立 retrieval stack
2. Moryflow 成功 dogfood Memox 公网 API

### 11.2.2 S7：下线 Moryflow 旧 retrieval stack

目标：完成迁移闭环，真正去掉旧系统，而不是长期双轨。

必须完成：

1. 切断所有新流量
2. 删除旧 worker 与旧 server module
3. 删除 `VectorizedFile` 相关表
4. 删除旧 `vectorizedCount` quota 字段
5. 清理 `vectorizeEnabled` 等旧概念
6. 更新文案、手册、部署说明

交付结果：

1. 仓库里只剩一套正式 retrieval stack
2. 运维、产品、代码、文档不再分叉

### 11.2.3 S8：上线门槛

必须全部通过：

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:unit`
4. `@anyhunt/anyhunt-server` integration / e2e
5. `@moryflow/server` 相关测试
6. `@moryflow/pc` 相关测试
7. source ingest / finalize / reindex / delete / search / export 压测
8. graph projection / canonical merge / idempotency / rate limit 回归
9. OpenAPI snapshot 审核
10. Moryflow Server staging dogfooding

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

这套方案的目标不是“先接上”，而是：

- 一次性把方向做对
- 后面不再做第二轮架构返工
- 让 Memox 真正成为可对外售卖、可被 Moryflow 与外部客户共同消费的平台
