# 云同步系统重构方案

> 基于向量时钟的文件同步系统，替代当前的时间戳方案。

## 1. 重构动机

### 1.1 当前实现的问题

当前实现基于 `mtime` + `lastSyncAt` 时间戳判断冲突：

```typescript
// 当前实现 (sync.service.ts)
const localModifiedAfterSync = localMtime > lastSyncTime;
const remoteModifiedAfterSync = remote.updatedAt > lastSyncTime;
```

**问题**：
1. **依赖物理时钟**：设备时钟不同步会导致错误判断
2. **设备级粒度**：`lastSyncAt` 是设备级别的，无法精确到单个文件
3. **离线场景失效**：离线多次修改后，时间戳无法反映真实的因果关系

### 1.2 向量时钟的优势

向量时钟是分布式系统中追踪因果关系的标准方案：

1. **不依赖物理时钟**：使用逻辑时钟，不受设备时钟影响
2. **文件级精度**：每个文件独立维护向量时钟
3. **精确检测并发**：能准确识别「并发修改」vs「顺序修改」

---

## 2. 核心概念

### 2.1 向量时钟

```typescript
// packages/shared-sync/src/vector-clock.ts

/**
 * 向量时钟：记录每个设备对文件的修改次数
 * 例如：{ "mac-abc": 3, "iphone-xyz": 2 }
 * 表示 Mac 修改了 3 次，iPhone 修改了 2 次
 */
export type VectorClock = Record<string, number>;

export type ClockRelation = 'equal' | 'before' | 'after' | 'concurrent';

/**
 * 比较两个向量时钟的因果关系
 */
export function compareVectorClocks(a: VectorClock, b: VectorClock): ClockRelation {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  let aBeforeB = false;
  let bBeforeA = false;

  for (const key of allKeys) {
    const va = a[key] ?? 0;
    const vb = b[key] ?? 0;

    if (va < vb) aBeforeB = true;
    if (va > vb) bBeforeA = true;
  }

  if (!aBeforeB && !bBeforeA) return 'equal';
  if (aBeforeB && !bBeforeA) return 'before';  // a 发生在 b 之前
  if (!aBeforeB && bBeforeA) return 'after';   // a 发生在 b 之后
  return 'concurrent';  // 并发修改，需要解决冲突
}

/**
 * 合并两个向量时钟（取每个分量的最大值）
 */
export function mergeVectorClocks(a: VectorClock, b: VectorClock): VectorClock {
  const result: VectorClock = { ...a };
  for (const [key, value] of Object.entries(b)) {
    result[key] = Math.max(result[key] ?? 0, value);
  }
  return result;
}

/**
 * 递增指定设备的时钟分量
 */
export function incrementClock(clock: VectorClock, deviceId: string): VectorClock {
  return {
    ...clock,
    [deviceId]: (clock[deviceId] ?? 0) + 1,
  };
}
```

### 2.2 四种因果关系

| 关系 | 含义 | 处理方式 |
|-----|-----|---------|
| `equal` | 时钟完全相同 | 无需操作 |
| `before` | 本地落后于远端 | 下载远端版本 |
| `after` | 本地领先于远端 | 上传本地版本 |
| `concurrent` | 并发修改 | 冲突解决 |

---

## 3. 数据模型

### 3.1 客户端本地索引

```typescript
// packages/shared-sync/src/types.ts

/**
 * 文件条目（持久化到 file-index.json）
 */
export interface FileEntry {
  id: string;                      // fileId (UUID)
  path: string;                    // 相对路径
  createdAt: number;               // 创建时间戳

  // 向量时钟
  vectorClock: VectorClock;        // 当前时钟状态

  // 同步状态（用于检测本地变更）
  lastSyncedHash: string | null;   // 上次同步成功时的内容哈希，null 表示从未同步
  lastSyncedClock: VectorClock;    // 上次同步成功时的时钟状态
}

/**
 * 文件索引结构
 */
export interface FileIndex {
  version: 2;  // 升级版本号，标识新格式
  deviceId: string;
  files: FileEntry[];
}
```

### 3.2 服务端数据库模型

```prisma
model SyncFile {
  id          String   @id @default(uuid())
  vaultId     String
  path        String
  title       String
  size        Int
  contentHash String

  // 向量时钟（核心）
  vectorClock Json     @default("{}")

  // 软删除
  isDeleted   Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  vault Vault @relation(fields: [vaultId], references: [id], onDelete: Cascade)

  @@unique([vaultId, path])
  @@index([vaultId, isDeleted])
}
```

### 3.3 DTO 定义

