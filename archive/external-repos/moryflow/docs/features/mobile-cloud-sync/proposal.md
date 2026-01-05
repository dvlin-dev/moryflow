# Mobile 云同步

## 需求

Mobile 端接入云同步功能：
- 复用后端 `/api/sync/*` 接口
- 与 PC 端数据双向同步
- 支持多 Vault 管理

## 技术方案

### 架构

```
Mobile App (Expo)
├── lib/cloud-sync/
│   ├── sync-engine.ts     # 同步引擎
│   ├── api-client.ts      # HTTP 客户端
│   ├── file-collector.ts  # 文件收集
│   ├── executor.ts        # 操作执行
│   └── store.ts           # expo-secure-store
│
└── 本地文件系统 (expo-file-system)
         │
         │ HTTP API
         ▼
后端服务 (复用 PC 端接口)
```

### 与 PC 端差异

| 方面 | PC 端 | Mobile 端 |
|------|-------|-----------|
| 文件系统 | Node.js fs | expo-file-system |
| 变更监听 | chokidar (实时) | 手动/App 生命周期触发 |
| 存储 | electron-store | expo-secure-store |
| Hash 计算 | crypto | expo-crypto |

### 同步触发时机

```
自动触发：
├── App 从后台切换到前台
├── 用户登录成功
├── 切换 Vault
└── 编辑器保存文件后（防抖 3s）

手动触发：
└── 下拉刷新 / 点击同步按钮
```

### 核心逻辑（伪代码）

```
# 同步流程
syncEngine.init(vaultPath):
  checkLoginStatus()
  loadFileIndex()
  tryAutoBinding()     # 匹配云端同名 Vault 或创建新 Vault
  performSync()

# 文件收集
collectLocalFiles(vaultPath):
  entries = fileIndexManager.getAll()
  for entry in entries:
    content = readFile(entry.path)
    hash = sha256(content)
    yield { fileId, path, title, mtime, contentHash, size }

# App 生命周期
AppState.addEventListener('change', (state) => {
  if state == 'active':
    cloudSyncEngine.triggerSync()
})
```

### 多 Vault 管理

```
存储结构：
documentDirectory/vaults/
├── {uuid-1}/           # Vault 1
│   └── .moryflow/
├── {uuid-2}/           # Vault 2
└── default/            # 默认 Vault（兼容现有用户）

Vault 切换流程：
1. cloudSyncEngine.stop()
2. 保存当前编辑状态
3. 更新 CURRENT_VAULT 存储
4. cloudSyncEngine.init(newVaultPath)
```

## 代码索引

| 模块 | 路径 |
|------|------|
| 同步引擎 | `apps/mobile/lib/cloud-sync/sync-engine.ts` |
| API 客户端 | `apps/mobile/lib/cloud-sync/api-client.ts` |
| 文件收集 | `apps/mobile/lib/cloud-sync/file-collector.ts` |
| 操作执行 | `apps/mobile/lib/cloud-sync/executor.ts` |
| 本地存储 | `apps/mobile/lib/cloud-sync/store.ts` |
| 自动绑定 | `apps/mobile/lib/cloud-sync/auto-binding.ts` |
| 工作区选择器 | `apps/mobile/components/cloud-sync/workspace-selector.tsx` |
| 云同步设置页 | `apps/mobile/app/(settings)/cloud-sync.tsx` |
