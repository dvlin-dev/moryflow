# PC 客户端云同步设计方案

> 本文档描述 PC 客户端接入云同步和向量化功能的技术方案
>
> **设计原则**：模块化、单一职责、类型安全、复用优先
>
> **实现状态**：✅ Main 进程模块已完成 | ✅ Renderer 组件已完成 | ✅ Code Review 已完成

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Renderer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ SyncStatus  │  │ Settings    │  │ SemanticSearch      │  │
│  │ Component   │  │ Panel       │  │ Component           │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │              │
│         └────────────────┼─────────────────────┘              │
│                          │ desktopAPI.cloudSync.*             │
└──────────────────────────┼────────────────────────────────────┘
                           │
┌──────────────────────────┼────────────────────────────────────┐
│                        Preload                                │
│                   contextBridge.exposeInMainWorld             │
└──────────────────────────┼────────────────────────────────────┘
                           │
┌──────────────────────────┼────────────────────────────────────┐
│                         Main                                  │
│                          │                                    │
│  ┌───────────────────────▼───────────────────────────────┐   │
│  │              cloud-sync/                               │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────────────────────┐  │   │
│  │  │ const   │ │ store   │ │ api/                    │  │   │
│  │  │ (类型)  │ │ (持久化)│ │ ├── client.ts (HTTP)   │  │   │
│  │  └─────────┘ └─────────┘ │ └── types.ts (API类型) │  │   │
│  │                          └─────────────────────────┘  │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │ sync-engine/                                    │  │   │
│  │  │ ├── state.ts (状态管理+广播)                    │  │   │
│  │  │ ├── executor.ts (操作执行)                      │  │   │
│  │  │ ├── scheduler.ts (防抖调度)                     │  │   │
│  │  │ └── index.ts (入口)                             │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │ file-id/                                        │  │   │
│  │  │ └── index.ts (fileId 映射表管理)                │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  │  ┌─────────┐                                          │   │
│  │  │ index   │ 统一导出                                 │   │
│  │  └─────────┘                                          │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────────────────────┐    │
│  │ vault-watcher   │──│ 监听文件变化，触发同步            │    │
│  │ (现有，复用)    │  └─────────────────────────────────┘    │
│  ├─────────────────┤  ┌─────────────────────────────────┐    │
│  │ membership-     │──│ 提供 token，监听登录状态变化      │    │
│  │ bridge (现有)   │  └─────────────────────────────────┘    │
│  └─────────────────┘                                          │
└───────────────────────────────────────────────────────────────┘
```

## 二、文件结构

### 2.1 新增文件

```
apps/pc/src/
├── main/
│   └── cloud-sync/
│       ├── index.ts                # 统一导出
│       ├── const.ts                # 本地类型、常量、默认值
│       ├── store.ts                # electron-store 实例
│       │
│       ├── api/                    # API 层（单一职责：HTTP 通信）
│       │   ├── types.ts            # 从后端 DTO 派生的类型
│       │   └── client.ts           # HTTP 客户端
│       │
│       ├── file-id/                # fileId 管理（单一职责）
│       │   └── index.ts
│       │
│       └── sync-engine/            # 同步引擎（单一职责：协调同步）
│           ├── index.ts            # 入口 + 对外接口
│           ├── state.ts            # 状态管理 + 事件广播
│           ├── executor.ts         # 同步操作执行
│           └── scheduler.ts        # 防抖调度
│
├── shared/ipc/
│   └── cloud-sync.ts               # IPC 类型定义（复用 const.ts 类型）
│
└── preload/
    └── index.ts                    # 更新：添加 cloudSync 命名空间
```

### 2.2 需要修改的现有文件

| 文件 | 修改内容 |
|------|---------|
| `shared/ipc/index.ts` | 导出 cloud-sync 类型 |
| `shared/ipc/desktop-api.ts` | 添加 `cloudSync` 命名空间定义 |
| `preload/index.ts` | 实现 `cloudSync` IPC 调用 |
| `main/app/ipc-handlers.ts` | 注册 cloud-sync handlers |
| `main/index.ts` | 集成同步引擎初始化 |

## 三、类型系统设计（类型安全）

### 3.1 API 类型 (`api/types.ts`)

> **原则**：与后端 DTO 保持一致，从服务端 sync.dto.ts、vault.dto.ts 等派生

```typescript
/**
 * API 类型定义
 * 与后端 moryflow-membership/apps/server/src/*/dto/*.dto.ts 保持一致
 */

// ── Vault API ──────────────────────────────────────────────

export interface VaultDto {
  id: string
  name: string
  createdAt: string // ISO date string
  fileCount?: number
  deviceCount?: number
}

export interface VaultDeviceDto {
  id: string
  deviceId: string
  deviceName: string
  lastSyncAt: string | null
}

export interface VaultListDto {
  vaults: VaultDto[]
}

// ── Sync API ───────────────────────────────────────────────

export interface LocalFileDto {
  fileId: string
  path: string
  title: string
  mtime: number
  contentHash: string
  size: number
}

export type SyncAction = 'upload' | 'download' | 'delete' | 'conflict'

export interface SyncActionDto {
  fileId: string
  path: string
  action: SyncAction
  url?: string
  conflictRename?: string
  size?: number
  contentHash?: string
}

export interface SyncDiffRequest {
  vaultId: string
  deviceId: string
  localFiles: LocalFileDto[]
}

export interface SyncDiffResponse {
  actions: SyncActionDto[]
}

