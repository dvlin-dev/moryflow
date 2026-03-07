---
title: 云同步（统一实现）
date: 2026-03-08
scope: moryflow, pc, mobile, server
status: completed
---

<!--
[INPUT]: PC/Mobile/Server 云同步当前实现与协议
[OUTPUT]: 云同步统一实现说明、协议不变量、模块边界与代码索引
[POS]: Moryflow 云同步单一实现文档

[PROTOCOL]: 本文件变更时同步更新 `docs/design/moryflow/features/index.md`。
-->

# 云同步（统一实现）

## TL;DR

1. 当前云同步已经是 `server-authoritative action plan`：`sync/diff -> execute -> receipt-only commit -> staged apply publish`。
2. `path`、`fileId`、`SyncFile`、`storageRevision` 都有明确单一事实源。
3. PC/Mobile 都采用 `apply journal + recovery coordinator`，commit 前不再直接 publish 本地真相。
4. `cloud sync` 与 `vectorize/Memox` 已经解耦，sync 只写 `file lifecycle outbox`。

## 1. 核心不变量

### 1.1 事实源

1. `path`：canonical POSIX relative path；规范化只处理分隔符与前导 `./`，不会再通过 `.trim()` 静默改写文件名。任一 segment 的首尾空白都会直接判为非法路径。
2. `fileId`：同步事实源分配，不能由 vectorize 副作用生成。
3. `SyncFile`：服务端唯一元数据真相。
4. `storageRevision`：对象代际唯一标识。
5. `file lifecycle outbox`：只代表 `SyncFile` 发布后的派生事件。

### 1.2 协议字段职责

1. `vectorClock`：语义内容版本。
2. `storageRevision`：对象代际。
3. `actionId`：执行令牌。
4. `receiptToken`：带 `issuedAt/expiresAt` 的短期 action 完成回执。
5. `expectedHash/expectedStorageRevision/expectedVectorClock`：乐观并发校验前置条件。
6. `SYNC_ACTION_SECRET`：receipt token 唯一签名密钥；缺失时服务端必须 fail-fast，不能回退到其它 secret。
7. `deviceId`：设备级唯一标识；当前协议前置假设同一 `vault` 内不会出现重复 `deviceId`，客户端通过 UUID 生成保证唯一性，服务端不提供“重复 deviceId 自动修复”语义。

## 2. 当前架构

```text
PC / Mobile Client
├── path-normalizer
├── file-id-registry
├── detect-local-changes
├── sync-engine runner
├── executor (I/O only)
├── apply-journal
├── recovery-coordinator
└── file-index-publisher
        │
        │ HTTP API (Bearer token)
        ▼
Server (NestJS)
├── sync-plan.service
├── sync-upload-contract.service
├── sync-action-token.service
├── sync-object-verify.service
├── sync-commit.service
├── sync-orphan-cleanup.service
├── file-lifecycle-outbox.service
└── search-result-filter.service
        │
        ├── PostgreSQL (SyncFile / VaultDevice / FileLifecycleOutbox)
        └── Cloudflare R2 (revisioned objects)
```

## 3. 服务端协议

### 3.1 Diff

1. 客户端上报 `localFiles`。
2. 服务端按 `SyncFile` 真相源和 `vectorClock` 计算 action plan。
3. `SyncFile.storageRevision` 是非空列，服务端不再接受 nullable revision 元数据进入协议。
4. 返回的每个 action 都包含：
   - `actionId`
   - `receiptToken`
   - `storageRevision/contentHash/size` 合同
   - upload/download 所需 URL
5. conflict action 额外包含 `remoteStorageRevision`，用于固定下载远端冲突副本的对象快照。

### 3.2 Upload / Download

1. 上传 URL HMAC 签名覆盖：
   - `action`
   - `userId/vaultId/fileId`
   - `contentType`
   - `contentHash`
   - `storageRevision`
   - `expectedSize`
2. 下载 URL 只绑定 `storageRevision/contentHash`，不再签入 `expectedSize`；避免把 upload 专用参数混入 download 签名合同后导致合法下载 URL 被误判为 `INVALID_SIGNATURE`。
3. 服务端 download endpoint 会校验快照合同：
   - 请求的 `storageRevision` 对象不存在或指定 revision 不再存在时，返回 `404 FILE_NOT_FOUND`；
   - 对象仍存在但 `contentHash` 与合同不匹配时，返回 `409 SNAPSHOT_MISMATCH`。
