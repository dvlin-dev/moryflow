---
title: 云同步与 Memox 验证基线
date: 2026-03-09
scope: apps/moryflow/server + apps/moryflow/pc + apps/anyhunt/server
status: active
---

<!--
[INPUT]: Moryflow 云同步现状、Memox 单链路接入事实、线上真实问题与现有测试入口
[OUTPUT]: 云同步与 Memox 的统一验证基线、执行顺序、成功标准与自动化覆盖策略
[POS]: docs/reference/ 核心功能验证参考

[PROTOCOL]: 当验证范围、执行顺序、成功标准、自动化测试分层、当前 blocker、当前证据或下一步排查顺序失真时更新本文件；保持“当前真相”单版本口径，不写时间线式日志。
-->

# 云同步与 Memox 验证基线

## 目标

本文件定义 Moryflow 云同步与 Anyhunt Memox 接入的统一验证口径，覆盖：

1. 当前线上问题诊断顺序。
2. 后续自动化测试的分层与职责。
3. 功能验收的固定成功标准。

当前优先问题：

1. 用户登录后应触发云同步，但空间用量长期显示为 `0`。
2. 点击“重试同步”后，空间仍不更新。
3. 云同步生产 harness 需要与真实业务故障分离，避免把本地验证环境问题误判成线上同步失败。

## 范围

### 云同步

- PC 登录与 Vault 绑定
- `diff -> execute -> receipt-only commit -> publish`
- `SyncFile` 写入与 `UserStorageUsage` 更新
- “重试同步”触发链
- 设置页 / 状态区空间展示

### Memox

- `file lifecycle outbox`
- Moryflow `source bridge / file projection / search adapter`
- Anyhunt `source identities / revisions / finalize / sources search`
- Moryflow `/api/v1/search` 到 Anyhunt `/api/v1/sources/search` 的读链闭环

## 固定执行顺序

验证必须分两阶段执行，不直接从“补齐所有自动化”开始。

### 第一阶段：真实问题诊断

目标是优先定位线上断点，不追求先补全自动化。

#### 云同步诊断顺序

1. 触发链
   - 登录后是否建立云同步上下文
   - Vault 是否绑定成功
   - “重试同步”是否真正触发 IPC -> main -> server 请求
2. 服务端写入链
   - `SyncFile` 是否产生或更新
   - `sync commit` 是否成功
   - `UserStorageUsage` 是否增量更新
   - `recalculateStorageUsage()` 是否能回算出真实值
3. UI 展示链
   - 设置页显示值是否来自 `/api/v1/usage`
   - IPC / store / 组件映射是否断裂
   - 服务端值与 UI 值是否一致

#### Memox 诊断顺序

1. 写链
   - `file lifecycle outbox` 是否产生
   - Moryflow 是否调用 Anyhunt `source identity / revision / finalize`
   - Anyhunt `sources` 域是否成功落库
2. 读链
   - Anyhunt `/api/v1/sources/search` 是否能搜到目标文件
   - Moryflow `/api/v1/search` 是否能通过 Memox 搜回同一文件
   - 删除 / 重命名 / 覆盖后结果是否跟随更新

#### 第一阶段产物

必须形成一份明确断点结论，而不是只有零散日志：

1. 断点所在层级
2. 复现步骤
3. 证据
4. 修复优先级
5. 需要补的最小回归测试

#### 第一阶段文档同步要求

每次排查都必须把以下内容回写到本文件，而不是只保留在终端输出或会话上下文中：

1. 当前 blocker
2. 当前已确认事实
3. 当前关键证据
4. 当前与业务逻辑无关的验证环境阻塞
5. 下一步固定排查顺序

约束：

1. 只保留当前仍成立的事实，不保留“第几轮排查”“几点几分执行了什么”的时间线式日志。
2. 若旧结论已被新证据推翻，直接覆盖为新事实，不保留并列版本。
3. 若问题拆分为“真实业务故障”和“验证环境故障”，必须明确分栏，禁止混写。

#### 第一阶段优先断点

##### 云同步

1. 若空间长期为 `0`，先验证是否真的发生过成功同步，而不是先怀疑 quota 统计：
   - `lastSyncAt`
   - `SyncFile`
   - `UserStorageUsage`
   - `file lifecycle outbox`
2. 若登录后或“重试同步”后仍无变化，优先核查 PC 主进程初始化时序：
   - 登录是否真正建立云同步上下文
   - `cloudSyncEngine.init()/reinit()` 是否重新拿到 `vaultPath`
   - IPC 是否真的触发到 main process 与 server 请求
3. 当前已确认的第一阶段根因与修复：
   - 问题并非优先落在 `quota.service.ts`，而是 PC 主进程在 `cloudSyncEngine.stop() -> syncState.reset()` 后清空了内存态 `vaultPath`
   - 登录回流与“重试同步”继续走 `cloudSyncEngine.reinit()` 时，如果只依赖内存态 `vaultPath`，同步引擎会直接空转，导致不会发起真实 `diff/commit`
   - 修复要求：`reinit()` 必须在内存态缺失时回退到当前 active vault，重新执行 `init(vaultPath)`，而不是把“已绑定但内存被 reset”误判成“没有 vault”
4. 第一批回归测试最小范围：
   - PC 主进程：覆盖 `reinit()` 在 `syncState.reset()` 后仍能从 active vault 恢复并重新触发 `syncDiff`
   - IPC 层：覆盖 usage/search/list 等失败不被错误吞掉，避免把真实故障伪装成“空间为 0”
5. 若生产 harness 无法完成桌面端启动，必须先把“验证环境阻塞”和“真实线上同步状态”拆开：
   - 验证环境阻塞：Electron 主进程是否因本地依赖、单实例锁、首窗创建失败而提前退出
   - 真实线上同步状态：`VaultDevice.lastSyncAt`、`SyncFile`、`UserStorageUsage`、`FileLifecycleOutbox`
