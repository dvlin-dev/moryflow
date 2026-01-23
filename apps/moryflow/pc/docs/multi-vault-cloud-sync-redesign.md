# 多 Vault 支持与云同步优化设计方案

> 本文档描述多 Vault 支持和云同步体验优化的技术方案
>
> **设计原则**：Notion 级别的用户体验、最小化用户操作、自动化优先

---

## 一、需求背景

### 1.1 当前问题

| 问题            | 现状                                              | 期望                          |
| --------------- | ------------------------------------------------- | ----------------------------- |
| 云同步 500 错误 | 打开设置页云同步 Tab 时报 `Internal server error` | 正常显示用量信息              |
| 绑定逻辑复杂    | 用户需要手动为每个 Vault 绑定云端                 | 一个开关控制所有 Vault 的同步 |
| 单 Vault 限制   | 左上角只显示单个 Vault 名称                       | 支持多 Vault 切换和创建       |
| 模块适配        | Agent 等模块硬编码单 Vault                        | 统一适配多 Vault              |

### 1.2 期望体验（参考 Notion）

```
┌─────────────────────────────────────────────┐
│  ▾ My Vault              [+]  ← 点击展开选择器
├─────────────────────────────────────────────┤
│    ● My Vault           ✓ 当前               │
│    ○ Work Notes                             │
│    ○ Personal                               │
│    ─────────────────────                    │
│    + 新建 Vault                              │
│    + 打开已有文件夹                           │
└─────────────────────────────────────────────┘

云同步：全局开关，打开即自动同步所有 Vault
```

---

## 二、问题分析

### 2.1 云同步 500 错误分析

**错误链路**：

```
renderer (useCloudSync)
  → window.desktopAPI.cloudSync.getUsage()
    → IPC handler 'cloud-sync:getUsage'
      → cloudSyncApi.getUsage()
        → HTTP GET /api/usage
          → QuotaController.getUsage(@CurrentUser() user)
            → user.id / user.subscriptionTier  ← 如果 user 为 undefined，报错
```

**根本原因**：

1. `@CurrentUser()` 装饰器从 `request.user` 获取用户，依赖认证中间件
2. 当 token 无效/过期/未传递时，`request.user` 可能为 `undefined`
3. 访问 `user.id` 和 `user.subscriptionTier` 导致 TypeError，表现为 500 错误

**解决方案**：

1. **后端**：在 Controller 层添加空值检查，返回 401 而非 500
2. **PC 端**：在调用 API 前检查登录状态，未登录时不发起请求
3. **PC 端**：IPC handler 中捕获 401 错误，返回友好的默认值

### 2.2 云同步绑定逻辑分析

**当前流程**：

```
1. 用户打开 Vault
2. 用户进入设置 → 云同步
3. 用户点击"绑定" → 选择创建新 Vault 或绑定已有
4. 后端创建云端 Vault + 注册设备
5. 本地存储绑定关系
6. 启动同步引擎
```

**问题**：

- 每个 Vault 都需要手动绑定，操作繁琐
- 用户不理解"绑定"概念
- 新建 Vault 不会自动同步

**期望流程**：

```
1. 用户打开设置 → 云同步
2. 打开"云同步"开关（默认开启）
3. 所有 Vault 自动创建云端对应并开始同步
4. 关闭开关：停止同步，可选删除云端数据
```

### 2.3 多 Vault 支持分析

**当前存储**：

```typescript
// vault/const.ts
vaultPreferenceStore: {
  recentVaultPath: string | null;
} // 单 Vault

// cloud-sync/store.ts
bindings: Record<string, VaultBinding>; // 按路径索引的绑定信息
```

**影响模块**：
| 模块 | 当前实现 | 需要改动 |
|------|---------|---------|
| `vault/context.ts` | `getStoredVault()` 返回单个 | 改为返回当前活动 Vault |
| `agent-runtime` | `vaultUtils` 使用 `getStoredVault()` | 无需改动（透明） |
| `cloud-sync` | `bindings` 按路径存储 | 无需改动 |
| `vault-watcher` | 监听当前 Vault | 切换时重新初始化 |
| `VaultExplorer` | 显示单个名称 | 改为 Select 组件 |

---

## 三、核心数据结构设计

