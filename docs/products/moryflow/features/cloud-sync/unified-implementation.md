---
title: 云同步（统一方案与现状）
date: 2026-01-25
scope: moryflow, pc, mobile, server
status: active
---

<!--
[INPUT]: PC/Mobile/Server 云同步现状实现与协议
[OUTPUT]: 单一文档的统一方案 + 核心逻辑 + 代码索引
[POS]: Moryflow 云同步唯一入口文档（替代旧 tech/review/auto-binding）

[PROTOCOL]: 本文件变更时同步更新 `docs/products/moryflow/index.md`。
-->

# 云同步（统一方案与现状）

## TL;DR

- **核心一致性依据**：`fileId + vectorClock + lastSyncedHash`，提交成功后才回写 FileIndex。
- **冲突策略**：保留远端为冲突副本（`conflictCopyId`），本地版本覆盖云端原文件。
- **优化**：`lastSyncedSize/lastSyncedMtime` + hash cache 做预过滤，降低全量哈希开销。
- **绑定**：默认自动绑定，绑定记录写入 `userId` 用于账号切换冲突处理。

---

## 1. 当前实现架构（已落地）

```
PC / Mobile Client
├── FileIndex (fileId + vectorClock + lastSyncedHash + size/mtime)
├── Sync Engine (detect → diff → execute → commit → apply)
└── Cloud Sync API Client
        │
        │ HTTP API (Bearer token)
        ▼
Server (NestJS)
├── SyncService (diff/commit + conflict)
├── StorageClient (R2 预签名)
├── VaultService / QuotaService
└── PostgreSQL (SyncFile / VaultDevice / Vault)
        │
        ▼
Cloudflare R2 (object storage)
```

**代码索引（核心）**

| 模块                       | 路径                                                           |
| -------------------------- | -------------------------------------------------------------- |
| API 类型（唯一对外协议源） | `packages/api/src/cloud-sync/types.ts`                         |
| Server Diff/Commit         | `apps/moryflow/server/src/sync/sync.service.ts`                |
| Diff 纯函数                | `apps/moryflow/server/src/sync/sync-diff.ts`                   |
| PC Sync Engine             | `apps/moryflow/pc/src/main/cloud-sync/sync-engine/index.ts`    |
| PC Executor                | `apps/moryflow/pc/src/main/cloud-sync/sync-engine/executor.ts` |
| PC FileIndex               | `apps/moryflow/pc/src/main/cloud-sync/file-index/*`            |
| Mobile Sync Engine         | `apps/moryflow/mobile/lib/cloud-sync/sync-engine.ts`           |
| Mobile Executor            | `apps/moryflow/mobile/lib/cloud-sync/executor.ts`              |
| Mobile FileIndex           | `apps/moryflow/mobile/lib/vault/file-index/*`                  |

---

## 2. 数据结构（关键字段）

### 2.1 Client FileIndex（v2，严格校验）

```ts
FileEntry = {
  id: string
  path: string
  vectorClock: VectorClock
  lastSyncedHash: string | null
  lastSyncedClock: VectorClock
  lastSyncedSize: number | null
  lastSyncedMtime: number | null
}
```

- **v2 严格校验**：无旧版迁移；无效记录直接重置。
- `lastSyncedSize/lastSyncedMtime` 仅用于**跳过重复 hash**，不参与冲突判断。

### 2.2 Server SyncFile

```ts
SyncFile = {
  id: string
  vaultId: string
  path: string
  title: string
  size: number
  contentHash: string
  vectorClock: VectorClock
  isDeleted: boolean
}
```

### 2.3 VaultBinding（PC/Mobile）

```ts
VaultBinding = {
  localPath: string
  vaultId: string
  vaultName: string
  boundAt: number
  userId: string
}
```

---

## 3. 同步主流程（核心逻辑）

```text
init(vaultPath):
  load FileIndex + scan/create fileId
  if binding.userId != currentUserId -> binding conflict
  if no binding -> auto binding (list by name or create)
  performSync()

performSync():
  local = detectLocalChanges(vaultPath, deviceId)
  actions = syncDiff({ local })
  result = executeActions(actions)
  commit(result.completed, result.deleted)
  if commit.success:
    applyChangesToFileIndex(local.pendingChanges, result)
```