export interface CompletedFileDto {
  fileId: string
  action: SyncAction
  path: string
  title: string
  size: number
  contentHash: string
  expectedHash?: string
}

export interface SyncCommitRequest {
  vaultId: string
  deviceId: string
  completed: CompletedFileDto[]
  deleted: string[]
}

export interface SyncCommitResponse {
  success: boolean
  syncedAt: string
  conflicts?: Array<{
    fileId: string
    path: string
    expectedHash: string
    currentHash: string
  }>
}

// ── Vectorize API ──────────────────────────────────────────

export interface VectorizeFileRequest {
  fileId: string
  vaultId: string
  fileName: string
  content: string
}

export interface VectorizeResponse {
  queued: boolean
  fileId: string
}

// ── Search API ─────────────────────────────────────────────

export interface SearchRequest {
  query: string
  topK?: number
  vaultId?: string
}

export interface SearchResultItem {
  fileId: string
  score: number
  title: string
}

export interface SearchResponse {
  results: SearchResultItem[]
  count: number
}

// ── Usage API ──────────────────────────────────────────────

export interface UsageResponse {
  storage: {
    used: number
    limit: number
    percentage: number
  }
  vectorized: {
    count: number
    limit: number
    percentage: number
  }
  fileLimit: {
    maxFileSize: number
  }
  plan: string
}
```

### 3.2 本地类型 (`const.ts`)

> **原则**：只定义 PC 端特有的类型和常量

```typescript
import { z } from 'zod'

// ── 云同步设置（PC 端持久化）────────────────────────────────

export const CloudSyncSettingsSchema = z.object({
  syncEnabled: z.boolean(),
  vectorizeEnabled: z.boolean(),
  deviceId: z.string().uuid(),
  deviceName: z.string().min(1).max(100),
})

export type CloudSyncSettings = z.infer<typeof CloudSyncSettingsSchema>

// ── Vault 绑定信息（PC 端持久化）────────────────────────────

export interface VaultBinding {
  localPath: string
  vaultId: string
  vaultName: string
  boundAt: number
}

// ── Store Schema ────────────────────────────────────────────

export interface CloudSyncStoreSchema {
  settings: CloudSyncSettings
  /** key 为 localPath */
  bindings: Record<string, VaultBinding>
}

// ── 同步状态（内存中，不持久化）─────────────────────────────

export type SyncEngineStatus = 'idle' | 'syncing' | 'offline' | 'disabled'

export interface SyncStatusSnapshot {
  engineStatus: SyncEngineStatus
  vaultPath: string | null
  vaultId: string | null
  pendingCount: number
  lastSyncAt: number | null
  error?: string
}

// ── 常量 ────────────────────────────────────────────────────

export const STORE_NAME = 'cloud-sync'

/** 同步防抖延迟 (ms) */
export const SYNC_DEBOUNCE_DELAY = 300

/** 向量化防抖延迟 (ms) */
export const VECTORIZE_DEBOUNCE_DELAY = 1000

/** 向量化内容大小限制 (bytes) - 与后端 MAX_CONTENT_LENGTH 对应 */
export const VECTORIZE_MAX_SIZE = 100 * 1024

/** fileId 映射文件路径 */
export const FILE_ID_MAP_PATH = '.moryflow/file-ids.json'

// ── 默认值工厂 ──────────────────────────────────────────────

export const createDefaultSettings = (): CloudSyncSettings => ({
  syncEnabled: false,
  vectorizeEnabled: false,
  deviceId: crypto.randomUUID(),
  deviceName: require('os').hostname(),
})

export const DEFAULT_STORE: CloudSyncStoreSchema = {
  settings: createDefaultSettings(),
  bindings: {},
}
```

## 四、模块实现

### 4.1 store.ts - 持久化存储（单一职责）

> 参考：`agent-settings/store.ts`

```typescript
import Store from 'electron-store'
import {
  STORE_NAME,
  DEFAULT_STORE,
  createDefaultSettings,
  type CloudSyncStoreSchema,
  type CloudSyncSettings,
  type VaultBinding,
} from './const.js'

const store = new Store<CloudSyncStoreSchema>({
  name: STORE_NAME,
  defaults: DEFAULT_STORE,
})

// ── Settings ────────────────────────────────────────────────

export const readSettings = (): CloudSyncSettings =>
  store.get('settings') ?? createDefaultSettings()

export const writeSettings = (settings: CloudSyncSettings): void => {
  store.set('settings', settings)
}

// ── Bindings ────────────────────────────────────────────────

export const readBindings = (): Record<string, VaultBinding> =>
  store.get('bindings') ?? {}

export const readBinding = (localPath: string): VaultBinding | null =>
  readBindings()[localPath] ?? null

export const writeBinding = (binding: VaultBinding): void => {
  const bindings = readBindings()
  bindings[binding.localPath] = binding
  store.set('bindings', bindings)
}

export const deleteBinding = (localPath: string): void => {
  const bindings = readBindings()
  delete bindings[localPath]
  store.set('bindings', bindings)
}
```

### 4.2 api/client.ts - HTTP 客户端（单一职责）

> **原则**：只负责 HTTP 请求，不含业务逻辑

```typescript
import { membershipBridge } from '../../membership-bridge.js'
import type {
  VaultDto,
  VaultListDto,
  VaultDeviceDto,
  SyncDiffRequest,
  SyncDiffResponse,
  SyncCommitRequest,
  SyncCommitResponse,
  VectorizeFileRequest,
  VectorizeResponse,
  SearchRequest,
  SearchResponse,
  UsageResponse,
} from './types.js'

