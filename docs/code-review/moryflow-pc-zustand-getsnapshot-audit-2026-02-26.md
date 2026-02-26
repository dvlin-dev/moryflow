---
title: Moryflow PC Zustand getSnapshot 风险审计（2026-02-26）
date: 2026-02-26
scope: moryflow-pc
status: completed
---

# 审计目标

排查 `apps/moryflow/pc` 内所有可能触发以下报错的点，并集中列出：

- `The result of getSnapshot should be cached to avoid an infinite loop`
- `Maximum update depth exceeded`

> 说明：本文件仅做“问题清单与证据”汇总，不在本文件中直接实施修复。

## 修复进展（2026-02-26）

- P0（`vault-file.tsx`、`vault-folder.tsx`）已修复：对象字面量 selector 已改为字段级原子 selector。
- P1（`vault-files-store.ts`）已修复：`useSyncVaultFilesStore` 已增加 `shouldSyncSnapshot` 等价判断。
- 回归测试已补齐：`apps/moryflow/pc/src/renderer/components/vault-files/vault-files-store.test.tsx`。

## 审计方法

1. 全量扫描 `zustand` store 与订阅调用点（`createStore/useStore/useSync*Store`）。
2. 重点匹配会导致快照引用抖动的高危写法：
   - `useXxxStore((state) => ({ ... }))`（对象字面量 selector）
   - `useXxxStore((state) => ([ ... ]))`（数组字面量 selector）
3. 检查 `useSync*Store` 是否具备 `shouldSync` 防抖，避免无变化重复 `setSnapshot`。

## 审计覆盖范围（moryflow pc）

- `apps/moryflow/pc/src/renderer/components/vault-files/vault-files-store.ts`
- `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-pane-footer-store.ts`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/chat-prompt-overlay-store.ts`
- `apps/moryflow/pc/src/renderer/workspace/stores/workspace-shell-view-store.ts`
- `apps/moryflow/pc/src/renderer/workspace/stores/workspace-controller-store.ts`
- `apps/moryflow/pc/src/renderer/workspace/stores/workspace-shell-controller-store.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/hooks/use-sidebar-panels-store.ts`
- `apps/moryflow/pc/src/renderer/lib/server/auth-store.ts`
- `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-sessions.ts`
- `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-selected-skill.ts`

## 审计发现（修复前）

### P0：对象字面量 selector（直接命中 getSnapshot 风险）

1. `VaultFile` 使用对象字面量 selector  
   文件：`apps/moryflow/pc/src/renderer/components/vault-files/components/vault-file.tsx:36`  
   证据：`useVaultFilesStore((state) => ({ ... }))`  
   风险：每次 selector 执行返回新对象引用，在 React 19 + zustand v5 下可触发 `getSnapshot should be cached`，并在高频更新链路下放大为嵌套更新错误。

2. `VaultFolder` 使用对象字面量 selector  
   文件：`apps/moryflow/pc/src/renderer/components/vault-files/components/vault-folder.tsx:69`  
   证据：`useVaultFilesStore((state) => ({ ... }))`  
   风险：同上；且该组件在树节点层级中会被批量渲染，触发面更大。

### P1：同步层缺少快照等价保护（放大器）

3. `useSyncVaultFilesStore` 无 `shouldSync` 判断  
   文件：`apps/moryflow/pc/src/renderer/components/vault-files/vault-files-store.ts:55`  
   证据：`useLayoutEffect` 内直接 `setSnapshot(snapshot)`  
   风险：只要 `snapshot` 引用变化就会写入 store；与 P0 对象 selector 叠加时，会显著提高进入更新风暴的概率。

4. `VaultFiles` 快照通过对象组装并持续同步  
   文件：`apps/moryflow/pc/src/renderer/components/vault-files/index.tsx:78`、`:108`  
   证据：`storeSnapshot = useMemo(() => ({ ... }))` + `useSyncVaultFilesStore(storeSnapshot)`  
   风险：拖拽状态变化（如 `draggedNodeId/dropTargetId`）会频繁触发同步；在缺少 `shouldSync` 且子组件使用对象 selector 的情况下，容易放大为 UI 抖动或循环更新。

## 排除项（本次未发现同类问题）

- `workspace-shell` 链路：`WorkspaceShellMainContent/WorkspaceShellOverlays/AgentSubPanels` 当前未发现对象字面量 selector。
- `chat-pane` 链路：`ChatFooter/ChatPromptInputOverlays/FileContextPanelFromOverlayStore` 当前未发现对象字面量 selector。
- 本次扫描未发现 `useXxxStore((state) => ([ ... ]))` 的数组字面量 selector。

## 已执行修复顺序

1. 先处理 P0（`vault-file.tsx`、`vault-folder.tsx`）  
   目标：改为原子 selector（字段级订阅）。
2. 再处理 P1（`vault-files-store.ts`）  
   目标：补齐 `shouldSync`，避免等价快照重复写入。
3. 补充回归测试  
   目标：覆盖“等价快照不写入 + 组件订阅不触发 getSnapshot 告警”。