```typescript
// packages/shared-sync/src/dto.ts

import { z } from 'zod';

// ==================== Schemas ====================

export const VectorClockSchema = z.record(z.string(), z.number());

export const LocalFileSchema = z.object({
  fileId: z.string().uuid(),
  path: z.string().min(1),
  title: z.string().min(1),
  size: z.number().min(0),
  contentHash: z.string(),  // 空字符串表示删除
  vectorClock: VectorClockSchema,
});

export const SyncDiffRequestSchema = z.object({
  vaultId: z.string().uuid(),
  deviceId: z.string().min(1),
  localFiles: z.array(LocalFileSchema),
});

export const CompletedFileSchema = z.object({
  fileId: z.string().uuid(),
  action: z.enum(['upload', 'download', 'delete', 'conflict']),
  path: z.string().min(1),
  title: z.string().min(1),
  size: z.number().min(0),
  contentHash: z.string(),
  vectorClock: VectorClockSchema,
});

export const SyncCommitRequestSchema = z.object({
  vaultId: z.string().uuid(),
  deviceId: z.string().min(1),
  completed: z.array(CompletedFileSchema),
  deleted: z.array(z.string()),  // fileId[]
  vectorizeEnabled: z.boolean().optional().default(false),
});

// ==================== Types ====================

export type LocalFileDto = z.infer<typeof LocalFileSchema>;
export type SyncDiffRequest = z.infer<typeof SyncDiffRequestSchema>;
export type CompletedFile = z.infer<typeof CompletedFileSchema>;
export type SyncCommitRequest = z.infer<typeof SyncCommitRequestSchema>;

export type SyncAction = 'upload' | 'download' | 'delete' | 'conflict';

/**
 * 同步操作指令
 */
export interface SyncActionDto {
  fileId: string;
  path: string;
  action: SyncAction;

  // upload 使用
  uploadUrl?: string;

  // download 使用
  downloadUrl?: string;

  // conflict 时需要两个 URL
  // - downloadUrl: 下载云端版本作为冲突副本
  // - uploadUrl: 上传本地版本覆盖云端
  conflictRename?: string;  // 冲突副本的新路径

  size?: number;
  contentHash?: string;
  remoteVectorClock?: VectorClock;
}

export interface SyncDiffResponse {
  actions: SyncActionDto[];
}

export interface ConflictFileDto {
  fileId: string;
  path: string;
  expectedHash: string;
  currentHash: string;
}

export interface SyncCommitResponse {
  success: boolean;
  syncedAt: string;
  conflicts?: ConflictFileDto[];  // 乐观锁冲突
}
```

---

## 4. 同步流程

### 4.1 整体流程

```
┌────────────────────────────────────────────────────────────────────┐
│                           同步流程                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐  │
│   │  检测本地    │   ──►   │  POST /diff │   ──►   │  执行操作    │  │
│   │  变更       │         │  获取差异    │         │  (I/O only) │  │
│   │  (只读)     │         │             │         │             │  │
│   └─────────────┘         └─────────────┘         └─────────────┘  │
│          │                                               │         │
│          │ 生成 PendingChanges                           │         │
│          │ (不修改 FileIndex)                            │         │
│          ▼                                               ▼         │
│   ┌─────────────┐                                 ┌─────────────┐  │
│   │  暂存待更新  │                                 │ POST /commit│  │
│   │  状态       │                                 │ 提交结果    │  │
│   └─────────────┘                                 └─────────────┘  │
│                                                          │         │
│                                                          ▼         │
│                                                   ┌─────────────┐  │
│                                                   │  更新本地    │  │
│                                                   │  FileIndex  │  │
│                                                   │  (成功后)   │  │
│                                                   └─────────────┘  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

**核心原则**：状态变更只在 commit 成功后执行，避免部分失败导致的状态不一致。

### 4.2 检测本地变更（只读）

```typescript
// client/sync/detect-changes.ts

/**
 * 待提交的状态变更（暂存，不立即应用）
 */
export interface PendingChange {
  type: 'new' | 'modified' | 'deleted';
  fileId: string;
  path: string;
  vectorClock: VectorClock;
  contentHash: string;
}

/**
 * 检测本地变更
 * 重要：此函数是只读的，不修改 FileIndex
 */