### 3.1 本地 Vault 存储

```typescript
// vault/const.ts - 新增

interface VaultItem {
  /** 唯一标识，使用 UUID */
  id: string;
  /** 本地路径 */
  path: string;
  /** 显示名称，默认从路径提取 */
  name: string;
  /** 添加时间 */
  addedAt: number;
}

interface VaultStoreSchema {
  /** 所有已添加的 Vault */
  vaults: VaultItem[];
  /** 当前活动 Vault 的 ID */
  activeVaultId: string | null;
}

// 默认值
const DEFAULT_VAULT_STORE: VaultStoreSchema = {
  vaults: [],
  activeVaultId: null,
};
```

### 3.2 云同步设置重构

```typescript
// cloud-sync/const.ts - 实际实现

interface CloudSyncSettings {
  /** 云同步开关（默认关闭） */
  syncEnabled: boolean;
  /** 智能索引开关 */
  vectorizeEnabled: boolean;
  /** 设备唯一标识 */
  deviceId: string; // UUID
  /** 设备名称 */
  deviceName: string;
}

interface VaultBinding {
  /** 本地路径（作为索引 key） */
  localPath: string;
  /** 云端 Vault ID */
  vaultId: string;
  /** 云端 Vault 名称 */
  vaultName: string;
  /** 绑定时间 */
  boundAt: number;
}

interface CloudSyncStoreSchema {
  settings: CloudSyncSettings;
  /** 按本地路径（localPath）索引的绑定关系 */
  bindings: Record<string, VaultBinding>;
}
```

> **注**：实际实现使用 `localPath` 作为绑定索引（而非 `localVaultId`），因为路径是最直接的标识方式，且与文件监听等模块保持一致。

### 3.3 后端 Vault 模型（无需改动）

```typescript
// 后端已支持多 Vault，无需改动
interface VaultDto {
  id: string;
  name: string;
  createdAt: string;
  fileCount?: number;
  deviceCount?: number;
}
```

---

## 四、核心逻辑设计

### 4.1 多 Vault 管理

```typescript
// vault/store.ts - 新增

/** 获取所有 Vault */
function getVaults(): VaultItem[];

/** 获取当前活动 Vault */
function getActiveVault(): VaultItem | null;

/** 设置活动 Vault */
function setActiveVault(vaultId: string): void;

/** 添加 Vault（打开/创建时调用） */
function addVault(path: string, name?: string): VaultItem;

/** 移除 Vault（仅从列表移除，不删除文件） */
function removeVault(vaultId: string): void;

/** 更新 Vault 名称 */
function updateVaultName(vaultId: string, name: string): void;
```

**切换 Vault 流程**：

```
1. setActiveVault(vaultId)
2. 停止当前 vault-watcher
3. 清理当前 fileId 缓存
4. 启动新 vault-watcher
5. 重新初始化 cloud-sync 引擎
6. 广播状态变更到 renderer
```

### 4.2 云同步自动化

**开启云同步时**：

```typescript
async function enableCloudSync(): Promise<void> {
  // 1. 更新设置
  updateSettings({ enabled: true });

  // 2. 获取当前活动 Vault
  const activeVault = getActiveVault();
  if (!activeVault) return;

  // 3. 检查是否已绑定
  const binding = getBinding(activeVault.id);
  if (!binding) {
    // 4. 自动创建云端 Vault 并绑定
    await autoBindVault(activeVault);
  }

  // 5. 启动同步引擎
  await cloudSyncEngine.init(activeVault.path);
}

async function autoBindVault(vault: VaultItem): Promise<void> {
  // 1. 创建云端 Vault（使用本地名称）
  const cloudVault = await cloudSyncApi.createVault(vault.name);

  // 2. 注册设备
  const settings = readSettings();
  await cloudSyncApi.registerDevice(cloudVault.id, settings.deviceId, settings.deviceName);

  // 3. 保存绑定关系
  writeBinding({
    localVaultId: vault.id,
    cloudVaultId: cloudVault.id,
    cloudVaultName: cloudVault.name,
    boundAt: Date.now(),
    lastSyncAt: null,
  });
}
```

**关闭云同步时**：

