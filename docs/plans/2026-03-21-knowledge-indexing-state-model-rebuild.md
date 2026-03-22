# Knowledge Indexing End-to-End Rebuild Plan

> 状态：review draft
> 目标：把 Moryflow -> Memox -> Anyhunt -> PC -> Renderer 整条知识索引链路重建成可直接上线的生产方案。
> 前提：**不做历史兼容，不做旧语义迁移**。允许清空并重建受影响的 memory / vector / graph 数据；禁止触碰其他主业务用户数据。
> 稳定事实回写目标：`docs/reference/cloud-sync-and-memox-validation.md`、`apps/moryflow/server/src/memox/CLAUDE.md`、`apps/anyhunt/server/src/sources/CLAUDE.md`、`apps/anyhunt/server/src/memory/CLAUDE.md`

---

## 1. 最终判断

这次问题的真正根因不是某个前端判断顺序，也不是某个后端分支漏写状态，而是：

> **整条链路没有把“谁负责定义索引状态”这件事设计清楚。**

当前实现同时存在四个结构性错误：

1. `KnowledgeSource` 同时承担 identity、当前可检索结果、最近一次尝试状态三个职责。
2. Moryflow 把 revision 生命周期元数据写回 source identity，导致 aggregate 被污染。
3. Anyhunt overview 没有权威读模型，只能靠裸字段猜 pending。
4. Renderer 没有消费统一的状态语义，而是在多个组件里分别从 count 推断 UI 状态。

所以用户看到的“`Indexing 22 new files...` 一直不变”，本质上是：

- 上游 workspace content 已经发起投影
- 中游 source / revision 模型没有清晰表达结果
- 下游 overview 和 UI 又继续猜状态

这不是 patch 能解决的问题，必须按整链路重构。

---

## 2. 这次重构的硬约束

### 2.1 交互必须符合用户直觉

用户只关心三件事：

1. 文件现在能不能被搜索到
2. 系统是不是还在处理
3. 有没有文件需要他关注

因此最终界面只允许出现少量、明确、低打扰的状态，不允许暴露 source/revision/chunk/materialization 这类内部术语。

### 2.2 状态语义只能定义一次

整条链路里：

- Anyhunt 定义 source ingest 的领域状态
- Moryflow 传递和编排
- PC/Renderer 只做展示投影

不能再出现：

- Anyhunt 用库表字段猜
- Moryflow server 再翻译一次
- IPC 再拼一次
- Renderer 卡片和面板再各推一次

### 2.3 模块必须单一职责

最终必须做到：

- `WorkspaceDocument / WorkspaceContentOutbox` 负责“有哪些文档需要投影”
- `KnowledgeSource` 只负责 source aggregate
- `KnowledgeSourceRevision` 只负责一次 ingest attempt
- `Overview / file status query` 只负责读模型
- `Renderer` 只负责展示

### 2.4 不允许过度设计

这次可以重构，但不能为了“看起来完整”引入不必要的新状态表、新同步层、新双写逻辑。

约束是：

- **优先复用现有 aggregate、revision、outbox**
- **优先新增 query service，而不是新增持久化 read-model table**
- **优先新增一个清晰的 rebuild / retry 入口，而不是到处散落补偿逻辑**

### 2.5 直接按重建方案上线

既然已经明确：

- 不考虑历史兼容
- 允许清空 memory / vector / graph 域

那最终上线方案就应该是：

> **新模型上线 + 清空受影响数据 + 从 canonical workspace content 全量重建**

而不是继续修旧状态。

---

## 3. 已确认的根因证据

### 3.1 Anyhunt 把 aggregate 和 attempt 混在了一起

`apps/anyhunt/server/prisma/vector/schema.prisma`

当前 `KnowledgeSource` 同时包含：

- identity 字段
- `currentRevisionId`
- `status = ACTIVE | PROCESSING | FAILED | DELETED`

这会制造出一个从领域上就不自洽的状态：

- `status = ACTIVE`
- `currentRevisionId = null`

它既像“已可用”，又像“没有可用 revision”。

后面所有 pending / failed 的误判，都建立在这个矛盾之上。

### 3.2 Anyhunt 用 `currentRevisionId` 猜 pending

`apps/anyhunt/server/src/memory/memory-overview.service.ts`

当前统计逻辑：

- indexed：`status = ACTIVE` 且 `currentRevisionId IS NOT NULL`
- pending：`currentRevisionId IS NULL OR status = PROCESSING`
- failed：`status = FAILED`