4. conflict 下载 URL 使用 `remoteStorageRevision` 固定远端对象，而不是复用本地 overwrite revision。
5. `storageRevision` 不等于 R2 `ETag`：
   - download 的快照稳定性依赖 `storageRevision + contentHash` 合同校验；
   - delete 才依赖 `HEAD` 获取当前对象 `ETag` 后再执行 `If-Match` 条件删除。

### 3.3 Commit

1. commit 请求只接受 `receipts[]`。
2. `receipts[]` 中的 `actionId` 在单次 commit 内必须唯一；DTO 与 service 都会拒绝重复 `actionId`。
3. 同一 commit request 内，同一 `fileId` 不能被多个 receipts 重复声明；service 会在验签后按目标 `fileId` 做二次去重，避免不同 `actionId` 指向同一逻辑文件时重复计算 `sizeDelta`、重复发布 outbox 事件。
4. 服务端验签 `receiptToken`。
5. `SYNC_ACTION_SECRET` 缺失时服务启动直接失败，不允许空密钥或复用 `STORAGE_API_SECRET`。
6. 无效 `receiptToken` 会返回 `400 INVALID_SYNC_ACTION_RECEIPT`，不会再冒泡成 `500 INTERNAL_ERROR`。
7. 过期 `receiptToken` 会返回 `409 SYNC_ACTION_RECEIPT_EXPIRED`，要求客户端重新获取新的 sync plan。
8. 上传对象缺失会返回 `404 SYNC_UPLOADED_OBJECT_NOT_FOUND`，不会再冒泡成 `500 INTERNAL_ERROR`。
9. 上传对象 metadata 与合同不匹配会返回 `409 SYNC_UPLOADED_OBJECT_CONTRACT_MISMATCH`。
10. 服务端读取并校验对象合同。
11. 只有对象合同通过后，才会 publish `SyncFile`。
12. publish 成功后，同事务写入 `file lifecycle outbox`。

### 3.4 Delete / Orphan Cleanup

1. 删除依赖 `storageRevision + If-Match ETag` 条件删除。
2. 客户端恢复期可调用 `cleanup-orphans` 回收未发布 revision 对象。
3. 服务端只会删除“当前 `SyncFile` 未引用该 revision”的 orphan object。
4. orphan cleanup 没有额外的时间保护窗口：
   - 只要对象 revision 不再被当前 `SyncFile` 引用，就允许在 recovery 阶段立即清理；
   - 如果客户端长期离线，orphan object 会持续占用存储，直到下次 recovery。

### 3.5 Tombstone / GC

1. `SyncFile.isDeleted=true` 是当前唯一 tombstone 语义。
2. 当前实现不做 `SyncFile` 物理删除 GC，删除记录按永久 tombstone 保留。
3. 未来如需 GC，必须以独立设计文档重新定义保留期、审计保全和 projection 回收顺序，不能在现有协议上直接追加隐式清理。

## 4. 客户端执行模型

### 4.1 检测

1. 只读扫描本地文件。
2. 统一 canonical path。
3. 通过 file-id registry 确保新文件在进入 diff 前已注册 `fileId`。
4. 只生成 `pendingChanges/localStates`，不直接修改 FileIndex。

### 4.2 执行

1. upload：上传对象，记录 receipt 与 uploaded object。
2. download：下载到 staging temp，记录 `write_file` staged operation。
3. delete：只记录 `delete_file` staged operation。
4. conflict：
   - 下载远端副本到 staging
   - 上传 conflict copy
   - 上传 local overwrite
   - 记录 staged operations 与 receipts

### 4.3 Journal / Recovery

1. 同步开始先恢复历史 journal。
2. 执行前创建 `phase=executing` journal。
3. execute 完成写入 `phase=prepared`。
4. commit success 后写入 `phase=committed`。
5. 恢复器语义：
   - `committed`：replay staged apply，再 publish FileIndex
   - `executing/prepared`：cleanup orphan objects，再清理 journal
