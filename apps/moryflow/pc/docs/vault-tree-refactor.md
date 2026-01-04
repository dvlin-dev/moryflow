# Vault Tree 组件改造方案

## 概述

将现有的 `vault-tree` 组件改造为使用 `animate-ui/components/base/files` 组件库，保留原有功能的同时获得更好的动画效果。

## 现有功能清单

### 当前 vault-tree 组件功能

| 功能 | 实现位置 | 说明 |
|------|----------|------|
| 虚拟滚动 | `index.tsx` | 基于固定行高（36px）的简单虚拟滚动 |
| 拖拽移动 | `tree-node.tsx` | 支持文件/文件夹拖拽到目标文件夹 |
| 右键菜单 | `tree-node.tsx` | 重命名、删除、新建文件、在访达中显示 |
| 展开/折叠 | `index.tsx` + `handle.ts` | 通过 expandedPaths 控制 |
| 选中状态 | `tree-node.tsx` | 通过 selectedId 控制 |
| 节点排序 | `handle.ts` | 文件夹优先，同类型按中文排序 |

### animate-ui Files 组件现有功能

| 功能 | 说明 |
|------|------|
| 展开/折叠动画 | 基于 accordion，带平滑过渡 |
| 高亮跟随 | hover 时背景色平滑跟随鼠标 |
| 文件夹图标动画 | 开/关状态切换时有缩放动画 |
| Git 状态 | 支持 untracked/modified/deleted 显示 |

## 改造策略

### 策略选择：扩展 animate-ui Files 组件

**理由**：
1. animate-ui Files 组件的动画效果更佳，符合项目 UI 风格
2. 基于 accordion 的结构更易维护
3. 通过扩展而非重写，可复用组件库的动画逻辑

### 需要新增的功能

1. **右键菜单** - 在 FileItem/FolderTrigger 上包装 ContextMenu
2. **拖拽支持** - 添加 drag/drop 事件处理
3. **选中状态** - 添加 selectedId 支持和视觉反馈
4. **虚拟滚动** - 对于大型 vault 的性能优化（可作为后续优化）
5. **数据适配** - 将 VaultTreeNode 转换为 Files 组件结构

## 实现步骤

### 第一阶段：创建适配层组件

创建 `apps/pc/src/renderer/components/vault-files/` 目录：

```
vault-files/
├── index.tsx           # 入口，导出 VaultFiles 组件
├── const.ts            # 类型定义和常量
├── handle.ts           # 工具函数（排序、拖拽验证等）
├── components/
│   ├── vault-folder.tsx    # 文件夹节点（包装 FolderItem）
│   └── vault-file.tsx      # 文件节点（包装 FileItem）
└── context.tsx         # 事件回调上下文
```

### 第二阶段：实现核心组件

#### 2.1 创建事件上下文 (`context.tsx`)

```tsx
// 通过 Context 传递事件回调，避免层层透传 props
type VaultFilesContextType = {
  selectedId: string | null
  onSelectFile?: (node: VaultTreeNode) => void
  onSelectNode?: (node: VaultTreeNode) => void
  onRename?: (node: VaultTreeNode) => void
  onDelete?: (node: VaultTreeNode) => void
  onCreateFile?: (node: VaultTreeNode) => void
  onShowInFinder?: (node: VaultTreeNode) => void
  onMove?: (sourcePath: string, targetDir: string) => void | Promise<void>
}
```

#### 2.2 实现 VaultFolder 组件

- 包装 `FolderItem` + `FolderTrigger` + `FolderPanel`
- 添加右键菜单（ContextMenu）
- 添加拖拽处理（draggable + onDrop）
- 递归渲染子节点

#### 2.3 实现 VaultFile 组件

- 包装 `FileItem`
- 添加右键菜单
- 添加拖拽处理
- 点击选中文件

#### 2.4 实现 VaultFiles 入口组件

```tsx
type VaultFilesProps = {
  nodes: VaultTreeNode[]
  selectedId?: string | null
  expandedPaths?: string[]
  onExpandedPathsChange?: (paths: string[]) => void
  // ...其他事件回调
}
```

- 将 expandedPaths 转换为 Files 组件的 open 属性
- 提供 Context 给子组件
- 递归渲染 VaultFolder/VaultFile

