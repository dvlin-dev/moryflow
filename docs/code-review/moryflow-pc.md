---
title: Moryflow PC Code Review
date: 2026-02-26
scope: apps/moryflow/pc
status: in_progress
---

<!--
[INPUT]: apps/moryflow/pc（模块 A/B/C/D/E 已完成）
[OUTPUT]: 模块 A/B/C/D/E 修复结果 + 当前模块推进与验证入口
[POS]: Phase 3 / P2 模块审查记录（Moryflow PC）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Moryflow PC Code Review

## 当前范围

- 项目：`apps/moryflow/pc`
- 已完成模块：`A（auth / settings-dialog / payment-dialog）`、`B（chat-pane / input-dialog / command-palette）`、`C（editor / workspace）`、`D（cloud-sync / share / site-publish / vault-files）`、`E（renderer hooks / contexts / transport / stores）`
- 当前模块：`项目复盘`
- 下一模块：`收口验证与一致性复查`

## 模块 A 修复结果（已完成）

### S1

- [done] `ProviderDetails` 拆分为容器 + 控制器 hook + 预设/自定义子组件
- [done] `McpSection` 渲染期 `setState` 清理，改为 `renderContentByState()`
- [done] `AddModelDialog/EditModelDialog` 迁移到 `RHF + zod/v3`
- [done] `CloudSyncSection` 状态片段化（`sectionState + renderContentByState + renderUsageByState`）

### S2

- [done] `McpDetails` 测试逻辑与展示拆分
- [done] `LoginPanel` 拆分为流程容器 + 子片段（header/fields/terms）

### S3

- [done] `SectionContent` 收敛 loading 守卫与 section 分发
- [done] `PaymentDialog` 增加 checkout 打开失败态与重试状态机

## 模块 B 修复结果（已完成）

### S1

- [done] `ChatPane` 容器拆分为视图层 + 控制器 hook（会话/模型/提交/审批编排下沉）
  - `apps/moryflow/pc/src/renderer/components/chat-pane/index.tsx:21`
  - `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-pane-controller.ts:35`

- [done] `ChatPromptInput` 拆分为控制器 + 模型选择片段 + Popover 片段
  - `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/index.tsx:27`
  - `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/use-chat-prompt-input-controller.ts:64`
  - `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/chat-prompt-input-model-selector.tsx:51`
  - `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/chat-prompt-input-overlays.tsx:47`

- [done] `ChatMessage` 拆分为消息主体/工具片段/操作片段
  - `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/index.tsx:30`
  - `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/message-body.tsx:68`
  - `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/tool-part.tsx:58`
  - `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/message-actions.tsx:29`

### S2

- [done] `ChatPromptInputPlusMenu` 改为统一 `PlusSubmenu` 渲染器，收敛重复子菜单结构
  - `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/plus-menu.tsx:139`
  - `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/plus-menu.tsx:249`

- [done] `ChatMessage` 参数面继续收敛：`MessageBody` 改为 `view/edit/tool` 分组模型，`tool labels/callbacks` 下沉到 `useMessageToolModel`
  - `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/index.tsx:94`
  - `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/message-body.tsx:20`
  - `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/use-message-tool-model.ts:21`

- [done] `useChatSessions` 生命周期运行时收敛为 `chatSessionsRuntime`，显式管理订阅 acquire/release
  - `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-sessions.ts:135`
  - `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-sessions.ts:238`

- [done] `InputDialog` 关闭链路去重（`actionHandledRef`），补充回归测试
  - `apps/moryflow/pc/src/renderer/components/input-dialog/index.tsx:33`
  - `apps/moryflow/pc/src/renderer/components/input-dialog/index.test.tsx:48`

- [done] `CommandPalette` 本轮复检无新增 S1/S2 问题，保持现状（不做无效重构）

### S3

- [done] `McpPanel` 状态文案改为 `getStatusText()` 分发，移除链式三元
  - `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/mcp-panel.tsx:37`

- [done] `TaskHoverPanel` 列表项状态色改为 `getTaskItemTone()` 映射，移除链式三元
  - `apps/moryflow/pc/src/renderer/components/chat-pane/components/task-hover-panel.tsx:59`

## 模块 C 修复结果（editor / workspace，已完成）

### S1