6. 任一非网络失败进入 `needs_recovery`，不能直接回 `idle`。
7. `write_file` replay 必须先确认 staged temp 存在，才允许删除 `replacePath/targetPath`；temp 缺失时旧文件必须保留，等待下次恢复或人工处理。
8. PC `activityTracker` 必须在真正调用过 `startSync()` 的 success / `needs_recovery` / commit conflict / exception 退出路径执行 `endSync()`；no-op sync 早返回不得调用未配对的 `endSync()`。
9. PC/Mobile 对任意 `commitResult.success === false` 都必须进入 `needs_recovery`；即使当前服务端只会在 conflict 场景返回 `success: false`，客户端也不能把“无 conflict 的非成功 commit”误落到 `idle`。

### 4.4 FileIndex Publish

1. 只允许在 `commit success + local replay success` 后 publish。
2. FileIndex publish 已独立为 `file-index-publisher`。
3. 这保证了 `磁盘状态 / FileIndex / 服务端 SyncFile` 三者不会再出现部分成功分叉。

## 5. 与 vectorize / Memox 的边界

### 5.1 已完成边界

1. `SyncCommitRequest.vectorizeEnabled` 已删除。
2. sync 域不再 direct call vectorize。
3. PC/Mobile settings 不再暴露 `vectorizeEnabled`。
4. cloud-sync API client 不再持有 vectorize 直连。
5. sync commit 成功后只写 `file lifecycle outbox`。
6. `file lifecycle outbox` 通过内部控制面提供 `claim/ack` 通路，供 projection consumer 独立消费。

### 5.2 当前读路径保护

1. Search 查询结果必须经过 `SyncFile` 存活态过滤。
2. Vectorize 域已增加 `projection drift reconcile`，周期性清理 stale projection。
3. 即使 projection 删除滞后，用户也不会再读到 tombstone 文件。
4. projection consumer 不在本次范围内，但其接入方式已经冻结为 `POST /internal/sync/outbox/claim` + `POST /internal/sync/outbox/ack`。

### 5.3 本次范围外

1. Memox consumer
2. 第三方 API 接入
3. projection 具体策略

## 6. 关键代码索引

### 6.1 Server

- `packages/api/src/cloud-sync/types.ts`
- `apps/moryflow/server/src/sync/dto/sync.dto.ts`
- `apps/moryflow/server/src/sync/sync-plan.service.ts`
- `apps/moryflow/server/src/sync/sync-upload-contract.service.ts`
- `apps/moryflow/server/src/sync/sync-action-token.service.ts`
- `apps/moryflow/server/src/sync/sync-object-verify.service.ts`
- `apps/moryflow/server/src/sync/sync-commit.service.ts`
- `apps/moryflow/server/src/sync/sync-orphan-cleanup.service.ts`
- `apps/moryflow/server/src/sync/file-lifecycle-outbox.service.ts`
- `apps/moryflow/server/src/sync/sync-internal-metrics.controller.ts`
- `apps/moryflow/server/src/sync/sync-internal-outbox.controller.ts`
- `apps/moryflow/server/src/search/search-result-filter.service.ts`
- `apps/moryflow/server/src/vectorize/vectorize-projection-reconcile.service.ts`

### 6.2 PC

- `apps/moryflow/pc/src/main/cloud-sync/path-normalizer.ts`
- `apps/moryflow/pc/src/main/cloud-sync/file-id-registry.ts`
- `apps/moryflow/pc/src/main/cloud-sync/apply-journal.ts`
- `apps/moryflow/pc/src/main/cloud-sync/recovery-coordinator.ts`
- `apps/moryflow/pc/src/main/cloud-sync/file-index-publisher.ts`
- `apps/moryflow/pc/src/main/cloud-sync/sync-engine/index.ts`
- `apps/moryflow/pc/src/main/cloud-sync/sync-engine/executor.ts`

### 6.3 Mobile

- `apps/moryflow/mobile/lib/cloud-sync/path-normalizer.ts`
- `apps/moryflow/mobile/lib/cloud-sync/file-id-registry.ts`
- `apps/moryflow/mobile/lib/cloud-sync/apply-journal.ts`
- `apps/moryflow/mobile/lib/cloud-sync/recovery-coordinator.ts`
- `apps/moryflow/mobile/lib/cloud-sync/file-index-publisher.ts`
- `apps/moryflow/mobile/lib/cloud-sync/sync-engine.ts`
- `apps/moryflow/mobile/lib/cloud-sync/executor.ts`

## 7. Step 6：观测、E2E 与上线闸门

### 7.1 内部观测

