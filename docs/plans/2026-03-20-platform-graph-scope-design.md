# 平台级 Graph Scope 冻结方案

## 1. 结论

本方案是 Anyhunt / Moryflow 共用 graph 能力的冻结版本。

执行原则：

- 不考虑历史兼容
- 不修补旧 canonical graph
- 不保留 source direct graph projection
- 不保留 `graphEnabled` 这类缺少隔离语义的旧布尔开关
- 直接把 graph 重构成“按知识空间隔离”的正式平台能力

冻结决定：

1. graph 的唯一隔离边界是 `project_id`
2. graph 的内部唯一归并边界是 `graphScopeId`
3. 所有 graph 读写都必须先 resolve `graphScopeId`
4. graph canonical merge 不再允许只按 `apiKeyId` 归并
5. source graph 写链只保留 `source -> SOURCE_DERIVED memory facts -> graph`
6. 旧 graph 数据直接废弃并全量重建

---

## 2. 当前根因

当前 graph 不能上线，不是因为抽取能力不够，而是因为隔离模型天然错误。

### 2.1 当前错误模型

- `GraphEntity` 当前按 `(apiKeyId, entityType, canonicalName)` 归并
- `GraphRelation` 隐式依赖同一个 `apiKeyId` 下的 canonical entity
- `GraphQueryService` 虽然会按 scope 过滤 observation，但 canonical entity / relation 早已在更上游跨 scope 合并
- `SourceMemoryProjectionService` 产出的 `SOURCE_DERIVED` memory fact 仍会进入 graph
- Moryflow 又固定采用“每环境一个服务 API Key”，因此 `apiKeyId` 不是用户边界，也不是 workspace/vault 边界

### 2.2 实际后果

1. 同一环境下不同用户、不同 vault 的 aliases / relations 可能被错误合并
2. graph query/detail 即使带 scope，也可能返回已被污染的 canonical aliases
3. Moryflow 只能靠“默认关闭 graph”规避风险，而不是因为 graph 设计正确
4. source 文档当前存在两条 graph 写链，导致重复抽取和重复 evidence：
   - `source revision -> graph`
   - `source -> SOURCE_DERIVED memory facts -> graph`

结论：必须重构 graph 的隔离模型和写入拓扑，不能继续打补丁。

---

## 3. 冻结后的正式模型

### 3.1 对外合同

graph 的正式公共隔离字段只有一个：`project_id`。

冻结规则：

- 所有 graph 能力都要求 `project_id`
- 不引入 `graph_scope_key`
- 不支持无 `project_id` 的 graph query / detail / overview / graph context
- 不支持跨 `project_id` 的 graph merge
- `user_id / agent_id / app_id / run_id / org_id / metadata` 继续是 retrieval / memory 的过滤字段，但不再参与 graph canonical 隔离

原因：

- Moryflow 中 `project_id = vaultId`
- Anyhunt 现有统一 scope 模型中，`project_id` 已经是最稳定的知识空间标识
- 再引入第二个 graph 外部隔离字段只会制造双轨和历史包袱

### 3.2 内部模型

新增内部资源：`GraphScope`

职责：

- 表达一个 graph 知识空间
- 承载 graph 的生命周期、状态和 rebuild 运营信息
- 为 `GraphEntity / GraphRelation / GraphObservation` 提供唯一归并边界

冻结规则：

- 一个 `GraphScope` 严格对应一个 `(apiKeyId, projectId)`
- 所有 graph 数据必须挂到 `graphScopeId`
- `graphScopeId` 是 graph 内部唯一隔离键
- graph child table 不再重复存 `projectId`

---

## 4. 冻结数据模型

### 4.1 GraphScope

```prisma
model GraphScope {
  id                String   @id @default(uuid())
  apiKeyId          String
  projectId         String
  status            String   @default("ACTIVE")
  projectionStatus  String   @default("IDLE")
  lastProjectedAt   DateTime?
  lastErrorCode     String?
  lastErrorMessage  String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  entities          GraphEntity[]
  relations         GraphRelation[]
  observations      GraphObservation[]
  projectionRuns    GraphProjectionRun[]

  @@unique([apiKeyId, projectId])
  @@index([apiKeyId, status])
  @@index([apiKeyId, projectionStatus])
}
```

### 4.2 GraphEntity