- [done] `DesktopWorkspaceShell` 拆分为 `layout-state hook + main-content + overlays` 三层，主区改为显式 `renderContentByState()` 分发
  - `apps/moryflow/pc/src/renderer/workspace/desktop-workspace-shell.tsx:36`
  - `apps/moryflow/pc/src/renderer/workspace/hooks/use-shell-layout-state.ts:45`
  - `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx:50`
  - `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-overlays.tsx:33`

- [done] `useDocumentState` 拆分为 `auto-save/fs-sync/vault-restore/persistence` 四段副作用，主 hook 保持外部 API 不变
  - `apps/moryflow/pc/src/renderer/workspace/hooks/use-document-state.ts:99`
  - `apps/moryflow/pc/src/renderer/workspace/hooks/use-document-state.ts:143`
  - `apps/moryflow/pc/src/renderer/workspace/hooks/use-document-state.ts:193`
  - `apps/moryflow/pc/src/renderer/workspace/hooks/use-document-state.ts:278`

- [done] `handle.ts` 收敛为编排层，vault 生命周期与命令动作组装下沉为独立 hooks
  - `apps/moryflow/pc/src/renderer/workspace/handle.ts:19`
  - `apps/moryflow/pc/src/renderer/workspace/hooks/use-workspace-vault.ts:21`
  - `apps/moryflow/pc/src/renderer/workspace/hooks/use-workspace-command-actions.ts:28`

### S2

- [done] `Sidebar` 拆分 publish 登录门禁与 `agentSub` 面板分发，装配层职责收敛
  - `apps/moryflow/pc/src/renderer/workspace/components/sidebar/index.tsx:90`
  - `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/agent-sub-panels.tsx:39`
  - `apps/moryflow/pc/src/renderer/workspace/components/sidebar/hooks/use-sidebar-publish-controller.ts:26`

- [done] `EditorPanel` 改为显式视图状态机（`empty/loading/error/ready`）+ `renderContentByState()` 分发
  - `apps/moryflow/pc/src/renderer/workspace/components/editor-panel/index.tsx:39`
  - `apps/moryflow/pc/src/renderer/workspace/components/editor-panel/index.tsx:165`
  - `apps/moryflow/pc/src/renderer/workspace/components/editor-panel/index.tsx:207`

- [done] `useVaultTreeState` 拆分 `bootstrap` 与 `fs-events`，初始化与订阅副作用解耦
  - `apps/moryflow/pc/src/renderer/workspace/hooks/use-vault-tree.ts:52`
  - `apps/moryflow/pc/src/renderer/workspace/hooks/use-vault-tree.ts:135`

### S3

- [done] `NotionEditor` 扩展配置与加载态拆到独立文件，主组件只保留编辑器装配
  - `apps/moryflow/pc/src/renderer/components/editor/index.tsx:55`
  - `apps/moryflow/pc/src/renderer/components/editor/notion-editor-extensions.ts:36`
  - `apps/moryflow/pc/src/renderer/components/editor/notion-editor-loading.tsx:9`

- [done] 目的地视图分发改为显式函数分发，移除散落布尔条件拼接
  - `apps/moryflow/pc/src/renderer/workspace/desktop-workspace-shell.tsx:123`
  - `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx:111`
  - `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx:225`

## 模块 C 修复项映射（C-1~C-6）

1. C-1：拆分 `DesktopWorkspaceShell` 为 `panel-state hook + main-content renderer + overlays`，并把主区渲染改为 `renderContentByState/switch`。
2. C-2：拆分 `useDocumentState` 为 `tabs/load`、`auto-save`、`vault-restore`、`persistence` 四段，保留对外 API 不变。
3. C-3：收敛 `handle.ts`，下沉 vault lifecycle 与 command actions 组装，主控制器仅负责编排。
4. C-4：拆分 `Sidebar` 的 publish/login 门禁与 panel 分发，统一 `agentSub` 的状态片段渲染。
5. C-5：改造 `EditorPanel` 为显式视图状态机（empty/loading/error/ready）+ `renderContentByState()`。
6. C-6：轻量清理 `useVaultTreeState`/`NotionEditor` 的职责边界（effect 分段与配置外提），补齐必要回归测试。

## 模块 D 修复结果（cloud-sync / share / site-publish / vault-files，已完成）

### S1

- [done] `VaultFiles` 共享业务状态从 Context 迁移到 store-first，子节点改为就地 selector 取数
  - `apps/moryflow/pc/src/renderer/components/vault-files/vault-files-store.ts:1`
  - `apps/moryflow/pc/src/renderer/components/vault-files/index.tsx:14`
  - `apps/moryflow/pc/src/renderer/components/vault-files/components/vault-folder.tsx:25`
  - `apps/moryflow/pc/src/renderer/components/vault-files/components/vault-file.tsx:17`

