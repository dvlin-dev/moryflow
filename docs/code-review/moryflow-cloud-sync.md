---
title: Moryflow Cloud Sync Code Review
date: 2026-01-25
scope: moryflow, pc, mobile, server, packages/api, packages/sync, docs
status: review
---

<!--
[INPUT]: PR #61 (dvlin-dev/cloud-sync-impl) 变更集合
[OUTPUT]: Code Review 结论 + 问题清单 + 重构建议
[POS]: Moryflow 云同步模块专项 Review

[PROTOCOL]: 本文件变更时，需同步更新 `docs/index.md` 与 `docs/CLAUDE.md`。
-->

# Moryflow Cloud Sync Code Review

## 评审范围

- PC/Mobile/Server 云同步主链路（detect → diff → execute → commit → apply）
- FileIndex v2 严格校验与 hash 预过滤
- 冲突副本上传与向量时钟合并
- 文档收敛与类型收敛（packages/api 为唯一协议源）

## 总体评价

整体方向正确：多端实现已对齐到“向量时钟 + 乐观锁 + 软删除”的统一模型，客户端改为**提交成功后再回写索引**，并补齐冲突副本与 expectedHash 逻辑。文档也已收敛为单一入口，便于维护。

但仍存在几处会影响一致性/数据正确性的缺口，需要尽快修复。

## 问题清单（必须修复）

| #   | Line                                                                   | Code                                                      | Issue                                                                                                                          | Potential Solution                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `apps/moryflow/mobile/lib/cloud-sync/file-collector.ts:106-110`        | `if (size && size > MAX_SYNC_FILE_SIZE) { ... continue }` | **大文件被跳过但未记录快照**，`buildLocalChanges` 会把此条目当作“文件不存在”，从而发 tombstone 导致远端误删。                  | 跳过时仍写入快照（`exists: true`），`contentHash` 使用 `lastSyncedHash`，或在 `buildLocalChanges` 中显式识别 `skipped` 状态避免 tombstone。并将判断改为 `size > MAX_SYNC_FILE_SIZE`。 |
| 2   | `apps/moryflow/pc/src/main/cloud-sync/sync-engine/executor.ts:305-327` | `vectorClock: pending?.vectorClock ?? {}`                 | **upload action 在无 pendingChanges 时会发送空向量时钟**，可能发生时钟回退并引发循环冲突（如“内容相同但远端落后”的快进场景）。 | fallback 为 `getEntry(...).vectorClock` 或 `localStates` 中的 clock；与 Mobile 行为保持一致。                                                                                         |
| 3   | `apps/moryflow/mobile/lib/cloud-sync/executor.ts:146-156`              | 下载分支只写新路径                                        | **rename/download 回退路径时未清理旧路径文件**，可能产生“旧文件残留 → 被扫描为新文件”的重复条目。                              | 下载前若 `localState.path !== action.path` 且旧文件存在，先删除或显式移动（与 PC 行为对齐）。                                                                                         |
| 4   | `apps/moryflow/server/src/sync/sync.service.ts:333-345`                | `totalNewSize += remoteSize`                              | **冲突额度预估偏大**：当 `localSize < remoteSize` 时，实际增量应为 `localSize`，当前逻辑会过度拒绝。                           | 冲突场景存储增量按 `localSize` 计算（`totalNewSize += localSize`），或显式公式：`totalNewSize += (localSize - remoteSize) + remoteSize`。                                             |

## 建议重构（非阻断，但建议纳入下一轮）

1. **抽离纯逻辑为共享模块**
   - 将 `file-collector-core` 扩展为 PC/Mobile 共享，避免双端逻辑漂移。
   - 把 `applyChangesToFileIndex` 与 action 执行结果的结构（Downloaded/Conflict）统一成共享类型。

2. **统一 clock/expectedHash 处理策略**
   - 约定 upload/completion 必须携带来源 clock（pending/local entry），避免分支差异。

3. **冲突与重命名的 “路径唯一性” 处理**
   - 在 apply 逻辑中统一处理 path 冲突清理（旧 path 删除/替换），避免 fileIndex 出现重复路径。

4. **大文件策略明确化**
   - 建议将 “跳过同步的大文件” 显式标记为 `skipped` 状态，并在 UI 层提示；避免 silent skip。

---

## 结论

本次改动已具备可上线的主链路，但以上 4 个问题会导致**数据一致性风险或额度误判**。建议在合并前修复问题清单，并将“建议重构”纳入下一轮迭代。