// ── HTTP 错误类型 ───────────────────────────────────────────

export class CloudSyncApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'CloudSyncApiError'
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isQuotaExceeded(): boolean {
    return this.status === 403
  }

  get isServerError(): boolean {
    return this.status >= 500
  }
}

// ── 基础请求函数 ────────────────────────────────────────────

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const config = membershipBridge.getConfig()
  if (!config.token) {
    throw new CloudSyncApiError('未登录', 401, 'UNAUTHORIZED')
  }

  const res = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `请求失败: ${res.status}` }))
    throw new CloudSyncApiError(
      error.message || `请求失败: ${res.status}`,
      res.status,
      error.code
    )
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T
  }

  return res.json()
}

// ── API 方法（纯函数）────────────────────────────────────────

export const cloudSyncApi = {
  // ── Vault ─────────────────────────────────────────────────

  listVaults: (): Promise<VaultListDto> =>
    request('/api/vaults'),

  createVault: (name: string): Promise<VaultDto> =>
    request('/api/vaults', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  getVault: (vaultId: string): Promise<VaultDto> =>
    request(`/api/vaults/${vaultId}`),

  deleteVault: (vaultId: string): Promise<void> =>
    request(`/api/vaults/${vaultId}`, { method: 'DELETE' }),

  registerDevice: (
    vaultId: string,
    deviceId: string,
    deviceName: string
  ): Promise<VaultDeviceDto> =>
    request(`/api/vaults/${vaultId}/devices`, {
      method: 'POST',
      body: JSON.stringify({ deviceId, deviceName }),
    }),

  // ── Sync ──────────────────────────────────────────────────

  syncDiff: (payload: SyncDiffRequest): Promise<SyncDiffResponse> =>
    request('/api/sync/diff', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  syncCommit: (payload: SyncCommitRequest): Promise<SyncCommitResponse> =>
    request('/api/sync/commit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // ── Vectorize ─────────────────────────────────────────────

  vectorizeFile: (payload: VectorizeFileRequest): Promise<VectorizeResponse> =>
    request('/api/vectorize/file', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteVector: (fileId: string): Promise<{ success: boolean }> =>
    request(`/api/vectorize/file/${fileId}`, { method: 'DELETE' }),

  // ── Search ────────────────────────────────────────────────

  search: (payload: SearchRequest): Promise<SearchResponse> =>
    request('/api/search', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // ── Usage ─────────────────────────────────────────────────

  getUsage: (): Promise<UsageResponse> =>
    request('/api/usage'),
} as const
```

### 4.3 file-id/index.ts - fileId 映射管理（单一职责）

```typescript
import path from 'node:path'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { FILE_ID_MAP_PATH } from '../const.js'

type FileIdMapping = Record<string, string>

// ── 内部缓存 ────────────────────────────────────────────────

const cache = new Map<string, FileIdMapping>()

// ── 路径工具 ────────────────────────────────────────────────

const getMapPath = (vaultPath: string): string =>
  path.join(vaultPath, FILE_ID_MAP_PATH)

// ── 核心函数 ────────────────────────────────────────────────

export const loadMapping = async (vaultPath: string): Promise<FileIdMapping> => {
  const cached = cache.get(vaultPath)
  if (cached) return cached

  try {
    const content = await readFile(getMapPath(vaultPath), 'utf-8')
    const mapping = JSON.parse(content) as FileIdMapping
    cache.set(vaultPath, mapping)
    return mapping
  } catch {
    const mapping: FileIdMapping = {}
    cache.set(vaultPath, mapping)
    return mapping
  }
}

const saveMapping = async (vaultPath: string): Promise<void> => {
  const mapping = cache.get(vaultPath) ?? {}
  const mapPath = getMapPath(vaultPath)
  await mkdir(path.dirname(mapPath), { recursive: true })
  await writeFile(mapPath, JSON.stringify(mapping, null, 2))
}

// ── 导出 API ────────────────────────────────────────────────

export const fileIdManager = {
  /** 加载 vault 的 fileId 映射表 */
  load: loadMapping,

  /** 清除 vault 的缓存（切换 vault 时调用） */
  clearCache: (vaultPath: string): void => {
    cache.delete(vaultPath)
  },

  /** 获取或创建 fileId */
  async getOrCreate(vaultPath: string, relativePath: string): Promise<string> {
    const mapping = await loadMapping(vaultPath)
    if (mapping[relativePath]) {
      return mapping[relativePath]
    }
    const fileId = crypto.randomUUID()
    mapping[relativePath] = fileId
    await saveMapping(vaultPath)
    return fileId
  },

  /** 移动/重命名文件时更新映射 */
  async move(vaultPath: string, oldPath: string, newPath: string): Promise<void> {
    const mapping = await loadMapping(vaultPath)
    const fileId = mapping[oldPath]
    if (fileId) {
      delete mapping[oldPath]
      mapping[newPath] = fileId
      await saveMapping(vaultPath)
    }
  },

  /** 删除文件时移除映射 */
  async delete(vaultPath: string, relativePath: string): Promise<string | null> {
    const mapping = await loadMapping(vaultPath)
    const fileId = mapping[relativePath]
    if (fileId) {
      delete mapping[relativePath]
      await saveMapping(vaultPath)
    }
    return fileId
  },

  /** 根据路径获取 fileId */
  async getByPath(vaultPath: string, relativePath: string): Promise<string | null> {
    const mapping = await loadMapping(vaultPath)
    return mapping[relativePath] ?? null
  },

  /** 根据 fileId 获取路径 */
  async getByFileId(vaultPath: string, fileId: string): Promise<string | null> {
    const mapping = await loadMapping(vaultPath)
    for (const [p, id] of Object.entries(mapping)) {
      if (id === fileId) return p
    }
    return null
  },

  /** 获取所有映射 */
  getAll: loadMapping,
} as const
```

### 4.4 sync-engine/ - 同步引擎

#### sync-engine/state.ts - 状态管理（单一职责）

```typescript
import { BrowserWindow } from 'electron'
import type { SyncStatusSnapshot, SyncEngineStatus } from '../const.js'

// ── 内部状态 ────────────────────────────────────────────────

let engineStatus: SyncEngineStatus = 'disabled'
let currentVaultPath: string | null = null
let currentVaultId: string | null = null
let pendingFiles = new Set<string>()
let lastSyncAt: number | null = null
let lastError: string | undefined

// ── 监听器 ──────────────────────────────────────────────────

const listeners = new Set<(snapshot: SyncStatusSnapshot) => void>()

// ── 状态快照 ────────────────────────────────────────────────

export const getSnapshot = (): SyncStatusSnapshot => ({
  engineStatus,
  vaultPath: currentVaultPath,
  vaultId: currentVaultId,
  pendingCount: pendingFiles.size,
  lastSyncAt,
  error: lastError,
})

// ── 广播 ────────────────────────────────────────────────────

export const broadcast = (): void => {
  const snapshot = getSnapshot()
  // 内部监听器
  for (const listener of listeners) {
    try {
      listener(snapshot)
    } catch (e) {
      console.error('[cloud-sync] listener error:', e)
    }
  }
  // 广播到所有窗口
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('cloud-sync:status-changed', snapshot)
  }
}

// ── 状态更新函数 ────────────────────────────────────────────

export const syncState = {
  // ── Getters ───────────────────────────────────────────────
  get status() { return engineStatus },
  get vaultPath() { return currentVaultPath },
  get vaultId() { return currentVaultId },
  get pendingFiles() { return pendingFiles },

  // ── Setters ───────────────────────────────────────────────
  setStatus(status: SyncEngineStatus): void {
    engineStatus = status
  },

  setVault(vaultPath: string | null, vaultId: string | null): void {
    currentVaultPath = vaultPath
    currentVaultId = vaultId
  },

  setLastSync(time: number): void {
    lastSyncAt = time
  },

  setError(error: string | undefined): void {
    lastError = error
  },

  addPending(relativePath: string): void {
    pendingFiles.add(relativePath)
  },

  clearPending(): void {
    pendingFiles = new Set()
  },

  // ── 重置 ──────────────────────────────────────────────────
  reset(): void {
    engineStatus = 'disabled'
    currentVaultPath = null
    currentVaultId = null
    pendingFiles = new Set()
    lastError = undefined
  },

  // ── 订阅 ──────────────────────────────────────────────────
  subscribe(listener: (snapshot: SyncStatusSnapshot) => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
```

#### sync-engine/executor.ts - 操作执行（单一职责）

```typescript
import path from 'node:path'
import crypto from 'node:crypto'
import { readFile, writeFile, rename, stat, mkdir } from 'node:fs/promises'
import type { SyncActionDto, CompletedFileDto, LocalFileDto } from '../api/types.js'
import { fileIdManager } from '../file-id/index.js'

// ── 工具函数 ────────────────────────────────────────────────

export const computeHash = async (filePath: string): Promise<string> => {
  const content = await readFile(filePath)
  return crypto.createHash('sha256').update(content).digest('hex')
}

export const getRelativePath = (vaultPath: string, absolutePath: string): string =>
  path.relative(vaultPath, absolutePath)

export const isMarkdownFile = (filePath: string): boolean =>
  filePath.toLowerCase().endsWith('.md')

// ── 收集本地文件信息 ────────────────────────────────────────

export const collectLocalFiles = async (vaultPath: string): Promise<LocalFileDto[]> => {
  const mapping = await fileIdManager.getAll(vaultPath)
  const localFiles: LocalFileDto[] = []

  for (const [relativePath, fileId] of Object.entries(mapping)) {
    const absolutePath = path.join(vaultPath, relativePath)
    try {
      const stats = await stat(absolutePath)
      if (!stats.isFile()) continue

      const contentHash = await computeHash(absolutePath)
      localFiles.push({
        fileId,
        path: relativePath,
        title: path.basename(relativePath, path.extname(relativePath)),
        mtime: stats.mtimeMs,
        contentHash,
        size: stats.size,
      })
    } catch {
      // 文件可能已删除，跳过
    }
  }

  return localFiles
}

// ── 执行单个同步操作 ────────────────────────────────────────

export const executeAction = async (
  action: SyncActionDto,
  vaultPath: string,
  completed: CompletedFileDto[],
  deleted: string[]
): Promise<void> => {
  const absolutePath = path.join(vaultPath, action.path)

  switch (action.action) {
    case 'upload': {
      if (!action.url) return
      const content = await readFile(absolutePath)
      await fetch(action.url, { method: 'PUT', body: content })
      const hash = await computeHash(absolutePath)
      completed.push({
        fileId: action.fileId,
        action: 'upload',
        path: action.path,
        title: path.basename(action.path, path.extname(action.path)),
        size: content.length,
        contentHash: hash,
      })
      break
    }

    case 'download': {
      if (!action.url) return
      // 确保目录存在
      await mkdir(path.dirname(absolutePath), { recursive: true })
      const res = await fetch(action.url)
      const content = await res.arrayBuffer()
      await writeFile(absolutePath, Buffer.from(content))
      // 为下载的文件创建 fileId 映射
      const mapping = await fileIdManager.load(vaultPath)
      mapping[action.path] = action.fileId
      completed.push({
        fileId: action.fileId,
        action: 'download',
        path: action.path,
        title: path.basename(action.path, path.extname(action.path)),
        size: content.byteLength,
        contentHash: action.contentHash ?? '',
      })
      break
    }

    case 'delete': {
      deleted.push(action.fileId)
      break
    }

    case 'conflict': {
      if (!action.conflictRename) return
      const conflictPath = path.join(path.dirname(absolutePath), action.conflictRename)
      await rename(absolutePath, conflictPath)
      // 为冲突文件创建新 fileId
      const relativePath = getRelativePath(vaultPath, conflictPath)
      await fileIdManager.getOrCreate(vaultPath, relativePath)
      break
    }
  }
}
```

#### sync-engine/scheduler.ts - 防抖调度（单一职责）

```typescript
import { SYNC_DEBOUNCE_DELAY, VECTORIZE_DEBOUNCE_DELAY, VECTORIZE_MAX_SIZE } from '../const.js'
import { readSettings, readBinding } from '../store.js'
import { cloudSyncApi } from '../api/client.js'
import { fileIdManager } from '../file-id/index.js'
import { stat, readFile } from 'node:fs/promises'
import path from 'node:path'

// ── 同步调度 ────────────────────────────────────────────────

let syncDebounceTimer: NodeJS.Timeout | null = null

export const scheduleSync = (performSync: () => Promise<void>): void => {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer)
  }
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null
    void performSync()
  }, SYNC_DEBOUNCE_DELAY)
}

export const cancelScheduledSync = (): void => {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer)
    syncDebounceTimer = null
  }
}