```prisma
model GraphEntity {
  id            String   @id @default(uuid())
  graphScopeId  String
  entityType    String
  canonicalName String
  aliases       String[] @default([])
  metadata      Json?
  lastSeenAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  graphScope         GraphScope      @relation(fields: [graphScopeId], references: [id], onDelete: Cascade)
  outgoingRelations  GraphRelation[] @relation("GraphRelationFrom")
  incomingRelations  GraphRelation[] @relation("GraphRelationTo")
  observations       GraphObservation[]

  @@unique([graphScopeId, entityType, canonicalName])
  @@index([graphScopeId, entityType])
  @@index([graphScopeId, lastSeenAt])
}
```

### 4.3 GraphRelation

```prisma
model GraphRelation {
  id           String   @id @default(uuid())
  graphScopeId String
  fromEntityId String
  toEntityId   String
  relationType String
  confidence   Float
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  graphScope   GraphScope      @relation(fields: [graphScopeId], references: [id], onDelete: Cascade)
  fromEntity   GraphEntity     @relation("GraphRelationFrom", fields: [fromEntityId], references: [id], onDelete: Cascade)
  toEntity     GraphEntity     @relation("GraphRelationTo", fields: [toEntityId], references: [id], onDelete: Cascade)
  observations GraphObservation[]

  @@unique([graphScopeId, fromEntityId, toEntityId, relationType])
  @@index([graphScopeId, relationType])
}
```

### 4.4 GraphObservation

```prisma
model GraphObservation {
  id                 String   @id @default(uuid())
  graphScopeId       String
  graphEntityId      String?
  graphRelationId    String?
  evidenceSourceId   String?
  evidenceRevisionId String?
  evidenceChunkId    String?
  evidenceMemoryId   String?
  observationType    String
  payload            Json
  confidence         Float?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  graphScope    GraphScope      @relation(fields: [graphScopeId], references: [id], onDelete: Cascade)
  graphEntity   GraphEntity?    @relation(fields: [graphEntityId], references: [id], onDelete: Cascade)
  graphRelation GraphRelation?  @relation(fields: [graphRelationId], references: [id], onDelete: Cascade)

  @@index([graphScopeId, graphEntityId])
  @@index([graphScopeId, graphRelationId])
  @@index([graphScopeId, evidenceSourceId])
  @@index([graphScopeId, evidenceRevisionId])
  @@index([graphScopeId, evidenceChunkId])
  @@index([graphScopeId, evidenceMemoryId])
  @@index([graphScopeId, observationType])
}
```

### 4.5 GraphProjectionRun

```prisma
model GraphProjectionRun {
  id               String   @id @default(uuid())
  graphScopeId     String
  kind             String
  status           String
  totalItems       Int      @default(0)
  processedItems   Int      @default(0)
  failedItems      Int      @default(0)
  lastErrorCode    String?
  lastErrorMessage String?
  startedAt        DateTime @default(now())
  finishedAt       DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  graphScope       GraphScope @relation(fields: [graphScopeId], references: [id], onDelete: Cascade)

  @@index([graphScopeId, status])
  @@index([graphScopeId, startedAt])
}
```

设计说明：

- `GraphEntity / GraphRelation / GraphObservation` 不再冗余存 `apiKeyId`
- `apiKeyId` 由 `GraphScope` 唯一承载
- graph 的运营状态不再从 observation 数量猜测，而是通过 `GraphScope + GraphProjectionRun` 明确建模

---

## 5. 冻结写链

### 5.1 删除 source direct graph projection

冻结决定：

- 删除 `project_source_revision`
- 删除 `cleanup_source`
- 删除 `MEMOX_SOURCE_GRAPH_PROJECTION_ENABLED`
- 删除 `GraphProjectionService.projectSourceRevision()`
- 删除 `KnowledgeSourceRevisionService.enqueueSourceGraphProjection()`
- 删除所有“source revision 直接投影 graph”的 queue/config/test/doc

graph 只保留一个 producer：

`MemoryFact`

### 5.2 唯一 graph 写链

```text
KnowledgeSourceRevision.finalize
  -> SourceMemoryProjectionService
  -> SOURCE_DERIVED MemoryFact
  -> GraphProjectionService.projectMemoryFact
  -> GraphEntity / GraphRelation / GraphObservation
```

### 5.3 MemoryFact 合同重构

删除 `graphEnabled: boolean`。

新增字段：

```prisma
graphScopeId       String?
graphProjectionState String @default("DISABLED")
graphProjectionErrorCode String?
```

冻结语义：

- `graphScopeId != null` 才表示该 memory fact 参与 graph
- `graphProjectionState` 枚举固定为：
  - `DISABLED`
  - `PENDING`
  - `READY`
  - `FAILED`