6. 只要服务端真相显示 `lastSyncAt = null` 且 `SyncFile = 0`，就应先判定为“从未发生成功 commit”，而不是“commit 成功但 quota/UI 没刷新”
7. 若本地生产 harness 已能启动桌面端，但 `desktopAPI.cloudSync.getUsage()` / `triggerSync()` 直接返回 `Please log in first`，必须优先验证桌面端 membership session 是否真正存在：
   - `window.desktopAPI.membership.hasRefreshToken()`
   - `window.desktopAPI.membership.getAccessToken()`
   - `window.localStorage['moryflow_user_info']`
   - 结论优先级高于 quota、搜索或 UI 展示链
8. 浏览器 Cookie 会话不等于 Desktop membership session；PC 云同步只认本地 membership token store 中的 `refreshToken/accessToken` 与 main 进程的 `membershipBridge` 同步状态

##### Memox

1. 若 `finalize` 或 `sources/search` 失败，先看 revision/source/chunk 状态，而不是只看 HTTP 表象：
   - `KnowledgeSourceRevision.status`
   - `KnowledgeSource.status`
   - `SourceChunk` 是否生成
   - `error` 字段中的 provider / upstream 错误
2. Embedding provider 是当前最优先排查点之一：
   - `EMBEDDING_OPENAI_BASE_URL`
   - `EMBEDDING_OPENAI_MODEL`
   - `EMBEDDING_OPENAI_API_KEY`
   - `EMBEDDING_OPENAI_DIMENSIONS`
3. 当前实现约束：
   - 代码仅在显式配置 `EMBEDDING_OPENAI_DIMENSIONS` 时才向 provider 发送 `dimensions`
   - `qwen/qwen3-embedding-4b` 这类可变维度模型必须显式配置 `EMBEDDING_OPENAI_DIMENSIONS=1536`；否则服务应在启动期 fail-fast，而不是把错误拖到 `finalize`
   - env 模板默认必须把 `EMBEDDING_OPENAI_DIMENSIONS` 留空，避免对不支持该参数的旧模型误发 `dimensions`
   - 未显式配置时仍保持默认 `1536` 维预期校验，避免打坏不支持该参数的旧模型
   - 当前向量库 schema 仍固定为 `vector(1536)`，所以在 schema 迁移前只允许 `1536`，不接受其他维度

### 第二阶段：自动化测试收口

只有在第一阶段拿到真实断点后，才补长期自动化。

#### A. Moryflow Server 集成测试

目标：确保云同步写链、空间统计与删除链路稳定。

必须覆盖：

1. commit 成功后同时更新 `SyncFile`、`file lifecycle outbox` 与 `UserStorageUsage`
2. 覆盖上传、删除、覆盖上传、重命名后的空间变化
3. “重试同步”场景不会漏 commit，不会把空间长期卡在 `0`
4. 回算路径能纠正缓存偏差

建议优先关注：

- `apps/moryflow/server/src/sync/sync-commit.service.ts`
- `apps/moryflow/server/src/quota/quota.service.ts`
- `apps/moryflow/server/src/quota/quota.controller.ts`
- `apps/moryflow/server/test/sync-internal-outbox.e2e-spec.ts`

#### B. Anyhunt + Moryflow 集成测试

目标：确保 Memox 单链路可写、可搜、可删。

必须覆盖：

1. `source identity -> revision -> finalize -> search -> delete`
2. 已删除文件不再命中
3. 覆盖上传、重命名后搜索结果跟随最新 revision
4. Moryflow 搜索入口与 Anyhunt 搜索结果语义一致

建议优先关注：

- `apps/moryflow/server/src/memox/memox-source-bridge.service.ts`
- `apps/moryflow/server/src/memox/memox-file-projection.service.ts`
- `apps/moryflow/server/src/memox/memox-search-adapter.service.ts`
- `apps/anyhunt/server/src/sources/knowledge-source-revision.service.ts`
- `apps/anyhunt/server/src/retrieval/retrieval.service.ts`

#### C. PC 集成 / E2E

目标：覆盖真实用户路径，而不是只测 service。

必须覆盖：

1. 登录后自动同步
2. “重试同步”按钮
3. 空间展示刷新
4. 新增文件后同步状态变化
5. 搜索结果在 UI 中可见

建议优先关注：