- [done] `cloud-sync-section.tsx`（395 行）拆分为容器层 + ready 内容层，移除容器内大块 UI 条件编排
  - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section.tsx:1`
  - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section-ready.tsx:1`

- [done] `site-publish` 两个超阈值组件（`site-list.tsx`/`publish-dialog.tsx`）拆分并降到 `< 300` 行
  - `apps/moryflow/pc/src/renderer/components/site-publish/site-list.tsx:1`
  - `apps/moryflow/pc/src/renderer/components/site-publish/site-list-card.tsx:1`
  - `apps/moryflow/pc/src/renderer/components/site-publish/publish-dialog.tsx:1`
  - `apps/moryflow/pc/src/renderer/components/site-publish/publish-dialog-step-content.tsx:1`

### S2

- [done] `VaultFolder` 文件夹行多状态 class 分发移除链式三元，改为 `getFolderRowStateClass()`
  - `apps/moryflow/pc/src/renderer/components/vault-files/components/vault-folder.tsx:40`

- [done] `SiteList` 列表态统一为 `viewState + renderContentByState/switch`
  - `apps/moryflow/pc/src/renderer/components/site-publish/site-list.tsx:34`

- [done] `PublishDialog` 步骤态统一为 `step + renderContentByStep/renderFooterByStep`
  - `apps/moryflow/pc/src/renderer/components/site-publish/publish-dialog.tsx:33`

### S3

- [done] `share` 模块复扫未发现新增 S1/S2：`share-popover` 已使用 `panel + switch`，维持现状避免无效重构
  - `apps/moryflow/pc/src/renderer/components/share/share-popover.tsx:228`

### follow-up（稳定性回归）