1. Server 新增 `SyncTelemetryService`，持续记录 `diff/commit/orphanCleanup` 计数与耗时。
2. internal 控制面固定为裸 internal 路由，不挂在 `/api` 前缀下。
3. 内部观测端点固定为 `GET /internal/metrics/sync`，并统一受 `InternalApiTokenGuard` 保护。
4. outbox 内部控制面固定为：
   - `POST /internal/sync/outbox/claim`
   - `POST /internal/sync/outbox/ack`
5. 指标只服务于内部排障；进程重启后计数归零，但 `outbox.pendingCount` 仍以 DB 为准。
6. 运行期排障手册固定写入：
   - `docs/design/moryflow/runbooks/cloud-sync-operations.md`

### 7.2 Step 6 回归与 E2E

1. Server：
   - `storage.controller.spec.ts`
   - `sync.service.spec.ts`
   - `sync-telemetry.service.spec.ts`
   - `sync-diff.spec.ts`
   - `sync-action-token.service.spec.ts`
   - `file-lifecycle-outbox.service.spec.ts`
   - `sync-orphan-cleanup.service.spec.ts`
   - `test/sync-internal-metrics.e2e-spec.ts`
   - `test/sync-internal-outbox.e2e-spec.ts`
2. PC：
   - `path-normalizer.spec.ts`
   - `recovery-coordinator.spec.ts`
   - `sync-engine/executor.spec.ts`
   - `sync-engine/index.spec.ts`
3. Mobile：
   - `path-normalizer.spec.ts`
   - `recovery-coordinator.spec.ts`
   - `executor.spec.ts`
   - `index.spec.ts`

### 7.3 全仓上线闸门

1. `pnpm lint`：通过。
2. `pnpm typecheck`：通过。
3. `pnpm test:unit`：通过。
4. 历史 auth store / router 测试红灯已通过共享安全存储适配和 PC Vitest `localStorage` 规范化修复完成清零。
5. 上线前还必须完成一次压测验证，至少满足以下目标：
   - `diff`：100 个文件动作，P99 < 500ms
   - `commit`：100 个 receipts，P99 < 2s
   - `cleanup-orphans`：100 个对象，P99 < 2s
   - `outbox claim`：单批最大 100 条事件，lease 过期后可重复 claim

## 8. 当前实现判断

1. 云同步主协议已经完成最佳实践级收口。
2. 2026-03-06 PR 评论补充收口已继续完成：
   - download URL 不再把 `expectedSize` 作为签名合同的一部分；
   - commit receipt 已补 `fileId` 级重复拒绝；
   - PC no-op sync 已移除未配对的 `activityTracker.endSync()`；
   - PC/Mobile 任意 `commit success=false` 都会统一进入 `needs_recovery`，不再把“无 conflicts 的非成功 commit”误报成同步成功。
3. 其余外部 review 中被判定为误读或仅文档问题的项，不进入本轮实现范围。
4. 当前实现允许四种能力组合独立成立：
   - `sync on + vectorize off`
   - `sync off + vectorize on`
   - `sync on + vectorize on`
   - `sync off + vectorize off`
5. 后续如果继续接 Memox，只需要新增 outbox consumer，而不是回改 sync 主链路。
6. 当前文档状态为 `completed`，表示 cloud-sync 统一实现已经按本文档落地。

## 9. 最小长期运行清单（不过度设计）

> 目标：如果业务要求只是“云同步长期稳定可用，用户正常使用无明显问题”，则在当前协议与架构基础上，优先补齐以下最小闭环；不需要再重做主协议，也不需要引入更重的协同系统。

### 9.1 必须做

1. 真实备份与恢复演练：
   - PostgreSQL 必须有定时备份或快照；
   - R2 bucket 必须有备份、复制或等价恢复手段；
   - 至少完成一次真实恢复演练，验证 `SyncFile` / `VaultDevice` / `FileLifecycleOutbox` 与对象存储 revision 能对应回去。
2. 外部监控与告警：
   - 不能只依赖进程内 metrics；
   - 至少把 `commit.failures`、`commit.conflicts`、`orphanCleanup.retried`、`outbox.pendingCount` 接入外部采集与告警。
3. 固定冒烟回归场景：
   - 单设备 upload / download / delete；
   - 双设备并发修改同一文件并生成 conflict copy；
   - `prepared` 阶段异常退出后恢复；
   - `committed` 阶段异常退出后恢复。