禁止继续使用“graphEnabled=true 但没有 scope”的中间状态。

### 5.4 scope 解析规则

#### manual memory

- 请求若 `include_in_graph = true`
- 必须同时提供 `project_id`
- 服务端必须 resolve / materialize 对应 `GraphScope`
- 成功后把 `graphScopeId` 写进 MemoryFact，并投递 graph projection
- 若缺少 `project_id`，直接返回 `422 GRAPH_SCOPE_REQUIRED`

#### source-derived memory

- 从 `KnowledgeSource.projectId` 解析 `GraphScope`
- 若 `projectId` 为空，则 source-derived memory fact 不参与 graph，直接写 `graphScopeId = null`
- source indexing 不能因为 graph 缺失失败，但 graph 不得进入半启用状态

#### memory update

- `include_in_graph = false`：清空 `graphScopeId`，并 cleanup 原 graph observation
- `include_in_graph = true`：重新按 `project_id` resolve `GraphScope`
- 不允许把一个 memory fact 从 A scope 直接迁移到 B scope；必须 cleanup 后重建

---

## 6. 冻结查询链

### 6.1 Graph query / detail / overview

所有 graph 读接口都必须先 resolve `GraphScope`。

冻结规则：

- 请求没有 `project_id`：直接 `422 GRAPH_SCOPE_REQUIRED`
- `(apiKeyId, projectId)` 找不到 `GraphScope`：
  - query/detail 返回空结果或 `404`
  - overview 返回 `disabled`
- 所有 `GraphEntity / GraphRelation / GraphObservation` 查询必须强制带 `graphScopeId`

删除当前“先查 canonical entity，再按 observation 做 scope 兜底”的逻辑。

### 6.2 Retrieval graph context

`include_graph_context = true` 时：

- 必须存在 `project_id`
- retrieval 先 resolve `GraphScope`
- graph context 只从该 `graphScopeId` 下读取
- 没有 `project_id` 直接 `422 GRAPH_SCOPE_REQUIRED`

冻结决定：

- graph context 不再是 loosely filtered 的附加信息
- graph context 是严格 project-scoped 的正式读模型

### 6.3 Graph overview 状态

状态扩展为：

- `disabled`
- `idle`
- `building`
- `ready`
- `failed`

冻结语义：

- `disabled`：该 project 不支持 graph，或还未 materialize `GraphScope`
- `idle`：graph 已启用，但当前没有任何 graph-enabled memory fact
- `building`：存在进行中的 graph projection / rebuild run
- `ready`：最近一次 projection 成功，且已有 observation
- `failed`：最近一次 run 失败

删除当前基于 `indexedSourceCount / derivedCount / observationCount` 推测状态的实现。

---

## 7. Moryflow 冻结接入方式

### 7.1 graph scope 映射

- `Moryflow workspace/vault -> project_id`
- `Moryflow project_id -> GraphScope`
- Moryflow 不增加第二套 graph scope 概念

### 7.2 gateway 约束

- `MemoryService.search()` 只有在 workspace 已绑定 `project_id` 时才允许 `includeGraphContext=true`
- `overview / graph query / graph detail` 全部强制按当前 workspace 的 `project_id` 路由
- chat session 绑定 workspace 时，graph context 也必须沿用同一个 workspace

### 7.3 UI 约束

- Connections 不再根据“entityCount 是否为 0”推断 graph 状态
- UI 只认 `disabled / idle / building / ready / failed`
- `disabled` 时显示明确不可用态，不显示“还在构建”

---

## 8. 迁移与 cutover

### 8.1 冻结原则

- 不迁移旧 graph entity / relation / observation
- 不保留旧 graph ID
- 不对旧 canonical graph 做 scope 修补
- 直接废弃旧 graph 数据集

### 8.2 执行顺序

1. 部署新 schema
2. 上线新的 `GraphScope` resolver 与新的 memory fact graph 字段
3. 删掉 source direct graph projection 写链
4. 停止旧 graph consumer
5. 清空旧 `GraphEntity / GraphRelation / GraphObservation`
6. 扫描所有 active project，materialize `GraphScope`
7. 运行 `graph rebuild from memory facts`
8. backlog 清零并验证通过后，再开放 graph query / overview / retrieval graph context

### 8.3 rebuild 唯一事实源

graph rebuild 只从 `MemoryFact` 重放，不从 source revision 原文重放。

原因：

- `MemoryFact` 已经冻结了 scope、origin、生命周期和 provenance
- 从 source 原文重放会重新引入双写链和重复抽取问题

### 8.4 rebuild 单位