```typescript
async function disableCloudSync(deleteCloudData: boolean): Promise<void> {
  // 1. 停止同步引擎
  cloudSyncEngine.stop();

  // 2. 更新设置
  updateSettings({ enabled: false });

  // 3. 可选：删除云端数据
  if (deleteCloudData) {
    const bindings = readAllBindings();
    for (const binding of Object.values(bindings)) {
      await cloudSyncApi.deleteVault(binding.cloudVaultId);
    }
    clearAllBindings();
  }
}
```

**Vault 切换时的同步处理**：

```typescript
async function onVaultSwitch(newVaultId: string): Promise<void> {
  const settings = readSettings();
  if (!settings.enabled) return;

  const vault = getVaultById(newVaultId);
  if (!vault) return;

  // 检查新 Vault 是否已绑定
  const binding = getBinding(newVaultId);
  if (!binding) {
    // 自动绑定
    await autoBindVault(vault);
  }

  // 重新初始化同步引擎
  await cloudSyncEngine.init(vault.path);
}
```

### 4.3 Vault 选择器交互

**组件结构**：

```tsx
// VaultSelector 组件
<Popover>
  <PopoverTrigger>
    <Button variant="ghost" className="w-full justify-between">
      <span>{activeVault?.name || 'Select Vault'}</span>
      <ChevronDown className="h-4 w-4" />
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    {/* Vault 列表 */}
    {vaults.map((vault) => (
      <VaultItem
        key={vault.id}
        vault={vault}
        isActive={vault.id === activeVaultId}
        onSelect={() => switchVault(vault.id)}
        onRename={(name) => renameVault(vault.id, name)}
        onRemove={() => removeVault(vault.id)}
      />
    ))}
    <Separator />
    {/* 操作按钮 */}
    <Button onClick={createNewVault}>+ 新建 Vault</Button>
    <Button onClick={openExistingFolder}>+ 打开已有文件夹</Button>
  </PopoverContent>
</Popover>
```

**状态管理**：

```typescript
// renderer/hooks/use-vault-manager.ts

function useVaultManager() {
  const [vaults, setVaults] = useState<VaultItem[]>([]);
  const [activeVaultId, setActiveVaultId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 加载 Vault 列表
  useEffect(() => {
    loadVaults();
    // 监听 Vault 变更事件
    return window.desktopAPI.vault.onVaultsChange(handleVaultsChange);
  }, []);

  const switchVault = async (vaultId: string) => {
    await window.desktopAPI.vault.setActiveVault(vaultId);
    setActiveVaultId(vaultId);
  };

  const createVault = async (name: string, parentPath: string) => {
    const vault = await window.desktopAPI.vault.create({ name, parentPath });
    if (vault) {
      setActiveVaultId(vault.id);
    }
  };

  const openFolder = async () => {
    const vault = await window.desktopAPI.vault.open({ askUser: true });
    if (vault) {
      setActiveVaultId(vault.id);
    }
  };

  return {
    vaults,
    activeVault: vaults.find((v) => v.id === activeVaultId) || null,
    isLoading,
    switchVault,
    createVault,
    openFolder,
    removeVault,
    renameVault,
  };
}
```

---

## 五、IPC 接口设计

### 5.1 Vault 管理接口

```typescript
// shared/ipc/vault.ts - 扩展

interface VaultApi {
  // 现有接口保持兼容
  open(options?: VaultOpenOptions): Promise<VaultInfo | null>;
  create(options: VaultCreateOptions): Promise<VaultInfo | null>;

  // 新增多 Vault 接口
  getVaults(): Promise<VaultItem[]>;
  getActiveVault(): Promise<VaultItem | null>;
  setActiveVault(vaultId: string): Promise<void>;
  removeVault(vaultId: string): Promise<void>;
  renameVault(vaultId: string, name: string): Promise<void>;

  // 事件监听
  onVaultsChange(handler: (vaults: VaultItem[]) => void): () => void;
  onActiveVaultChange(handler: (vault: VaultItem | null) => void): () => void;
}
```

### 5.2 云同步接口简化