- `apps/moryflow/pc/src/main/app/cloud-sync-ipc-handlers.ts`
- `apps/moryflow/pc/src/main/cloud-sync/**`
- `apps/moryflow/pc/src/renderer/hooks/use-cloud-sync.ts`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section.tsx`

#### D. 线上 Smoke Test

目标：部署后用最小步骤验证核心能力，不替代自动化。

必须覆盖：

1. 上传至少一个文件后，`/api/v1/usage` 非 `0`
2. 通过 Anyhunt 可搜索到该文件
3. 通过 Moryflow 可搜索到该文件
4. 删除后 Anyhunt 与 Moryflow 都不再命中

## 成功标准

### 云同步

1. 登录并触发同步后，空间值会从 `0` 变为真实字节数
2. “重试同步”可以恢复可恢复故障，不会只是重复空转
3. 服务端 `/api/v1/usage` 与 UI 展示值一致
4. `SyncFile`、存储对象和 `UserStorageUsage` 三者一致

### Memox

1. 新同步文件能在 Anyhunt `sources/search` 中被检索到
2. 同一文件能通过 Moryflow `/api/v1/search` 命中
3. 删除、重命名、覆盖上传后的搜索结果与最新状态一致
4. Moryflow 不再依赖第二套旧搜索后端

## 验证分层约束

1. 真实线上问题优先用链路诊断解决，不用“补更多猜测性测试”替代。
2. 自动化测试必须按职责分层：server 集成、跨服务集成、PC 集成/E2E、线上 smoke。
3. 不允许只看 diff；验证必须覆盖相关链路文件、相关文档与关键运行时配置。
4. Bug 修复必须补回归测试，避免再次出现“空间为 0 / 搜索未生效”。
5. 从 `Memory Workbench` 文档收口开始，验证文档必须持续回写；每个实现阶段完成前，都要把本阶段新增的验证步骤、成功标准与当前 blocker 覆盖写回本文件和生产验收 Playbook。
6. 若某个阶段的代码已改、测试已加，但验证文档未同步，则该阶段不视为完成。

## Memory Workbench 阶段化验证

`Memory Workbench` 的执行与验证固定按以下顺序推进，禁止跳阶段：

1. `MemoryFact` 来源模型
2. `source -> memory_fact` 投影链
3. `graph read API`
4. `retrieval/search` 双组合同
5. Moryflow Server `memory gateway`
6. PC `desktopAPI.memory.*`
7. PC `Memory Workbench`
8. `Global Search` 集成 `Local + Memory`

每一阶段固定要求：

1. 先补对应测试
2. 再补对应实现
3. 再把验证步骤回写到本文件
4. 最后才允许进入下一阶段

固定映射：

1. `PR 2 -> stages 1-4`
2. `PR 3 -> stages 5-6 + Memory 导航接入`
3. `PR 4 -> stages 7-8 + 最终 search cutover`

## 当前执行授权

当前 `Memory Workbench` 需求链路如需直接执行线上升级、数据库 migration 或生产验证，固定使用以下环境文件作为线上变量入口：

- `/Users/lin/code/moryflow/apps/moryflow/server/.env`
- `/Users/lin/code/moryflow/apps/anyhunt/server/.env`

执行约束：

1. 该授权只覆盖当前 `Memory Workbench` 相关的 Anyhunt / Moryflow Server 变更。
2. 若后续阶段需要升级环境变量、执行 migration 或直接运行线上验证，可直接执行，不再重复等待单独授权。
3. 每次实际执行后，都必须把结果与 blocker 同步回写到本文件和生产验收 Playbook。

### PR 2 当前验证基线

- 当前状态：已随 `PR #200` 合并到 `main`
- 下一步：进入 `PR 3`，从 `Moryflow Server memory gateway` 开始
- 保留 blocker：`memory-entity.integration.spec.ts` 仍需在具备 container runtime 的环境补跑

### PR 3 当前验证基线

- 当前状态：`Task 6-8` 已完成
- 下一步：进入 `PR 4`，从 `Overview + Search` 开始做 `Memory Workbench`
- 保留 blocker：暂无 `PR 3` 代码 blocker；旧 `/api/v1/search` fallback 仍按计划保留到 `Task 13`
- 最新补强：memory gateway 已对齐 Anyhunt 真实 memory contract，`list` 读取数组响应、`create` 读取 `{ results }` envelope、`history` 读取 `old_content/new_content`；`createFact()` 已改为 create 后回拉 detail

#### Stage 1: `MemoryFact` 来源模型

- 当前结论：PASS
- 已完成：
  - `MemoryFact` 字段从 `memory` 重命名为 `content`
  - 新增 `originKind/sourceId/sourceRevisionId/derivedKey`
  - `source-derived` 写路径已收口为只读
- 验证命令：

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/memory/__tests__/memory.service.spec.ts
pnpm --filter @anyhunt/anyhunt-server typecheck
```

#### Stage 2: `source -> memory_fact` 投影链

- 当前结论：PASS
- 已完成：
  - finalize 成功后 enqueue source memory projection
  - derived facts 支持 `derivedKey` 幂等更新与 stale cleanup
  - projection enqueue 失败不回滚 indexed source/revision
- 验证命令：

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/memory/__tests__/source-memory-projection.service.spec.ts \
  src/sources/__tests__/knowledge-source-revision.service.spec.ts
```

#### Stage 3: `graph read API`

- 当前结论：PASS
- 已完成：
  - `GET /api/v1/graph/overview`
  - `POST /api/v1/graph/query`
  - `GET /api/v1/graph/entities/:entityId`
  - `GET /api/v1/memories/overview`
  - scoped entity detail 无作用域内 evidence 时固定返回 `404`
  - overview facts 统计与 graph scope memory 过滤已对齐“未过期 memory”语义
  - graph scope 过滤已改为基于 `GraphObservation -> evidenceSource/evidenceMemory` relation filter，不再依赖前置 ID 列表
  - graph query / detail 的 `evidence_summary` 已改为精确统计，不再受 recent observation 截断
- 验证命令：

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/graph/__tests__/graph.controller.spec.ts \
  src/graph/__tests__/graph-query.service.spec.ts \
  src/graph/__tests__/graph-overview.service.spec.ts \
  src/memory/__tests__/memory-overview.service.spec.ts