rebuild 的运营单位固定为 `GraphScope`。

后台 job：

- `graph-scope-rebuild`
- 参数：`graphScopeId`
- 行为：
  - 删除该 scope 下现有 graph 数据
  - 扫描所有 `graphScopeId = 当前 scope` 的 active memory facts
  - 重建 entity / relation / observation
  - 写入 `GraphProjectionRun`
  - 更新 `GraphScope.projectionStatus`

---

## 9. 必须删除的历史包袱

以下内容必须在本次重构中删除，不能保留：

- `MEMOX_SOURCE_GRAPH_PROJECTION_ENABLED`
- source direct graph projection queue / processor / service path
- `graphEnabled`
- 旧的 `apiKeyId` 级 graph canonical unique key
- query 中 observation 级 scope 兜底过滤
- 基于 source / derived count 推断 graph status 的 overview 实现
- “graph 默认关闭，等以后隔离再说”的产品状态

---

## 10. 验证标准

### 10.1 隔离正确性

必须通过：

1. 同一 `apiKeyId` 下两个不同 `project_id`，同名 entity 不共享 aliases
2. 同一 `apiKeyId` 下两个不同 `project_id`，relation 不共享
3. Moryflow 同一用户两个 vault，graph 完全隔离
4. manual memory 与 source-derived memory 在同一 `project_id` 内可以汇总到同一 graph
5. source delete / memory delete 能完整清理本 scope graph evidence

### 10.2 查询正确性

必须通过：

1. graph query 缺少 `project_id` 直接报错
2. retrieval `include_graph_context=true` 缺少 `project_id` 直接报错
3. detail/query/overview 都只返回单一 scope 数据

### 10.3 运营可观测性

必须可以按 `project_id / graphScopeId` 查看：

- 当前 graph status
- 最近一次 projection run
- processed / failed / total
- lastProjectedAt
- lastError

### 10.4 必补测试

- `GraphScopeResolver` 单测
- `GraphProjectionService` scope-aware canonical merge 单测
- `GraphProjectionService` cleanup 单测
- `GraphQueryService` project hard-scope 单测
- `GraphOverviewService` disabled/building/ready/failed 单测
- `SourceMemoryProjectionService` source-derived memory fact graphScope materialization 单测
- Moryflow gateway `includeGraphContext` project-required 单测
- Moryflow workspace graph overview / detail / query 单测

---

## 11. 最终实施结论

本次 graph 上线的根治方案不是“重新打开开关”，而是完成下面 6 件事：

1. 引入 `GraphScope`
2. graph 数据统一按 `graphScopeId` 存储和归并
3. 删除 source direct graph projection
4. 删除 `graphEnabled`，改成 `graphScopeId + graphProjectionState`
5. query / overview / retrieval graph context 全部强制 `project_id`
6. 旧 graph 数据直接清空并按 memory facts rebuild

这 6 件事做完后，graph 才算从实验性增强功能，升级成 Anyhunt / Moryflow 共用的正式平台能力。

---

## 12. Implementation Plan

执行原则：

- 直接按冻结方案重构，不做兼容层
- 先改数据模型和平台 contract，再改写链和读链
- 旧 graph 路径边改边删，不保留“双轨”
- 每完成一个阶段就跑对应最小验证，最后再跑整体验证

### Task 1：重构 Prisma 数据模型与基础 contract

**Status**

- Completed

**目标**

- 引入 `GraphScope` 和 `GraphProjectionRun`
- 给 `MemoryFact` 增加 `graphScopeId` 与 `graphProjectionState`
- 删除 `graphEnabled`
- 让 graph child table 全部依赖 `graphScopeId`

**Files**

- Modify: `apps/anyhunt/server/prisma/vector/schema.prisma`
- Modify: `apps/anyhunt/server/src/graph/dto/graph.schema.ts`
- Modify: `apps/anyhunt/server/src/memory/dto/*`
- Modify: `apps/moryflow/server/src/memory/dto/memory.dto.ts`

**Implementation**

1. 在 Prisma schema 中新增 `GraphScope`、`GraphProjectionRun`
2. 把 `GraphEntity / GraphRelation / GraphObservation` 切到 `graphScopeId`
3. 从 `MemoryFact` 删除 `graphEnabled`
4. 在 `MemoryFact` 新增：
   - `graphScopeId String?`
   - `graphProjectionState String @default("DISABLED")`
   - `graphProjectionErrorCode String?`