4. 服务端定时 orphan sweep：
   - 在客户端恢复驱动之外，增加服务端周期性清理；
   - 只删除“当前 `SyncFile` 已不再引用的 revision object”，不改变现有协议。

### 9.2 用户交互约束（简单、直觉、Notion 风格）

1. 默认“少打扰”：
   - 同步成功时只保留安静的状态反馈，不弹成功 toast，不制造额外流程感；
   - 用户主要感知应该是“内容自然保持一致”，而不是“我在操作一个同步系统”。
2. 状态文案必须面向普通用户：
   - 允许展示 `Synced / Syncing / Needs attention / Offline` 这类直觉状态；
   - 禁止在主界面暴露 `receiptToken`、`actionId`、`vectorClock`、`storageRevision` 等协议术语。
3. 失败态优先给动作，不优先给技术细节：
   - `needs_recovery` 应翻译为用户可理解的状态，例如“Sync needs attention”；
   - 必须配套一个明确动作入口，如 `Resume recovery`、`Try again`，避免让用户自己猜下一步。
4. 冲突体验遵循 Notion 式“保守但不惊扰”：
   - 不追求自动 merge；
   - 明确告诉用户“保留了本地与远端两份内容”，并能直接定位冲突副本；
   - 不使用高压、技术化或带责备感的提示文案。
5. 同步入口做减法：
   - 主界面只保留一个稳定的同步状态入口；
   - 不在多个页面重复堆叠“立即同步 / 强制恢复 / 高级诊断”等并列操作。
6. 诊断信息分层展示：
   - 默认层只展示状态、最后同步时间、是否需要用户处理；
   - 日志、错误细节、对象清理等高级诊断只放在设置页或开发排障入口，不进入主路径。

### 9.3 建议做

1. 冲突体验最小可理解化：
   - 用户侧需要明确知道“发生了冲突，系统保留了两份内容”；
   - 至少提供 conflict copy 的提示与快速定位能力。
2. 下游 projection 积压观测：
   - 将 `outbox.pendingCount` 持续增长视为独立问题处理；
   - 不回改 sync 主链路，只排查 consumer 处理能力与 ack 推进。

### 9.4 可以暂缓

1. `SyncFile` tombstone GC：
   - 当前永久 tombstone 保留可以接受；
   - 在存量规模没有形成明显成本前，不必优先做物理删除策略。
2. outbox lease 续租：
   - 当前 `claim -> process -> ack` 已足够支撑现阶段；
   - 除非 consumer 处理时间经常超过 `leaseMs`，否则不必先做续租。
3. `SYNC_ACTION_SECRET` / `INTERNAL_API_TOKEN` 的 grace-period 轮换：
   - 当前“整组实例同步切换”虽不优雅，但可运行；
   - 在运维复杂度未明显上升前，可暂缓。
4. 自动 conflict merge：
   - 容易引入额外错误与复杂度；
   - 当前以“保留冲突副本、不丢数据”为目标已经足够。

### 9.5 结论

1. 当前 cloud-sync 主协议已经足够支撑长期运行，不需要再做架构级重写。
2. 若只追求“长期稳定可用”，优先级应固定为：
   - 备份恢复
   - 外部监控告警
   - 固定冒烟回归
   - 服务端 orphan sweep
3. 在用户体验上，默认约束应固定为“少打扰、少术语、少入口、明确下一步”，整体交互接近 Notion 式的安静与直觉，而不是工程工具式同步面板。
4. 上述清单完成后，cloud-sync 可以进入“持续运营优化”阶段，而不是继续做协议大改。

## 10. 2026-03-08 交互与观测收口进度

> 本节用于回写本轮“代码侧现在就要做”的四步实施状态，确保文档、实现与回归基线同步推进。

### 10.1 Step 1：`needs_recovery` 用户化呈现（completed）

1. PC 与 Mobile 都保留内部状态 `needs_recovery` 作为协议事实源，不在主界面直接暴露该术语。
2. 两端新增统一状态派生层：
   - PC：`sync-status-model.ts`
   - Mobile：`status-presentation.ts`
3. UI 统一映射为 `Needs attention + Resume Recovery`：
   - 顶部状态、hover card、设置页、workspace sheet 都只展示用户可理解状态；
   - 恢复动作继续复用既有 `triggerSync()` / recovery coordinator，不新增第二套恢复 API。
