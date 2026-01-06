# FileIndex 文件索引系统

## 需求

解决跨平台文件标识问题：
- **路由稳定**：Mobile 编辑器使用 fileId 作为路由，文件重命名不影响 URL
- **架构统一**：PC 和 Mobile 使用相同的 fileIdManager 接口
- **多 Vault 支持**：API 统一带 `vaultPath` 参数

## 技术方案

### 数据结构

```typescript
interface FileEntry {
  id: string       // UUID
  path: string     // 相对路径
  createdAt: number
}

interface FileIndexStore {
  files: FileEntry[]
}
```

### 存储位置

| 平台 | 位置 |
|------|------|
| PC | `{vaultPath}/.moryflow/file-index.json` |
| Mobile | `AsyncStorage` key: `moryflow:file-index:{vaultPath}` |

### 核心接口

```
load(vaultPath)           // 加载到内存
scanAndCreateIds(vault)   // 扫描目录，为 md 文件创建 fileId
getOrCreate(vault, path)  // 获取或创建 fileId
getByPath(vault, path)    // path → fileId
getByFileId(vault, id)    // fileId → path
move(vault, old, new)     // 重命名：更新 path，fileId 不变
delete(vault, path)       // 删除条目
setMany(vault, entries)   // 批量设置（云同步下载用）
```

### 核心逻辑（伪代码）

```
# 文件重命名场景
handleTitleBlur():
  newPath = buildNewPath(editingTitle)
  moveFile(oldPath, newPath)          // 文件系统移动
  fileIndexManager.move(oldPath, newPath)  // fileId 不变
  setCurrentPath(newPath)             // 组件内部状态
  # URL 不变：/(editor)/{fileId}

# 云同步下载新文件
executeDownloadAction(action):
  writeFile(action.path, content)
  fileIndexManager.setMany([{
    path: action.path,
    fileId: action.fileId
  }])
```

## 代码索引

| 模块 | 路径 |
|------|------|
| 类型定义 | `packages/shared-api/src/file-index/types.ts` |
| PC 实现 | `apps/pc/src/main/cloud-sync/file-index/index.ts` |
| PC IO 层 | `apps/pc/src/main/cloud-sync/file-index/store.ts` |
| PC 扫描器 | `apps/pc/src/main/cloud-sync/file-index/scanner.ts` |
| Mobile 实现 | `apps/mobile/lib/vault/file-index/index.ts` |
| Mobile IO 层 | `apps/mobile/lib/vault/file-index/store.ts` |
| Mobile 扫描器 | `apps/mobile/lib/vault/file-index/scanner.ts` |
| Mobile 编辑器 | `apps/mobile/app/(editor)/[fileId].tsx` |
