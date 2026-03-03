---
title: Moryflow PC Home/Chat Tab 布局评估与重构方案
date: 2026-03-04
scope: apps/moryflow/pc
status: completed
---

<!--
[INPUT]:
- 评审请求：分析当前 Home/Chat Tab 布局设计，确认其是否仍是最佳实践。
- 关注点：`destination` 与 `sidebarMode` 的语义边界、历史改造来源、是否需要继续重构。
- 已知线索：早期语义为 `destination='agent'` 再分 `agent-home/agent-chat`。

[OUTPUT]:
- 一份可评审的方案文档：现状事实、历史演进、最佳实践评估、重构建议与执行计划。

[POS]:
- Moryflow PC Workspace Shell 导航与布局语义的评审基线（Home/Chat/Modules）。

[PROTOCOL]:
- 若本方案进入实施，需同步更新相关代码目录 Header 与 `apps/moryflow/pc/src/renderer/CLAUDE.md`。
-->

# Moryflow PC Home/Chat Tab 布局评估与重构方案

## 1. 结论（先给审核结论）

截至 **2026-03-04**，当前布局不是“错误设计”，但也不算长期最佳实践：

1. **短期可继续使用**：状态不变量与核心交互是自洽的，功能上稳定。
2. **中期建议重构**：存在“语义混叠 + 路由派生分散 + 状态可表达非法组合”的结构性隐患。
3. **推荐做 L1/L2 之间的结构重构**：不是推倒重做 UI，而是收敛状态模型和路由派生层。

## 1.1 已确认决策（2026-03-04）

1. **语义顶层**采用“工作区/模块”分层，而不是把 `Home/Chat` 作为唯一语义顶层。
2. **交互主感知**保持“顶部 `Home/Chat` Tab”，作为用户最常用的一层入口。
3. 统一口径：`Home/Chat` 是“工作区内视图切换”，`Skills/Sites/Agent` 是“模块目的地”。

## 2. 现状事实（纠偏）

你提到的旧语义（`destination='agent' | 'skills' | 'sites'`）是历史阶段事实。当前代码已演进：

1. `Destination` 现在是：`'agent' | 'agent-module' | 'skills' | 'sites'`。
2. 默认启动是：`{ destination: 'agent', sidebarMode: 'chat' }`。
3. 主内容区映射是：
   - `destination='agent' && sidebarMode='chat'` -> `agent-chat`
   - `destination='agent' && sidebarMode='home'` -> `agent-home`
   - `destination='agent-module'` -> `agent-module`
   - `destination='skills'` -> `skills`
   - `destination='sites'` -> `sites`
4. 非 `agent` 目的地时，侧栏内容强制走 Home 形态（Modules + Files），ChatPane 进入 parking host 保活。

## 3. 这套设计从哪里演进而来（时间线）

1. **2026-02-11**：`ddac1955`
   - 从旧顶层模式收敛为 `destination + agentSub(chat/workspace)`。
2. **2026-02-28**：`27b6d2c4`
   - `agentSub` 改为 `sidebarMode(home/chat)`；
   - 引入不变量：非 `agent` 时回落 Home 侧栏。
3. **2026-03-03**：`b51d6c83`
   - 新增 `agent-module`（Telegram 独立模块）并接入 Modules Nav。
4. **2026-03-04**：`76db6ad5`
   - 新增无 workspace 场景归一化（`normalizeNoVaultNavigation`，仅豁免 `agent-module`）。

## 4. 最佳实践评估

### 4.1 当前做得好的点

1. 有显式状态机函数（`go / setSidebarMode / normalizeNoVaultNavigation`），不是 UI 里随意拼状态。
2. 有单测覆盖关键不变量（导航转换、侧栏路由、ChatPane 放置）。
3. ChatPane 用 portal + parking 保活，切页不丢聊天上下文，体验稳定。
4. 侧栏/主区/顶栏已按 store-first 分层，props 透传大幅减少。

### 4.2 当前偏离最佳实践的点