这意味着 overview 实际上在猜：

> “没有 current revision，大概就是还在索引。”

这条假设不成立。

`currentRevisionId == null` 只表示“当前没有可检索 revision”，并不表示“正在处理中”。

### 3.3 finalize 在错误的阶段才开始写状态

`apps/anyhunt/server/src/sources/knowledge-source-revision.service.ts`

当前顺序是：

1. 读取 source / revision
2. 读取 normalized text
3. chunk
4. 若 chunk 数为 0，直接抛错
5. 之后才 `tryMarkProcessing()`
6. 再之后才在首次索引场景下 `source.markProcessing()`

因此这类错误会变成：

- 日志里有失败
- revision/source 没有 durable 结果
- overview 再把它猜成 pending

这正是当前 stuck pending 的直接形成机制。

### 3.4 Moryflow 把 revision 生命周期信息写回 source identity

`apps/moryflow/server/src/memox/memox-workspace-content-projection.service.ts`
`apps/moryflow/server/src/memox/memox-source-bridge.service.ts`

当前流程存在两个明显问题：

1. source identity 会被 `resolveSourceIdentity()` 两次
2. `metadata.content_hash` 这类 revision 生命周期数据会被写回 source identity

这说明现在的 source aggregate 已经被 attempt 级信息污染了。

一旦 source 需要依赖 `content_hash` 才能判断“是不是这次已经 materialize 完成”，说明模型已经分层失败。

### 3.5 Renderer 在多个位置重复推导 UI 状态

`apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-card.tsx`
`apps/moryflow/pc/src/renderer/workspace/components/memory/knowledge-panel.tsx`

当前现象：

- 卡片里 `pending > 0` 优先于 `failed > 0`
- 面板里也单独用 count 推导 `isIndexing / hasFailed`
- 两个组件没有共享统一 presenter

这会导致：

- 同一份 overview，在不同组件里可能被解释出不同含义
- 后端一旦投影歧义，前端会继续扩大歧义

### 3.6 Detail panel 当前没有真实的状态数据源

`knowledge-panel.tsx` 现在展示的是：

- overview count
- facts
- search results

它并没有“失败文件列表”的真实来源，因此也不具备：

- 展示失败文件
- 展示文件级原因
- 发起文件级 retry

这意味着现在的 detail panel 还不是一个真正的 status panel。

---

## 4. 目标架构：按职责重建整条链路

### 4.1 先明确谁是 canonical source

这条链路里真正的 canonical source 是：

- Moryflow `WorkspaceDocument`
- Moryflow `WorkspaceDocumentRevision`
- Moryflow `WorkspaceContentOutbox`

Anyhunt 不是 canonical 文档系统；它是：

- search / memory / graph 的 materialization 目标

因此：

- 文档存在性
- 文档当前内容
- 重试和全量重建入口

都应该回到 Moryflow 的 workspace-content 写链，而不是绕过它直接操纵 Anyhunt revision。

### 4.2 索引资格判定必须发生在 materialize 之前

引入一份共享的纯函数模块：

`IndexableTextClassifier`

职责：

- 输入原始文本
- 输出：
  - `indexable = true` + normalized text
  - 或 `indexable = false`

要求：

- 放在 `packages/*` 共享层
- 无数据库依赖
- 无网络依赖
- Moryflow 与 Anyhunt 共享同一套规则

这份 classifier 只负责一个问题：

> 当前文本是否值得 materialize 成检索源。

#### materialize 顺序必须改成

1. Moryflow 读取 workspace content
2. 调用 `IndexableTextClassifier`
3. 再决定：
   - `indexable = false` 且 source 不存在：`no-op`
   - `indexable = false` 且 source 已存在：`delete source`
   - `indexable = true`：继续 source / revision 生命周期

这一步的意义是：

- 空文档、纯空白、无可检索文本的内容，不再制造“灰色 source”
- “没有可索引文本”不再被错误地当成 processing failure

#### 额外不变量

一旦 classifier 判定 `indexable = true`，Anyhunt 在 finalize 阶段就不应该再出现“0 retrievable chunk”。

如果还出现：

- 说明是 Anyhunt 内部实现违背不变量
- 必须落到 durable failed revision
- 视为真实 ingest failure，而不是安静忽略

### 4.3 `KnowledgeSource` 回到 aggregate，本身不再做状态机

目标模型：

```text
KnowledgeSource
- id
- apiKeyId
- sourceType
- externalId
- identity metadata (title / displayPath / mimeType / scope)
- currentRevisionId
- latestRevisionId
- status = ACTIVE | DELETED
```