export function detectLocalChanges(
  localFiles: Map<string, LocalFileState>,
  fileIndex: FileIndex,
  deviceId: string
): {
  dtos: LocalFileDto[];
  pendingChanges: Map<string, PendingChange>;
} {
  const dtos: LocalFileDto[] = [];
  const pendingChanges = new Map<string, PendingChange>();
  const indexMap = new Map(fileIndex.files.map(e => [e.path, e]));

  // 1. 处理当前存在的文件
  for (const [filePath, file] of localFiles) {
    const entry = indexMap.get(filePath);
    const currentHash = computeHashSync(file.content);

    if (!entry) {
      // 新文件：生成新 ID 和初始时钟
      const newId = crypto.randomUUID();
      const newClock = { [deviceId]: 1 };

      dtos.push({
        fileId: newId,
        path: filePath,
        title: getTitle(filePath),
        size: file.size,
        contentHash: currentHash,
        vectorClock: newClock,
      });

      pendingChanges.set(newId, {
        type: 'new',
        fileId: newId,
        path: filePath,
        vectorClock: newClock,
        contentHash: currentHash,
      });
      continue;
    }

    // 已存在的文件：比较内容哈希检测变更
    const hasChanged = currentHash !== entry.lastSyncedHash;
    const clockToSend = hasChanged
      ? incrementClock(entry.vectorClock, deviceId)
      : entry.vectorClock;

    dtos.push({
      fileId: entry.id,
      path: entry.path,
      title: getTitle(entry.path),
      size: file.size,
      contentHash: currentHash,
      vectorClock: clockToSend,
    });

    if (hasChanged) {
      pendingChanges.set(entry.id, {
        type: 'modified',
        fileId: entry.id,
        path: entry.path,
        vectorClock: clockToSend,
        contentHash: currentHash,
      });
    }
  }

  // 2. 检测删除的文件
  // 重要：只有同步过的文件才需要通知服务端删除
  for (const entry of fileIndex.files) {
    if (!localFiles.has(entry.path) && entry.lastSyncedHash !== null) {
      const deleteClock = incrementClock(entry.vectorClock, deviceId);

      dtos.push({
        fileId: entry.id,
        path: entry.path,
        title: getTitle(entry.path),
        size: 0,
        contentHash: '',  // 空 hash 表示删除
        vectorClock: deleteClock,
      });

      pendingChanges.set(entry.id, {
        type: 'deleted',
        fileId: entry.id,
        path: entry.path,
        vectorClock: deleteClock,
        contentHash: '',
      });
    }
  }

  return { dtos, pendingChanges };
}
```

### 4.3 服务端差异计算

```typescript
// server/sync/sync.service.ts

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultService: VaultService,
    private readonly quotaService: QuotaService,
    private readonly storageClient: StorageClient,
    private readonly vectorizeService: VectorizeService,
  ) {}

  /**
   * 计算同步差异
   */
  async calculateDiff(
    userId: string,
    tier: UserTier,
    dto: SyncDiffRequest
  ): Promise<SyncDiffResponse> {
    const { vaultId, deviceId, localFiles } = dto;

    // 1. 验证 Vault 所有权
    await this.vaultService.getVault(userId, vaultId);

    // 2. 配额检查
    await this.validateUploadQuota(userId, tier, localFiles);

    // 3. 获取设备名称（用于冲突命名）
    const device = await this.prisma.vaultDevice.findUnique({
      where: { vaultId_deviceId: { vaultId, deviceId } },
    });
    const deviceName = device?.deviceName ?? 'Unknown Device';

    // 4. 获取远程文件
    const remoteFiles = await this.prisma.syncFile.findMany({
      where: { vaultId },
    });

    // 5. 计算差异
    const actions = this.computeDiff(localFiles, remoteFiles, deviceName);

    // 6. 生成预签名 URL
    return { actions: this.generatePresignUrls(userId, vaultId, actions) };
  }

  /**
   * 核心差异计算逻辑
   */
  private computeDiff(
    localFiles: LocalFileDto[],
    remoteFiles: SyncFile[],
    deviceName: string
  ): SyncActionDto[] {
    const actions: SyncActionDto[] = [];
    const localMap = new Map(localFiles.map(f => [f.fileId, f]));
    const remoteMap = new Map(remoteFiles.map(f => [f.id, f]));

    // 1. 处理本地存在的文件
    for (const local of localFiles) {
      const remote = remoteMap.get(local.fileId);
      const action = this.resolveFile(local, remote, deviceName);
      if (action) actions.push(action);
    }

    // 2. 处理远端有、本地无的文件（远端新增）
    for (const remote of remoteFiles) {
      if (!localMap.has(remote.id) && !remote.isDeleted) {
        actions.push(this.createDownloadAction(remote));
      }
    }

    return actions;
  }

  /**
   * 解析单个文件的同步操作
   */
  private resolveFile(
    local: LocalFileDto,
    remote: SyncFile | undefined,
    deviceName: string
  ): SyncActionDto | null {
    const isLocalDeleted = local.contentHash === '';

    // Case 1: 本地新增（远端不存在）
    if (!remote) {
      return isLocalDeleted ? null : this.createUploadAction(local);
    }

    const isRemoteDeleted = remote.isDeleted;
    const remoteClock = remote.vectorClock as VectorClock;
    const relation = compareVectorClocks(local.vectorClock, remoteClock);

    // Case 2: 双方都删除
    if (isLocalDeleted && isRemoteDeleted) {
      return null;
    }

    // Case 3: 本地删除，远端存在
    if (isLocalDeleted && !isRemoteDeleted) {
      return this.resolveLocalDeleted(local, remote, relation);
    }

    // Case 4: 远端删除，本地存在
    if (!isLocalDeleted && isRemoteDeleted) {
      return this.resolveRemoteDeleted(local, remote, relation);
    }

    // Case 5: 双方都存在
    return this.resolveBothExist(local, remote, relation, deviceName);
  }

  /**
   * 本地删除，远端存在
   */
  private resolveLocalDeleted(
    local: LocalFileDto,
    remote: SyncFile,
    relation: ClockRelation
  ): SyncActionDto {
    switch (relation) {
      case 'after':
        // 本地删除更新 → 执行删除
        return { fileId: local.fileId, path: local.path, action: 'delete' };

      case 'before':
        // 远端有新版本 → 恢复文件
        return this.createDownloadAction(remote);

      case 'concurrent':
        // 并发：本地删除 vs 远端修改 → 保留远端（修改优先于删除）
        return this.createDownloadAction(remote);

      case 'equal':
        // 异常状态：时钟相等但删除状态不同
        this.logger.error(`Invalid state: equal clock but different delete status: ${local.fileId}`);
        return this.createDownloadAction(remote);
    }
  }

  /**
   * 远端删除，本地存在
   */
  private resolveRemoteDeleted(
    local: LocalFileDto,
    remote: SyncFile,
    relation: ClockRelation
  ): SyncActionDto {
    switch (relation) {
      case 'after':
        // 本地有新修改 → 恢复上传
        return this.createUploadAction(local);

      case 'before':
        // 远端删除更新 → 执行删除
        return { fileId: local.fileId, path: local.path, action: 'delete' };

      case 'concurrent':
        // 并发：本地修改 vs 远端删除 → 保留本地（修改优先于删除）
        return this.createUploadAction(local);

      case 'equal':
        // 异常状态
        this.logger.error(`Invalid state: equal clock but different delete status: ${local.fileId}`);
        return { fileId: local.fileId, path: local.path, action: 'delete' };
    }
  }

  /**
   * 双方都存在
   */
  private resolveBothExist(
    local: LocalFileDto,
    remote: SyncFile,
    relation: ClockRelation,
    deviceName: string
  ): SyncActionDto | null {
    // 内容相同
    if (local.contentHash === remote.contentHash) {
      // 路径不同且本地更新 → 上传（更新路径）
      if (local.path !== remote.path && relation === 'after') {
        return this.createUploadAction(local);
      }
      return null;
    }

    // 内容不同
    switch (relation) {
      case 'after':
        return this.createUploadAction(local);

      case 'before':
        return this.createDownloadAction(remote);

      case 'equal':
        // 时钟相等但内容不同，异常情况，按冲突处理
        this.logger.warn(`Clock equal but content differs: ${local.fileId}`);
        return this.createConflictAction(local, remote, deviceName);

      case 'concurrent':
        return this.createConflictAction(local, remote, deviceName);
    }
  }

  private createUploadAction(local: LocalFileDto): SyncActionDto {
    return {
      fileId: local.fileId,
      path: local.path,
      action: 'upload',
      size: local.size,
      contentHash: local.contentHash,
    };
  }

  private createDownloadAction(remote: SyncFile): SyncActionDto {
    return {
      fileId: remote.id,
      path: remote.path,
      action: 'download',
      size: remote.size,
      contentHash: remote.contentHash,
      remoteVectorClock: remote.vectorClock as VectorClock,
    };
  }

  private createConflictAction(
    local: LocalFileDto,
    remote: SyncFile,
    deviceName: string
  ): SyncActionDto {
    return {
      fileId: local.fileId,
      path: local.path,
      action: 'conflict',
      size: remote.size,
      contentHash: remote.contentHash,
      remoteVectorClock: remote.vectorClock as VectorClock,
      conflictRename: this.generateConflictName(remote.path, deviceName),
    };
  }

  /**
   * 生成冲突文件名
   * 格式：原文件名 (设备名 - YYYY-MM-DD HH:mm).扩展名
   */
  private generateConflictName(filePath: string, deviceName: string): string {
    const lastSlashIndex = filePath.lastIndexOf('/');
    const dir = lastSlashIndex !== -1 ? filePath.substring(0, lastSlashIndex + 1) : '';
    const fileName = lastSlashIndex !== -1 ? filePath.substring(lastSlashIndex + 1) : filePath;

    const lastDotIndex = fileName.lastIndexOf('.');
    const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
    const base = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;

    const truncatedDeviceName = deviceName.length > 30
      ? deviceName.substring(0, 30) + '...'
      : deviceName;

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return `${dir}${base} (${truncatedDeviceName} - ${timestamp})${ext}`;
  }
}
```

### 4.4 执行同步操作

```typescript
// client/sync/executor.ts

