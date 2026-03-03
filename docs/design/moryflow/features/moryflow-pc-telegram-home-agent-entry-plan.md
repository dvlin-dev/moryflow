---
title: Moryflow PC Home Tab 独立 Agent 模块方案（Telegram 右侧直出）
date: 2026-03-03
scope: apps/moryflow/pc
status: completed
---

<!--
[INPUT]:
- 需求更新：不是“入口外露到设置”，而是把 Telegram 配置做成与 Skills 同级的独立模块。
- 交互要求：Home 模块区里 `Agent` 位于 `Skills` 上方；点击后右侧主内容区直接显示模块页面。
- 约束：最佳实践；不考虑历史兼容；允许重构。

[OUTPUT]:
- 执行前技术方案：信息架构、路由模型、组件拆分、测试与验收。

[POS]:
- Moryflow PC Telegram 独立模块化（Home Modules 同级）单一事实源。

[PROTOCOL]:
- 本文最初为执行前评审稿（draft），现已回写执行结果并标记为 completed。
-->

# Moryflow PC Home Tab 独立 Agent 模块方案（Telegram 右侧直出）

## 1. 目标与结论（TL;DR）

目标：将 Telegram 配置从 Settings 内部分区升级为 Home 模块导航中的一级模块，名称 `Agent`，排序在 `Skills` 之前，点击后在右侧主内容区直接展示页面。

推荐结论：

1. 新增独立 destination（内部 key 与现有 `destination='agent'` 解耦），将 `Agent` 作为模块导航项接入。
2. 右侧新增 `AgentModulePage`，承载 Telegram 配置与 Pairing 审批（不再通过 Settings 弹窗承载主路径）。
3. 将 Telegram UI 逻辑抽到模块页组件并作为唯一事实源，避免页面复制实现。
4. Settings 内 `telegram` 分区直接移除，不保留兼容入口。

## 2. 执行前现状事实（代码）

1. 模块导航 `ModulesNav` 当前仅支持 destination 跳转（`Skills/Sites`），位置：
   - `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/modules-nav.tsx`
2. 导航状态 `Destination` 当前仅有：
   - `'agent' | 'skills' | 'sites'`
   - 文件：`apps/moryflow/pc/src/renderer/workspace/navigation/state.ts`
3. 右侧主内容路由当前仅渲染：
   - `agent-home / agent-chat / skills / sites`
   - 文件：`apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`
