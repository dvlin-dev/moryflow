# 云同步系统

## 需求

实现多设备文件同步：
- 双向同步：上传、下载、删除
- 冲突处理：以本地为准，云端版本保存为副本
- 软删除：支持多设备删除同步

## 技术方案

### 架构

```
PC Client (Electron)
├── cloud-sync/
│   ├── sync-engine/    # 同步引擎
│   ├── file-index/     # fileId 管理
│   └── api/            # HTTP 客户端
│
└── vault-watcher       # 文件变化监听
         │
         │ HTTP API
         ▼
后端服务 (NestJS)
├── SyncService         # 差异计算、提交处理
├── StorageClient       # 文件存储代理
└── PostgreSQL          # SyncFile / VaultDevice / Vault
         │
         ▼
    Cloudflare R2       # 实际文件存储
```

### 数据模型

```prisma
model SyncFile {
  id          String   // fileId (UUID)
  vaultId     String
  path        String
  title       String
  size        Int
  mtime       BigInt
  contentHash String
  isDeleted   Boolean  // 软删除标记
}

model VaultDevice {
  vaultId    String
  deviceId   String
  deviceName String
  lastSyncAt DateTime  // 该设备上次同步时间
}
```

### 同步流程（伪代码）

```
# 总体流程
performSync():
  localFiles = collectLocalFiles()
  actions = api.syncDiff(localFiles)
  completed = executeActions(actions)
  api.syncCommit(completed, deleted)

# 服务端差异计算
computeDiff(localFiles, remoteFiles, deletedFiles, lastSyncTime):
  for local in localFiles:
    if deletedFiles.has(local.fileId):
      yield { action: 'delete' }      # 其他设备已删除
    elif not remoteFiles.has(local.fileId):
      yield { action: 'upload' }      # 本地新增
    elif local.hash != remote.hash:
      yield resolveConflict(local, remote, lastSyncTime)
    elif local.path != remote.path:
      if local.mtime > remote.updatedAt:
        yield { action: 'upload' }    # 本地重命名
      else:
        yield { action: 'download' }  # 远端重命名

  for remote in remoteFiles:
    if not localFiles.has(remote.fileId):
      if remote.updatedAt > lastSyncTime:
        yield { action: 'download' }  # 远端新增
      else:
        yield { action: 'delete' }    # 本地已删除

# 冲突解决
resolveConflict(local, remote, lastSyncTime):
  localModified = local.mtime > lastSyncTime
  remoteModified = remote.updatedAt > lastSyncTime

  if localModified and not remoteModified:
    return { action: 'upload' }
  elif remoteModified and not localModified:
    return { action: 'download' }
  else:
    return { action: 'conflict' }     # 双方都修改

# 冲突处理（以本地为准）
executeConflict(action):
  remoteContent = download(action.url)
  saveAs(conflictPath, remoteContent)    # 云端版本保存为副本
  localContent = readFile(action.path)
  upload(action.uploadUrl, localContent) # 本地版本覆盖云端
```

### 关键机制

| 机制 | 说明 |
|------|------|
| fileId | 文件唯一标识，重命名时不变 |
| lastSyncAt | 区分"本地修改"和"远端新增" |
| 软删除 | isDeleted=true，供其他设备查询 |
| 乐观锁 | commit 时验证 expectedHash |

### 防抖调度

```
SYNC_DEBOUNCE = 300ms      # 避免频繁同步
VECTORIZE_DEBOUNCE = 1000ms # 等待用户停止编辑
```

## 代码索引

| 模块 | 路径 |
|------|------|
| 同步引擎入口 | `apps/pc/src/main/cloud-sync/sync-engine/index.ts` |
| 操作执行器 | `apps/pc/src/main/cloud-sync/sync-engine/executor.ts` |
| 防抖调度器 | `apps/pc/src/main/cloud-sync/sync-engine/scheduler.ts` |
| 文件索引管理 | `apps/pc/src/main/cloud-sync/file-index/index.ts` |
| API 客户端 | `apps/pc/src/main/cloud-sync/api/client.ts` |
| 自动绑定 | `apps/pc/src/main/cloud-sync/auto-binding.ts` |
| 同步服务 | `apps/server/src/sync/sync.service.ts` |
| 存储控制器 | `apps/server/src/storage/storage.controller.ts` |