1. **语义混叠**：`agent` 同时指“工作区语义”，`agent-module` 又是“模块语义”；命名层面易混淆。
2. **非法状态可表达**：例如 `destination='skills' + sidebarMode='chat'` 仍可存在，只能靠 resolver 兜底。
3. **派生逻辑分散**：`resolveMainViewState`、`resolveSidebarContentMode`、`resolveChatPanePlacement`、`resolveHeaderMode` 分散在多处，新增模块时容易漂移。
4. **扩展成本上升**：主内容 keep-alive 目前每加一个页面就要新增一组 mounted state，维护成本会线性增长。

## 5. 是否需要重构

结论：**需要，但不建议“大改 UI”，建议做一次状态语义与派生层收敛重构**。

判断依据：

1. 如果未来 1-2 个迭代还会新增模块（例如更多 Agent 子模块），当前模型会持续放大复杂度。
2. 当前问题属于“架构债”而非“功能 bug”，越晚改越难改。
3. 现有测试基础已经具备，适合现在做一次可控重构。

## 6. 重构方案（推荐）

### 6.1 目标

1. 保持现有 UI 形态不变（Home/Chat tabs + Modules + 主内容区）。
2. 收敛成“单一布局派生入口”，避免多文件重复判断。
3. 让类型层就能表达合法状态，减少运行时兜底。
4. 明确“语义顶层”和“交互主感知”分层，避免后续方案再把二者混为一谈。

### 6.2 核心设计

#### A. 重写导航状态为判别联合（避免非法组合）

```ts
type NavigationState =
  | { kind: 'agent-workspace'; sidebarMode: 'home' | 'chat' }
  | { kind: 'module'; module: 'agent-module' | 'skills' | 'sites' };
```

说明：

1. `agent-workspace` 专门表示“编辑/对话工作区”。
2. `module` 专门表示模块页面，`sidebarMode` 不再与模块态混用。
3. 持久化只保存 `agent-workspace` 的 `sidebarMode` 偏好。
4. `agent-module` 与 `agent-workspace` 保持命名解耦，避免“Agent 同词异义”。

#### B. 新增唯一派生函数 `resolveWorkspaceLayout(state)`

统一输出：

1. `headerMode`
2. `sidebarContentMode`
3. `mainViewState`
4. `chatPanePlacement`
5. `showTopTabs`

UI 组件只能消费这个派生结果，禁止各自重复判断 `destination/sidebarMode`。

#### B.1 信息架构口径（避免再争议）

1. 语义层：
   - 顶层：`agent-workspace | module`
   - 工作区内子层：`home | chat`
2. UI 层：
   - 侧栏顶部主操作继续展示 `Home/Chat`
   - Modules 区展示 `Agent/Skills/Sites`
3. 约束：
   - 不允许在文档或代码注释中把 `Home/Chat` 表述为“全应用唯一顶层分类”。

#### C. 模块注册表单一化

把 `ModulesNav` 与主内容路由的 module 枚举收口到同一个 registry（id/label/icon/mainView），避免“导航与主区不同步”。

#### D. keep-alive 泛化

把 `homeMainMounted/skillsMainMounted/sitesMainMounted...` 改为 key-based keep-alive map，避免每加模块就复制一段 state。

### 6.3 文件改造清单（预估）

1. `apps/moryflow/pc/src/renderer/workspace/navigation/state.ts`
2. `apps/moryflow/pc/src/renderer/workspace/hooks/use-navigation.ts`
3. `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`
4. `apps/moryflow/pc/src/renderer/workspace/components/sidebar/index.tsx`
5. `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/sidebar-layout-router-model.ts`
6. `apps/moryflow/pc/src/renderer/workspace/components/chat-pane-portal-model.ts`
7. `apps/moryflow/pc/src/renderer/workspace/components/unified-top-bar/index.tsx`
8. `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/modules-nav.tsx`
9. 相关测试：`navigation/state.test.ts`、`use-navigation.test.tsx`、`chat-pane-portal-model.test.ts`、`sidebar-layout-router-model.test.ts`、`workspace-shell-main-content-model.test.ts`

## 7. 验证与验收

本次按 **L2** 执行：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

验收标准：

1. Home/Chat/Modules 的可见性与当前一致（无 UX 回归）。
2. `Cmd/Ctrl+1/2/3/4` 行为不变。
3. 模块切换时 ChatPane 仍保活。
4. 无 workspace 场景行为保持：仅允许模块页白名单，其他回落 agent-home。
5. 新增模块只需改 registry，不需要改 4 处 resolver。
6. 文档与代码口径一致：`Home/Chat` 是工作区 Tab，不是全局语义顶层。