关键约束：

- 删除 `PROCESSING`
- 删除 `FAILED`
- 删除 source-level lifecycle metadata
  - `metadata.content_hash`
  - `metadata.storage_revision`
  - 其他 revision attempt 派生信息

`KnowledgeSource` 只表达：

1. 这个知识源 identity 是否存在
2. 当前哪一个 revision 可检索
3. 最近一次尝试是哪一个 revision
4. 这个 source 是否被删除

它不再负责表达：

- 现在是不是处理中
- 最近一次是不是失败

这些全部属于 revision attempt。

### 4.4 `KnowledgeSourceRevision` 负责 ingest 生命周期

`KnowledgeSourceRevision` 保留 attempt 状态机：

- `PENDING_UPLOAD`
- `READY_TO_FINALIZE`
- `PROCESSING`
- `INDEXED`
- `FAILED`
- `DELETED`

硬规则：

> 只要 revision 已经被正式受理并开始处理，就必须 durable 结束于 `INDEXED` 或 `FAILED`。

允许不改状态的只有真正的前置拒绝：

- 幂等冲突
- 锁冲突
- 非法状态迁移
- 资源不存在

不允许再被当成“前置拒绝”的情况：

- embedding 失败
- chunk replace 失败
- 存储失败
- guardrail 超限
- classifier / chunking 不变量被破坏

这些都必须写回 revision 结果。

### 4.5 Read model 用 query service，不新建持久化状态表

这次不引入新的持久化投影表。

新增一个查询层服务即可：

`SourceIngestReadService`

职责：

- 读取 `KnowledgeSource.currentRevisionId`
- 读取 `KnowledgeSource.latestRevisionId`
- 读取 latest revision status / error
- 产出唯一的 source ingest 读模型

示例语义：

```text
SourceIngestState
- READY
- INDEXING
- NEEDS_ATTENTION
```

读模型规则：

1. `latestRevisionId is null`
   - source 不计入 indexing / attention
   - 若 source 不存在，则根本不进入知识源统计

2. `latest revision in PENDING_UPLOAD | READY_TO_FINALIZE | PROCESSING`
   - `INDEXING`

3. `latest revision = FAILED`
   - `NEEDS_ATTENTION`

4. `latest revision = INDEXED` 且 `currentRevisionId = latestRevisionId`
   - `READY`

5. `currentRevisionId` 指向旧 revision，`latest revision` 正在处理
   - `INDEXING`
   - 语义是“旧版本仍可检索，新版本正在替换”

6. `currentRevisionId` 指向旧 revision，`latest revision = FAILED`
   - `NEEDS_ATTENTION`
   - 语义是“旧版本仍可检索，但最新改动没有成功 materialize”

重点：

- overview 不再猜
- source detail panel 不再猜
- 只允许 `SourceIngestReadService` 解释 ingest 读语义

### 4.6 Anyhunt 对上游暴露的是读模型，不是裸表猜测结果

Anyhunt 的 overview DTO 需要改成面向语义的字段，而不是面向旧库表实现：

```text
indexing
- sourceCount            // 当前可索引知识源总数
- indexedSourceCount
- indexingSourceCount
- attentionSourceCount
- lastCompletedAt
```

约束：

- `sourceCount` 明确表示“knowledge sources total”，不是“workspace total files”
- 不再出现 `pendingSourceCount`
- 不再出现 `failedSourceCount`

因为：

- `pending` 是实现术语
- `failed` 对用户来说并不总是正确语义
- `indexing / attention` 才是用户真正关心的状态

### 4.7 Moryflow server / IPC 只做传递和编排，不再二次发明状态

目标分层：

- Anyhunt：输出 canonical ingest read model
- Moryflow server `MemoryService`：透传并做 workspace scope 适配
- PC IPC：补充本地 workspace/sync 信息
- Renderer：只消费统一 presenter

禁止继续在以下层做语义重定义：

- `apps/moryflow/server/src/memory/memory.service.ts`
- `apps/moryflow/pc/src/main/app/ipc/memory-domain/*`
- `apps/moryflow/pc/src/shared/ipc/memory.ts`

这些层可以：

- 改 DTO
- 改字段命名
- 改 transport shape

但不能各自再重新定义什么叫“indexing / failed / ready”。

### 4.8 Renderer 只保留一个 presenter

新增共享 presenter：

`deriveKnowledgeSummary()`