4. Telegram UI 当前挂在 Settings Dialog 分区：
   - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/telegram-section.tsx`

## 3. 需求拆解

### 3.1 必达

1. Home 模块区顺序改为：`Agent`、`Skills`、`Sites`。
2. 点击 `Agent` 后右侧显示独立模块页面（非弹窗/非跳 settings）。
3. 该模块页面承载完整 Telegram 配置能力（含 Pairing 审批），与现有 Settings 中 Telegram 功能一致。

### 3.2 非目标

1. 本轮不改 Telegram 主进程协议、运行时/密钥存储策略。
2. 本轮不扩展到移动端/网页端。

## 4. 方案对比（2-3 选 1）

### 方案 A（推荐）：新增同级 destination + 独立页面 + UI 共享组件

做法：

1. 扩展导航 destination，例如内部 key：`'agent-module'`（用户显示名仍为 `Agent`）。
2. `ModulesNav` 新增 `Agent` 导航项（navigate 型）。
3. `WorkspaceShellMainContent` 新增页面分支，右侧渲染 `AgentModulePage`。
4. 抽取 Telegram 业务 UI 为共享组件（例如 `renderer/features/telegram/TelegramSettingsPanel`），由 Settings 分区与新页面共同复用。

优点：

1. 满足“与 Skills 同级、右侧直出”的核心目标。
2. 避免 UI 双维护，后续 Telegram 迭代只改一处。
3. 通过内部 key 解耦，规避与现有 `destination='agent'` 语义冲突。

代价：

1. 导航状态与主内容路由需要一次性重构。

### 方案 B：直接把 `telegram-section.tsx` 复制一份到新页面

优点：

1. 初期实现快。

缺点：

1. 明显违反单一事实源，后续功能与校验将产生双轨漂移。
2. 与“最佳实践”冲突，不建议。

### 方案 C：把 `Agent` 做成打开新窗口/抽屉

优点：

1. 对主路由侵入小。

缺点：

1. 不符合“右侧主内容区直出”要求。
2. 交互层级更复杂，认知成本更高。

## 5. 推荐方案设计（A）

## 5.1 导航与路由模型

1. Destination 扩展：
   - 从：`'agent' | 'skills' | 'sites'`
   - 到：`'agent' | 'agent-module' | 'skills' | 'sites'`
2. 语义约束：
   - `agent`：原有编辑/会话工作区（Home/Chat）
   - `agent-module`：Telegram 独立模块页（Home 模块同级）
3. `go()` 不变量保持：`destination !== 'agent'` 时侧栏内容走 Home 布局。

## 5.2 Sidebar 模块区

1. `ModulesNav` 条目源改为外部注入数组（去掉内部硬编码）。
2. `Sidebar` 组装条目顺序：
   - `Agent` -> `go('agent-module')`
   - `Skills` -> `go('skills')`
   - `Sites` -> `go('sites')`
3. active 规则：按 destination 高亮对应模块项。

## 5.3 右侧主内容区

1. `workspace-shell-main-content.tsx` 增加主视图状态 `agent-module`。
2. 增加 keep-alive mount 标记（对齐 skills/sites 现有策略），避免频繁切换重建。
3. 新增 `AgentModulePage`：
   - 页面标题：`Agent`
   - 子标题可写明 `Telegram channel configuration`（用户可见英文）
   - 主体渲染 Telegram 共享业务组件。

## 5.4 Telegram 模块页组件化与 Settings 入口下线（根因治理）

1. 将现有 `telegram-section.tsx` 迁移为模块页业务组件（保留表单/状态/pairing 单一实现），由 `AgentModulePage` 直接渲染。
2. 删除 Settings 内 Telegram 分区注册：
   - `settingsSections` 移除 `telegram`
   - `sectionContentLayout` 移除 `telegram`
   - `section-content.tsx` 移除 `telegram` 分支
3. 删除 Settings 体系下仅服务 Telegram 分区的文案与测试（以模块页测试替代）。
4. 保持“Telegram 配置主路径唯一”：Home Modules -> `Agent` -> 右侧模块页。

## 5.5 文档与语义收敛

1. 更新旧导航文档中“Modules 仅非 Agent 模块”的约束，替换为新事实（含 `Agent` 模块）。
2. 不保留“旧语义兼容注释”与双轨描述。

## 6. 执行前预计改造文件

1. `apps/moryflow/pc/src/renderer/workspace/navigation/state.ts`
2. `apps/moryflow/pc/src/renderer/workspace/navigation/state.test.ts`
3. `apps/moryflow/pc/src/renderer/workspace/hooks/use-navigation.ts`
4. `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/modules-nav.tsx`
5. `apps/moryflow/pc/src/renderer/workspace/components/sidebar/index.tsx`
6. `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`
7. `apps/moryflow/pc/src/renderer/workspace/components/agent-module/index.tsx`（新增）
8. `apps/moryflow/pc/src/renderer/features/telegram/*`（新增共享业务组件）
9. `apps/moryflow/pc/src/renderer/components/settings-dialog/const.ts`（移除 `telegram` section）
10. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/section-content.tsx`（移除分支）
11. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/telegram-section.tsx`（迁移或删除）
12. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/telegram-section.validation.test.ts`（迁移为模块页测试）
13. `packages/i18n/src/translations/settings/*.ts`（移除 settings 下 `telegram` 导航文案）
14. 相关 CLAUDE 文档与 design 文档索引。

## 7. 执行前测试与验收

### 7.1 单元测试

1. 导航层：
   - `go('agent-module')` 状态转换正确。
2. Sidebar：
   - 模块顺序严格为 `Agent > Skills > Sites`。
   - 点击 `Agent` 触发 `go('agent-module')`。
3. 主内容路由：
   - `destination='agent-module'` 时渲染 `AgentModulePage`。
4. Telegram 模块页组件：
   - 保留现有表单与 pairing 行为回归。
5. Settings 分区约束：
   - `settingsSections` 不再包含 `telegram`。

### 7.2 回归验证

1. Skills/Sites 页面行为不回归。
2. Settings 不再出现 Telegram 分区入口。
3. `pnpm --filter @moryflow/pc typecheck`
4. `pnpm --filter @moryflow/pc test:unit`

## 8. 风险与规避

1. 风险：`Agent`（模块名）与现有 `destination='agent'`（工作区）概念冲突。
   - 规避：内部 key 使用 `agent-module`，文案与内部语义分离。
2. 风险：Telegram 组件分叉导致后续维护漂移。
   - 规避：强制抽共享组件，禁止复制实现。
3. 风险：导航重构影响快捷键与现有习惯。
   - 规避：本轮先保持现有快捷键不变，仅新增模块点击路径；快捷键映射另开变更评审。

## 9. 已确认决策（2026-03-03）

1. `Agent` 模块固定对应 Telegram 独立模块页（非泛 Agent 总览页）。
2. Settings 内 `telegram` 分区直接移除，仅保留模块页入口。

## 10. 执行结果（2026-03-03）

### 10.1 已完成实现

1. Navigation destination 扩展为 `agent-module`，保留 `agent` 作为原工作区语义。
2. Sidebar Modules 顺序改为 `Agent > Skills > Sites`，`Agent` 点击后触发 `go('agent-module')`。
3. 主内容分发新增 `agent-module` 视图，右侧渲染 `AgentModulePage`。
4. Telegram 组件迁移到 `workspace/components/agent-module/telegram-section.tsx`，作为唯一业务实现。
5. Settings Dialog 移除 `telegram` section（`SettingsSection`、`settingsSections`、`SectionContent` 分支均已删除）。

### 10.2 测试回归

1. 新增 `modules-nav.test.tsx`：校验模块顺序与 `Agent -> agent-module` 点击语义。
2. 新增 `workspace-shell-main-content-model.test.ts`：校验 `agent-module` 路由分发。
3. 迁移 `telegram-section.validation.test.ts` 到新模块目录，保持表单校验回归。
4. 更新 `state.test.ts`、`use-navigation.test.tsx`、`chat-pane-portal-model.test.ts`、`sidebar-layout-router-model.test.ts` 覆盖新 destination 语义。

### 10.3 文档与索引同步

1. 本文状态已从 `draft` 更新为 `completed`。
2. `docs/design/moryflow/features/index.md` 与 `docs/index.md` 已更新为“已完成口径”。
3. `docs/CLAUDE.md`、`apps/moryflow/pc/src/renderer/CLAUDE.md`、`workspace/CLAUDE.md`、`settings-dialog/CLAUDE.md`、`sidebar/CLAUDE.md` 已同步本次变更事实。