- [done] `cloud-sync-section` 修复“条件 `return` 后再调用 hook”风险：状态派生抽离为纯函数，容器层统一按 `sectionState` 分发，hook 顺序稳定
  - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section.tsx:1`
  - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section-model.ts:1`
  - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section-model.test.ts:1`

- [done] `vault-files` 补齐 `handle` 纯函数回归测试，覆盖排序、拖拽解析与 drop 校验
  - `apps/moryflow/pc/src/renderer/components/vault-files/handle.test.ts:1`

## 模块 E 修复结果（renderer hooks / contexts / transport / stores，已完成）

### S1

- [done] `workspace-controller-context` 去 Context 化：Provider 仅做控制器快照同步，读取端统一切换到 `workspace-controller-store` selector（`nav/vault/tree/doc/command/dialog`）
  - `apps/moryflow/pc/src/renderer/workspace/context/workspace-controller-context.tsx:1`
  - `apps/moryflow/pc/src/renderer/workspace/stores/workspace-controller-store.ts:1`

- [done] `workspace-shell-context` 去 Context 化：Shell 控制器（sidebar/chat/settings）改为 `workspace-shell-controller-store`，保留 `useWorkspaceShell` API 不变
  - `apps/moryflow/pc/src/renderer/workspace/context/workspace-shell-context.tsx:1`
  - `apps/moryflow/pc/src/renderer/workspace/stores/workspace-shell-controller-store.ts:1`

### S2

- [done] 删除未被引用的 `renderer/contexts/app-context.tsx`，清理模块 E 范围残留 Context 实现与死代码
  - `apps/moryflow/pc/src/renderer/contexts/app-context.tsx`（deleted）

### S3

- [done] `workspace/CLAUDE.md` 同步为 Store-first 口径，补齐业务控制器与 Shell 控制器的 store 边界定义
  - `apps/moryflow/pc/src/renderer/workspace/CLAUDE.md:1`

## Store-first 二次改造执行结果（已完成）

> 执行约束：不新增/不扩散 Context；跨组件共享状态统一 `Zustand Store + Methods`。  
> 覆盖范围：`ChatFooter/PromptOverlays/FileContextPanel/WorkspaceShellMainContent/WorkspaceShellOverlays/AgentSubPanels/ProviderDetailsPreset`。

### 执行目标

1. 消除“拆文件后 props 平铺”过渡态，收敛到 `store selector + model object`。
2. 容器组件只保留装配职责，状态与行为下沉到 feature store。
3. 为模块 D/E 继续重构预留一致的数据边界（Chat/Workspace 两条线都用 store）。

### 执行项（Store-first）

1. [done] `SF-1`（模块 B）：Chat 容器 store 化  
   变更：

- 新增 `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-pane-footer-store.ts`（footer snapshot store）
- `ChatFooter` 改为 selector 取数：`apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-footer.tsx`
- `ChatPane` 改为同步快照并移除 footer 20+ props 平铺：`apps/moryflow/pc/src/renderer/components/chat-pane/index.tsx`

2. [done] `SF-2`（模块 B）：输入浮层 store 化  
   变更：

- 新增 `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/chat-prompt-overlay-store.ts`
- `ChatPromptInputOverlays` 改为 selector 取数：`apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/chat-prompt-input-overlays.tsx`
- `FileContextPanel` 新增 store 取数包装层 `FileContextPanelFromOverlayStore`：`apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/file-context-panel.tsx`
- `ChatPromptInput` 改为同步 overlay snapshot 并移除 overlays props 平铺：`apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/index.tsx`

3. [done] `SF-3`（模块 C/E）：Workspace 装配层去 props 平铺  
   变更：

- 新增 `apps/moryflow/pc/src/renderer/workspace/stores/workspace-shell-view-store.ts`
- 新增 `apps/moryflow/pc/src/renderer/workspace/components/sidebar/hooks/use-sidebar-panels-store.ts`
- `WorkspaceShellMainContent` 改为 selector 取数：`apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`
- `WorkspaceShellOverlays` 改为 selector 取数：`apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-overlays.tsx`
- `AgentSubPanels` 改为 selector 取数：`apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/agent-sub-panels.tsx`
- `DesktopWorkspaceShell/Sidebar` 改为快照同步层：`apps/moryflow/pc/src/renderer/workspace/desktop-workspace-shell.tsx`、`apps/moryflow/pc/src/renderer/workspace/components/sidebar/index.tsx`

4. [done] `SF-4`（模块 A follow-up）：设置页高 props 收口  
   变更：

- `ProviderDetailsPresetProps` 收敛为 `formModel/listModel/dialogModel` 三段模型：`apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/provider-details-preset.tsx`
- `ProviderDetails` 改为三段模型装配：`apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/provider-details.tsx`

### 同类问题扫描（本轮后 Top，按 Props block 统计）

- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/chat-prompt-input-model-selector.tsx`（18 fields）
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/const.ts`（17 fields，类型定义）
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/file-context-panel.tsx`（16 fields，通用面板 API）
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/primary-action.tsx`（14 fields）
- `apps/moryflow/pc/src/renderer/components/vault-files/const.ts`（14 fields，类型定义）
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/plus-menu.tsx`（13 fields）
- `apps/moryflow/pc/src/renderer/workspace/components/chat-pane-portal.tsx`（13 fields）

## 模块 C 验证命令

- `pnpm --filter @moryflow/pc typecheck`
- `pnpm --filter @moryflow/pc test:unit`
- `pnpm --filter @moryflow/pc test:unit -- src/renderer/workspace`

## 验证结果（本地）

- `pnpm --filter @moryflow/pc typecheck`
  - 结果：pass（模块 E 修复后）

- `pnpm --filter @moryflow/pc exec vitest run src/renderer/workspace/components/sites/index.test.tsx src/renderer/workspace/hooks/use-navigation.test.tsx src/renderer/workspace/hooks/use-document-state.test.tsx src/renderer/workspace/hooks/use-vault-tree.test.tsx`
  - 结果：pass（`4 files / 7 tests`）

- `pnpm --filter @moryflow/pc exec vitest run src/renderer/components/site-publish/use-site-publish.test.tsx src/renderer/components/settings-dialog/components/cloud-sync-section-model.test.ts src/renderer/components/vault-files/handle.test.ts`
  - 结果：pass（`3 files / 13 tests`）

- `pnpm --filter @moryflow/pc typecheck`
  - 结果：pass

- `pnpm --filter @moryflow/pc typecheck`
  - 结果：fail
  - 原因：本地缺少 `node_modules`，且大量 workspace 依赖未解析（输出包含 `Local package.json exists, but node_modules missing`）。

- `pnpm --filter @moryflow/pc test:unit`
  - 结果：fail
  - 原因：`vitest: command not found`（同样由 `node_modules` 缺失导致）。