职责：

- 输入统一的 overview DTO
- 输出 UI 需要的 summary state

```text
KnowledgeSummaryState
- SCANNING
- NEEDS_ATTENTION
- INDEXING
- READY
```

约束：

- `knowledge-card.tsx` 与 `knowledge-panel.tsx` 必须共享这一个 presenter
- failure / attention 必须高于 indexing
- renderer 组件禁止再直接读原始 count 做状态判断

这样可以保证：

- 同一份数据在所有入口表现一致
- UI 逻辑收敛到一个地方

### 4.9 Detail panel 必须使用专用状态接口，而不是 search 结果

当前 detail panel 的数据源设计不对。

最终需要一个专用状态查询：

```text
GET knowledge sources
- filter: attention | indexing | ready
- returns:
  - documentId
  - title
  - path
  - state
  - userFacingReason
  - lastAttemptAt
  - canRetry
```

它的职责是：

- 支撑 detail panel 的失败/处理中列表
- 支撑单文件 retry / 批量 retry

它不应该复用：

- full-text search results
- facts list

因为这两类数据都不是状态数据源。

### 4.10 Retry 和全量重建必须回到 canonical write path

最终必须只有一条正式写链：

> `WorkspaceDocument/Revision -> WorkspaceContentOutbox -> Memox consumer -> Anyhunt`

因此：

- `Retry`
- `Retry all failed`
- 上线后的全量重建

都必须通过 Moryflow 的 workspace-content canonical path 触发。

禁止：

- 前端直接触发 Anyhunt revision finalize
- 直接在桌面端拼 Anyhunt source/revision 调用
- 用 search/read API 做补偿写入

推荐最小化实现：

1. Moryflow server 提供 document-scoped re-enqueue
2. Moryflow server 提供 workspace-scoped rebuild enqueue
3. 这两个入口都只负责把 canonical 文档快照重新写入 `WorkspaceContentOutbox`

这样：

- retry 和 rebuild 复用同一条正式链路
- 没有第二套写路径
- 责任清晰

---

## 5. 最终的 UI 交互要求

### 5.1 卡片只保留四个状态

Knowledge 卡片只允许出现：

1. `Scanning`
2. `Needs attention`
3. `Indexing`
4. `Ready`

优先级固定：

1. `Scanning`
2. `Needs attention`
3. `Indexing`
4. `Ready`

原因：

- 真正失败或需要处理时，必须优先暴露问题
- 不能再被“仍有别的文件在跑”遮掉

### 5.2 文案必须直接，不暴露内部概念

允许的文案风格：

- `3 files need attention`
- `Indexing 12 files...`
- `48 files indexed`

不允许的文案风格：

- `3 revisions failed`
- `Materialization pending`
- `Chunks unavailable`

### 5.3 panel 只提供必要动作

detail panel 只需要：

- attention 文件列表
- indexing 文件列表
- 每个文件一条简短原因
- `Retry`
- `Retry all failed`

不引入：

- 新工作流页
- 复杂筛选器
- 额外诊断面板
- 术语解释层

### 5.4 “没有可索引文本”固定定义为 quiet skip

这次直接定死，不再保留产品裁量空间：

- 首次 materialize 遇到 `no indexable text`
  - 不创建 source
  - 不计入 knowledge source total
  - 不展示 attention

- 已存在 source 的文档变成 `no indexable text`
  - 删除既有 source materialization
  - 从搜索结果中移除
  - 不展示 attention

原因：

- 这不是运行时失败，而是确定性的“当前内容不值得进入知识索引”
- 用户不应该因为空白文档、纯占位文档而看到红色错误态

唯一底线仍然是：

> 它绝不能继续表现成长期 indexing。

---

## 6. 必须删除的旧做法

这次不是“加一层兼容”，而是明确删掉旧模型。

必须删除：

1. `KnowledgeSource.status = PROCESSING | FAILED`
2. `MemoryOverviewService` 用 `currentRevisionId == null` 猜 pending
3. source identity 上的 revision lifecycle metadata
4. `resolveSourceIdentity -> finalize -> resolveSourceIdentity(materialize)` 的双 resolve 流程
5. renderer 组件各自推导状态
6. detail panel 复用 search results 充当状态列表

这些做法只要还在，旧问题还会以别的形式回来。

---

## 7. 上线方案：直接 reset 并从 canonical content 重建

### 7.1 清空范围

只清 Memox / vector / graph 派生数据，不清主业务用户数据。

建议清空：