4. `offline`、`setup`、`recovery` 也统一走同一派生层，避免多处组件各自解释 engine status。

### 10.2 Step 2：冲突副本提示与直达入口（completed）

1. PC/Mobile `sync-engine` 会在成功同步且存在 `conflictEntries` 时写入 `SyncNotice`，作为用户态冲突提示的单一事实源。
2. `SyncNotice` 当前收口为 `conflict_copy_created`，承载冲突副本 `fileId/path` 列表；数据层保留全部冲突项。
3. 主路径交互保持“保守但不惊扰”：
   - 默认只展示安静提示，不弹成功 toast；
   - 顶部/设置页/workspace sheet 统一支持 `Open Conflict Copy`；
   - 当前默认直达第一条冲突副本，避免在主路径引入多余选择流程。
4. 冲突提示不会替代同步成功态本身；当所有动作已完成时，主状态仍是 `Synced`，冲突提示作为次级 callout 存在。

### 10.3 Step 3：周期 telemetry snapshot 与阈值告警（completed）

1. Server 继续以 `SyncTelemetryService` 作为观测事实源，不新增第二套 reporter。
2. `reportPeriodicSnapshot()` 现由 `@Cron(CronExpression.EVERY_10_MINUTES)` 调度，固定每 10 分钟输出一次结构化 snapshot。
3. 周期告警规则固定为：
   - `commit.failures`
   - `commit.conflicts`
   - `orphanCleanup.retried`
   - `outbox.pendingCount`
4. `commit.failures / commit.conflicts / orphanCleanup.retried` 使用“相对上次 snapshot 的新增量”做 warn，避免重复报总量；`outbox.pendingCount` 保持 gauge 语义，按当前值告警。
5. 阈值继续从 `SYNC_TELEMETRY_*_WARN_THRESHOLD` 读取；未配置时使用默认阈值，runbook 与测试基线同步以该行为为准。

### 10.4 Step 4：真场景回归测试收口（completed）

1. PC：
   - `sync-engine/__tests__/index.spec.ts` 固定 `needs_recovery` 与 conflict notice 行为；
   - `__tests__/recovery-coordinator.spec.ts` 固定 `prepared/committed` 恢复链路；
   - `sync-engine/__tests__/executor.spec.ts` 现补齐 upload / download / delete / conflict 关键 action 回归；
   - `sync-status-model.test.ts` 固定用户态状态映射。
2. Mobile：
   - `lib/cloud-sync/__tests__/index.spec.ts` 固定 `needs_recovery` 与 notice；
   - `recovery-coordinator.spec.ts` 固定 journal 恢复；
   - `executor.spec.ts` 继续作为最接近真实文件副作用的 action 回归基线；
   - `status-presentation.spec.ts` 固定用户态状态映射；
   - `mobile/vitest.config.ts` 已把 unit test include 收口为 `lib/**/*.spec.ts`，确保 `status-presentation.spec.ts` 这类同目录 spec 进入默认 `test:unit` 闸门。
3. Server：
   - `sync-telemetry.service.spec.ts` 固定 snapshot 聚合、fresh-delta warn 与 `outbox.pendingCount` gauge 告警行为。
4. 经过这轮收口后，本轮四个最小稳定场景已经有明确测试落点：
   - 单设备 upload / download / delete
   - 冲突副本保留
   - `prepared` 阶段恢复
   - `committed` 阶段恢复

### 10.5 Review follow-up：状态映射与 stale notice 收口（completed）

1. PC/Mobile 用户态状态映射继续以“是否仍有有效 binding”作为 setup/offline 的分界，不再把 `stay_offline`、auto-bind 失败或无绑定离线场景错误映射成 `Try Again`。
2. PC/Mobile 的 no-op 成功同步现在也会清理历史 `conflict_copy_created` notice，保证冲突提示只代表本次最近一次真实冲突，不会跨后续空同步残留。
3. PC renderer `sync-status-indicator.tsx` 的 tooltip 改为按当前状态即时计算，避免在同一 `needs-attention` tone 内切换 setup/offline/recovery 时显示旧文案。
4. Mobile 设置页与 workspace sheet 继续保持 `Synced` 为主状态标题，冲突提示只作为次级 callout / hint，不提升为主状态。