### 第三阶段：替换 VaultExplorer 中的引用

修改 `apps/pc/src/renderer/workspace/components/vault-explorer/index.tsx`：

```tsx
// Before
import { VaultTree } from '@/components/vault-tree'

// After
import { VaultFiles } from '@/components/vault-files'
```

### 第四阶段：清理旧代码

确认新组件功能完整后，删除：
- `apps/pc/src/renderer/components/vault-tree/` 目录

## 技术细节

### 拖拽实现

复用现有的拖拽逻辑：
- `createDragData` / `parseDragData` - 拖拽数据序列化
- `validateDrop` - 验证目标是否可放置

需要在 animate-ui 组件上添加：
```tsx
<FolderTrigger
  draggable
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
>
```

### 选中状态

通过 className 添加选中样式：
```tsx
<FileItem
  className={cn(isSelected && 'bg-accent')}
>
```

### 右键菜单

使用 shadcn ContextMenu 包装：
```tsx
<ContextMenu>
  <ContextMenuTrigger asChild>
    <FileItem>...</FileItem>
  </ContextMenuTrigger>
  <ContextMenuContent>
    {/* 菜单项 */}
  </ContextMenuContent>
</ContextMenu>
```

### 虚拟滚动（后续优化）

animate-ui Files 基于 accordion，不支持原生虚拟滚动。有两个方案：

1. **方案 A**：使用 `@tanstack/react-virtual` 在外层包装
2. **方案 B**：仅在节点数超过阈值时启用虚拟滚动

建议先不做虚拟滚动，观察实际性能表现后再决定。

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 动画性能 | 大量节点时可能卡顿 | 后续可加虚拟滚动 |
| 功能遗漏 | 用户体验下降 | 详细对比测试清单 |
| 拖拽行为变化 | 用户习惯改变 | 保持相同的拖拽验证逻辑 |

## 测试清单

- [ ] 文件/文件夹正确显示
- [ ] 点击文件打开编辑器
- [ ] 点击文件夹展开/折叠
- [ ] 右键菜单正常工作
  - [ ] 重命名
  - [ ] 删除
  - [ ] 新建文件（文件夹）
  - [ ] 在访达中显示
- [ ] 拖拽文件到文件夹
- [ ] 拖拽文件夹到文件夹
- [ ] 不能拖拽文件夹到其子目录
- [ ] 选中状态正确高亮
- [ ] 展开状态持久化
- [ ] 空白区域右键菜单（新建笔记/文件夹）

## 文件变更清单

### 新增文件

```
apps/pc/src/renderer/components/vault-files/
├── index.tsx
├── const.ts
├── handle.ts
├── context.tsx
└── components/
    ├── vault-folder.tsx
    └── vault-file.tsx
```

### 修改文件

```
apps/pc/src/renderer/workspace/components/vault-explorer/index.tsx
  - 将 VaultTree 替换为 VaultFiles
```

### 删除文件

```
apps/pc/src/renderer/components/vault-tree/
├── index.tsx
├── const.ts
├── handle.ts
└── components/
    └── tree-node.tsx
```

## 时序图

```
用户点击文件
    │
    ▼
VaultFile.onClick
    │
    ├─► Context.onSelectNode(node)
    │
    └─► Context.onSelectFile(node)
           │
           ▼
       VaultExplorer.onOpenFile
           │
           ▼
       打开编辑器
```

```
用户拖拽文件到文件夹
    │
    ▼
VaultFile.onDragStart
    │ 设置 dataTransfer
    ▼
VaultFolder.onDragOver
    │ validateDrop 检查
    ▼
VaultFolder.onDrop
    │
    └─► Context.onMove(sourcePath, targetDir)
           │
           ▼
       主进程执行移动
```

## 总结

本改造方案采用「扩展适配」策略，在 animate-ui Files 组件基础上添加业务功能。主要工作量在于：

1. 创建适配层组件（约 400 行代码）
2. 迁移现有的拖拽/菜单逻辑
3. 替换 VaultExplorer 中的引用

预计改造完成后，文件树将获得：
- 更流畅的展开/折叠动画
- 更美观的 hover 高亮效果
- 更易维护的代码结构