// ── 向量化调度 ──────────────────────────────────────────────

const vectorizeTimers = new Map<string, NodeJS.Timeout>()

export const scheduleVectorize = (vaultPath: string, relativePath: string): void => {
  // 只处理 Markdown 文件
  if (!relativePath.toLowerCase().endsWith('.md')) return

  const key = `${vaultPath}:${relativePath}`
  const existing = vectorizeTimers.get(key)
  if (existing) {
    clearTimeout(existing)
  }

  const timer = setTimeout(() => {
    vectorizeTimers.delete(key)
    void performVectorize(vaultPath, relativePath)
  }, VECTORIZE_DEBOUNCE_DELAY)

  vectorizeTimers.set(key, timer)
}

export const cancelAllVectorize = (): void => {
  for (const timer of vectorizeTimers.values()) {
    clearTimeout(timer)
  }
  vectorizeTimers.clear()
}

// ── 执行向量化 ──────────────────────────────────────────────

const performVectorize = async (vaultPath: string, relativePath: string): Promise<void> => {
  const settings = readSettings()
  if (!settings.vectorizeEnabled) return

  const binding = readBinding(vaultPath)
  if (!binding) return

  const absolutePath = path.join(vaultPath, relativePath)

  try {
    const stats = await stat(absolutePath)
    if (stats.size > VECTORIZE_MAX_SIZE) {
      console.warn('[cloud-sync] file too large for vectorize:', relativePath)
      return
    }

    const content = await readFile(absolutePath, 'utf-8')
    const fileId = await fileIdManager.getOrCreate(vaultPath, relativePath)

    await cloudSyncApi.vectorizeFile({
      fileId,
      vaultId: binding.vaultId,
      fileName: path.basename(relativePath),
      content,
    })
  } catch (error) {
    console.warn('[cloud-sync] vectorize failed:', error)
  }
}
```

#### sync-engine/index.ts - 入口（协调各模块）

```typescript
import path from 'node:path'
import { readSettings, readBinding } from '../store.js'
import { cloudSyncApi, CloudSyncApiError } from '../api/client.js'
import { fileIdManager } from '../file-id/index.js'
import { membershipBridge } from '../../membership-bridge.js'
import { syncState, broadcast, getSnapshot } from './state.js'
import { collectLocalFiles, executeAction, getRelativePath } from './executor.js'
import { scheduleSync, cancelScheduledSync, scheduleVectorize, cancelAllVectorize } from './scheduler.js'
import type { SyncStatusSnapshot } from '../const.js'