5. 更新 graph DTO：
   - `GraphOverviewResponseSchema.projection_status` 扩展为 `disabled | idle | building | ready | failed`
   - graph query / detail / overview 的 scope 中把 `project_id` 变成必填
6. 更新 Moryflow DTO：
   - `includeGraphContext=true` 时必须有 `workspaceId -> project_id`

**Verification**

- Run: `pnpm --filter @anyhunt/anyhunt-server exec prisma format`
- Run: `pnpm --filter @anyhunt/anyhunt-server exec prisma generate`
- Run: `pnpm --filter @anyhunt/anyhunt-server run typecheck`
- Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/graph/__tests__/graph.schema.spec.ts src/graph/__tests__/graph-query.service.spec.ts src/graph/__tests__/graph-projection.service.spec.ts src/graph/__tests__/graph-overview.service.spec.ts src/graph/utils/graph-scope-query.utils.spec.ts src/memory/__tests__/memory.schema.spec.ts src/memory/__tests__/memory-overview.service.spec.ts src/memory/__tests__/memory.service.spec.ts src/memory/__tests__/source-memory-projection.service.spec.ts`
- Run: `pnpm --filter @moryflow/server exec vitest run src/memory/memory.dto.spec.ts`

**Current State**

- `prisma/vector/schema.prisma` 已引入 `GraphScope` 与 `GraphProjectionRun`
- `MemoryFact` 已切到 `graphScopeId + graphProjectionState + graphProjectionErrorCode`
- `GraphEntity / GraphRelation / GraphObservation` 已切到 `graphScopeId`
- graph / memory / Moryflow DTO 已统一到 `project_id` hard-required + 五态 projection status
- Anyhunt server `typecheck` 已通过
- 上述 graph / memory / DTO 最小回归测试已通过

### Task 2：新增 GraphScope 解析与能力策略层

**Status**

- Completed

**目标**

- 所有 graph 读写都共享同一套 `GraphScope` 解析逻辑
- 缺少 `project_id` 时 fail closed

**Files**

- Create: `apps/anyhunt/server/src/graph/graph-scope.service.ts`
- Create: `apps/anyhunt/server/src/graph/graph-scope.types.ts`
- Modify: `apps/anyhunt/server/src/graph/graph.module.ts`
- Modify: `apps/anyhunt/server/src/sources/source-processing.errors.ts`
- Test: `apps/anyhunt/server/src/graph/__tests__/graph-scope.service.spec.ts`

**Implementation**

1. 新建 `GraphScopeService`，提供：
   - `requireScope(apiKeyId, projectId)`
   - `getScope(apiKeyId, projectId)`
   - `ensureScope(apiKeyId, projectId)`
2. 统一定义 graph 相关错误码：
   - `GRAPH_SCOPE_REQUIRED`
   - `GRAPH_SCOPE_NOT_FOUND`
3. 删除所有基于“scope 过滤 observation 即可”的旧假设
4. 明确：graph 能力的公开前提就是 `project_id`

**Verification**

- Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/graph/__tests__/graph-scope.service.spec.ts`
- Run: `pnpm --filter @anyhunt/anyhunt-server run typecheck`

**Current State**

- `GraphScopeService` 已统一提供 `getScope / requireScope / ensureScope`
- `graph-scope.types.ts` 已集中定义 `GRAPH_SCOPE_REQUIRED / GRAPH_SCOPE_NOT_FOUND`
- graph scope 缺参和 scope miss 已统一为 typed error，不再散落字符串常量
- `GraphModule` / `MemoryModule` 已接入同一套 scope resolver
- `graph-scope.service.spec.ts` 已通过

### Task 3：重构 Memory 写链，删除 graphEnabled 语义

**Status**

- Completed

**目标**

- manual memory 和 source-derived memory 都改成 `graphScopeId + graphProjectionState`
- source-derived memory 从 source.projectId materialize graph scope

**Files**

- Modify: `apps/anyhunt/server/src/memory/memory.service.ts`
- Modify: `apps/anyhunt/server/src/memory/memory.repository.ts`
- Modify: `apps/anyhunt/server/src/memory/source-memory-projection.service.ts`
- Modify: `apps/anyhunt/server/src/memory/source-memory-projection.types.ts`
- Test: `apps/anyhunt/server/src/memory/__tests__/source-memory-projection.service.spec.ts`
- Test: `apps/anyhunt/server/src/memory/__tests__/*`

**Implementation**

1. manual memory create/update：
   - `include_in_graph=true` 时必须先 resolve `GraphScope`
   - 成功后写入 `graphScopeId`，状态置为 `PENDING`
   - 未启用 graph 时写 `DISABLED`