```typescript
// shared/ipc/cloud-sync.ts - 重构

interface CloudSyncApi {
  // 设置（简化）
  getSettings(): Promise<CloudSyncSettings>;
  setEnabled(enabled: boolean): Promise<void>;
  setVectorizeEnabled(enabled: boolean): Promise<void>;

  // 同步控制
  getStatus(): Promise<SyncStatusSnapshot>;
  triggerSync(): Promise<void>;

  // 用量
  getUsage(): Promise<CloudUsageInfo | null>;

  // 事件
  onStatusChange(handler: (status: SyncStatusSnapshot) => void): () => void;
}

// 移除以下复杂接口
// - bindVault
// - unbindVault
// - listCloudVaults
// - getBinding
```

---

## 六、UI 组件设计

### 6.1 VaultSelector（替换当前 header）

**位置**：`renderer/workspace/components/vault-explorer/components/vault-selector.tsx`

**功能**：

- 显示当前 Vault 名称
- 点击展开下拉选择器
- 列表项支持：选择、重命名、移除
- 底部操作：新建、打开已有

**样式**：参考 Notion 的 Workspace 选择器

- 圆角 Popover
- 列表项 hover 效果
- 当前项高亮标记

### 6.2 SyncStatusHoverCard（同步状态悬浮面板）

**位置**：`renderer/components/cloud-sync/sync-status-hover-card.tsx`

**触发方式**：Hover 到左下角云朵图标时显示

**设计理念**：

- 不是工具化的状态面板，而是像 Notion 一样的优雅信息展示
- 关注"正在发生什么"而非"功能按钮"
- 动画流畅、信息层次清晰

#### 当前实现（基础版）

**已实现功能**：

- 显示基本状态：已同步 / 同步中 / 离线 / 未启用
- 显示待同步文件数（pendingCount）
- 显示上次同步时间
- 快捷操作：立即同步、打开设置

**当前视觉设计**：

```
┌─────────────────────────────────────────────┐
│                                             │
│  ◉ 已同步                                    │  ← 状态标题 + 图标
│  所有更改已保存到云端                          │  ← 状态描述
│                                             │
│  [如有] 3 个更改待同步                        │  ← 待同步提示
│                                             │
├─────────────────────────────────────────────┤
│  上次同步：今天 14:32     [立即同步] [设置]   │  ← 底部信息 + 操作
└─────────────────────────────────────────────┘
```

**交互细节**：

- Hover 进入延迟：150ms（避免误触发）
- Hover 离开延迟：300ms（给用户时间移入面板）

**样式规范**：

- 面板宽度：280px（w-72）
- 使用 shadcn HoverCard 组件

---

#### 后续增强（Phase 4 待实现）

**目标**：显示具体文件级别的同步活动，提供更详细的同步状态。

**增强后视觉设计**：

```
┌─────────────────────────────────────────────┐
│                                             │
│  ◉ 已同步                                    │  ← 状态标题 + 图标
│  所有更改已保存到云端                          │  ← 状态描述
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  最近活动                                    │  ← 小标题（灰色）
│                                             │
│  ↑ 项目笔记.md                    刚刚       │  ← 上传图标 + 文件名 + 时间
│  ↑ 会议记录/2024-01.md            2分钟前    │
│  ↓ 设计文档.md                    5分钟前    │  ← 下载图标
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  上次同步：今天 14:32                         │  ← 底部信息
│                                             │
└─────────────────────────────────────────────┘
```

**同步中状态**：

```
┌─────────────────────────────────────────────┐
│                                             │
│  ◎ 同步中...                                 │  ← 旋转动画图标
│  正在同步 3 个文件                            │
│                                             │
│  ━━━━━━━━━━━━━━━━░░░░░░  2/3                │  ← 进度条
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  正在处理                                    │
│                                             │
│  ↑ 项目笔记.md                    上传中...  │  ← 当前文件 + 状态
│    ━━━━━━━━░░░░░░  45%                      │  ← 单文件进度（可选）
│                                             │
│  待处理                                      │
│  ○ 会议记录.md                               │
│                                             │
└─────────────────────────────────────────────┘
```

**所需数据结构**（待实现）：