// ── 核心同步流程 ────────────────────────────────────────────

const performSync = async (): Promise<void> => {
  const { vaultPath, vaultId, status } = syncState
  if (!vaultPath || !vaultId) return
  if (status !== 'idle' && status !== 'syncing') return

  const settings = readSettings()
  if (!settings.syncEnabled) return

  try {
    syncState.setStatus('syncing')
    syncState.setError(undefined)
    broadcast()

    // 收集本地文件
    const localFiles = await collectLocalFiles(vaultPath)

    // 获取同步差异
    const { actions } = await cloudSyncApi.syncDiff({
      vaultId,
      deviceId: settings.deviceId,
      localFiles,
    })

    // 执行同步操作
    const completed: any[] = []
    const deleted: string[] = []

    for (const action of actions) {
      await executeAction(action, vaultPath, completed, deleted)
    }

    // 提交同步结果
    if (completed.length > 0 || deleted.length > 0) {
      await cloudSyncApi.syncCommit({
        vaultId,
        deviceId: settings.deviceId,
        completed,
        deleted,
      })
    }

    syncState.setLastSync(Date.now())
    syncState.clearPending()
    syncState.setStatus('idle')
  } catch (error) {
    if (error instanceof CloudSyncApiError) {
      syncState.setError(error.message)
      // 可根据 error.status 做特殊处理
    } else {
      syncState.setError(error instanceof Error ? error.message : String(error))
    }
    syncState.setStatus('idle')
  } finally {
    broadcast()
  }
}