2. source-derived memory：
   - 从 `KnowledgeSource.projectId` resolve `GraphScope`
   - 成功则写入 `graphScopeId`
   - 无 `projectId` 时保持 `DISABLED`
3. 删除所有 `graphEnabled` 分支逻辑
4. Memory update 若取消 graph：
   - 清空 `graphScopeId`
   - 投递 cleanup-memory-fact

**Verification**

- Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/memory/__tests__/source-memory-projection.service.spec.ts`

**Current State**

- `MemoryService` create/update/batchUpdate 已统一走 `graphScopeId + graphProjectionState`
- manual memory 已改为 `include_in_graph` 控制 graph 写入，不再保留 `graphEnabled`
- `MemoryRepository` 已切到新的 graph 字段集合
- `SourceMemoryProjectionService` 已从 `KnowledgeSource.projectId` materialize `GraphScope`
- source-derived memory 在无 `projectId` 时会显式落到 `DISABLED`

### Task 4：收敛 graph 写链，只保留 MemoryFact -> GraphProjection

**Status**

- Completed

**目标**

- 删除 source direct graph projection
- 让 `GraphProjectionService` 只处理 memory fact 路径

**Files**

- Modify: `apps/anyhunt/server/src/graph/graph-projection.service.ts`
- Modify: `apps/anyhunt/server/src/graph/graph.processor.ts`
- Modify: `apps/anyhunt/server/src/queue/queue.constants.ts`
- Modify: `apps/anyhunt/server/src/sources/knowledge-source-revision.service.ts`
- Modify: `apps/anyhunt/server/src/memox-platform/memox-platform.service.ts`
- Modify: `apps/anyhunt/server/src/graph/graph.module.ts`
- Test: `apps/anyhunt/server/src/graph/__tests__/graph-projection.service.spec.ts`

**Implementation**

1. 删除 queue kind：
   - `project_source_revision`
   - `cleanup_source`
2. 删除：
   - `GraphProjectionService.projectSourceRevision()`
   - `cleanupSourceEvidence()`
   - `KnowledgeSourceRevisionService.enqueueSourceGraphProjection()`
   - `MEMOX_SOURCE_GRAPH_PROJECTION_ENABLED`
3. `GraphProjectionService.projectMemoryFact()` 改为：
   - 读取 `memory.graphScopeId`
   - 所有 canonical merge 按 `graphScopeId`
   - observation 必须同时保留 `evidenceMemoryId / evidenceSourceId / evidenceRevisionId`
4. cleanup 也统一按 memory fact provenance 清理

**Verification**

- Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/graph/__tests__/graph-projection.service.spec.ts`
- Run: `pnpm --filter @anyhunt/anyhunt-server run typecheck`

**Current State**

- `GraphProjectionService` 已只保留 `project_memory_fact / cleanup_memory_fact`
- source direct graph projection queue kind 和 service path 已从生产代码移除
- `KnowledgeSourceRevisionService` 已不再持有 graph queue 依赖
- `KnowledgeSourceDeletionService` 已只做 memory-based graph cleanup
- source direct graph 的死依赖和旧测试断言已清理

### Task 5：重构 graph query / context / overview 为 hard-scope 模型

**Status**

- Completed

**目标**

- 所有 graph 查询强制按 `graphScopeId`
- 删除 observation 级 scope 兜底过滤
- 把状态改成 capability-aware 五态

**Files**

- Modify: `apps/anyhunt/server/src/graph/graph-query.service.ts`
- Modify: `apps/anyhunt/server/src/graph/graph-context.service.ts`
- Modify: `apps/anyhunt/server/src/graph/graph-overview.service.ts`
- Modify: `apps/anyhunt/server/src/memory/memory-overview.service.ts`
- Modify: `apps/anyhunt/server/src/graph/graph.controller.ts`
- Test: `apps/anyhunt/server/src/graph/__tests__/graph-query.service.spec.ts`
- Test: `apps/anyhunt/server/src/graph/__tests__/graph-context.service.spec.ts`
- Test: `apps/anyhunt/server/src/graph/__tests__/graph-overview.service.spec.ts`

**Implementation**

1. query/detail/overview 入口先 `requireScope(apiKeyId, projectId)`
2. 所有 `findMany/findFirst/count` 强制带 `graphScopeId`
3. 删除“查全局 canonical entity，再靠 observations.some(scopeWhere) 兜底”的模式
4. overview 改为依赖：
   - `GraphScope.projectionStatus`
   - `GraphProjectionRun`
   - 当前 scope 下 observation 数量