```

#### Stage 4: `retrieval/search` 双组合同

- 当前结论：PASS
- 已完成：
  - 请求改为 `scope + group_limits`
  - 响应改为 `groups.files / groups.facts`
  - 分组计数字段固定为 `returned_count`，不再暴露误导性的伪 `total`
  - 平台侧双组 over-fetch + `hasMore` 已收口
  - Phase 2 load-check 已切到新 retrieval 请求/响应合同
  - Phase 2 OpenAPI gate 已纳入 `memories/overview` 与 `graph/*` 新端点
- 验证命令：

```bash
pnpm --filter @anyhunt/anyhunt-server test -- \
  src/retrieval/__tests__/retrieval.service.spec.ts \
  src/retrieval/__tests__/retrieval.controller.spec.ts \
  test/memox-phase2-openapi-load-check.utils.spec.ts
```

#### PR 2 综合校验

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
```

结果：

- typecheck：PASS
- 单测：PASS（`10` files / `61` tests）

当前 blocker：

- `RUN_INTEGRATION_TESTS=1 pnpm --filter @anyhunt/anyhunt-server test -- src/memory/__tests__/memory-entity.integration.spec.ts`
  - 当前环境没有可用 container runtime
  - `testcontainers` 报错：`Could not find a working container runtime strategy`
  - 该 blocker 属于验证环境，不是当前 PR 2 代码断言失败

#### PR 3 启动入口

- 当前状态：`Task 6-8` 已完成
- 下一步：`PR 4` 的 `Overview + Search`
- 启动前约束：
  - 继续沿用已冻结的 `PC -> Server -> Anyhunt` 单一链路
  - 不允许 PC renderer 直连 Anyhunt
  - `desktopAPI.memory.*` 只暴露收口后的上层 DTO，不泄漏 Anyhunt 平台 scope 与底层字段

#### Stage 5: `Moryflow Server memory gateway`

- 当前结论：PASS
- 已完成：
  - 新增 `apps/moryflow/server/src/memory/*`，落地统一 `memory gateway`
  - `memory.client.ts` 复用 `MemoxClient.requestJson(...)`，没有新建第二套 Anyhunt HTTP client
  - 已收口 `overview / search / facts / history / feedback / graph / exports`
  - manual fact create 已固定映射为 `messages + infer=false + async_mode=false`
  - derived fact update/delete 已在 gateway 边界收口为只读冲突
  - `search` 已固定走 Anyhunt `retrieval/search`
  - `includeGraphContext` 已映射为 Anyhunt `include_graph_context`，graph context 请求不再静默丢失
  - `createFact()` / `createExport()` 已补齐 Anyhunt 必需的 `Idempotency-Key`
  - Anyhunt write 调用已改为“幂等键只走 header”，`idempotency_key` 不再混入 upstream JSON body
  - `feedbackFact()` body 已改为真实 DTO class，继续走 `nestjs-zod` 运行时校验
  - retrieval 后续的 fact detail hydrate 已改成 best-effort，单条 stale fact 不再使整个 Search 报错
  - graph entity detail 已补齐 metadata scope 透传，detail 与 graph query 共享同一 scope 合同
  - graph / memory overview 的 GET scope 已增加 metadata query 预解析，支持 `metadata=<json>` 与 bracketed query 两种输入
  - facts 列表已改为扫到“拿够当前页或上游耗尽”为止，不再产生空页但 `hasMore=true` 的不可达分页
  - export 已向 Anyhunt 下推 `filters.user_id`，不再先做 project 级导出再本地过滤
  - feedback 为 `null` 时会保持 `null`，不再被错误映射为 `positive`
  - 旧 `/api/v1/search` 仍保留 fallback，尚未删除
  - `@moryflow/server` 的 `test` 与 `typecheck` 必须串行执行；两者都会触发 `prisma generate`，并行跑会竞争 `generated/prisma`
- 验证命令：

```bash
pnpm --filter @moryflow/server test -- \
  src/memory/memory.client.spec.ts \
  src/memory/memory.service.spec.ts \
  src/memory/memory.controller.spec.ts
pnpm --filter @moryflow/server typecheck
```

#### Stage 6: `desktopAPI.memory.*`

- 当前结论：PASS
- 已完成：
  - 新增 `shared/ipc/memory.ts`
  - 新增 `main/memory/api/client.ts`
  - 新增 `main/app/memory-ipc-handlers.ts`
  - `desktopAPI.memory.*` 与 preload bridge 已接通
  - PC main 已固定从 active workspace + binding 解析当前 `vaultId`
  - `getOverview()` 已聚合本地 `scope / binding / sync` 与 server `overview`
  - usage 查询已改为 best-effort，不再因 usage 抖动导致整个 Memory overview 失败
  - `getEntityDetail()` 已改为显式对象输入，metadata scope 贯通到 server
  - `getEntityDetail()` 的依赖类型也已同步包含 `metadata`，测试 mock 不再和正式合同分叉

#### Stage 7: `Memory Workbench`

- 当前结论：PASS
- 已完成：
  - `Memory Workbench` 已从 PR 3 placeholder 升级为正式 `Overview / Search / Facts / Graph / Exports`
  - `Overview` 已展示固定 `scope / binding / sync / indexing / facts / graph`
  - `Search` 已固定调用 `desktopAPI.memory.search({ includeGraphContext: true })`
  - `Facts` 已接通 list / detail / create / update / delete / batchDelete / history / feedback
  - `source-derived` facts 已固定为只读
  - `Graph` 已接通 query / entity detail / recent observations evidence
  - `Exports` 已固定为 facts export
  - write / detail actions 失败时会显示可见错误状态，不再无声 rejection
  - `openFact / createFact` 等异步 detail / mutation 结果已按 `workspaceScopeKey` 做 stale response discard
  - `saveSelectedFact / createExport` 也已按 `workspaceScopeKey` 做 stale response discard
  - 跨入口 pending fact / search intent 已绑定 `workspaceScopeKey`，切换 workspace 时只清理 scope 不匹配的旧 intent
  - same-scope 的 pending intent 不会再触发 `Memory Workbench` 全量 reset；从 `Global Search` 打开 facts 时不会闪空现有 Search/Facts/Graph/Exports 状态
  - Graph 查询已采用 debounce + stale response discard
  - `Memory Files` 打开动作保留 native `localPath` 原样，不在 renderer 单点改写路径分隔符
- 验证命令：

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/workspace/components/memory/index.test.tsx \
  src/renderer/workspace/components/memory/use-memory.test.tsx \
  src/renderer/workspace/components/memory/helpers.test.ts
pnpm --filter @moryflow/pc exec tsc --noEmit
```

#### Stage 8: `Global Search = Local + Memory`

- 当前结论：PASS
- 已完成：
  - `Global Search` 固定并列查询 `desktopAPI.search.query()` 与 `desktopAPI.memory.search()`
  - 分组固定为 `Threads / Files / Memory Files / Facts`
  - `Memory Search` 失败不会阻断本地结果，并会显式显示 `Unavailable`
  - `Memory Files` 仅在存在 `localPath` 且未被标记 `disabled` 时才允许打开；不可映射结果固定禁用
  - `Facts` 会路由到 `Memory -> Facts`
  - Workbench Search 与 Global Search 共用同一套 `Memory Files` 可打开判定
  - 旧 `desktopAPI.cloudSync.search -> /api/v1/search` 远端文件搜索链已移除，完成最终 cutover
- 验证命令：

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/renderer/components/global-search/index.test.tsx \
  src/renderer/components/global-search/use-global-search.test.tsx \
  src/main/app/cloud-sync-ipc-handlers.test.ts \
  src/main/app/memory-ipc-handlers.test.ts \
  src/renderer/workspace/components/workspace-shell-main-content.test.tsx \
  src/renderer/workspace/components/sidebar/components/modules-nav.test.tsx
pnpm --filter @moryflow/pc exec tsc --noEmit
```

- `listFacts()` 已改为 POST body 查询，避免数组/数字筛选继续依赖 GET query string 序列化与解析细节
- 未登录 / 未绑定时 `getOverview()` 返回 disabled DTO；其余 IPC fail-fast
- 验证命令：

```bash
pnpm --filter @moryflow/pc exec vitest run \
  src/main/memory/api/client.test.ts \
  src/main/app/memory-ipc-handlers.test.ts
pnpm --filter @moryflow/pc exec tsc --noEmit
```

#### PR 3 / Task 8: `Memory` 导航接入

- 当前结论：PASS
- 已完成：
  - `Memory` 已作为独立 `module destination` 接入 navigation state / registry / layout resolver
  - Home Modules 顺序已固定为 `Remote Agents -> Memory -> Skills -> Sites`
  - 主内容区已接入 `MemoryPage`
  - `MemoryPage` 已通过 `desktopAPI.memory.getOverview()` 渲染最小占位信息，不提前进入正式 Workbench UI
  - 停留在 `Memory` 模块时，active workspace 切换会自动触发 overview refresh
  - `extractMemoryErrorMessage()` 已支持 string error，不再把 hook 中的真实错误文案退回默认兜底文案
- 验证命令：

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

## 当前阶段结论

### 云同步

1. “空间长期为 `0`” 的第一优先根因已定位到 PC 主进程同步引擎恢复时序，而不是 quota 统计逻辑本身。
2. `cloudSyncEngine.reinit()` 现在必须在内存态 `vaultPath` 缺失时回退到 active vault，确保登录回流、绑定完成或 stop/reset 之后仍能重新启动同步引擎。
3. 第一批回归测试至少要覆盖：
   - `reinit()` 恢复 active vault 并重新发起 `syncDiff`
   - IPC 层不把 usage 失败错误伪装成 `0`
4. 生产验证 harness 现已固定为：
   - 绑定阶段总是按当前账号重新执行 `bindVault`，不再盲目复用旧 binding
   - 同步阶段必须等待 `lastSyncAt` 推进且状态脱离 `syncing/disabled`
   - 清理阶段必须执行 best-effort 远端删除收敛
5. 当前真实线上结论：
   - Memox 线上验收已通过，Anyhunt 与 Moryflow 的写链/读链均正常
   - 云同步当前 blocker 不是服务端 quota，而是桌面端没有已建立的 membership session
   - 当前 profile 中 `hasRefreshToken = false`、`accessToken = null`、`moryflow_user_info = null`
   - 当前本地生产 harness 已恢复可运行；此前 `electron-updater` 缺失导致的本地 Electron 启动阻塞已排除
   - 当前云同步生产验收会稳定 fail-fast 到“desktop membership session is missing”，不再误报为 quota、搜索或同步逻辑故障
   - 这与服务端真相 `lastSyncAt = null`、`SyncFile = 0` 一致，说明云同步从未真正穿过 `sync/commit`
6. 当前排查顺序冻结为：
   1. 先确认桌面端是否真正登录到 PC membership session，而不是仅有浏览器会话
   2. 若桌面端未登录，先由人工在当前本地 Desktop profile 中完成一次 PC 登录，并确保 token 已落入本地 membership token store
   3. 若桌面端已登录但仍失败，再继续追 `diff -> upload -> commit` 的服务端断点

## 当前需要人工完成的前置动作

在继续云同步真实验收前，必须先完成以下动作：

1. 在这台机器上的 Moryflow Desktop 内重新登录一次目标账号
2. 登录必须发生在当前本地桌面端 profile：
   - `~/Library/Application Support/@moryflow/pc`
3. 登录完成后，必须满足以下至少一条：
   - `window.desktopAPI.membership.hasRefreshToken()` 返回 `true`
   - `window.desktopAPI.membership.getAccessToken()` 返回非空
4. 仅浏览器端已登录不算完成；浏览器 Cookie 会话不能驱动 PC 云同步

人工动作完成后的固定下一步：

1. 重跑 `pnpm validate:production:cloud-sync`
2. 若仍失败，再继续沿 `diff -> upload -> commit -> usage -> search` 主链排查真实业务断点
3. 若通过，再把结果回写到本文件与生产验收 Playbook
   - 配置了 `MORYFLOW_E2E_USER_DATA` 的线上验收必须绕过 Electron 单实例锁
4. 当前真实线上状态已明确：
   - 真实账号对应的 `Vault` 与 `VaultDevice` 已存在
   - `VaultDevice.lastSyncAt = null`
   - `SyncFile = 0`
   - `UserStorageUsage.storageUsed = 0`
   - `FileLifecycleOutbox` 没有 pending / processed 记录
5. 上述服务端真相表明：当前问题不是“空间统计错了”，而是“还没有任何一次成功 sync commit”。
6. 当前验证环境阻塞也已明确：
   - 生产 harness 在本地 worktree 中启动 Electron 主进程时，因缺少 `electron-updater` 而在首窗创建前退出
   - 这属于本地桌面端验证环境问题，不等于线上云同步业务逻辑已经失败
7. 云同步当前固定排查顺序：
   - 先修复或绕过本地生产 harness 的桌面端启动阻塞，确保验证工具可靠
   - 再沿 `PC 登录态 / binding -> triggerSync -> diff -> execute -> commit -> SyncFile -> storageUsed -> search` 主链追断点
   - 只有在确认 commit 已真实发生后，才继续看 quota/UI 刷新
8. 在桌面端 harness 恢复前，服务端数据库真相是当前唯一可信的同步结果基线。

### Memox

1. Embedding provider 配置已切到 OpenRouter 后，仍要继续通过真实链路验证 `finalize -> sources/search`。
2. 在向量库 schema 迁移前，运行时维度仍固定为 `1536`，不接受其他值。
3. 当前线上若使用 `qwen/qwen3-embedding-4b`，必须同时部署 `EMBEDDING_OPENAI_DIMENSIONS=1536`；缺失该配置会导致 provider 默认返回 `2560` 维，进而触发 `finalize` 失败。
4. `POST /api/v1/sources/search` 若在写链恢复后仍返回 `500`，应优先检查 retrieval 的 chunk window SQL 是否仍把 `revisionId` 强转为 `uuid`；当前向量 schema 中 `SourceChunk.revisionId` / `KnowledgeSource.currentRevisionId` 都是 `String`，错误 cast 会触发 `operator does not exist: text = uuid`。
5. 真实线上现状已经确认：
   - `source identity`、`revision create`、`finalize` 已恢复为成功
   - `/api/v1/sources/search` 仍返回 `500`
6. `/api/v1/sources/search` 的当前根因已在本地代码中确认并修复：
   - chunk window CTE 必须固定为 `revisionId::text` 与 `centerChunkIndex::int`
   - 错误的类型推断会触发 `operator does not exist: text = uuid` 或 `operator does not exist: text - unknown`
7. Memox 生产 smoke 入口现已固定为 Anyhunt 服务端 source 生命周期验证：
   - run id 使用“毫秒级时间戳 + 随机后缀”
   - 失败路径必须执行 best-effort source cleanup
   - Moryflow 读链不再伪装成该脚本的覆盖范围，而是在云同步分布式验证阶段统一验收
8. 当前真实线上状态已确认恢复：
   - `pnpm validate:production:memox` 已通过
   - Anyhunt `live/ready` 与 Moryflow `live/ready` 都返回 `200`
   - `source identity / revision create / finalize / sources/search / retrieval/search / exports` 均成功
   - `memox-production-smoke-check` 返回 `ok: true`
9. 当前阶段可将 Memox 视为已通过线上验收；后续若再出现搜索问题，应优先按本文件的 retrieval / embedding 约束复核，而不是回到旧双链路假设。

## Memory Workbench 线上升级基线（2026-03-12）

1. 已实际读取以下线上环境文件作为执行入口：
   - `/Users/lin/code/moryflow/apps/moryflow/server/.env`
   - `/Users/lin/code/moryflow/apps/anyhunt/server/.env`
2. 已实际执行数据库迁移部署预检与正式 no-op deploy：
   - `cd /Users/lin/code/moryflow/apps/anyhunt/server && set -a && source .env && set +a && npx prisma migrate status --config prisma.main.config.ts`
   - `cd /Users/lin/code/moryflow/apps/anyhunt/server && set -a && source .env && set +a && npx prisma migrate status --config prisma.vector.config.ts`
   - `cd /Users/lin/code/moryflow/apps/moryflow/server && set -a && source .env && set +a && npx prisma migrate status --config prisma.config.ts`
   - `cd /Users/lin/code/moryflow/apps/anyhunt/server && set -a && source .env && set +a && npx prisma migrate deploy --config prisma.main.config.ts`
   - `cd /Users/lin/code/moryflow/apps/anyhunt/server && set -a && source .env && set +a && npx prisma migrate deploy --config prisma.vector.config.ts`
   - `cd /Users/lin/code/moryflow/apps/moryflow/server && set -a && source .env && set +a && npx prisma migrate deploy --config prisma.config.ts`
3. 当前执行结果：
   - Anyhunt main：`Database schema is up to date`，`No pending migrations to apply.`
   - Anyhunt vector：`Database schema is up to date`，`No pending migrations to apply.`
   - Moryflow server main：`Database schema is up to date`，`No pending migrations to apply.`
4. 当前结论：
   - 本期 `Memory Workbench` 所需 schema/migration 已随代码进入主干，线上数据库当前无额外待执行 migration
   - 当前未发现必须新增的 Anyhunt / Moryflow Server 环境变量升级项
   - 下一步应从数据库升级切换到真实链路验收：`Overview / Search / Facts / Graph / Exports / Global Search`

## Memory Workbench 线上验收执行结果（2026-03-12）

### 已执行基线

1. 服务健康探针已按真实线上路由执行：
   - `https://server.anyhunt.app/health/live` -> `200`
   - `https://server.anyhunt.app/health/ready` -> `200`
   - `https://server.moryflow.com/health/live` -> `200`
   - `https://server.moryflow.com/health/ready` -> `200`
2. `pnpm validate:production:memox` 已实际执行并通过：
   - `memox-openapi-load-check`：PASS
   - `memox-production-smoke-check`：PASS
   - smoke run id：`codex-validation-memox-20260312032700149-56ac2d7e`
3. Anyhunt 线上只读链路已实际验证：
   - `GET /api/v1/memories/overview?project_id=codex-validation`：PASS
   - `POST /api/v1/retrieval/search`：PASS
   - 当前线上 overview 真实返回：
     - `manual_count=1`
     - `derived_count=0`
     - `graph.projection_status=idle/building`（随验收 source 变化）
4. 部署 `BullMQ jobId` 修复后已完成第二轮线上复验：
   - 复验 run id：`20260312084707412-d787046a`
   - 追加定位 run id：`20260312085150058-9bd9949f`
   - `GET /api/v1/memories/overview?project_id=codex-validation`：PASS
   - `POST /api/v1/memories(enable_graph=false)`：PASS
   - `DELETE /api/v1/memories/:memoryId`：PASS
   - `POST /api/v1/memories(enable_graph=true)`：PASS
   - `source identity -> revision -> finalize -> derived facts readable`：PASS
   - 但 `PUT /api/v1/memories/:memoryId` 在携带 `metadata` 更新时仍返回 `500`
   - 且 `graph overview/query` 在 `120s` 观察窗口内仍无 `GraphObservation / GraphEntity / GraphRelation`
5. 部署第二阶段根因修复后已完成第三轮线上复验：
   - run id：`mw-r3-20260312104530391-c4e0199b`
   - `PUT /api/v1/memories/:memoryId` 在同时更新 `text + metadata` 时：PASS
   - `manual fact(enable_graph=true) -> graph query`：PASS
     - 第 `2` 次轮询即命中 `entity_count=1 / relation_count=2`
     - 命中实体：`codexprojectnjacyu`
     - 命中关系：`uses / works_on`
   - `source identity -> revision -> finalize -> graph query`：PASS
     - 第 `3` 次轮询即命中 `entity_count=1 / relation_count=2`
     - 命中实体：`sourceprojectnjacyu`
     - 命中关系：`uses / leads`
   - `GET /api/v1/graph/overview?project_id=codex-validation`：PASS
     - `entity_count=5`
     - `relation_count=4`
     - `observation_count=11`
     - `projection_status=ready`

### 当前 blocker

1. `Phase B` 桌面端真实验收中发现新的 Moryflow Server gateway blocker：
   - `desktopAPI.memory.createFact()`：PASS
   - `desktopAPI.memory.updateFact()`：FAIL，稳定返回 `MemoryApiError: An unexpected error occurred`
   - 用同一 desktop access token 直打 `POST https://server.moryflow.com/api/v1/memory/facts`：`201`
   - 用同一 desktop access token 直打 `PUT https://server.moryflow.com/api/v1/memory/facts/:id`：`500`
   - 直打 Anyhunt `PUT https://server.anyhunt.app/api/v1/memories/:id`：`200`
2. 桌面端验收环境本身已就绪，不再是 blocker：
   - 已登录 profile：`MORYFLOW_E2E_USER_DATA=/Users/lin/code/moryflow/.validation/moryflow-e2e-profile`
   - validation workspace：`MORYFLOW_VALIDATION_WORKSPACE=/Users/lin/code/moryflow/validation-workspace`
   - `pnpm --filter @moryflow/pc run test:e2e:cloud-sync-production` 已在该 workspace 上通过

### 已确认根因（2026-03-12）

1. Anyhunt `Memory` 写链与 `source -> memory_fact` 投影链的共同根因，已经定位到 BullMQ `jobId` 生成规则不兼容：
   - 本地以线上 env 复现 `POST /api/v1/memories(enable_graph=true)`，得到精确错误：
     - `Custom Id cannot contain :`
   - 当前代码在以下链路里使用了带 `:` 的自定义 `jobId`：
     - `apps/anyhunt/server/src/memory/memory.service.ts`
     - `apps/anyhunt/server/src/sources/knowledge-source-revision.service.ts`
     - `apps/anyhunt/server/src/memory/source-memory-projection.service.ts`
   - 直接影响：
     - `scheduleMemoryGraphProjection()` / `scheduleMemoryGraphCleanup()` 入队抛错，导致 `enable_graph=true` create、update、delete 在数据库事务成功后仍返回 `500`
     - `enqueueSourceMemoryProjection()` / `enqueueSourceGraphProjection()` 因入队失败被 `warn` 吞掉，导致 source finalize 成功但 `SOURCE_DERIVED` facts 与 graph projection 不收敛
   - 同类风险已确认还影响：
     - `apps/anyhunt/server/src/api-key/api-key-cleanup.service.ts`
     - `apps/anyhunt/server/src/sources/source-revision-cleanup.service.ts`
       两处也会因带 `:` 的自定义 `jobId` 直接抛错；虽不属于本次 `Memory Workbench` 线上 blocker 主路径，但后续修复必须一并收口，避免留下同根隐患
2. 第一轮线上 blocker 已被第二轮复验确认消失：
   - `DELETE /api/v1/memories/:memoryId` 已恢复为 `200`
   - `POST /api/v1/memories(enable_graph=true)` 已恢复为 `201`
   - `source finalize` 后 `SOURCE_DERIVED` facts 已能真实落库并可读
3. 第三轮复验前，`manual fact update(metadata)` 的根因已基本锁定为 raw SQL JSON 类型不匹配：
   - `apps/anyhunt/server/src/memory/memory.repository.ts`
   - `updateWithEmbedding()` 当前使用：
     - `metadata = COALESCE(${toSqlJson(data.metadata)}, metadata)`
   - `toSqlJson()` 在：
     - `apps/anyhunt/server/src/memory/utils/memory-json.utils.ts`
     - 当前固定返回 `::json`
   - PostgreSQL `Prisma Json` 实际落库为 `jsonb`；因此该路径只要更新 `metadata`，就很可能在 `COALESCE(json, jsonb)` 上触发类型错误
   - 同一接口在“不更新 metadata”时已复验通过，和上述判断一致
4. 第三轮复验前，`graph` blocker 的最终根因已定位到 `MemoryLlmService.extractGraph()` 调用模式错误：
   - `SOURCE_DERIVED` facts 已生成，说明 `source-memory projection` worker 正常
   - `graph overview/query` 持续为 `0 observation / 0 entity / 0 relation`
   - 说明剩余问题位于 `memory_fact -> graph` 这段，而不是 `source -> memory_fact`
   - 已用 Anyhunt 线上 env 在本地直调 `MemoryLlmService.extractGraph()` 复现到精确错误：
     - `No existing trace found`
   - 当前 `apps/anyhunt/server/src/memory/services/memory-llm.service.ts` 把同步抽取场景建立在 `@openai/agents-core` 的 `route.model.getResponse()` 上
   - 该路径要求 trace 上下文，失败后会被 catch 成 `null`
   - `extractFactsFromText()` 之所以还能工作，是因为它有 fallback；并不代表 extract LLM 链路本身正常
5. 线上 Redis / worker 本身不是第一轮主因：
   - 同一套线上 `REDIS_URL` 上，`memox-memory-export` 队列持续有历史 `completed` job
   - 手动检查后确认 `memox-graph-projection` 与 `memox-source-memory-projection` 在验收前为 `0 completed / 0 failed / 0 waiting`
   - 说明当前现象是“应用请求路径没有成功把正式 job 投进去”，不是“worker 已消费但结果丢失”
6. 向量库证据与上述根因一致：
   - 线上已能观察到 `graphEnabled=true` 的 manual fact 落库
   - 第二轮复验时 `SOURCE_DERIVED` facts 也已真实落库
   - 但 `GraphObservation / GraphEntity / GraphRelation` 仍为 `0`
   - 说明第三轮复验前的问题已经从“queue add 失败”收敛为“graph 投影没有产出图数据”

### 当前修复状态（2026-03-12）

1. 第一阶段代码层修复已完成：
   - 新增统一 `buildBullJobId()`，禁止继续手写带 `:` 的 BullMQ 自定义 `jobId`
   - 已覆盖：
     - `memory graph projection / cleanup`
     - `source memory projection`
     - `source graph projection / cleanup`
     - `source revision cleanup`
     - `api key cleanup`
2. 第二阶段根因修复已完成：
   - `update(metadata)` 的 SQL JSON 写入已统一收口为 `jsonb`
     - 新增 `apps/anyhunt/server/src/common/utils/prisma-json.utils.ts`
     - `memory-json.utils.ts` 与 `source-chunk.repository.ts` 不再各自手写 `::json`
   - `MemoryLlmService` 已改为 `LlmLanguageModelService + ai.generateText`
   - 不再依赖 agents-core trace 上下文
3. 本地验证已通过：
   - `pnpm --filter @anyhunt/anyhunt-server test -- src/queue/__tests__/queue.utils.spec.ts src/memory/__tests__/memory.service.spec.ts src/memory/__tests__/source-memory-projection.service.spec.ts src/sources/__tests__/knowledge-source-revision.service.spec.ts src/sources/__tests__/knowledge-source-deletion.service.spec.ts src/sources/__tests__/source-revision-cleanup.service.spec.ts src/api-key/__tests__/api-key-cleanup.service.spec.ts src/api-key/__tests__/api-key.service.spec.ts`
   - `pnpm --filter @anyhunt/anyhunt-server test -- src/memory/utils/__tests__/memory-json.utils.spec.ts src/memory/services/__tests__/memory-llm.service.spec.ts src/memory/__tests__/memory.service.spec.ts src/memory/__tests__/source-memory-projection.service.spec.ts src/graph/__tests__/graph-projection.service.spec.ts`
   - `pnpm --filter @anyhunt/anyhunt-server typecheck`
   - 使用 Anyhunt 线上 env 本地直调 `extractGraph()` 已返回真实实体/关系，不再是 `null`
4. 第三轮线上复验已完成并确认：
   - `M4` 的 metadata update 已恢复 PASS
   - `manual fact -> graph` 已恢复 PASS
   - `source -> memory_fact -> graph` 已恢复 PASS

### 当前结论

1. `Memox` 基础生产链：PASS
2. `Memory Workbench API` 线上专项验收：PASS
3. 当前断点层级：
   - `Phase B` 桌面端真实验收中发现新的 Moryflow Server gateway blocker：`desktopAPI.memory.updateFact()` 真实返回 `500`
4. 当前已确认事实：
   - 桌面端验收环境已就绪：
     - 已登录 profile：`MORYFLOW_E2E_USER_DATA=/Users/lin/code/moryflow/.validation/moryflow-e2e-profile`
     - validation workspace：`MORYFLOW_VALIDATION_WORKSPACE=/Users/lin/code/moryflow/validation-workspace`
   - 隐藏目录 `.validation/workspace` 会被 vault watcher 忽略；正式验收必须使用非隐藏目录 `validation-workspace`
   - `pnpm --filter @moryflow/pc run test:e2e:cloud-sync-production` 已在 `validation-workspace` 上通过，证明 `cloud-sync -> usage -> memory search -> Anyhunt search` 基础生产链可用
   - 同一桌面会话内：
     - `desktopAPI.memory.createFact()`：PASS
     - `desktopAPI.memory.updateFact()`：FAIL，稳定返回 `MemoryApiError: An unexpected error occurred`
   - 用同一 desktop access token 直打 `POST https://server.moryflow.com/api/v1/memory/facts`：`201`
   - 用同一 desktop access token 直打 `PUT https://server.moryflow.com/api/v1/memory/facts/:id`：`500`
   - 直打 Anyhunt `PUT https://server.anyhunt.app/api/v1/memories/:id`：`200`
5. 根因结论：
   - 问题不在桌面端 profile、workspace、cloud-sync 或 Anyhunt update 本身
   - 根因在 Moryflow Server `memory gateway`：
     - Anyhunt `PUT /api/v1/memories/:id` 返回“精简更新响应”
     - Moryflow Server 仍按完整 `AnyhuntMemorySchema` 解析 update 响应
     - 同时 `updateFact()` 直接信任 update 响应，而不是更新后重新回拉 scoped detail
   - 因此当前未完成的是 `Phase B` 桌面端与云同步真实验收；`Memox / Memory Workbench API` 已通过，但 `desktopAPI.memory.updateFact()` 仍是 blocker

## 下一步固定顺序

1. 修复 Moryflow Server `memory update` 合同：
   - `MemoryClient.updateMemory()` 改为接受 Anyhunt 精简更新响应
   - `MemoryService.updateFact()` 改为 update 后重新回拉 scoped detail
2. 部署 Moryflow Server 修复
3. 重跑 `Phase B` 桌面端真实验收：
   - `Overview / Search / Facts / Graph / Exports / Global Search`
   - 重点回归 `desktopAPI.memory.updateFact()`、Workbench Facts、Global Search -> Fact intent
4. 只有当 `Phase B` 也通过后，当前任务才算闭环。

## 相关事实源

- `docs/design/moryflow/core/cloud-sync-architecture.md`
- `docs/design/moryflow/runbooks/cloud-sync-operations.md`
- `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