// ── 导出 API ────────────────────────────────────────────────

export const cloudSyncEngine = {
  /** 初始化同步引擎（在 vault 打开时调用） */
  async init(vaultPath: string): Promise<void> {
    const settings = readSettings()
    if (!settings.syncEnabled) {
      syncState.setStatus('disabled')
      broadcast()
      return
    }

    const config = membershipBridge.getConfig()
    if (!config.token) {
      syncState.setStatus('disabled')
      broadcast()
      return
    }

    // 加载 fileId 映射
    await fileIdManager.load(vaultPath)

    const binding = readBinding(vaultPath)
    syncState.setVault(vaultPath, binding?.vaultId ?? null)
    syncState.setStatus('idle')
    broadcast()

    // 首次同步
    if (binding?.vaultId) {
      void performSync()
    }
  },

  /** 停止同步引擎 */
  stop(): void {
    cancelScheduledSync()
    cancelAllVectorize()

    const prevPath = syncState.vaultPath
    if (prevPath) {
      fileIdManager.clearCache(prevPath)
    }

    syncState.reset()
    broadcast()
  },

  /** 处理文件变化（由 vault-watcher 触发） */
  handleFileChange(type: 'add' | 'change' | 'unlink', absolutePath: string): void {
    const { vaultPath, status } = syncState
    if (!vaultPath || status === 'disabled') return

    const relativePath = getRelativePath(vaultPath, absolutePath)

    if (type === 'add' || type === 'change') {
      syncState.addPending(relativePath)
      scheduleSync(performSync)
      scheduleVectorize(vaultPath, relativePath)
    } else if (type === 'unlink') {
      syncState.addPending(relativePath)
      scheduleSync(performSync)
      // 删除向量
      void fileIdManager.delete(vaultPath, relativePath).then((fileId) => {
        if (fileId) {
          void cloudSyncApi.deleteVector(fileId).catch(() => {})
        }
      })
    }

    broadcast()
  },

  /** 手动触发同步 */
  triggerSync(): void {
    void performSync()
  },

  /** 获取状态快照 */
  getStatus(): SyncStatusSnapshot {
    return getSnapshot()
  },

  /** 订阅状态变化 */
  onStatusChange(listener: (snapshot: SyncStatusSnapshot) => void): () => void {
    return syncState.subscribe(listener)
  },
} as const
```

### 4.5 index.ts - 统一导出

```typescript
// ── 引擎 ────────────────────────────────────────────────────
export { cloudSyncEngine } from './sync-engine/index.js'

// ── API ─────────────────────────────────────────────────────
export { cloudSyncApi, CloudSyncApiError } from './api/client.js'
export type * from './api/types.js'

// ── fileId ──────────────────────────────────────────────────
export { fileIdManager } from './file-id/index.js'

// ── Store ───────────────────────────────────────────────────
export {
  readSettings,
  writeSettings,
  readBinding,
  writeBinding,
  deleteBinding,
} from './store.js'

// ── 类型和常量 ──────────────────────────────────────────────
export type {
  CloudSyncSettings,
  VaultBinding,
  SyncStatusSnapshot,
  SyncEngineStatus,
} from './const.js'

export {
  SYNC_DEBOUNCE_DELAY,
  VECTORIZE_DEBOUNCE_DELAY,
  VECTORIZE_MAX_SIZE,
} from './const.js'
```

## 五、IPC 接口

### 5.1 类型定义 (`shared/ipc/cloud-sync.ts`)

> **原则**：复用 const.ts 类型，避免重复定义

```typescript
/**
 * Cloud Sync IPC 类型
 * 复用 main/cloud-sync/const.ts 中的类型
 */

// 从 main 导出的类型
export type {
  CloudSyncSettings,
  VaultBinding,
  SyncStatusSnapshot,
} from '../../main/cloud-sync/const.js'

// IPC 专用类型
export interface CloudVault {
  id: string
  name: string
  fileCount?: number
}

export interface CloudUsageInfo {
  storage: { used: number; limit: number; percentage: number }
  vectorized: { count: number; limit: number; percentage: number }
  fileLimit: { maxFileSize: number }
  plan: string
}

export interface SemanticSearchResult {
  fileId: string
  score: number
  title: string
  localPath?: string
}

export interface CloudSyncStatusEvent {
  status: SyncStatusSnapshot
}
```

### 5.2 更新 desktop-api.ts

```typescript
import type {
  CloudSyncSettings,
  VaultBinding,
  SyncStatusSnapshot,
  CloudVault,
  CloudUsageInfo,
  SemanticSearchResult,
  CloudSyncStatusEvent,
} from './cloud-sync'

export type DesktopApi = {
  // ... 现有定义 ...

  cloudSync: {
    // 设置
    getSettings: () => Promise<CloudSyncSettings>
    updateSettings: (patch: Partial<CloudSyncSettings>) => Promise<CloudSyncSettings>

    // Vault 绑定
    getBinding: (localPath: string) => Promise<VaultBinding | null>
    bindVault: (input: { localPath: string; vaultId?: string; vaultName?: string }) => Promise<VaultBinding>
    unbindVault: (localPath: string) => Promise<void>
    listCloudVaults: () => Promise<CloudVault[]>

    // 同步控制
    getStatus: () => Promise<SyncStatusSnapshot>
    triggerSync: () => Promise<void>
    onStatusChange: (handler: (event: CloudSyncStatusEvent) => void) => () => void

    // 用量
    getUsage: () => Promise<CloudUsageInfo>

    // 搜索
    search: (input: { query: string; topK?: number; vaultId?: string }) => Promise<SemanticSearchResult[]>
  }
}
```

### 5.3 更新 preload/index.ts

```typescript
import type { CloudSyncStatusEvent } from '../shared/ipc/cloud-sync.js'

