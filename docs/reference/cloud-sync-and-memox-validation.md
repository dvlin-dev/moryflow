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

## 下一步固定顺序

1. 先部署 Anyhunt retrieval 修复，使 `/api/v1/sources/search` 恢复可用。
2. 部署后重新执行生产验证：
   - `validate:production:memox`
   - 手工最小探针：`source identity -> revision -> finalize -> sources/search`
3. 只有在 Memox 读写链都恢复后，才继续执行云同步真实验证：
   - PC 触发同步
   - usage 前后增量对账
   - Moryflow / Anyhunt 搜索结果对账
4. 只有当 `Memox` 与 `云同步` 两条生产验证都通过后，当前任务才算闭环。

## 相关事实源

- `docs/design/moryflow/core/cloud-sync-architecture.md`
- `docs/design/moryflow/runbooks/cloud-sync-operations.md`
- `docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md`
- `docs/design/anyhunt/runbooks/memox-phase2-moryflow-cutover.md`
