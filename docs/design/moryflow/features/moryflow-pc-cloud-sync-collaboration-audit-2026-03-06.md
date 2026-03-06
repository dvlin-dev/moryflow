---
title: Moryflow PC 云同步/协同深度审计（2026-03-06）
date: 2026-03-06
scope: apps/moryflow/pc, apps/moryflow/server, docs/design/moryflow/features
status: active
---

<!--
[INPUT]: Moryflow PC 云同步/协同相关设计文档与实现代码
[OUTPUT]: 功能正常性判断 + 最佳实践评估 + 风险分级与修复优先级
[POS]: Moryflow PC 云同步/协同审计事实源

[PROTOCOL]: 本文件变更时同步更新 `docs/design/moryflow/features/index.md`、`docs/index.md` 与 `docs/CLAUDE.md`。
-->

# Moryflow PC 云同步/协同深度审计

## 1. 审计范围与方法

### 1.1 审计范围

1. 文档事实源：
   - `docs/design/moryflow/features/cloud-sync-unified-implementation.md`
   - `docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md`（协同实时同步）
   - `docs/design/moryflow/core/ui-conversation-and-streaming.md`
2. PC 云同步主链路：
   - `apps/moryflow/pc/src/main/cloud-sync/**`
   - `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
3. 服务端同步主链路：
   - `apps/moryflow/server/src/sync/**`
   - `apps/moryflow/server/prisma/schema.prisma`
4. 协同实时链路（会话正文事件）：
   - `apps/moryflow/pc/src/main/chat/broadcast.ts`
   - `apps/moryflow/pc/src/main/chat/handlers.ts`
   - `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-stored-messages.ts`
5. 跨端对照（用于判断是否 PC 特有问题）：
   - `apps/moryflow/mobile/lib/cloud-sync/**`
   - `apps/moryflow/mobile/lib/vault/file-index/**`

### 1.2 方法与限制

1. 本次采用“源码静态审计 + 协议一致性核对 + PC/Mobile 对照 + 定向回归测试”联合方法。
2. 已完成受影响模块运行态验证（Server/PC/Mobile 定向单测；Server/PC typecheck）。
3. 限制项：
   - 尚未执行真实双设备并发 E2E（upload/download/delete 混合）；
   - Mobile `check:type` 存在历史遗留报错（`ChatSessionSummary.mode`、`runtime/session-store`），与本轮 cloud-sync 改动无直接关系。

## 2. 文档与实现一致性结论

### 2.1 已存在且可定位的核心文档

1. 云同步单一事实源文档存在且结构完整：`cloud-sync-unified-implementation.md`。
2. 协同实时同步（chat message event）文档存在且含执行回写：`moryflow-pc-telegram-integration-architecture.md` 第 29 节。

### 2.2 文档漂移问题（已修复）

1. 已完成 cloud-sync 相关失效引用收敛（`docs/products/...` -> `docs/design/moryflow/features/...`）：
   - `apps/moryflow/pc/src/main/cloud-sync/index.ts:5`
   - `apps/moryflow/pc/src/main/cloud-sync/auto-binding.ts:6`
   - `apps/moryflow/pc/src/main/CLAUDE.md:68`
   - `apps/moryflow/pc/src/renderer/CLAUDE.md:93`

结论：cloud-sync 范围内的文档漂移已收口，引用路径已统一到 `docs/design/moryflow/features/*`。

## 3. 功能正常性评估

### 3.1 结论摘要

1. 协同（Chat 正文实时同步）主链路整体可用，设计与实现一致性较好。
2. 云同步链路原有 P0/P1 问题已按本审计计划完成修复并通过定向回归，当前可判定为“主链路功能正常（定向验证范围内）”。

### 3.2 第一轮关键问题（已确认）

#### P0-1 本地删除可能无法正确上云，存在“删除后回弹”风险

1. `scanAndCreateIds` 会直接清理本地已不存在的索引条目：
   - `apps/moryflow/pc/src/main/cloud-sync/file-index/index.ts:120-123`
2. `unlink` 事件处理中又会提前删除索引条目：
   - `apps/moryflow/pc/src/main/cloud-sync/sync-engine/index.ts:312-314`
3. 但 tombstone 生成依赖“索引条目仍存在且文件缺失”：
   - `apps/moryflow/pc/src/main/cloud-sync/sync-engine/executor.ts:218-237`

影响：删除语义可能丢失，服务端无法收到删除意图，后续 diff 可能把远端文件重新下载回本地。

#### P0-2 进入 `offline` 后恢复路径不闭环，可能长期卡死

1. 同步入口对 `offline` 直接早退：
   - `apps/moryflow/pc/src/main/cloud-sync/sync-engine/index.ts:83`
2. 网络/服务异常会把状态置为 `offline`：
   - `apps/moryflow/pc/src/main/cloud-sync/sync-engine/index.ts:176`
   - `apps/moryflow/pc/src/main/cloud-sync/sync-engine/index.ts:184`
3. 手动触发同步仍走同一早退路径：
   - `apps/moryflow/pc/src/main/cloud-sync/sync-engine/index.ts:344-346`

影响：网络短暂波动后可能无法自动或手动恢复，仅依赖外部 reinit（如重新登录/重启/切换 Vault）。

#### P0-3 路径边界缺失，存在路径穿越写入风险

1. 服务端 path 校验过宽，仅 `z.string().min(1)`：
   - `apps/moryflow/server/src/sync/dto/sync.dto.ts:30`
2. 客户端下载/冲突副本直接 `path.join(vaultPath, action.path)` 写盘：
   - `apps/moryflow/pc/src/main/cloud-sync/sync-engine/executor.ts:294`
   - `apps/moryflow/pc/src/main/cloud-sync/sync-engine/executor.ts:437`
3. 冲突副本名含设备名拼接，未做文件名净化：
   - `apps/moryflow/server/src/sync/sync-diff.ts:204-210`

影响：若服务端存入恶意 path（含 `../`），客户端可能写出 Vault 边界。

#### P1-1 服务端 commit 的文件归属校验不足（跨 Vault 风险）

1. `SyncFile.id` 为全局主键：
   - `apps/moryflow/server/prisma/schema.prisma:416`
2. commit upsert 仅按 `id` 定位，不校验 `vaultId` 归属：
   - `apps/moryflow/server/src/sync/sync.service.ts:195-214`
3. `calculateSizeDelta` 查询也未按 `vaultId` 过滤：
   - `apps/moryflow/server/src/sync/sync.service.ts:454-457`

影响：若 fileId 泄露，可产生跨 Vault 元数据污染与用量统计偏差风险。

#### P1-2 `.markdown` 文件在部分配置下无法进入同步

1. 扫描器仅纳入 `.md`：
   - `apps/moryflow/pc/src/main/cloud-sync/file-index/scanner.ts:37`
2. 运行时却认为 `.markdown` 也是 Markdown：
   - `apps/moryflow/pc/src/main/cloud-sync/sync-engine/executor.ts:104-107`
3. 本地变更检测只遍历 FileIndex 条目：
   - `apps/moryflow/pc/src/main/cloud-sync/sync-engine/executor.ts:149`

影响：`vectorizeEnabled=false` 或向量化被尺寸限制跳过时，`.markdown` 可能永远没有 fileId，无法同步。

#### P1-3 云同步核心测试覆盖明显不足

当前仅看到 3 个 PC 云同步单测文件：

1. `detect-local-changes.spec.ts`
2. `executor.spec.ts`
3. `apply-changes.spec.ts`

缺口：`sync-engine/index.ts`（状态机/恢复）、`auto-binding.ts`、`binding-conflict.ts`、`scheduler.ts`、`state.ts` 基本无回归保护。

### 3.3 第二轮新增深挖问题（本次补充）

#### P0-4 服务端乐观锁覆盖面不足，`download/delete` 无并发前置条件，存在“最后写覆盖”风险

1. 服务端仅对 `completed` 中携带 `expectedHash` 的项做冲突校验：
   - `apps/moryflow/server/src/sync/sync.service.ts:136-173`
2. PC 端 `download` 完成上报未带 `expectedHash`：
   - `apps/moryflow/pc/src/main/cloud-sync/sync-engine/executor.ts:352-360`
   - `apps/moryflow/pc/src/main/cloud-sync/sync-engine/executor.ts:400-408`
3. `delete` 仅进入 `deleted[]`，同样没有并发前置条件：
   - `apps/moryflow/pc/src/main/cloud-sync/sync-engine/executor.ts:422-429`
   - `apps/moryflow/server/src/sync/sync.service.ts:217-228`

影响：并发设备下，下载回写/删除可覆盖他端更晚提交，冲突无法被协议层显式感知。

#### P0-5 冲突副本命名存在跨平台与注入风险

1. 冲突文件名直接拼接 `deviceName`，未做字符净化：
   - `apps/moryflow/server/src/sync/sync-diff.ts:204-210`
2. 时间戳模板包含 `:`，在 Windows 文件名非法：
   - `apps/moryflow/server/src/sync/sync-diff.ts:208`

影响：Windows 端可能写盘失败；恶意设备名可污染路径/文件名语义（例如注入分隔符或可疑片段）。

#### P0-6 提交流程“先删 R2 后写 DB”，失败时可能出现存储与元数据不一致

1. 删除对象存储发生在事务外且早于 DB 事务：
   - `apps/moryflow/server/src/sync/sync.service.ts:175-178`
2. 随后才进入 DB 事务更新 `SyncFile` 与用量：
   - `apps/moryflow/server/src/sync/sync.service.ts:183-248`

影响：事务回滚或中途异常时，R2 已删除而 DB 仍显示可用，形成“元数据存在、实体缺失”。

#### P1-4 `syncState.reset()` 未清理 `lastSyncAt`，切换工作区可能展示旧状态

1. `lastSyncAt` 有独立状态字段：
   - `apps/moryflow/pc/src/main/cloud-sync/sync-engine/state.ts:24`
2. `reset()` 未重置 `lastSyncAt`：
   - `apps/moryflow/pc/src/main/cloud-sync/sync-engine/state.ts:173-189`

影响：用户切换 Vault/账号后可能看到历史同步时间，状态感知失真。

#### P1-5 `cachedUserId` 为全局缓存且未按 token 维度隔离，存在账号切换误判风险

1. PC 端用户 ID 缓存是单一全局变量：
   - `apps/moryflow/pc/src/main/cloud-sync/user-info.ts:16`
2. 仅在 token 为空或显式 reset 时清理：
   - `apps/moryflow/pc/src/main/cloud-sync/user-info.ts:24-27`
   - `apps/moryflow/pc/src/main/cloud-sync/binding-conflict.ts:118-121`
3. 主进程监听只在登出（token 为空）分支执行 reset：
   - `apps/moryflow/pc/src/main/index.ts:352-357`

影响：若出现“旧 token -> 新 token”且无空窗的切换路径，绑定冲突检测可能基于旧用户 ID。

### 3.4 闭环状态（2026-03-06 执行后）

1. P0-1（删除回弹）已修复：
   - 代码：`file-index` 保留已同步缺失条目用于 tombstone；`delete` 不再提前剔除已同步条目。
   - 验证：`apps/moryflow/pc/src/main/cloud-sync/file-index/__tests__/index.spec.ts`（新增 tombstone 保留回归）。
2. P0-2（offline 恢复断路）已修复：
   - 代码：`offline` 语义拆分 `user | error`；仅 `offline+user` 早退，`triggerSync` 可恢复。
   - 验证：PC `sync-engine/state.spec.ts`；Mobile `sync-engine-store.spec.ts` + executor 相关回归。
3. P0-3（路径边界）已修复：
   - 代码：Server `SafeRelativePathSchema`；PC/Mobile `resolveSafePath` 写盘边界校验。
   - 验证：`sync.dto.spec.ts`、PC/Mobile `executor.spec.ts` 的路径穿越用例。
4. P1-1（fileId 跨 Vault）已修复：
   - 代码：`commitSync` 增加 fileId 归属校验；`calculateSizeDelta` 改为使用同 vault 已查询映射。
   - 验证：`sync.service.spec.ts`（跨 vault 抛 `ForbiddenException`）。
5. P1-2（`.markdown` 漏同步）已修复：
   - 代码：PC/Mobile 扫描口径统一 `.md + .markdown`。
   - 验证：PC `file-index/index.spec.ts` 中 `.markdown` 回归；Mobile 云同步回归通过。
6. P1-3（测试覆盖不足）已部分修复：
   - 新增：Server `sync.service.spec.ts`、`sync/dto/sync.dto.spec.ts`；PC `file-index/index.spec.ts`、`sync-engine/state.spec.ts`、`cloud-sync/user-info.spec.ts`。
   - 说明：`auto-binding/binding-conflict/scheduler` 仍缺专门回归，见第 10 节后续建议。
7. P0-4（download/delete 无并发前置）已修复：
   - 代码：`deleted` 协议改为 `{ fileId, expectedHash? }`；服务端对 upload/download/delete 统一 expectedHash 校验。
   - 验证：`sync.service.spec.ts`（delete expectedHash 冲突）；PC/Mobile `executor.spec.ts`（delete 上报 expectedHash）。
8. P0-5（冲突命名风险）已修复：
   - 代码：`deviceName` 白名单净化；时间戳去 `:`（`HH-mm`）。
   - 验证：`sync-diff.spec.ts`（冲突名净化）。
9. P0-6（先删 R2 后写 DB）已修复：
   - 代码：R2 删除动作后置到 DB 事务成功后执行。
   - 验证：`sync.service.spec.ts`（调用顺序断言）。
10. P1-4（reset 未清理 lastSyncAt）已修复：
    - 代码：`syncState.reset()` 增加 `lastSyncAt = null` 与 `offlineReason = null`。
    - 验证：PC `sync-engine/state.spec.ts`。
11. P1-5（userId 缓存未按 token 隔离）已修复：
    - 代码：缓存改为 `{ token, userId }`；主进程监听 token 变化主动清缓存。
    - 验证：PC `cloud-sync/user-info.spec.ts`。

## 4. 跨端对照（PC vs Mobile）

### 4.1 共享问题收口情况（非 PC 特有）

1. Mobile 端已同步收口 `offline` 恢复断路、路径边界校验、`.markdown` 扫描与删除语义。
2. PC/Mobile 在核心同步协议上的分歧已显著下降，问题已从“协议层系统性风险”降为“测试覆盖与工程化完善”。

### 4.2 差异点

1. Mobile 云同步测试文件数仍低于 PC 当前 cloud-sync 回归文件数：
   - Mobile: `file-collector.spec.ts`, `detect-local-changes.spec.ts`, `sync-engine-store.spec.ts`, `executor.spec.ts`
   - PC: `detect-local-changes.spec.ts`, `executor.spec.ts`, `apply-changes.spec.ts`, `state.spec.ts`, `file-index/index.spec.ts`, `user-info.spec.ts`
2. Mobile 将变更构建逻辑拆到 `file-collector-core.ts`，纯函数测试可维护性更好。

## 5. 协同（实时同步）评估

### 5.1 正向结论

1. 主进程已经实现“会话摘要事件”和“正文事件”解耦：
   - `apps/moryflow/pc/src/main/chat/broadcast.ts:34-45`
   - `apps/moryflow/pc/src/main/chat/broadcast.ts:55-84`
2. Renderer 侧有按 session 隔离的 revision 新鲜度保护，能避免旧快照覆盖新事件：
   - `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-stored-messages.ts:46-76`
   - `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-stored-messages.ts:109-123`

### 5.2 结论

协同实时链路“架构方向正确、实现较稳”，相较云同步模块风险显著更低。

## 6. 最佳实践评估

### 6.1 已符合

1. 使用向量时钟做冲突关系判断（`compareVectorClocks`）。
2. commit 成功后再回写 FileIndex（主原则正确）。
3. 协同消息链路做了 revision 语义收敛（避免消息回滚闪烁）。

### 6.2 偏离项

1. legacy 历史对象（无 `storageRevision`）仍需依赖 delayed cleanup + DB/hash 双确认，尚未完成全量 metadata backfill。
2. 尚缺真实多设备并发 E2E 用例（当前以单元回归为主）。
3. 前端状态治理与规范仍有偏差：`use-cloud-sync` 仍是 hook 内局部状态 + 直接 IPC 调用，未完全收敛到 Store-first 约束（参见 `docs/design/moryflow/core/ui-conversation-and-streaming.md:24-26`）。

## 7. 执行计划完成状态（2026-03-06）

1. Task A（服务端协议与一致性）已完成：
   - 完成项：commit 并发校验扩展到 download/delete、fileId 归属校验、sizeDelta 同源映射、R2 删除后置、路径与冲突命名安全收口。
   - 关键文件：`apps/moryflow/server/src/sync/dto/sync.dto.ts`、`apps/moryflow/server/src/sync/sync.service.ts`、`apps/moryflow/server/src/sync/sync-diff.ts`。
2. Task B（PC 状态机与索引语义）已完成：
   - 完成项：删除语义保留 tombstone、offline reason 拆分、写盘边界校验、`.markdown` 扫描、`reset` 状态清理、token 维度 userId 缓存。
   - 关键文件：`apps/moryflow/pc/src/main/cloud-sync/**`、`apps/moryflow/pc/src/main/index.ts`。
3. Task C（Mobile 同构修复）已完成：
   - 完成项：offline 恢复链路、写盘边界校验、`.markdown` 扫描、删除语义与 PC 对齐。
   - 关键文件：`apps/moryflow/mobile/lib/cloud-sync/**`、`apps/moryflow/mobile/lib/vault/file-index/**`。
4. Task D（回归测试矩阵）已完成本轮计划内目标：
   - 新增/扩展测试：Server/PC/Mobile 共 10+ 条关键回归（并发、路径、删除、状态、缓存）。
5. Task E（文档回写）已完成：
   - 本文档 + `docs/design/moryflow/features/index.md` + `docs/index.md` + `docs/CLAUDE.md` 已同步更新。

## 8. 回归验证结果（执行证据）

1. Server：
   - `pnpm --filter @moryflow/server test -- src/sync/sync.service.spec.ts src/sync/sync-diff.spec.ts src/sync/dto/sync.dto.spec.ts`（通过，11 tests）
   - `pnpm --filter @moryflow/server typecheck`（通过）
2. PC：
   - `pnpm --filter @moryflow/pc exec vitest run src/main/cloud-sync/file-index/__tests__/index.spec.ts src/main/cloud-sync/__tests__/user-info.spec.ts src/main/cloud-sync/sync-engine/__tests__/state.spec.ts src/main/cloud-sync/sync-engine/__tests__/executor.spec.ts src/main/cloud-sync/sync-engine/__tests__/detect-local-changes.spec.ts src/main/cloud-sync/sync-engine/__tests__/apply-changes.spec.ts`（通过，17 tests）
   - `pnpm --filter @moryflow/pc typecheck`（通过）
3. Mobile：
   - `pnpm --filter @moryflow/mobile exec vitest run lib/cloud-sync/__tests__/detect-local-changes.spec.ts lib/cloud-sync/__tests__/executor.spec.ts lib/cloud-sync/__tests__/file-collector.spec.ts lib/cloud-sync/__tests__/sync-engine-store.spec.ts`（通过，16 tests）
   - `pnpm --filter @moryflow/mobile check:type`（未通过；为 cloud-sync 范围外历史问题，详见第 1.2 节）

## 9. 最终判断（执行后）

1. 云同步：在本轮审计覆盖的问题域内，核心 P0/P1 缺陷已完成修复并通过定向回归，可判定为“主链路功能正常（定向验证范围内）”。
2. 协同：实时正文同步链路继续保持稳定，未发现新增回归风险。
3. 最佳实践：协议边界安全、并发控制、状态机恢复、跨端一致性已显著提升；但在 legacy 对象 metadata 补齐与 E2E 覆盖方面仍有改进空间。

## 10. 剩余风险与后续建议

1. 建议增加历史对象 `storageRevision` metadata backfill / 巡检任务，逐步消化 legacy cleanup 风险窗口。
2. 建议补齐双设备并发 E2E（upload/download/delete 混合），将目前单测层面的保证扩展到系统级验证。
3. 建议继续补充 `auto-binding`、`binding-conflict`、`scheduler` 的专门回归用例，降低后续演进回归概率。

## 11. 第三轮问题与修复闭环（2026-03-06，completed）

### 11.1 新发现问题

1. 服务端 `commitSync` 在事务后执行 R2 删除时，仅记录日志，不做持久化补偿；且 `storageClient.deleteFiles()` 返回 `false` 时当前实现不会进入异常分支，删除失败会被静默吞掉。
2. Mobile 端 `cloud-sync/user-info.ts` 仍使用全局单值 `cachedUserId`，未按 token 维度隔离，账号切换后绑定冲突检测仍可能复用旧身份。
3. PC/Mobile 已补片段级回归，但 `sync-engine` 编排入口仍缺少“`offline_error` 可恢复、`offline_user` 仍阻断”这类主流程用例，测试证据还不够闭环。
4. 进一步走读发现，`sync` 当前对象键仍是 `{userId}/{vaultId}/{fileId}`，而本地 `fileId` 在 tombstone 保留语义下会被复用。即使补上删除补偿队列，只要删除链路仍是“按 `fileId` 盲删”，就仍存在“删除失败后，同一 `fileId` 被重新上传，新对象被首次删除或补偿任务误删”的代际竞争窗口。

### 11.2 本轮修复方案

1. 服务端一致性收口：
   - 为 sync 删除补偿引入持久化重试队列；
   - `deleteFiles()` 返回 `false` 或抛异常都统一入补偿队列；
   - 删除链路从“按 `fileId` 批量盲删”升级为“按 `storageRevision` 条件删除”：`SyncFile` 持久化对象 revision，上传对象写入 revision 元数据，首次删除与补偿删除都先校验对象代际再执行删除；
   - legacy 无 revision 的对象不再走不安全盲删，宁可保留待后续清理，也不允许误删新对象；
   - 补处理器与 service 回归测试，覆盖 `false/throw` 入补偿、revision 不匹配跳过删除、revision 匹配才允许删除。
2. Mobile 身份缓存收口：
   - 对齐 PC，改为 token 维度缓存；
   - 无 token 时清空缓存，token 变化时自动失效；
   - 补对应单测。
3. 状态机测试收口：
   - 新增 PC/Mobile `sync-engine` 编排级测试；
   - 覆盖 `offline_error` 可手动恢复、`offline_user` 仍早退的关键分支。

### 11.3 验收标准

1. R2 删除失败后存在可重试补偿路径，不能再出现“仅日志、无后续动作”。
2. 删除链路不能再因为 `fileId` 复用而误删新上传对象；首次删除与补偿删除都必须具备对象代际校验。
3. Mobile 在 token 切换场景下不会复用旧 userId。
4. `sync-engine` 主流程对 `offline` 两种语义的行为有自动化测试保护。

### 11.4 执行结果

1. 服务端删除链路已完成 revision 化收口：
   - `SyncFile` 新增 `storageRevision` 持久化字段，提交同步时写入/继承对象代际；
   - upload URL 下发 `storageRevision`，PC/Mobile executor 在实际上传时把 `contentHash` 回带到 storage upload endpoint，R2 对象元数据保存 `storagerevision/contenthash`；
   - `commitSync` 事务后的首次删除不再走 `deleteFiles(fileIds)` 盲删，而是统一走 `SyncStorageDeletionService`：先 `head` 校验 `storageRevision`，再以 `If-Match ETag` 条件删除，避免 head/delete 间再次发生对象覆盖导致误删；
   - 删除失败或 legacy 无 revision 的对象统一进入补偿队列；补偿处理器与首次删除复用同一删除服务，避免主链路与补偿链路语义分叉。
2. legacy 对象安全策略已落地：
   - 对于旧对象（无 `storageRevision`），首次删除不再做不安全盲删，而是转入 delayed cleanup；
   - delayed cleanup 先校验 DB tombstone 仍存在且 `contentHash` 未变，再校验当前对象 hash，最后仍使用 `If-Match ETag` 删除；
   - 这使 legacy 对象至少具备“删除前双重确认”，显著降低误删窗口。
3. Mobile 用户缓存问题已完成：
   - `cloud-sync/user-info.ts` 改为 `{ token, userId }` 缓存；
   - 无 token 清空缓存，token 变化自动失效。
4. PC/Mobile 编排级测试已完成：
   - 新增 `sync-engine/index.spec.ts`（PC/Mobile），明确 `offline_user` 继续阻断、`offline_error` 可以恢复重试。

### 11.5 验证证据

1. Server 定向单测：
   - `pnpm --filter @moryflow/server test -- src/sync/sync-storage-deletion.service.spec.ts src/sync/sync.service.spec.ts src/sync/sync-cleanup.processor.spec.ts src/sync/sync-diff.spec.ts src/sync/dto/sync.dto.spec.ts src/sync/sync-quota.spec.ts`
   - 结果：6 files passed, 22 tests passed。
2. PC 定向单测：
   - `pnpm --filter @moryflow/pc exec vitest run src/main/cloud-sync/sync-engine/__tests__/executor.spec.ts src/main/cloud-sync/sync-engine/__tests__/index.spec.ts src/main/cloud-sync/__tests__/user-info.spec.ts src/main/cloud-sync/file-index/__tests__/index.spec.ts src/main/cloud-sync/sync-engine/__tests__/state.spec.ts src/main/cloud-sync/sync-engine/__tests__/detect-local-changes.spec.ts src/main/cloud-sync/sync-engine/__tests__/apply-changes.spec.ts`
   - 结果：7 files passed, 19 tests passed。
3. Mobile 定向单测：
   - `pnpm --filter @moryflow/mobile exec vitest run lib/cloud-sync/__tests__/executor.spec.ts lib/cloud-sync/__tests__/index.spec.ts lib/cloud-sync/__tests__/user-info.spec.ts lib/cloud-sync/__tests__/detect-local-changes.spec.ts lib/cloud-sync/__tests__/file-collector.spec.ts lib/cloud-sync/__tests__/sync-engine-store.spec.ts`
   - 结果：6 files passed, 21 tests passed。
4. 受影响包类型校验：
   - `pnpm --filter @moryflow/api build`：通过；
   - `pnpm --filter @moryflow/server typecheck`：通过；
   - `pnpm --filter @moryflow/pc typecheck`：通过；
   - `pnpm --filter @moryflow/mobile check:type`：仍失败，但失败项为既有历史问题（`ChatSessionSummary.mode`、`agent-runtime runtime default` 等），不在 cloud-sync 本轮改动范围。
5. 根级验证：
   - `pnpm lint`：通过（存在 `apps/moryflow/server/src/auth/auth-social.controller.ts` 的既有 warning，不阻断）；
   - `pnpm typecheck`：通过；
   - `pnpm test:unit`：失败，但失败项位于 `@moryflow/admin` / `@anyhunt/admin` 既有认证 store/router 测试，不是本轮 cloud-sync 引入。

### 11.6 最终判断与剩余风险

1. 第三轮新增发现的问题已按根因完成收口，尤其是对象删除从“按 fileId 盲删”升级到了“按对象代际安全删”，这解决了本轮审计里最深层的误删风险。
2. 在“当前协议 + 当前代码库”约束下，云同步主链路已达到可接受的最佳实践水平：
   - 并发校验覆盖 upload/download/delete；
   - 删除链路具备事务后执行、条件删除、失败补偿与 replay safety；
   - PC/Mobile 对 `offline` 语义、token 缓存语义、tombstone 语义已对齐。
3. 仍保留一项有限 legacy 风险：
   - rollout 之前已存在且尚未重写 metadata 的旧对象，只能走 delayed cleanup + DB/hash 双确认，虽然已经显著降低误删概率，但严格来说仍不如 revisioned object 那样“代际绝对可判定”；
   - 该风险仅影响历史对象，不影响本轮之后的新上传对象。