// 在 api 对象中添加：
cloudSync: {
  getSettings: () => ipcRenderer.invoke('cloud-sync:getSettings'),
  updateSettings: (patch) => ipcRenderer.invoke('cloud-sync:updateSettings', patch ?? {}),

  getBinding: (localPath) => ipcRenderer.invoke('cloud-sync:getBinding', { localPath }),
  bindVault: (input) => ipcRenderer.invoke('cloud-sync:bindVault', input ?? {}),
  unbindVault: (localPath) => ipcRenderer.invoke('cloud-sync:unbindVault', { localPath }),
  listCloudVaults: () => ipcRenderer.invoke('cloud-sync:listCloudVaults'),

  getStatus: () => ipcRenderer.invoke('cloud-sync:getStatus'),
  triggerSync: () => ipcRenderer.invoke('cloud-sync:triggerSync'),
  onStatusChange: (handler) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: CloudSyncStatusEvent) =>
      handler(payload)
    ipcRenderer.on('cloud-sync:status-changed', listener)
    return () => ipcRenderer.removeListener('cloud-sync:status-changed', listener)
  },

  getUsage: () => ipcRenderer.invoke('cloud-sync:getUsage'),

  search: (input) => ipcRenderer.invoke('cloud-sync:search', input ?? {}),
},
```

## 六、IPC Handlers 注册

```typescript
// main/app/ipc-handlers.ts

import path from 'node:path'
import {
  cloudSyncEngine,
  cloudSyncApi,
  fileIdManager,
  readSettings,
  writeSettings,
  readBinding,
  writeBinding,
  deleteBinding,
} from '../cloud-sync/index.js'

// ── Cloud Sync Handlers ─────────────────────────────────────

ipcMain.handle('cloud-sync:getSettings', () => readSettings())

ipcMain.handle('cloud-sync:updateSettings', (_e, patch) => {
  const current = readSettings()
  const next = { ...current, ...patch }
  writeSettings(next)
  return next
})

ipcMain.handle('cloud-sync:getBinding', (_e, { localPath }) => {
  return readBinding(localPath)
})

ipcMain.handle('cloud-sync:bindVault', async (_e, { localPath, vaultId, vaultName }) => {
  if (!localPath) throw new Error('localPath is required')

  const settings = readSettings()
  let finalVaultId = vaultId

  // 如果没有指定 vaultId，创建新的
  if (!finalVaultId) {
    const name = vaultName || path.basename(localPath)
    const vault = await cloudSyncApi.createVault(name)
    finalVaultId = vault.id
  }

  // 注册设备
  await cloudSyncApi.registerDevice(finalVaultId, settings.deviceId, settings.deviceName)

  // 保存绑定
  const binding = {
    localPath,
    vaultId: finalVaultId,
    vaultName: vaultName || path.basename(localPath),
    boundAt: Date.now(),
  }
  writeBinding(binding)

  // 初始化同步引擎
  await cloudSyncEngine.init(localPath)

  return binding
})

ipcMain.handle('cloud-sync:unbindVault', (_e, { localPath }) => {
  deleteBinding(localPath)
  cloudSyncEngine.stop()
})

ipcMain.handle('cloud-sync:listCloudVaults', async () => {
  const { vaults } = await cloudSyncApi.listVaults()
  return vaults.map((v) => ({
    id: v.id,
    name: v.name,
    fileCount: v.fileCount,
  }))
})

ipcMain.handle('cloud-sync:getStatus', () => cloudSyncEngine.getStatus())

ipcMain.handle('cloud-sync:triggerSync', () => {
  cloudSyncEngine.triggerSync()
})

ipcMain.handle('cloud-sync:getUsage', () => cloudSyncApi.getUsage())

ipcMain.handle('cloud-sync:search', async (_e, { query, topK, vaultId }) => {
  const response = await cloudSyncApi.search({ query, topK, vaultId })
  const status = cloudSyncEngine.getStatus()

  // 填充 localPath
  if (status.vaultPath) {
    return Promise.all(
      response.results.map(async (r) => ({
        ...r,
        localPath: await fileIdManager.getByFileId(status.vaultPath!, r.fileId),
      }))
    )
  }

  return response.results
})
```

## 七、集成点

### 7.1 与 vault-watcher 集成

```typescript
// main/index.ts

import { cloudSyncEngine } from './cloud-sync/index.js'

// 修改 emitFsEvent，添加同步触发
const handleFsEvent = (type: FsEventType, changedPath: string) => {
  // 原有逻辑：通知渲染进程
  emitFsEvent(type, changedPath)

  // 新增：触发同步引擎
  if (type === 'file-added') {
    cloudSyncEngine.handleFileChange('add', changedPath)
  } else if (type === 'file-changed') {
    cloudSyncEngine.handleFileChange('change', changedPath)
  } else if (type === 'file-removed') {
    cloudSyncEngine.handleFileChange('unlink', changedPath)
  }
}
```

### 7.2 与 membership-bridge 集成

```typescript
// main/index.ts