```typescript
interface SyncActivity {
  fileId: string;
  fileName: string;
  /** 相对路径，用于显示文件夹层级 */
  relativePath: string;
  /** 同步方向 */
  direction: 'upload' | 'download';
  /** 同步状态 */
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  /** 完成时间（仅 completed 状态有值） */
  completedAt?: number;
  /** 进度百分比（仅 syncing 状态有值） */
  progress?: number;
}

interface SyncStatusDetail {
  /** 引擎状态 */
  engineStatus: 'idle' | 'syncing' | 'offline' | 'disabled';
  /** 总体进度（同步中时） */
  overallProgress?: {
    completed: number;
    total: number;
  };
  /** 最近活动（最多显示 5 条） */
  recentActivities: SyncActivity[];
  /** 待同步文件（离线时显示） */
  pendingFiles: string[];
  /** 上次同步时间 */
  lastSyncAt: number | null;
  /** 错误信息 */
  error?: string;
}
```

**实现要点**：

- 需创建 `sync-engine/activity-tracker.ts` 同步活动追踪器
- 在同步引擎中记录每个文件的同步状态变化
- 通过 IPC 事件实时推送活动更新到 renderer

### 6.3 CloudSyncSection（简化）

**位置**：`renderer/components/settings-dialog/components/cloud-sync-section.tsx`

**重构后的结构**：

```
┌────────────────────────────────────────────────┐
│ 云同步                                          │
│ 在多设备间同步你的笔记                           │
│ ────────────────────────────── [开关：默认开启] │
├────────────────────────────────────────────────┤
│ 智能索引                                        │
│ 对文件建立语义索引，支持智能搜索                  │
│ ────────────────────────────── [开关]          │
├────────────────────────────────────────────────┤
│ 存储空间      ████████░░░░░░  500MB / 1GB      │
│ 索引文件      ██████░░░░░░░░   120 / 500       │
├────────────────────────────────────────────────┤
│ 当前套餐：Basic · 单文件最大 10MB               │
└────────────────────────────────────────────────┘
```

**移除**：

- Vault 绑定对话框
- 绑定/解绑按钮
- 云端 Vault 列表

---

## 七、迁移方案

### 7.1 数据迁移

```typescript
// 启动时执行一次性迁移

async function migrateVaultData(): Promise<void> {
  const oldStore = getOldVaultStore(); // { recentVaultPath: string | null }
  const newStore = getNewVaultStore();

  // 已迁移则跳过
  if (newStore.get('migrated')) return;

  const oldPath = oldStore.get('recentVaultPath');
  if (oldPath) {
    // 创建 VaultItem
    const vault: VaultItem = {
      id: crypto.randomUUID(),
      path: oldPath,
      name: path.basename(oldPath),
      addedAt: Date.now(),
    };

    // 写入新存储
    newStore.set('vaults', [vault]);
    newStore.set('activeVaultId', vault.id);

    // 迁移云同步绑定（如果有）
    const oldBinding = cloudSyncStore.get('bindings')[oldPath];
    if (oldBinding) {
      const newBindings: Record<string, VaultCloudBinding> = {
        [vault.id]: {
          localVaultId: vault.id,
          cloudVaultId: oldBinding.vaultId,
          cloudVaultName: oldBinding.vaultName,
          boundAt: oldBinding.boundAt,
          lastSyncAt: null,
        },
      };
      cloudSyncStore.set('bindings', newBindings);
    }
  }

  newStore.set('migrated', true);
}
```

### 7.2 兼容性处理

- `getStoredVault()` 继续工作，内部改为调用 `getActiveVault()`
- Agent Runtime 无需改动
- vault-watcher 无需改动接口，内部监听 Vault 切换事件

---

## 八、实现优先级

### Phase 1：修复紧急问题 ✅ 已完成

1. ✅ 修复 500 错误（后端空值检查 + PC 端错误处理）
   - `quota.controller.ts`: 添加 `user` 空值检查，返回 401 而非 500
   - PC 端 IPC handler 已有 try-catch 返回默认值
2. ✅ 简化云同步开关（移除绑定概念，自动化处理）
   - 移除 `VaultBindDialog` 组件
   - 重构 `CloudSyncSection`：一个开关控制，开启时自动绑定
   - 保留手动同步按钮、智能索引开关、用量显示

### Phase 2：多 Vault 基础 ✅ 已完成

3. ✅ 重构 Vault 存储结构
   - 新增 `vault/store.ts`：多 Vault 存储管理（VaultItem 列表、activeVaultId）
   - 修改 `vault/context.ts`：适配多 Vault，保持 `getStoredVault()` 兼容性
   - 扩展 IPC 类型和 handlers：getVaults、setActiveVault、removeVault、renameVault