## 8. 风险与回滚

1. 风险：导航状态重构可能影响快捷键和深层组件选择器。
2. 风险：布局派生收敛后，若映射漏项会出现空白页。
3. 回滚策略：分两步提交（先引入新模型+适配层，再删旧分支），每步可独立回退。

## 9. 推荐执行节奏

1. 先做“纯模型重构 + 兼容适配层”（不改 UI）。
2. 再删除旧 resolver 分支与重复状态字段。
3. 最后再做 keep-alive 泛化与 registry 收口。

## 10. 实施任务清单（可直接开工）

> 执行约束：先做状态与派生层，再做组件消费层；禁止先改 UI 再补状态模型。

### Task 1：状态模型重构（Navigation State）

**目标**：把可表达非法组合的 `destination + sidebarMode` 收敛为判别联合状态。

**改动文件**：

1. `apps/moryflow/pc/src/renderer/workspace/navigation/state.ts`
2. `apps/moryflow/pc/src/renderer/workspace/navigation/state.test.ts`

**步骤**：

1. 新增 `NavigationState` 判别联合定义（`agent-workspace` / `module`）。
2. 保留对旧状态消费方的过渡 helper（仅过渡期使用）。
3. 重写 `go / setSidebarMode / normalizeNoVaultNavigation`，保证类型层面无非法组合。
4. 补齐状态机单测（模块跳转、回到工作区、无 workspace 收敛）。

### Task 2：导航 Hook 与持久化适配

**目标**：保持用户体验不变（快捷键与上次 sidebar 偏好），同时切换到新状态模型。

**改动文件**：

1. `apps/moryflow/pc/src/renderer/workspace/hooks/use-navigation.ts`
2. `apps/moryflow/pc/src/renderer/workspace/hooks/use-navigation.test.tsx`

**步骤**：

1. Hook 内部状态迁移到新 `NavigationState`。
2. 保持 `lastSidebarMode` 仅针对 `agent-workspace` 生效。
3. 快捷键语义保持不变：`1/2` 切工作区 tab，`3/4` 去模块。
4. 补充/更新快捷键与持久化回归测试。

### Task 3：单一布局派生层落地

**目标**：把当前分散在多处的布局判断统一到单一函数。

**改动文件**：

1. `apps/moryflow/pc/src/renderer/workspace/navigation/layout-resolver.ts`（新增）
2. `apps/moryflow/pc/src/renderer/workspace/navigation/layout-resolver.test.ts`（新增）
3. `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/sidebar-layout-router-model.ts`
4. `apps/moryflow/pc/src/renderer/workspace/components/chat-pane-portal-model.ts`
5. `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`
6. `apps/moryflow/pc/src/renderer/workspace/components/unified-top-bar/index.tsx`

**步骤**：

1. 新增 `resolveWorkspaceLayout(state)` 并输出统一派生结果。
2. 将 sidebar/chat-pane/main-content/top-bar 的判断替换为消费该派生结果。
3. 删除重复 resolver 或降级为薄封装，避免双事实源。
4. 增加派生矩阵单测（全量 destination/module + home/chat 组合）。

### Task 4：Modules Registry 收口

**目标**：让导航项与主内容路由共享同一注册表，新增模块只改一处。

**改动文件**：

1. `apps/moryflow/pc/src/renderer/workspace/navigation/modules-registry.ts`（新增）
2. `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/modules-nav.tsx`
3. `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`
4. `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/modules-nav.test.tsx`

**步骤**：

1. 抽取 registry（`id/label/icon/mainView/order`）。
2. `ModulesNav` 改为读取 registry 渲染。
3. 主内容分发改为基于 registry 映射。
4. 增加“导航与路由一致性”测试（避免漏挂页面）。

### Task 5：Main Content keep-alive 泛化

**目标**：移除每页一组 mounted state 的线性扩张模式。

**改动文件**：

1. `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`
2. `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content-model.test.ts`

**步骤**：

1. 用 key-based keep-alive map 替换多组 `useState(mounted)`。
2. 保证 chat main/panel/parking 三宿主行为不变。
3. 补齐切换保活与首挂载行为测试。