import { membershipBridge } from './membership-bridge.js'
import { cloudSyncEngine } from './cloud-sync/index.js'

// 监听登录状态变化
membershipBridge.addListener(() => {
  const config = membershipBridge.getConfig()
  if (!config.token) {
    // 登出时停止同步
    cloudSyncEngine.stop()
  }
})
```

## 八、设计要点总结

### 8.1 单一职责

| 模块 | 职责 |
|------|------|
| `const.ts` | 类型定义、常量、默认值 |
| `store.ts` | electron-store 读写操作 |
| `api/client.ts` | HTTP 请求（纯函数） |
| `api/types.ts` | API 类型（与后端对齐） |
| `file-id/` | fileId 映射管理 |
| `sync-engine/state.ts` | 状态管理和广播 |
| `sync-engine/executor.ts` | 同步操作执行 |
| `sync-engine/scheduler.ts` | 防抖调度 |
| `sync-engine/index.ts` | 协调各模块 |

### 8.2 类型安全

- API 类型与后端 DTO 保持一致
- 使用 Zod Schema 进行运行时验证
- IPC 类型复用 const.ts 定义

### 8.3 错误处理

- `CloudSyncApiError` 区分错误类型（401/403/5xx）
- 同步失败时保持 idle 状态，记录错误信息
- 向量化失败静默处理，不影响同步流程

### 8.4 复用现有模式

- Store 模式：参考 `agent-settings/store.ts`
- 监听器模式：参考 `agent-settings/index.ts`
- IPC 模式：参考 `preload/index.ts`
- 广播模式：参考 `agent:mcp-status-changed`

## 九、Renderer 组件实现

### 9.1 文件结构

```
apps/pc/src/renderer/
├── hooks/
│   └── use-cloud-sync.ts          # 云同步状态订阅 hook
│
├── components/
│   ├── cloud-sync/
│   │   ├── index.ts               # 组件导出
│   │   └── sync-status-indicator.tsx  # 同步状态指示器
│   │
│   └── settings-dialog/
│       └── components/
│           ├── cloud-sync-section.tsx     # 云同步设置面板
│           └── cloud-sync/
│               └── vault-bind-dialog.tsx  # Vault 绑定对话框
```

### 9.2 useCloudSync Hook

提供云同步状态订阅和操作方法：

```typescript
const {
  status,          // 同步状态快照
  settings,        // 云同步设置
  binding,         // 当前 vault 绑定信息
  isLoaded,        // 是否已加载
  refresh,         // 刷新状态
  triggerSync,     // 手动触发同步
  updateSettings,  // 更新设置
  listCloudVaults, // 获取云端 Vault 列表
  bindVault,       // 绑定 Vault
  unbindVault,     // 解绑 Vault
  getUsage,        // 获取用量信息
} = useCloudSync(vaultPath)
```

### 9.3 SyncStatusIndicator 组件

显示当前同步状态的紧凑组件，支持：
- 状态图标显示（idle/syncing/offline/disabled/error）
- 待同步文件数量徽章
- 点击触发同步或打开设置
- Tooltip 显示详细信息

### 9.4 CloudSyncSection 设置面板

设置对话框中的云同步配置面板，包含：
- Vault 绑定状态卡片
- 自动同步开关
- 智能索引（向量化）开关
- 存储空间和索引用量进度条
- 设备信息显示

### 9.5 VaultBindDialog 绑定对话框

支持两种绑定模式：
- **新建 Vault**：输入名称创建新的云端 Vault
- **已有 Vault**：选择已存在的云端 Vault 进行绑定

### 9.6 语义搜索界面

**位置**：侧边栏 VaultExplorer 组件内

**文件结构**：
```
workspace/components/vault-explorer/
├── index.tsx                      # 主组件（已集成搜索逻辑）
├── const.ts                       # 类型定义
└── components/
    ├── search-input.tsx           # 搜索输入框
    └── search-results.tsx         # 搜索结果列表
```

**交互设计**：
```
┌─────────────────────────┐
│ 工作区名称              │  ← header
├─────────────────────────┤
│ 🔍 搜索笔记...          │  ← SearchInput
├─────────────────────────┤
│                         │
│   [搜索结果列表]        │  ← 输入时显示 SearchResults
│   或                    │
│   [文件树]              │  ← 默认显示 VaultFiles
│                         │
├─────────────────────────┤
│ [操作按钮栏]            │  ← FloatingActionBar
└─────────────────────────┘
```

**功能特性**：
- 防抖搜索（300ms）
- 实时显示搜索结果
- 结果显示：标题、本地可用状态、相关度分数
- 点击结果：本地文件直接打开，云端文件提示"尚未同步到本地"
- 清空搜索恢复文件树视图

**组件 Props**：

```typescript
// SearchInput
type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  isSearching: boolean
  onClear: () => void
  placeholder?: string
}

// SearchResults
type SearchResultsProps = {
  results: SemanticSearchResult[]
  isLoading: boolean
  onSelect: (result: SemanticSearchResult) => void
}
```

### 9.7 SyncStatusIndicator 集成位置

**位置**：FloatingActionBar（刷新按钮旁边）

**集成方式**：
```tsx
// floating-action-bar/index.tsx
<div className="flex items-center gap-1">
  <ActionButton icon={Command} ... />
  <ActionButton icon={FolderOpen} ... />
  <ActionButton icon={RefreshCw} ... />
  <SyncStatusIndicator
    vaultPath={vaultPath}
    onOpenSettings={() => onSettingsOpen('cloud-sync')}
    compact
  />
</div>
```