4. ✅ 实现 VaultSelector 组件
   - 创建 `use-vault-manager.ts` Hook
   - 创建 `VaultSelector` 组件（Notion 风格下拉选择器）
   - 支持：切换、重命名、移除、新建、打开已有文件夹
5. ✅ 数据迁移逻辑
   - 创建 `vault/migration.ts`：从单 Vault 自动迁移到多 Vault
   - 应用启动时自动执行迁移

### Phase 3：完善体验 ✅ 已完成

6. ✅ Vault 切换时的状态同步
   - 修改 `vault:setActiveVault` IPC handler
   - 切换时先停止当前云同步引擎 (`cloudSyncEngine.stop()`)
   - 切换完成后重新初始化云同步引擎 (`cloudSyncEngine.init(vault.path)`)
7. ✅ SyncStatusHoverCard 悬浮面板（基础版）
   - 创建 `renderer/components/cloud-sync/sync-status-hover-card.tsx`
   - 显示基本同步状态（idle/syncing/offline/disabled）
   - 显示待同步文件数（pendingCount）、上次同步时间
   - 快捷操作：立即同步、打开设置
   - 修改 `FloatingActionBar` 使用 HoverCard 包装同步指示器
8. ✅ Agent 等模块验证
   - `getStoredVault()` 已在 Phase 2 中适配多 Vault（返回当前活动 Vault）
   - Agent Runtime、Chat、Attachments 等模块无需改动，自动适配

### Phase 4：增强体验 ✅ 已完成

9. ✅ SyncStatusHoverCard 高级功能
   - 实现 `SyncActivity`、`SyncStatusDetail`、`PendingFile` 类型（`const.ts`）
   - 创建 `sync-engine/activity-tracker.ts` 同步活动追踪器
   - 在同步引擎中集成活动追踪（`executor.ts`、`state.ts`、`index.ts`）
   - 扩展 IPC 接口支持 `getStatusDetail()` 获取详细状态
   - 升级 `SyncStatusHoverCard` 组件：
     - 显示同步进度条
     - 显示当前正在同步的文件
     - 显示最近同步活动列表（带方向图标）
     - 显示待同步文件队列

---

## 九、风险与边界情况

### 9.1 并发风险

- **场景**：快速切换 Vault 时，同步引擎可能未完成初始化
- **方案**：使用锁或队列，确保切换操作串行执行

### 9.2 网络异常

- **场景**：自动绑定时网络失败
- **方案**：后台重试 + 状态提示，不阻塞用户操作

### 9.3 存储空间

- **场景**：用户关闭云同步并选择删除云端数据，但删除失败
- **方案**：记录失败的 Vault ID，下次联网时重试

### 9.4 数据一致性

- **场景**：本地 Vault 路径变更（移动/重命名）
- **方案**：启动时验证路径，失效时提示用户重新定位或移除

---

## 十、文件清单

### 10.1 已新增的文件 ✅

```
apps/pc/src/
├── main/
│   ├── vault/
│   │   ├── store.ts                    # ✅ 多 Vault 存储管理
│   │   └── migration.ts                # ✅ 数据迁移逻辑
├── renderer/
│   ├── hooks/
│   │   └── use-vault-manager.ts        # ✅ Vault 管理 Hook
│   ├── components/cloud-sync/
│   │   ├── index.ts                    # ✅ 导出入口
│   │   └── sync-status-hover-card.tsx  # ✅ 同步状态悬浮面板（基础版）
│   └── workspace/components/vault-explorer/components/
│       └── vault-selector.tsx          # ✅ Vault 选择器组件
└── shared/ipc/
    └── vault.ts                        # ✅ 扩展 IPC 类型（VaultItem）
```

### 10.2 Phase 4 新增的文件 ✅

```
apps/pc/src/
└── main/cloud-sync/
    └── sync-engine/
        └── activity-tracker.ts     # ✅ 同步活动追踪器（用于文件级别状态跟踪）
```

### 10.3 已修改的文件 ✅

