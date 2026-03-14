---
title: Moryflow PC 导航与 Workspace Shell 架构
date: 2026-03-08
scope: apps/moryflow/pc
status: active
---

<!--
[INPUT]: Moryflow PC 当前 Sidebar、Home/Chat、Modules 与主区派生实现
[OUTPUT]: PC Shell 唯一导航架构事实源
[POS]: Moryflow Core / Navigation + Workspace Shell

[PROTOCOL]: 仅在导航状态模型、布局派生、模块 registry 或交互不变量失真时更新；不维护评估过程。
-->

# Moryflow PC 导航与 Workspace Shell 架构

## 1. 当前状态

1. PC 壳层已经收口为单一左侧 Sidebar，不再引入独立 Nav Rail。
2. `Home / Chat` 已经收口为 agent workspace 内部视图切换，不再和 `Skills / Sites / Remote Agents` 这类模块目的地混用。
3. 导航状态已经改为判别联合，非法组合不再靠运行时 resolver 临时兜底。
4. 侧栏、主区、顶栏与 ChatPane 保活派生都已统一到单一布局派生层。
5. Modules 导航与主内容分发共享同一 registry，新增模块不再维护多份映射。

## 2. 信息架构

### 2.1 Sidebar 固定结构

```text
[Home | Chat] [Search]
[Modules / workspace-file related content]
[Thread list or file/workspace content]
[Bottom primary action: New chat]
```

约束：

1. Sidebar 顶部只保留 `Home | Chat` 和 `Search`。
2. `Home` 负责 Modules 与 workspace/file 相关内容。
3. `Chat` 只负责线程列表。
4. 设置入口属于系统级动作，只能出现在 `UnifiedTopBar` 右侧。
5. 底部只保留 `New chat` 单一主操作。

### 2.2 顶层语义分层

1. `agent-workspace`：工作区内部，支持 `home / chat` 切换。
2. `module`：独立模块页，例如 `remote-agents`、`automations`、`memory`、`skills`、`sites`。

## 3. 导航状态模型

```ts
type NavigationState =
  | { kind: 'agent-workspace'; sidebarMode: 'home' | 'chat' }
  | {
      kind: 'module';
      module: 'remote-agents' | 'automations' | 'memory' | 'skills' | 'sites';
    };
```

约束：

1. 模块态不再携带 `sidebarMode`。
2. `lastSidebarMode` 仅用于 `agent-workspace`。
3. 类型层面不再允许 `skills + chat` 一类非法组合。
4. 任意导航事件都必须经过统一状态转换与布局派生，组件层禁止直接拼装条件分支。

## 4. 布局派生与主区分发

### 4.1 单一布局派生层

1. `resolveWorkspaceLayout(state)` 是布局派生唯一入口。
2. Sidebar、Main Content、Top Bar、ChatPane Placement 都只消费该派生结果。
3. 非工作区目的地时，侧栏统一回到 Home 形态，ChatPane 进入 parking / keep-alive 语义。

### 4.2 Modules Registry

1. 模块导航与主内容路由共享同一 registry。
2. registry 负责 `id / label / icon / mainView / order` 等模块元信息。
3. 新增模块时只改一处，不再同步修改导航、主区映射和多处枚举。

### 4.3 Keep-Alive

1. 主内容保活已经收口到 key-based keep-alive map。
2. Chat 主视图、parking host 与其他主区页面的挂载语义保持一致。
3. 切换页面不得引入明显 remount、滚动复位或草稿丢失。

## 5. 交互不变量

### 5.1 Home / Chat

1. 点击 `Home / Chat` 总是回到 `agent-workspace` 并切换对应 `sidebarMode`。
2. `Search` 保持全局搜索语义，不拆成 Home / Chat 两套行为。
3. `New chat` 固定在底部，跨模式位置不变。

### 5.2 模块切换

1. 顶部 Modules 决定主区目的地，不再与 agent workspace 二级切换混用。
2. 模块态下仍需保留 agent workspace 的可回达性，不允许把工作区入口隐藏到二级交互里。
3. 打开类交互必须显式回到 `agent-workspace`；管理类交互保持就地生效，不强制切主区。

### 5.3 Workspace Tree 变更

1. Sidebar 文件树的即时创建不再弹命名对话框；创建入口统一走 main-process 分配真实名称的 quick create 协议。
2. 文件树局部变更优先使用目录级增量刷新，不再把单次拖拽 / 创建默认实现成全量 `fetchTree()`。
3. Shell、EditorPanel、ChatPane 等上层容器不得为了空状态或布局判断去订阅整棵 tree；必须优先消费 `hasFiles`、`treeLength` 一类原子派生状态。
4. 文件夹上下文创建子节点时，若目标文件夹当前折叠，必须先展开再展示新节点。

## 6. 组件职责边界

1. `sidebar/index.tsx` 只做装配，不承载业务状态分支。
2. `sidebar-header.tsx`、`sidebar-mode-tabs.tsx`、`sidebar-search-action.tsx` 负责顶部交互。
3. `sidebar-layout-router.tsx` 是唯一侧栏内容路由入口。
4. `modules-nav.tsx` 只负责模块导航，不混入搜索、新建或系统级动作。
5. `top-bar-actions.tsx` 与 `open-settings-button.tsx` 负责右上角系统动作。
6. 文件 / 文件夹命名归一化只能发生在 main process；renderer 不重复实现第二套命名策略。

## 7. 验收标准

1. `Home / Chat` 与模块目的地语义明确分层，不再可表达非法组合。
2. Sidebar、Main Content、Top Bar、ChatPane Placement 均由单一派生层决定。
3. Modules 导航与主区路由共享 registry，当前固定模块集为
   `remote-agents / automations / memory / skills / sites`，新增模块不需要多处同步映射。
4. keep-alive 泛化后，页面切换不丢失必要上下文，且不回退到局部 mounted state 拼装。

## 8. 当前验证基线

1. `navigation/state.ts`、`use-navigation.ts` 负责状态机、快捷键、持久化与无 workspace 归一化回归。
2. `sidebar-layout-router`、`modules-nav`、`unified-top-bar` 与相关 model 文件负责布局分发、模块可达性与系统动作位置回归。
3. 后续修改导航契约、布局派生或 modules registry 时，按 L2 执行根级校验。