### Task 6：清理旧分支与文档回写

**目标**：删除过渡层，防止双轨长期共存。

**改动文件**：

1. 受影响组件/模型中旧 resolver 与兼容 helper
2. `docs/design/moryflow/features/moryflow-pc-home-chat-layout-assessment-and-refactor-plan.md`
3. `apps/moryflow/pc/src/renderer/CLAUDE.md`
4. `docs/CLAUDE.md`（记录实施进度）

**步骤**：

1. 删除未再使用的旧派生函数与兼容路径。
2. 回写最终状态模型与验收证据。
3. 确认文档描述与代码行为一致。

## 11. 执行顺序与闸门

1. Task 1 -> Task 2：先状态模型再 Hook（避免 UI 先行导致漂移）。
2. Task 3 -> Task 4：先统一派生，再做 registry（确保消费路径单一）。
3. Task 5：在派生稳定后做 keep-alive 泛化（降低回归面）。
4. Task 6：最后做清理与文档收口。

每完成一个 Task，至少执行：

```bash
pnpm --filter @moryflow/pc typecheck
pnpm --filter @moryflow/pc test:unit
```

全部完成后执行 L2 全量闸门：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

## 12. 执行进度（持续回写）

| Task                         | 状态 | 完成时间   | 关键产出                                                                                                                                                                                                                               | 验证                                                                                 |
| ---------------------------- | ---- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Task 1 状态模型重构          | DONE | 2026-03-04 | `navigation/state.ts` 改为判别联合；新增 `getDestination/getSidebarMode/fromNavigationView/toNavigationView`；`state.test.ts` 同步重写                                                                                                 | `pnpm --filter @moryflow/pc typecheck` ✅；`pnpm --filter @moryflow/pc test:unit` ✅ |
| Task 2 Hook 适配             | DONE | 2026-03-04 | `use-navigation.ts` 切到新状态内部表示并保持对外 API；`desktop-workspace-shell.tsx` 用 `from/toNavigationView` 适配无 workspace 归一化                                                                                                 | `pnpm --filter @moryflow/pc typecheck` ✅；`pnpm --filter @moryflow/pc test:unit` ✅ |
| Task 3 单一布局派生层        | DONE | 2026-03-04 | 新增 `navigation/layout-resolver.ts`（`resolveWorkspaceLayout`）；`sidebar-layout-router-model.ts`、`chat-pane-portal-model.ts`、`workspace-shell-main-content.tsx`、`sidebar/index.tsx`、`unified-top-bar/index.tsx` 改为消费统一派生 | `pnpm --filter @moryflow/pc typecheck` ✅；`pnpm --filter @moryflow/pc test:unit` ✅ |
| Task 4 modules registry 收口 | DONE | 2026-03-04 | 新增 `navigation/modules-registry.ts`；`modules-nav.tsx` 与 `workspace-shell-main-content.tsx` 共用 registry；`layout-resolver.ts` 通过 `getModuleMainViewState` 映射主区                                                              | `pnpm --filter @moryflow/pc typecheck` ✅；`pnpm --filter @moryflow/pc test:unit` ✅ |
| Task 5 keep-alive 泛化       | DONE | 2026-03-04 | `workspace-shell-main-content.tsx` 改为 `MainViewKeepAliveMap`（key-based）并导出 `createInitialMainViewKeepAliveMap/markMainViewMounted`；移除线性 mounted 布尔扩张                                                                   | `pnpm --filter @moryflow/pc typecheck` ✅；`pnpm --filter @moryflow/pc test:unit` ✅ |
| Task 6 清理与闭环            | DONE | 2026-03-04 | 删除对外 `fromNavigationView/toNavigationView` 过渡路径；新增 `normalizeNoVaultNavigationView`；`desktop-workspace-shell.tsx` 与 `layout-resolver.ts` 改为直接消费 view-level 入口；相关单测同步                                       | `pnpm --filter @moryflow/pc typecheck` ✅；`pnpm --filter @moryflow/pc test:unit` ✅ |

---

本方案已按 Task 1~6 全部实施完成，进入最终 L2 全量校验与 code review 阶段。

### 最终 L2 校验（2026-03-04）

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

结果：全部通过。