```
apps/pc/src/
├── main/
│   ├── vault/context.ts            # ✅ 适配多 Vault，getStoredVault() 返回活动 Vault
│   ├── cloud-sync/const.ts         # ✅ 设置结构（syncEnabled、VaultBinding）
│   ├── cloud-sync/store.ts         # ✅ 绑定存储（按 localPath 索引）
│   └── app/ipc-handlers.ts         # ✅ 新增多 Vault IPC handlers
├── renderer/
│   ├── workspace/components/
│   │   └── vault-explorer/index.tsx  # ✅ 集成 VaultSelector
│   └── components/settings-dialog/
│       └── components/cloud-sync-section.tsx  # ✅ 简化 UI，移除绑定对话框
└── preload/index.ts                # ✅ 新增 vault IPC 暴露
```

---

## 十一、附录：类型完整定义

### 11.1 已实现类型（当前版本）

```typescript
// ═══════════════════════════════════════════════════════════════
// Vault 类型（shared/ipc/vault.ts）
// ═══════════════════════════════════════════════════════════════

interface VaultItem {
  /** 唯一标识，使用 UUID */
  id: string;
  /** 本地路径 */
  path: string;
  /** 显示名称 */
  name: string;
  /** 添加时间 */
  addedAt: number;
}

// main/vault/store.ts
interface VaultStoreSchema {
  vaults: VaultItem[];
  activeVaultId: string | null;
  migrated?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// 云同步类型（main/cloud-sync/const.ts）
// ═══════════════════════════════════════════════════════════════

interface CloudSyncSettings {
  syncEnabled: boolean; // 云同步开关
  vectorizeEnabled: boolean; // 智能索引开关
  deviceId: string; // UUID
  deviceName: string; // 设备名称
}

interface VaultBinding {
  localPath: string; // 本地路径（作为索引 key）
  vaultId: string; // 云端 Vault ID
  vaultName: string; // 云端 Vault 名称
  boundAt: number; // 绑定时间
}

interface CloudSyncStoreSchema {
  settings: CloudSyncSettings;
  /** key 为 localPath */
  bindings: Record<string, VaultBinding>;
}

// ═══════════════════════════════════════════════════════════════
// 同步状态快照（main/cloud-sync/const.ts）
// ═══════════════════════════════════════════════════════════════

type SyncEngineStatus = 'idle' | 'syncing' | 'offline' | 'disabled';

interface SyncStatusSnapshot {
  engineStatus: SyncEngineStatus;
  vaultPath: string | null;
  vaultId: string | null;
  pendingCount: number;
  lastSyncAt: number | null;
  error?: string;
}
```

### 11.2 Phase 4 已实现类型（同步活动追踪）

```typescript
// ═══════════════════════════════════════════════════════════════
// 同步活动追踪类型（main/cloud-sync/const.ts）
// ═══════════════════════════════════════════════════════════════

type SyncActivityStatus = 'pending' | 'syncing' | 'completed' | 'failed';
type SyncDirection = 'upload' | 'download' | 'delete';

interface SyncActivity {
  fileId: string;
  fileName: string;
  /** 相对路径，用于显示文件夹层级 */
  relativePath: string;
  /** 同步方向 */
  direction: SyncDirection;
  /** 同步状态 */
  status: SyncActivityStatus;
  /** 完成时间（仅 completed 状态有值） */
  completedAt?: number;
  /** 进度百分比（仅 syncing 状态有值，0-100） */
  progress?: number;
  /** 文件大小（字节） */
  size?: number;
  /** 错误信息 */
  error?: string;
}

interface PendingFile {
  fileName: string;
  relativePath: string;
  direction: SyncDirection;
}

interface SyncStatusDetail {
  /** 引擎状态 */
  engineStatus: SyncEngineStatus;
  /** 总体进度（同步中时） */
  overallProgress?: {
    completed: number;
    total: number;
    bytesTransferred?: number;
    bytesTotal?: number;
  };
  /** 最近活动（最多显示 5 条） */
  recentActivities: SyncActivity[];
  /** 当前正在同步的文件 */
  currentActivity?: SyncActivity;
  /** 待同步文件列表 */
  pendingFiles: PendingFile[];
  /** 上次同步时间 */
  lastSyncAt: number | null;
  /** 错误信息 */
  error?: string;
}
```