/**
 * 执行结果（暂存，不直接修改 FileIndex）
 */
export interface ExecuteResult {
  completed: CompletedFile[];
  deleted: string[];
  downloadedEntries: DownloadedEntry[];  // 新增：下载的文件信息
  conflictEntries: ConflictEntry[];      // 新增：冲突处理信息
  errors: Array<{ action: SyncActionDto; error: Error }>;
}

export interface DownloadedEntry {
  fileId: string;
  path: string;
  vectorClock: VectorClock;
  contentHash: string;
}

export interface ConflictEntry {
  originalFileId: string;
  originalPath: string;
  mergedClock: VectorClock;
  contentHash: string;
  conflictCopyId: string;
  conflictCopyPath: string;
  conflictCopyClock: VectorClock;
  conflictCopyHash: string;
}

/**
 * 执行同步操作
 * 重要：只做 I/O 操作，不修改 FileIndex
 */
export async function executeActions(
  actions: SyncActionDto[],
  vaultPath: string,
  deviceId: string
): Promise<ExecuteResult> {
  const completed: CompletedFile[] = [];
  const deleted: string[] = [];
  const downloadedEntries: DownloadedEntry[] = [];
  const conflictEntries: ConflictEntry[] = [];
  const errors: Array<{ action: SyncActionDto; error: Error }> = [];

  for (const action of actions) {
    try {
      switch (action.action) {
        case 'upload':
          await executeUpload(action, vaultPath, completed);
          break;

        case 'download':
          await executeDownload(action, vaultPath, completed, downloadedEntries);
          break;

        case 'delete':
          await executeDelete(action, vaultPath, deleted);
          break;

        case 'conflict':
          await executeConflict(action, vaultPath, deviceId, completed, conflictEntries);
          break;
      }
    } catch (e) {
      errors.push({
        action,
        error: e instanceof Error ? e : new Error(String(e)),
      });
    }
  }

  return { completed, deleted, downloadedEntries, conflictEntries, errors };
}

