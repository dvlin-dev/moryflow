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

[PROTOCOL]: 仅在验证范围、执行顺序、成功标准或自动化测试分层失真时更新本文件。
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
3. Memox / Memory 相关能力是否真实生效，缺少统一链路级验证。

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
   - env 模板默认必须把 `EMBEDDING_OPENAI_DIMENSIONS` 留空，不能预填 `1536`
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

## 相关事实源

- `docs/design/moryflow/core/cloud-sync-architecture.md`
- `docs/design/moryflow/runbooks/cloud-sync-operations.md`
- `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