5. `MemoryOverviewService` 不再通过 indexed source / derived fact 数量猜 graph status

**Verification**

- Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/graph/__tests__/graph-query.service.spec.ts src/graph/__tests__/graph-context.service.spec.ts src/graph/__tests__/graph-overview.service.spec.ts`

**Current State**

- `GraphQueryService` / `GraphContextService` / `GraphOverviewService` 已统一强制 `graphScopeId`
- `MemoryOverviewService` 的 graph 状态已改为 capability-aware 五态，不再从 source/fact 数量猜测
- observation 级 scope 兜底过滤已从主链删除
- graph detail/query/context 当前都只从单一 `GraphScope` 读取

### Task 6：重构 retrieval 与 Moryflow gateway 契约

**Status**

- Completed

**目标**

- `include_graph_context=true` 时强制 `project_id`
- Moryflow workspace 与 graph scope 严格绑定

**Files**

- Modify: `apps/anyhunt/server/src/retrieval/retrieval.service.ts`
- Modify: `apps/anyhunt/server/src/retrieval/dto/*`
- Modify: `apps/moryflow/server/src/memory/memory.client.ts`
- Modify: `apps/moryflow/server/src/memory/memory.service.ts`
- Modify: `apps/moryflow/server/src/memory/memory.controller.ts`
- Modify: `apps/moryflow/pc/src/main/app/ipc/memory-domain/*`
- Modify: `apps/moryflow/pc/src/main/agent-runtime/knowledge-tools.ts`
- Test: `apps/anyhunt/server/src/retrieval/__tests__/retrieval.service.spec.ts`
- Test: `apps/moryflow/server/src/memory/memory.service.spec.ts`
- Test: `apps/moryflow/pc/src/main/app/ipc/memory.test.ts`

**Implementation**

1. retrieval：
   - `include_graph_context=true` 且无 `project_id` 时返回 `422 GRAPH_SCOPE_REQUIRED`
   - graph context 批量读取时只接受单一 `graphScopeId`
2. Moryflow server：
   - 统一从 `workspaceId -> projectId`
   - 不允许跨 workspace 读 graph
3. Moryflow PC：
   - conversation / memory panel 的 graph 请求只沿用当前 workspace
   - 不再把 graph 当成“可选模糊增强”

**Verification**

- Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/retrieval/__tests__/retrieval.service.spec.ts`
- Run: `pnpm --filter @moryflow/server exec vitest run src/memory/memory.client.spec.ts src/memory/memory.service.spec.ts src/memory/memory.controller.spec.ts`
- Run: `pnpm --filter @moryflow/pc exec vitest run src/main/app/ipc/memory.test.ts`
- Run: `pnpm --filter @anyhunt/anyhunt-server run typecheck`
- Run: `pnpm --filter @moryflow/server run typecheck`
- Run: `pnpm --filter @moryflow/pc run typecheck`

**Current State**

- `RetrievalService` 已在 `include_graph_context=true` 时通过 `GraphScopeService.requireScope()` fail-closed，并只按单一 `graphScopeId` 读取 graph context
- Moryflow server 的 graph query / entity detail 已只透传 `project_id`，删除了 legacy `metadata` graph filter
- Moryflow PC shared IPC / API client / IPC handlers 已统一删除 graph detail metadata 双轨契约
- PC disabled overview 已明确返回 `projectionStatus = 'disabled'`，不再把不可用图谱伪装成 `idle`

### Task 7：实现 graph rebuild / status 运维面

**Status**

- Completed

**目标**

- 以 `GraphScope` 为单位做重建
- 可查询、可失败恢复、可审计

**Files**

- Create: `apps/anyhunt/server/src/graph/graph-rebuild.service.ts`
- Create: `apps/anyhunt/server/src/graph/graph-rebuild.processor.ts`
- Create: `apps/anyhunt/server/src/graph/graph-rebuild.controller.ts`
- Modify: `apps/anyhunt/server/src/graph/graph.module.ts`
- Modify: `apps/anyhunt/server/src/queue/queue.constants.ts`
- Modify: `apps/anyhunt/server/src/queue/queue.module.ts`
- Test: `apps/anyhunt/server/src/graph/__tests__/graph-rebuild.service.spec.ts`

**Implementation**

1. 新建后台 job：`graph-scope-rebuild`
2. 输入固定为 `graphScopeId`
3. rebuild 步骤固定：
   - scope 级 lease
   - 清理该 scope 下的 entity / relation / observation
   - 扫描 `graphScopeId = 当前 scope` 的 active memory facts
   - 重建 graph
   - 写入 `GraphProjectionRun`
   - 更新 `GraphScope.projectionStatus`
4. status 接口返回：
   - `status`
   - `totalItems`
   - `processedItems`
   - `failedItems`
   - `lastError`
   - `lastProjectedAt`

**Verification**

- Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/graph/__tests__/graph-rebuild.service.spec.ts src/graph/__tests__/graph.controller.spec.ts src/graph/__tests__/graph-projection.service.spec.ts`
- Run: `pnpm --filter @anyhunt/anyhunt-server run typecheck`

**Current State**

- `GraphRebuildService` / `GraphRebuildProcessor` / `GraphRebuildController` 已落地，`GraphProjectionRun` 现在是真正的 rebuild/status 事实源
- 运维入口已固定为 `POST /v1/graph/rebuild` 与 `GET /v1/graph/rebuild/status`，输入严格按 `project_id -> GraphScope`
- rebuild 过程已收敛为：scope 级数据清理 -> scoped memory facts 重放 -> `GraphProjectionRun` 计数更新 -> `GraphScope.projectionStatus` 终态更新
- scope 下单个 memory fact 投影失败时，run 会进入 `FAILED`，失败 fact 会被标记 `graphProjectionState = FAILED`
- `GraphProjectionService.projectMemoryFact()` 现在在“抽取为空”时也会把 memory fact 收敛到 `READY`，不再长期卡在 `PENDING`

### Task 8：清理旧合同、文档与全量验证

**Status**

- Completed

**目标**

- 删除所有旧 graph 语义
- 把正式事实源与 runbook 切到新模型

**Files**

- Modify: `docs/design/anyhunt/core/system-boundaries-and-identity.md`
- Modify: `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
- Modify: `apps/anyhunt/server/src/graph/CLAUDE.md`
- Modify: `apps/anyhunt/server/src/sources/CLAUDE.md`
- Modify: `apps/anyhunt/server/src/memory/CLAUDE.md`
- Modify: `apps/anyhunt/server/src/retrieval/CLAUDE.md`
- Modify: `apps/moryflow/server/src/memory/*` 相关测试与文档

**Implementation**

1. 删除“graph 默认关闭，未来再评估”的合同
2. 把系统边界文档改成：
   - graph 强制 `project_id`
   - canonical merge 强制 `graphScopeId`
3. 把 cutover runbook 改成：
   - 先建 `GraphScope`
   - 再 rebuild
   - 再开放 graph query / context
4. 删除所有提到 `MEMOX_SOURCE_GRAPH_PROJECTION_ENABLED` 和 `graphEnabled` 的文档

**Verification**

- Run: `pnpm --filter @anyhunt/anyhunt-server run typecheck`
- Run: `pnpm --filter @moryflow/server run typecheck`
- Run: `pnpm --filter @moryflow/pc run typecheck`
- Run: `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/graph/__tests__ src/memory/__tests__ src/retrieval/__tests__`
- Run: `pnpm --filter @moryflow/server exec vitest run src/memory`
- Run: `pnpm --filter @moryflow/pc exec vitest run src/main/app/ipc/memory.test.ts src/main/agent-runtime/memory-tools.test.ts`
- Run: `git diff --check`

**Current State**

- `docs/design/anyhunt/core/system-boundaries-and-identity.md` 与 `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md` 已切到 `project_id -> GraphScope` 的正式模型，不再保留“graph 默认关闭，未来再评估”的旧合同
- `apps/anyhunt/server/src/graph/CLAUDE.md`、`apps/anyhunt/server/src/sources/CLAUDE.md`、`apps/anyhunt/server/src/memory/CLAUDE.md`、`apps/anyhunt/server/src/retrieval/CLAUDE.md` 已清掉 `graphEnabled`、source direct graph projection、默认关闭 graph 等失真事实
- `knowledge_read` 已统一改为 code point 级分页，避免高位 Unicode / surrogate pair 在分页边界被截断
- graph / memory / retrieval / Moryflow server / PC memory 相关验证已全绿，当前冻结方案的 8 个任务全部完成

### Cutover Gate

只有同时满足以下条件，才允许把 graph 正式打开：

1. 所有 graph query / detail / overview / retrieval graph context 都只接受 `project_id`
2. 旧 source direct graph projection 代码与配置已删除
3. 旧 graph 数据已清空
4. 所有 active project 已 materialize `GraphScope`
5. `graph-scope-rebuild` backlog 清零
6. 隔离回归测试全部通过
