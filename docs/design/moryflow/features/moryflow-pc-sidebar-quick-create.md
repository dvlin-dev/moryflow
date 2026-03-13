---
title: Moryflow PC Sidebar Quick Create
date: 2026-03-13
scope: apps/moryflow/pc
status: active
---

# Moryflow PC Sidebar Quick Create

本文记录 Moryflow PC 左侧文件树的即时创建基线，覆盖文件 / 文件夹创建入口、命名策略和主进程职责边界。

## 1. 目标

- Sidebar 的创建动作必须即时生效，不再弹出命名对话框。
- 文件和文件夹统一使用确定性自动命名规则，避免不同入口行为漂移。
- 创建职责固定为“renderer 发起逻辑意图，main process 分配真实名字并落盘”。

## 2. 当前创建规则

### 2.1 默认名称

- 文件基础名固定为 `NewFile`。
- 文件夹基础名固定为 `NewFolder`。
- 冲突后缀不带空格：
  - `NewFile2`
  - `NewFile3`
  - `NewFolder2`
  - `NewFolder3`

### 2.2 文件落盘

- 新文件始终落成 Markdown 文件：
  - `NewFile.md`
  - `NewFile2.md`
- 新文件默认内容是空字符串，不再自动注入模板文案。
- `template` 能力仍保留在底层创建协议里，但 quick create 默认不传模板。

### 2.3 名称分配职责

- Renderer 只发送逻辑基础名 `NewFile` / `NewFolder`。
- Markdown 扩展名归一化只允许在 main process 发生。
- 文件名唯一性只在目标父目录作用域内判断。
- 文件创建使用 `writeFile(..., { flag: 'wx' })` 重试环，避免快速重复点击时产生重名竞争。
- 文件夹创建使用 `mkdir(..., { recursive: false })` 的重试 / `EEXIST` 处理。

## 3. 入口范围

本基线覆盖以下创建入口：

- Files section create menu
- root blank-area context menu
- empty-state primary create button
- folder context menu `New file`
- folder context menu `New folder`

本基线不包含：

- inline rename-on-create
- 新快捷键
- editor title rename 行为调整
- 额外的 empty-state folder button

## 4. 交互不变量

- 任意创建入口都不再显示命名对话框。
- root create 与 folder-scoped create 必须共享同一命名策略。
- 在折叠文件夹上执行子项创建时，目标文件夹必须先展开，让新节点立即可见。
- 空状态区域仍只保留一个主文件创建动作，不扩展第二套文件夹主按钮。
- 现有“创建后选中 / 打开 / tree 刷新”链路保持不变，不因为 quick create 重写第二套状态机。

## 5. 文案与 i18n 边界

- 旧的 create-name dialog 文案键已不再是当前事实源：
  - `createFileTitle`
  - `createFolderTitle`
  - `enterFileName`
  - `enterFolderName`
  - `fileNamePlaceholder`
  - `folderNamePlaceholder`
- 这轮只清理 Sidebar quick create 相关文案，不扩展到 note/editor 等其他命名体系。

## 6. 代码入口

- `apps/moryflow/pc/src/main/vault/files.ts`
- `apps/moryflow/pc/src/renderer/workspace/file-operations/operations/create-file.ts`
- `apps/moryflow/pc/src/renderer/workspace/file-operations/operations/create-folder.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/sidebar-files.tsx`
- `apps/moryflow/pc/src/renderer/components/vault-files/components/vault-folder.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/hooks/use-sidebar-panels-store.ts`