- `MemoryFact`
- `MemoryFactHistory`
- `MemoryFactFeedback`
- `MemoryFactExport`
- `KnowledgeSource`
- `KnowledgeSourceRevision`
- `SourceChunk`
- `GraphObservation`
- `GraphRelation`
- `GraphEntity`
- `GraphScope`
- `GraphProjectionRun`

如确认 `ScopeRegistry` 仅服务于 memory/graph 派生语义，可一并清理；否则保留。

同时清理对应对象存储中的：

- normalized text blobs
- source upload blobs
- graph/export 派生对象

### 7.2 不清的范围

禁止清理：

- `Workspace`
- `WorkspaceDocument`
- `WorkspaceDocumentRevision`
- 其他主业务用户数据

因为这些才是这次 rebuild 的 canonical 输入。

### 7.3 正确的上线顺序

1. 部署新 schema 与新代码
2. 暂停 Memox ingest / graph worker
3. 清空 Anyhunt memory / vector / graph 派生数据
4. 清理对应 object storage 派生对象
5. 由 Moryflow server 从当前 active `WorkspaceDocument` 集合发起一次全量 rebuild enqueue
6. 恢复 worker
7. 等待 outbox drain
8. 验证 overview、detail panel、search、graph、retry

### 7.4 为什么必须从 Moryflow 发起 rebuild

因为真正的 canonical input 在 Moryflow，不在 Anyhunt。

这意味着重建不能依赖：

- 桌面客户端是否在线
- 老的 Anyhunt source rows 是否可信
- 当前 outbox 是否刚好留着所有历史事件

最终上线必须有一个明确、可重复的入口：

> 基于当前 active workspace documents，重新生成完整 projection 输入。

这才是可上市的重建方案。

---

## 8. 验收标准

### 8.1 状态正确性

1. 任意文件首次索引失败后，不能继续计入 indexing
2. 任意文件更新失败后，旧版本是否保留可检索，必须由模型明确决定并在 UI 上正确表达
3. overview 不允许再从裸字段猜 pending
4. Anyhunt 输出的 ingest read model 必须是全链路唯一语义源
5. `no indexable text` 必须稳定走 quiet skip / delete，不得进入 attention 或 fake indexing

### 8.2 用户体验

1. 用户能一眼区分“还在处理”和“需要处理”
2. 失败优先级高于 indexing
3. detail panel 能看到真实的 attention 文件，而不是搜索结果替身
4. 不出现“界面还在 indexing，后台其实已经失败”的情况

### 8.3 模块边界

1. eligibility classifier 只有一份实现
2. source aggregate 不再存 revision lifecycle metadata
3. revision 生命周期只在 Anyhunt revision service
4. workspace summary presenter 只有一份实现
5. retry / rebuild 只走 canonical workspace-content 写链

### 8.4 上线稳定性

1. reset 后能从 canonical workspace documents 完整重建搜索与图谱
2. object storage 不留下旧 orphan 派生对象
3. outbox drain 后 overview 与实际 source/revision 数据一致
4. 任何失败都不会再制造假 indexing

---

## 9. 最终建议

最终应把这次工作定义为：

> **一次“workspace-content 到 knowledge source”的整链路职责重构，而不是一次 stuck pending 修复。**

最小且正确的落地路线是：

1. **前置 eligibility**
   用共享 classifier 决定是否值得 materialize。

2. **收紧 aggregate**
   `KnowledgeSource` 只保留 identity + current/latest revision pointer。

3. **收紧 attempt**
   `KnowledgeSourceRevision` 负责全部 ingest terminal result。

4. **统一 read model**
   Anyhunt 只输出 canonical ingest state，Moryflow/PC/Renderer 不再各自猜。

5. **统一写路径**
   retry 与 rebuild 全部回到 `WorkspaceContentOutbox`。

6. **直接 reset rebuild**
   不修旧语义，不迁移旧状态，直接从 canonical documents 重建。

如果按这套方案执行，做完之后：

- 界面状态会符合用户直觉
- 整条链路职责清晰，不会再互相污染
- retry / rebuild 有唯一正式入口
- 上线不会继续拖着旧的错误状态模型前进

---

## 10. 下一步

如果你认可这版方向，下一步我会把它收敛成正式 implementation plan，只保留三类内容：

1. schema / service / DTO / UI 的实际改动清单
2. reset 与 rebuild 的执行步骤
3. 上线前必须跑完的验证矩阵

那一版将直接面向实施，不再继续讨论概念层方案。