- `pnpm --filter @moryflow/pc test:unit -- src/renderer/workspace`
  - 结果：fail
  - 原因：`vitest: command not found`（同样由 `node_modules` 缺失导致）。

## 进度记录

| Date       | Module                                              | Action                                | Status | Notes                                                                                                                                                                                                            |
| ---------- | --------------------------------------------------- | ------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-26 | 模块 A（auth/settings-dialog/payment-dialog）       | 预扫描                                | done   | 输出 `S1x4 / S2x2 / S3x2`，给出 `A-1~A-6` 计划                                                                                                                                                                   |
| 2026-02-26 | 模块 A（auth/settings-dialog/payment-dialog）       | 分步修复（A-1~A-6）                   | done   | 全部代码改造落地，等待依赖安装后补齐 typecheck/test:unit 验证                                                                                                                                                    |
| 2026-02-26 | 模块 B（chat-pane/input-dialog/command-palette）    | 预扫描                                | done   | 输出 `S1x3 / S2x3 / S3x2`，给出 `B-1~B-6` 计划                                                                                                                                                                   |
| 2026-02-26 | 模块 B（chat-pane/input-dialog/command-palette）    | 一次性修复（B-1~B-6）                 | done   | `ChatPane/ChatPromptInput/ChatMessage` 完成拆分；`PlusMenu/useChatSessions/InputDialog/McpPanel/TaskHoverPanel` 收敛完成                                                                                         |
| 2026-02-26 | 模块 B（chat-pane/input-dialog/command-palette）    | follow-up（参数收敛复检）             | done   | `ChatMessage` 继续收敛为 `MessageBodyModel + useMessageToolModel`；减少 `message-body/tool-part` 参数平铺，并完成同类问题扫描清单                                                                                |
| 2026-02-26 | 模块 C（editor/workspace）                          | 预扫描                                | done   | 输出 `S1x3 / S2x3 / S3x2`，给出 `C-1~C-6` 一次性修复计划与验证命令                                                                                                                                               |
| 2026-02-26 | 模块 C（editor/workspace）                          | 一次性修复（C-1~C-6）                 | done   | `DesktopWorkspaceShell/useDocumentState/handle/Sidebar/EditorPanel/useVaultTree/NotionEditor` 完成分层收敛；待依赖安装后补齐验证                                                                                 |
| 2026-02-26 | 模块 B/C/E + 模块 A follow-up                       | Store-first 二次改造执行（SF-1~SF-4） | done   | `ChatFooter/PromptOverlays/FileContextPanel/WorkspaceShellMainContent/WorkspaceShellOverlays/AgentSubPanels/ProviderDetailsPreset` 已完成 store-first 或模型收口；`typecheck` 因依赖缺失未通过（非本次改动引入） |
| 2026-02-26 | 模块 D（cloud-sync/share/site-publish/vault-files） | 预扫描                                | done   | 输出 `S1x3 / S2x3 / S3x1`，给出 `D-1~D-6` 一次性修复计划（含文件边界与验证命令）                                                                                                                                 |
| 2026-02-26 | 模块 D（cloud-sync/share/site-publish/vault-files） | 一次性修复（D-1~D-6）                 | done   | 完成 `vault-files` store-first 迁移（移除 Context）、`cloud-sync/site-publish` 超阈值组件拆分、`site-list/publish-dialog` 状态分发统一为 `switch`；`share` 复扫维持现状                                          |
| 2026-02-26 | 模块 D（cloud-sync/share/site-publish/vault-files） | follow-up（稳定性回归）               | done   | 修复 `cloud-sync-section` 条件 `return` 后 hook 顺序风险；新增 `cloud-sync-section-model` 与 `vault-files/handle` 回归测试；`typecheck` + 模块 D 定向 `vitest` 全通过                                            |
| 2026-02-26 | 模块 E（renderer hooks/contexts/transport/stores）  | 预扫描                                | done   | 输出 `S1x2 / S2x1 / S3x1`：核心问题为 workspace controller/shell 仍使用 Context，且存在未引用 context 死代码                                                                                                     |
| 2026-02-26 | 模块 E（renderer hooks/contexts/transport/stores）  | 一次性修复（E-1~E-4）                 | done   | 完成 workspace controller/shell 去 Context 化（store-first），删除 `renderer/contexts/app-context.tsx`，并通过 `typecheck` + workspace 定向 `vitest`                                                             |