async function executeUpload(
  action: SyncActionDto,
  vaultPath: string,
  completed: CompletedFile[]
): Promise<void> {
  if (!action.uploadUrl) return;

  const filePath = path.join(vaultPath, action.path);
  const content = await fs.readFile(filePath);

  const res = await fetch(action.uploadUrl, {
    method: 'PUT',
    body: content,
    headers: { 'Content-Type': 'application/octet-stream' },
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }

  completed.push({
    fileId: action.fileId,
    action: 'upload',
    path: action.path,
    title: getTitle(action.path),
    size: content.length,
    contentHash: computeHash(content),
    vectorClock: {}, // 将由 pendingChanges 提供
  });
}

async function executeDownload(
  action: SyncActionDto,
  vaultPath: string,
  completed: CompletedFile[],
  downloadedEntries: DownloadedEntry[]
): Promise<void> {
  if (!action.downloadUrl) return;

  const filePath = path.join(vaultPath, action.path);

  // 确保目录存在
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const res = await fetch(action.downloadUrl);
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`);
  }

  const content = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(filePath, content);

  completed.push({
    fileId: action.fileId,
    action: 'download',
    path: action.path,
    title: getTitle(action.path),
    size: content.length,
    contentHash: action.contentHash ?? computeHash(content),
    vectorClock: action.remoteVectorClock ?? {},
  });

  // 记录下载信息，用于后续更新 FileIndex
  downloadedEntries.push({
    fileId: action.fileId,
    path: action.path,
    vectorClock: action.remoteVectorClock ?? {},
    contentHash: action.contentHash ?? computeHash(content),
  });
}

async function executeDelete(
  action: SyncActionDto,
  vaultPath: string,
  deleted: string[]
): Promise<void> {
  const filePath = path.join(vaultPath, action.path);

  try {
    await fs.unlink(filePath);
  } catch {
    // 文件可能已不存在
  }

  deleted.push(action.fileId);
}

async function executeConflict(
  action: SyncActionDto,
  vaultPath: string,
  deviceId: string,
  completed: CompletedFile[],
  conflictEntries: ConflictEntry[]
): Promise<void> {
  if (!action.conflictRename || !action.downloadUrl || !action.uploadUrl) return;

  const localFilePath = path.join(vaultPath, action.path);
  const conflictFilePath = path.join(vaultPath, action.conflictRename);

  // 确保目录存在
  await fs.mkdir(path.dirname(conflictFilePath), { recursive: true });

  // 1. 下载云端版本保存为冲突副本
  const downloadRes = await fetch(action.downloadUrl);
  if (!downloadRes.ok) {
    throw new Error(`Download conflict version failed: ${downloadRes.status}`);
  }
  const remoteContent = Buffer.from(await downloadRes.arrayBuffer());
  await fs.writeFile(conflictFilePath, remoteContent);

  // 2. 上传本地版本覆盖云端
  const localContent = await fs.readFile(localFilePath);
  const uploadRes = await fetch(action.uploadUrl, {
    method: 'PUT',
    body: localContent,
    headers: { 'Content-Type': 'application/octet-stream' },
  });
  if (!uploadRes.ok) {
    throw new Error(`Upload local version failed: ${uploadRes.status}`);
  }

  const localHash = computeHash(localContent);
  const remoteHash = action.contentHash ?? computeHash(remoteContent);

  // 计算合并后的时钟
  const mergedClock = mergeVectorClocks(
    action.remoteVectorClock ?? {},
    {} // 当前本地时钟将由 pendingChanges 提供
  );
  const finalClock = incrementClock(mergedClock, deviceId);

  completed.push({
    fileId: action.fileId,
    action: 'conflict',
    path: action.path,
    title: getTitle(action.path),
    size: localContent.length,
    contentHash: localHash,
    vectorClock: finalClock,
  });

  // 记录冲突信息，用于后续更新 FileIndex
  conflictEntries.push({
    originalFileId: action.fileId,
    originalPath: action.path,
    mergedClock: finalClock,
    contentHash: localHash,
    conflictCopyId: crypto.randomUUID(),
    conflictCopyPath: action.conflictRename,
    conflictCopyClock: action.remoteVectorClock ?? {},
    conflictCopyHash: remoteHash,
  });
}
```

### 4.5 提交同步结果（服务端）

```typescript
// server/sync/sync.service.ts (续)

/**
 * 提交同步结果
 */
async commitSync(
  userId: string,
  dto: SyncCommitRequest
): Promise<SyncCommitResponse> {
  const { vaultId, deviceId, completed, deleted, vectorizeEnabled } = dto;

  // 1. 验证 Vault 所有权
  await this.vaultService.getVault(userId, vaultId);

  // 2. 计算存储用量增量
  const sizeDelta = await this.calculateSizeDelta(completed, deleted);

  // 3. 事务处理
  await this.prisma.$transaction(async (tx) => {
    for (const file of completed) {
      await this.processCompletedFile(tx, vaultId, file);
    }

    // 软删除
    if (deleted.length > 0) {
      await tx.syncFile.updateMany({
        where: { id: { in: deleted }, vaultId },
        data: { isDeleted: true },
      });
    }

    // 更新设备最后同步时间
    await tx.vaultDevice.upsert({
      where: { vaultId_deviceId: { vaultId, deviceId } },
      create: { vaultId, deviceId, deviceName: 'Unknown Device', lastSyncAt: new Date() },
      update: { lastSyncAt: new Date() },
    });

    // 更新存储用量
    await this.updateStorageUsageIncremental(tx, userId, sizeDelta);
  });

  // 4. 从 R2 删除文件
  if (deleted.length > 0) {
    await this.storageClient.deleteFiles(userId, vaultId, deleted);
  }

  // 5. 向量化入队
  if (vectorizeEnabled) {
    await this.queueVectorizeFromSync(userId, vaultId, completed);
  }

  return { success: true, syncedAt: new Date().toISOString() };
}

/**
 * 处理已完成的文件
 */
private async processCompletedFile(
  tx: PrismaClient,
  vaultId: string,
  file: CompletedFile
): Promise<void> {
  switch (file.action) {
    case 'upload':
    case 'conflict':
      // 先清理可能的路径冲突
      await tx.syncFile.deleteMany({
        where: {
          vaultId,
          path: file.path,
          id: { not: file.fileId },
        },
      });

      await tx.syncFile.upsert({
        where: { id: file.fileId },
        create: {
          id: file.fileId,
          vaultId,
          path: file.path,
          title: file.title,
          size: file.size,
          contentHash: file.contentHash,
          vectorClock: file.vectorClock,
          isDeleted: false,
        },
        update: {
          path: file.path,
          title: file.title,
          size: file.size,
          contentHash: file.contentHash,
          vectorClock: file.vectorClock,
          isDeleted: false,
        },
      });
      break;

    case 'download':
      // 下载操作：服务端记录保持不变
      break;

    case 'delete':
      // 由外层统一处理
      break;
  }
}
```

### 4.6 更新本地索引（成功后）

```typescript
// client/sync/apply-changes.ts

/**
 * 同步成功后更新本地索引
 * 重要：只有在 commit 成功后才调用此函数
 */
export function applyChangesToFileIndex(
  fileIndex: FileIndex,
  pendingChanges: Map<string, PendingChange>,
  executeResult: ExecuteResult,
  completedIds: Set<string>
): void {
  // 1. 应用本地变更（new/modified/deleted）
  for (const [fileId, change] of pendingChanges) {
    if (!completedIds.has(fileId)) continue;

    switch (change.type) {
      case 'new':
        fileIndex.files.push({
          id: fileId,
          path: change.path,
          createdAt: Date.now(),
          vectorClock: change.vectorClock,
          lastSyncedHash: change.contentHash,
          lastSyncedClock: change.vectorClock,
        });
        break;

      case 'modified': {
        const entry = fileIndex.files.find(e => e.id === fileId);
        if (entry) {
          entry.vectorClock = change.vectorClock;
          entry.lastSyncedHash = change.contentHash;
          entry.lastSyncedClock = change.vectorClock;
        }
        break;
      }

      case 'deleted': {
        const idx = fileIndex.files.findIndex(e => e.id === fileId);
        if (idx !== -1) {
          fileIndex.files.splice(idx, 1);
        }
        break;
      }
    }
  }

  // 2. 应用下载的文件
  for (const entry of executeResult.downloadedEntries) {
    const existing = fileIndex.files.find(e => e.id === entry.fileId);
    if (existing) {
      existing.path = entry.path;
      existing.vectorClock = entry.vectorClock;
      existing.lastSyncedHash = entry.contentHash;
      existing.lastSyncedClock = entry.vectorClock;
    } else {
      fileIndex.files.push({
        id: entry.fileId,
        path: entry.path,
        createdAt: Date.now(),
        vectorClock: entry.vectorClock,
        lastSyncedHash: entry.contentHash,
        lastSyncedClock: entry.vectorClock,
      });
    }
  }

  // 3. 应用删除的文件
  for (const fileId of executeResult.deleted) {
    const idx = fileIndex.files.findIndex(e => e.id === fileId);
    if (idx !== -1) {
      fileIndex.files.splice(idx, 1);
    }
  }

  // 4. 应用冲突处理
  for (const conflict of executeResult.conflictEntries) {
    // 更新原始文件
    const original = fileIndex.files.find(e => e.id === conflict.originalFileId);
    if (original) {
      original.vectorClock = conflict.mergedClock;
      original.lastSyncedHash = conflict.contentHash;
      original.lastSyncedClock = conflict.mergedClock;
    }

    // 添加冲突副本
    fileIndex.files.push({
      id: conflict.conflictCopyId,
      path: conflict.conflictCopyPath,
      createdAt: Date.now(),
      vectorClock: conflict.conflictCopyClock,
      lastSyncedHash: conflict.conflictCopyHash,
      lastSyncedClock: conflict.conflictCopyClock,
    });
  }
}
```

---

## 5. 客户端 SyncEngine

```typescript
// client/sync/sync-engine.ts

export class SyncEngine {
  private deviceId: string;
  private vaultId: string;
  private vaultPath: string;
  private fileIndex: FileIndex;
  private syncing = false;

  async sync(): Promise<SyncResult> {
    if (this.syncing) {
      throw new SyncError('SYNC_IN_PROGRESS', 'Another sync is in progress');
    }

    this.syncing = true;
    try {
      return await this.doSync();
    } finally {
      this.syncing = false;
    }
  }

  private async doSync(): Promise<SyncResult> {
    // 1. 扫描本地文件
    const localFiles = await this.scanLocalFiles();

    // 2. 检测变更（只读，不修改 FileIndex）
    const { dtos, pendingChanges } = detectLocalChanges(
      localFiles,
      this.fileIndex,
      this.deviceId
    );

    // 3. 获取差异
    const { actions } = await this.api.syncDiff({
      vaultId: this.vaultId,
      deviceId: this.deviceId,
      localFiles: dtos,
    });

    if (actions.length === 0 && pendingChanges.size === 0) {
      return { uploaded: 0, downloaded: 0, conflicts: 0 };
    }

    // 4. 执行操作（只做 I/O，不修改 FileIndex）
    const executeResult = await executeActions(
      actions,
      this.vaultPath,
      this.deviceId
    );

    // 5. 准备 commit 数据
    const completedWithClock = this.mergeVectorClocks(
      executeResult.completed,
      pendingChanges
    );

    // 6. 提交到服务端
    const commitResult = await this.api.syncCommit({
      vaultId: this.vaultId,
      deviceId: this.deviceId,
      completed: completedWithClock,
      deleted: executeResult.deleted,
      vectorizeEnabled: this.settings.vectorizeEnabled,
    });

    if (!commitResult.success) {
      throw new SyncError('COMMIT_FAILED', 'Commit failed with conflicts');
    }

    // 7. 成功后更新本地 FileIndex
    const completedIds = new Set(completedWithClock.map(c => c.fileId));
    applyChangesToFileIndex(
      this.fileIndex,
      pendingChanges,
      executeResult,
      completedIds
    );
    await this.saveFileIndex();

    return {
      uploaded: completedWithClock.filter(c => c.action === 'upload').length,
      downloaded: completedWithClock.filter(c => c.action === 'download').length,
      conflicts: completedWithClock.filter(c => c.action === 'conflict').length,
    };
  }

  /**
   * 合并 pendingChanges 中的 vectorClock 到 completed
   */
  private mergeVectorClocks(
    completed: CompletedFile[],
    pendingChanges: Map<string, PendingChange>
  ): CompletedFile[] {
    return completed.map(c => {
      const pending = pendingChanges.get(c.fileId);
      if (pending && c.action === 'upload') {
        return { ...c, vectorClock: pending.vectorClock };
      }
      return c;
    });
  }
}
```

---

## 6. 错误处理

```typescript
// packages/shared-sync/src/errors.ts

export class SyncError extends Error {
  constructor(
    public readonly code: SyncErrorCode,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

export type SyncErrorCode =
  | 'SYNC_IN_PROGRESS'
  | 'NETWORK_ERROR'
  | 'UPLOAD_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'COMMIT_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_STATE';
```

---

## 7. 共享包结构

```
packages/shared-sync/
├── src/
│   ├── index.ts           # 导出入口
│   ├── vector-clock.ts    # 向量时钟工具
│   ├── types.ts           # 共享类型
│   ├── dto.ts             # DTO + Zod schemas
│   ├── hash.ts            # 哈希计算
│   └── errors.ts          # 错误类型
├── package.json
└── tsconfig.json
```

---

## 8. 关键设计决策

### 8.1 状态变更时机

**核心原则**：只在同步成功后修改本地状态。

```
检测变更 → 生成 pendingChanges（不修改 FileIndex）
    ↓
执行操作 → 只做 I/O，记录 executeResult（不修改 FileIndex）
    ↓
提交成功 → applyChangesToFileIndex（修改 FileIndex）
```

**好处**：
- 同步失败时可以安全重试
- 不会因部分失败导致状态不一致
- 向量时钟不会重复递增

### 8.2 并发删除 vs 修改

**原则**：修改优先于删除

| 场景 | 处理 |
|-----|-----|
| 本地修改 vs 远端删除 | 保留本地（上传） |
| 本地删除 vs 远端修改 | 保留远端（下载） |

**原因**：删除操作可以轻松恢复，而修改的内容丢失是不可逆的。

### 8.3 冲突解决策略

**本地优先 + 云端保留副本**：

1. 下载云端版本保存为 `文件名 (设备名 - 时间).md`
2. 上传本地版本覆盖云端
3. 合并向量时钟并递增

用户可以自行比较两个版本并决定保留哪个。

### 8.4 路径冲突处理

两个设备同时创建同名文件（不同 fileId）时：

```typescript
// 在 processCompletedFile 中先清理
await tx.syncFile.deleteMany({
  where: {
    vaultId,
    path: file.path,
    id: { not: file.fileId },
  },
});
```

先提交的文件保留，后提交的覆盖。

### 8.5 删除检测

只有同步过的文件才需要通知服务端删除：

```typescript
if (!localFiles.has(entry.path) && entry.lastSyncedHash !== null) {
  // 同步过的文件被删除，需要通知服务端
}
```

从未同步过的文件（新建后立即删除）不触发服务端删除。

---

## 9. 保留的现有功能

| 功能 | 说明 |
|-----|-----|
| 配额检查 | `validateUploadQuota` - 检查文件大小和存储空间 |
| 存储用量 | `calculateSizeDelta` + `updateStorageUsageIncremental` |
| 向量化入队 | `queueVectorizeFromSync` - 上传的 Markdown 文件入队 |
| 预签名 URL | `generatePresignUrls` - R2 对象存储 |
| 乐观锁 | `expectedHash` 校验（可选） |
| 活动追踪 | `activityTracker` 记录同步进度 |
| 路径变更 | 自动处理文件重命名/移动 |

---

## 10. 迁移策略

### 10.1 数据库迁移

```sql
-- 添加 vectorClock 字段
ALTER TABLE "SyncFile" ADD COLUMN "vectorClock" JSONB DEFAULT '{}';

-- 初始化现有记录的 vectorClock
UPDATE "SyncFile" SET "vectorClock" = '{}' WHERE "vectorClock" IS NULL;
```

### 10.2 客户端迁移

```typescript
// 检测旧版 FileIndex 并升级
function migrateFileIndex(oldIndex: OldFileIndex): FileIndex {
  return {
    version: 2,
    deviceId: oldIndex.deviceId ?? crypto.randomUUID(),
    files: oldIndex.files.map(f => ({
      ...f,
      vectorClock: {},
      lastSyncedHash: null,
      lastSyncedClock: {},
    })),
  };
}
```

**迁移后第一次同步**：
- 所有文件的 `lastSyncedHash` 为 null
- 会被检测为「未同步」
- 触发完整同步，建立 vectorClock 基线

---

## 11. 实现路线

### Phase 1: 基础设施 ✅ 完成

1. ✅ 创建 `packages/shared-sync` 共享包
2. ✅ 实现向量时钟工具函数（`vector-clock.ts`）
3. ✅ 定义 DTO + Zod schemas（`dto.ts`）
4. ✅ 定义共享类型（`types.ts`）
5. ✅ 实现错误类型（`errors.ts`）
6. ✅ 实现哈希工具（`hash.ts`）
7. ✅ 数据库 schema 迁移（SyncFile 添加 vectorClock 字段，移除 mtime）

### Phase 2: 服务端实现 ✅ 完成

1. ✅ 更新 `sync.dto.ts` - 添加 VectorClockSchema，移除 mtime 相关字段
2. ✅ 更新 `SyncService.computeDiff` - 使用向量时钟比较替代时间戳
3. ✅ 实现 `resolveFile`、`resolveLocalDeleted`、`resolveRemoteDeleted`、`resolveBothExist` 方法
4. ✅ 更新 `SyncService.commitSync` - 保存 vectorClock 替代 mtime
5. ✅ 保留配额检查、存储用量、向量化入队等现有功能

### Phase 3: 客户端实现 ✅ 完成

1. ✅ 更新 `FileEntry` 数据结构 - 添加 vectorClock, lastSyncedHash, lastSyncedClock
2. ✅ 实现 `detectLocalChanges`（只读）- 返回 dtos 和 pendingChanges，不修改 FileIndex
3. ✅ 更新 `executeActions`（记录 pending）- 只做 I/O，返回 downloadedEntries 和 conflictEntries
4. ✅ 实现 `applyChangesToFileIndex`（成功后应用）- 仅在 commit 成功后更新 FileIndex
5. ✅ FileIndex 版本迁移（v1 → v2）- 自动迁移旧格式到向量时钟格式

### Phase 4: 迁移与测试 ✅ 完成

1. ✅ 数据库迁移 - 使用 `prisma db push`，SyncFile 已添加 vectorClock 字段并移除 mtime
2. ✅ 客户端 FileIndex 升级逻辑 - store.ts 自动检测版本并迁移 v1 → v2
3. ✅ 类型检查通过 - shared-api、server、pc client cloud-sync 模块均无类型错误

### Phase 5: 共享包集成 ✅ 完成

1. ✅ 统一使用 `@moryflow/shared-sync` 作为向量时钟的单一来源
2. ✅ server 和 pc 添加 `@moryflow/shared-sync` 依赖
3. ✅ `shared-api` 从 `shared-sync` 重导出 `VectorClock` 类型
4. ✅ 移除服务端和客户端的重复向量时钟实现
5. ✅ 所有包构建通过

### Phase 6: 冲突副本完整同步 ✅ 完成

1. ✅ 扩展 `SyncActionDto` - 添加 `conflictCopyId` 和 `conflictCopyUploadUrl` 字段
2. ✅ 服务端生成冲突副本 fileId - 确保客户端和服务端使用相同的 ID
3. ✅ 服务端生成冲突副本上传 URL - 在 `generatePresignUrls` 中为冲突副本创建预签名 URL
4. ✅ 客户端上传冲突副本到 R2 - 冲突副本内容同步到云端存储
5. ✅ 客户端将冲突副本加入 completed - 服务端创建对应的 SyncFile 记录
6. ✅ 冲突副本在客户端和服务端状态完全一致

---

## 12. 参考资料

- [Vector Clocks - Wikipedia](https://en.wikipedia.org/wiki/Vector_clock)
- [Designing Data-Intensive Applications - Chapter 5](https://dataintensive.net/)
- [CouchDB Replication Protocol](https://docs.couchdb.org/en/stable/replication/protocol.html)
- [Local-First Software](https://www.inkandswitch.com/local-first/)