---

## 4. 本地变更检测（Client）

**目标**：只读扫描，计算 `localFiles` + `pendingChanges`，不直接改 FileIndex。

```text
detectLocalChanges():
  for entry in fileIndex:
    if file exists:
      if size/mtime == lastSyncedSize/lastSyncedMtime:
        hash = lastSyncedHash
      else if hashCache hit:
        hash = cached
      else:
        hash = computeHash(file)
      if hash != lastSyncedHash:
        clock = incrementClock(entry.vectorClock, deviceId)
        pendingChanges += modified/new
      else:
        clock = entry.vectorClock
      emit LocalFileDto
    else if lastSyncedHash != null:
      clock = incrementClock(entry.vectorClock, deviceId)
      emit tombstone (contentHash='')
```

**补充约束**

- Mobile 会跳过超大文件：`MAX_SYNC_FILE_SIZE = 10MB`。
- hash cache 超限会清空，保证内存上限。

---

## 5. Server Diff 规则（向量时钟）

**统一规则**：`compareVectorClocks(local, remote)` → `before/after/equal/concurrent`。

- **内容相同**：
  - 路径不同 → `after` 走 upload，其他走 download（同步重命名）。
  - `before` / `after` 允许“时钟快进”（download/upload）。
- **内容不同**：
  - `after` → upload
  - `before` → download
  - `equal` / `concurrent` → conflict
- **删除场景**：本地删除发 tombstone（`contentHash=''`），服务端按关系决定 delete / download。

---

## 6. Action 执行（Client）

### 6.1 Upload

- PUT 预签名 URL
- `CompletedFileDto.expectedHash` 来自 `pendingChanges.expectedHash`

### 6.2 Download

- GET 预签名 URL → 写入本地
- 若路径不同且内容相同可直接重命名

### 6.3 Delete

- 删除本地文件，提交 `deleted` fileId

### 6.4 Conflict（关键）

```text
executeConflict(action):
  remoteContent = download(action.url)
  saveAs(action.conflictRename, remoteContent)
  upload(action.conflictCopyUploadUrl, remoteContent) # 冲突副本上云
  upload(action.uploadUrl, localContent)              # 本地覆盖云端原文件
  mergedClock = increment(merge(localClock, remoteClock), deviceId)
  commit both original + conflictCopy
```

---

## 7. Commit 与持久化（Server）

- **乐观锁**：若 `expectedHash` 不匹配，返回冲突列表，客户端下次同步会收到 conflict action。
- **R2 清理**：`deleted` 先从 R2 删除。
- **写库**：`SyncFile` upsert + `isDeleted` 软删除。
- **设备记录**：`VaultDevice.lastSyncAt`。
- **向量化**：`vectorizeEnabled` 时从同步结果入队。

---

## 8. 自动绑定与账号切换

**自动绑定（PC/Mobile 一致）**

1. 若已绑定直接返回。
2. 获取云端 Vault 列表，按本地目录名匹配。
3. 未匹配则创建云端 Vault。
4. 注册设备，保存 binding（含 `userId`）。

**账号切换冲突**

- 若 binding.userId != 当前登录用户：
  - 用户选择 **同步到当前账号** → 删除旧绑定并重新绑定。
  - 用户选择 **保持离线** → sync 进入 offline。

---

## 9. 关键约束与性能

- **FileIndex v2 严格校验**：不做历史兼容，非法记录直接重置。
- **hash 优化**：size/mtime 预过滤 + cache，避免全量 hash。
- **同步节流**：PC 300ms；Mobile 3s（避免频繁 I/O）。
- **大文件限制**：Mobile 超过 10MB 直接跳过。

---

## 10. 测试覆盖（现有）

- PC Sync Engine：`apps/moryflow/pc/src/main/cloud-sync/sync-engine/__tests__/*`
- Mobile Detect/Executor：`apps/moryflow/mobile/lib/cloud-sync/__tests__/*`

---

## 11. 变更边界（必须遵守）

- **对外类型单一来源**：`packages/api/src/cloud-sync/types.ts`。
- **commit 后再更新 FileIndex**：避免本地状态领先服务端。
- **向量时钟是唯一冲突依据**：`lastSyncedSize/mtime` 只用于性能优化。
