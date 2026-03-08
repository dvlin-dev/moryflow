---
title: Moryflow PC Remote Agents 模块重构方案
date: 2026-03-09
scope: apps/moryflow/pc, docs/design/moryflow/features
status: implemented
---

<!--
[INPUT]:
- 现状：Home Modules 中的 `Agent` 实际只承载 Telegram 配置页。
- 新需求：先不做 custom agent，只把当前 `Agent = Telegram` 重命名并抽象成“远程入口模块”。
- 约束：最佳实践；根因治理；不做过度抽象；不引入多渠道统一协议空壳。

[OUTPUT]:
- Remote Agents 模块的信息架构、命名策略、组件边界、迁移步骤、风险与验收基线。

[POS]:
- Moryflow PC 将单一 Telegram Agent 页面重构为 Remote Agents 入口模块的当前实现与验证基线。

[PROTOCOL]: 仅在本方案的范围、目标、边界、模块职责或验收基线失真时，才更新本文。
-->

# Moryflow PC Remote Agents 模块重构方案

## 1. 目标与结论

目标：将当前 Home Modules 中语义失真的 `Agent` 模块重构为 `Remote Agents` 模块，使页面表达的对象从“智能体”收敛为“远程入口/渠道配置”，同时保持 Telegram 现有功能、IPC 契约与 runtime 主链路不变。

推荐结论：

1. 只在 Renderer 导航层与页面层完成 `Agent -> Remote Agents` 的语义重构。
2. `Remote Agents` 页面先作为轻量壳层，当前仅承载一个远程入口：`Telegram`。
3. Telegram UI 逻辑继续作为唯一业务实现，不复制，不平行维护。
4. 不提前抽象 main/ipc 为多渠道统一协议；当前 Telegram 专属服务与 IPC 契约保持原样。

## 2. 改造前事实

### 2.1 改造前信息架构

1. Home Modules 注册表中存在 `agent-module`，显示文案为 `Agent`：
   - `apps/moryflow/pc/src/renderer/workspace/navigation/modules-registry.ts`
2. 右侧主内容页 `AgentModulePage` 直接渲染 Telegram 配置：
   - `apps/moryflow/pc/src/renderer/workspace/components/agent-module/index.tsx`
3. Telegram 配置页已经是完整业务实现，包含：
   - bot token / proxy / DM access / pairing / developer settings
   - 文件：`apps/moryflow/pc/src/renderer/workspace/components/agent-module/telegram-section.tsx`

### 2.2 改造前运行边界

1. Telegram 主进程装配层职责清晰，已稳定收口为：
   - settings
   - runtime orchestration
   - pairing admin
   - 文件：`apps/moryflow/pc/src/main/channels/telegram/service.ts`
2. Telegram IPC 契约已围绕 Telegram 单渠道沉淀：
   - settings snapshot / update input / runtime status / pairing / proxy
   - 文件：`apps/moryflow/pc/src/shared/ipc/telegram.ts`
3. 官方事实源已明确当前页本质是 Telegram 配置入口，而非泛 agent 控制台：
   - `docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md`

## 3. 要解决的根因

当前问题不是“Telegram 配置不好用”，而是“模块语义错位”：

1. 用户看到 `Agent`，但页面内容其实是 `Telegram channel configuration`。
2. 代码中的 `agent-module` 实际代表远程入口配置，而不是 agent 本体。
3. 如果继续沿用 `Agent = Telegram` 语义，后续一旦引入更多远程入口，导航、页面命名与文档都会持续失真。

因此，本轮改造的根因治理方向应当是：

1. 把模块层语义从 `Agent` 收敛到 `Remote Agents`。
2. 把 Telegram 放回“远程入口”的正确层级。
3. 暂不把不存在的多渠道模型硬抽到 main/ipc 层。

## 4. 方案对比

### 方案 A：只改用户文案，不改结构

做法：

1. 左侧模块文案从 `Agent` 改为 `Remote Agents`。
2. 页面标题和描述同步改文案。
3. 组件目录、路由 key、页面命名维持现状。

优点：

1. 变更最小。

缺点：

1. 内部代码语义继续失真。
2. `agent-module` 仍然不是 agent，问题只被遮盖，没有解决。

### 方案 B（推荐）：Renderer 语义重构 + Telegram 业务实现原地复用

做法：

1. 将模块 destination、主页面、组件目录统一重命名为 `remote-agents`。
2. 新增 `RemoteAgentsPage` 壳层，负责标题、描述和远程入口布局。
3. Telegram 配置继续作为唯一业务实现挂载在 `Remote Agents` 页面中。
4. Main / IPC 继续保持 Telegram 专属命名与契约。

优点：

1. 根因解决，语义收敛完整。
2. 改动集中在 Renderer，运行风险低。
3. 后续真要支持其他远程入口时，导航与页面壳层已经正确。

代价：

1. 需要一次性迁移 Renderer 的命名、路由状态与测试。

### 方案 C：顺手把 main/ipc 一并抽成多渠道统一层

做法：

1. 在 Renderer 改成 `Remote Agents` 的同时，将 Telegram 的 IPC、service、store 一并抽象成“通用 remote agents”。

优点：

1. 长远看似更统一。

缺点：

1. 当前只有 Telegram，一个真实实例都不足以验证通用抽象。
2. 会引入大量空接口与伪通用层，明显过度设计。
3. 与“只做当前问题的根因治理”相冲突。

## 5. 推荐方案设计

推荐采用方案 B。

### 5.1 导航与命名

1. 用户可见模块名称从 `Agent` 改为 `Remote Agents`。
2. Renderer 内部 destination 从 `agent-module` 重构为 `remote-agents`。
3. 主视图状态、keep-alive key、页面组件名同步改为 `remote-agents`。
4. `agent` 这一 destination 继续保留给现有聊天/编辑工作区，不与 `remote-agents` 混用。

命名原则：

1. 页面壳层使用 `RemoteAgents*` 命名。
2. Telegram 业务实现继续使用 `Telegram*` 命名。
3. 不使用 `RemoteAgentTelegramService` 这类双重抽象命名。

### 5.2 页面信息架构

`Remote Agents` 页面采用“轻量壳层 + 单入口 section”结构，而不是 tab。

原因：

1. 当前只有一个入口 `Telegram`，tab 没有信息价值。
2. 使用 section/card 更符合“这是一个远程入口列表”的语义。
3. 后续如果新增第二个远程入口，再升级为列表 + 分组也不会推翻本轮结构。

页面结构：

1. 页面标题：`Remote Agents`
2. 页面副标题：`Manage remote entry points for your workspace.`
3. 页面主体：
   - `Telegram` section header
   - Telegram 配置正文

### 5.3 组件边界

建议重构为如下层次：

1. `workspace/components/remote-agents/index.tsx`
   - 页面壳层
   - 负责整体布局、标题、副标题
2. `workspace/components/remote-agents/remote-agent-section.tsx`
   - 通用 section 容器
   - 当前只服务 Telegram，但组件职责是布局容器，不承载协议语义
3. `workspace/components/remote-agents/telegram-section.tsx`
   - Telegram 唯一业务实现
   - 沿用现有表单、状态订阅、pairing、proxy test、developer settings 逻辑
4. `workspace/components/remote-agents/telegram-*`
   - 子组件原样迁移并按目录归属收口

约束：

1. Telegram 业务逻辑只保留一套。
2. 不复制 `telegram-section.tsx`。
3. 不新增“仅为未来渠道预留”的空组件。

### 5.4 Main / IPC 保持不变

本轮不改以下边界：

1. `apps/moryflow/pc/src/main/channels/telegram/*`
2. `apps/moryflow/pc/src/shared/ipc/telegram.ts`
3. `window.desktopAPI.telegram.*`

原因：

1. 当前需求是模块语义纠偏，不是渠道协议统一。
2. Telegram service 与 IPC 已经是稳定单一事实源。
3. 在没有第二个远程入口实现前，抽主进程通用层没有收益。

### 5.5 文档口径

文档需要同步收敛以下事实：

1. Home Modules 中不再存在面向 Telegram 的 `Agent` 页面。
2. 当前 `Remote Agents` 模块只承载 Telegram 远程入口配置。
3. `Remote Agents` 不等于 custom agent，也不代表多渠道协议统一已经完成。

## 6. 本轮改造文件

### 6.1 Renderer 导航与主内容

1. `apps/moryflow/pc/src/renderer/workspace/navigation/state.ts`
2. `apps/moryflow/pc/src/renderer/workspace/navigation/modules-registry.ts`
3. `apps/moryflow/pc/src/renderer/workspace/navigation/layout-resolver.ts`
4. `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/modules-nav.tsx`
5. `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`

### 6.2 页面与组件目录

1. `apps/moryflow/pc/src/renderer/workspace/components/remote-agents/index.tsx`
2. `apps/moryflow/pc/src/renderer/workspace/components/remote-agents/remote-agent-section.tsx`
3. `apps/moryflow/pc/src/renderer/workspace/components/remote-agents/telegram-section.tsx`
4. `apps/moryflow/pc/src/renderer/workspace/components/remote-agents/telegram-header.tsx`
5. `apps/moryflow/pc/src/renderer/workspace/components/remote-agents/telegram-bot-token.tsx`
6. `apps/moryflow/pc/src/renderer/workspace/components/remote-agents/telegram-proxy.tsx`
7. `apps/moryflow/pc/src/renderer/workspace/components/remote-agents/telegram-dm-access.tsx`
8. `apps/moryflow/pc/src/renderer/workspace/components/remote-agents/telegram-developer-settings.tsx`
9. 相关目录测试文件

### 6.3 文档

1. `docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md`
2. 必要时更新 `docs/design/moryflow/features/index.md`
3. 本文档本身

## 7. 迁移步骤

### 7.1 第一步：语义收敛

1. 将模块注册表中的 label 改为 `Remote Agents`。
2. 将内部 destination、mainViewState、页面组件命名统一切换为 `remote-agents`。
3. 更新所有与 `agent-module` 相关的导航测试与渲染测试。

### 7.2 第二步：页面壳层抽离

1. 新建 `RemoteAgentsPage` 作为唯一入口页面。
2. 将现有 `AgentModulePage` 的标题与描述替换为 `Remote Agents` 语义。
3. 通过壳层把 Telegram 以 section/card 形式挂载进去。

### 7.3 第三步：Telegram 目录迁移

1. 将 `agent-module/telegram-*` 迁移到 `remote-agents/telegram-*`。
2. 保持逻辑原样，优先做 import/path/文案层面的重构。
3. 不在本轮同时变更表单模型、IPC 调用和 runtime 状态订阅。

### 7.4 第四步：文档回写

1. 更新 Telegram 接入架构文档中的 UI 入口描述。
2. 明确页面名称与定位已从 `Agent` 收敛为 `Remote Agents`。
3. 删除或替换任何“Agent 模块 = Telegram 页面”的旧口径。

## 7.5 具体实施步骤

按以下顺序执行，避免命名迁移与行为修改交叉污染：

1. 更新本文档与实施清单，冻结本轮范围与非目标。
2. 先修改导航与主内容分发相关测试，将断言从 `agent-module` / `Agent` 调整为 `remote-agents` / `Remote Agents`。
3. 运行受影响测试，确认因生产代码尚未迁移而出现预期失败。
4. 修改 `navigation/state.ts`、`layout-resolver.ts`、`modules-registry.ts`，完成 destination 与 mainViewState 的语义迁移。
5. 修改 Sidebar 与主内容分发组件，使模块导航与页面渲染切换到 `remote-agents`。
6. 将 `workspace/components/agent-module/` 迁移为 `workspace/components/remote-agents/`。
7. 将页面壳层重命名为 `RemoteAgentsPage`，补充一个轻量 section 容器，用于承载 Telegram 配置。
8. 保持 Telegram 业务逻辑不变，只修正目录归属、import 路径、页面标题与日志命名。
9. 更新所有与 `agent-module`、`AgentModulePage`、`Agent` 模块文案相关的 Renderer 测试。
10. 回写 Telegram 接入架构文档与相关 design 索引，收敛页面入口事实。
11. 运行 `@moryflow/pc` 的 `typecheck` 与 `test:unit`。
12. 运行仓库级必要全量校验，确认本轮改造没有跨模块回归。
13. 检查 diff 与文档一致性后，将变更加入暂存区。
14. 基于暂存后的最终代码做一次完整 code review，优先检查语义漂移、遗漏引用、测试缺口与文档失真。

## 8. 风险与规避

### 8.1 命名迁移遗漏

风险：

1. `agent-module` 涉及 destination、mainViewState、keep-alive key、测试断言，多点改名容易遗漏。

规避：

1. 先统一收敛状态机与 registry，再改页面组件与测试。
2. 用全文搜索确保 `agent-module` 在 Renderer 侧清理干净。

### 8.2 Telegram 逻辑漂移

风险：

1. 如果在迁移目录时顺手改业务逻辑，容易引入行为回归。

规避：

1. 本轮只允许做壳层抽象与命名重构。
2. Telegram 业务逻辑保持单一实现，禁止复制。

### 8.3 过度抽象

风险：

1. 因为名称变成 `Remote Agents`，开发中容易顺手引入并不存在的多渠道统一模型。

规避：

1. 明确本轮非目标：不新增通用 remote-agent domain model，不改 main/ipc。
2. 只有当第二个真实远程入口落地时，才评估主进程层抽象。

## 9. 非目标

1. 不实现 custom agent。
2. 不为 Slack / Email / Webhook 等其它远程入口预埋通用协议。
3. 不修改 Telegram 运行时协议、pairing 流程、preview/final 语义或 polling/webhook 行为。
4. 不改 PC 聊天工作区 `destination='agent'` 的既有语义。

## 10. 验收基线

### 10.1 UI 与交互

1. 左侧模块显示 `Remote Agents`，不再显示 `Agent`。
2. 点击后右侧进入 `Remote Agents` 页面。
3. 页面中可见 Telegram section，配置、Proxy、Pairing、Developer Settings 行为与改造前一致。

### 10.2 代码结构

1. Renderer 不再存在把 Telegram 配置页命名为 `AgentModulePage` 的语义漂移。
2. Telegram 业务实现仍然只有一套。
3. Main / IPC 不因本轮重构而出现伪通用层。

### 10.3 验证命令

1. `pnpm --filter @moryflow/pc typecheck`
2. `pnpm --filter @moryflow/pc test:unit`
3. 若触及文档同步或跨模块契约，再补充受影响范围的最小验证

## 11. 当前实现结果

### 11.1 Renderer 导航与主内容

1. `apps/moryflow/pc/src/renderer/workspace/navigation/state.ts` 已将模块 destination 收敛为 `remote-agents | skills | sites`。
2. `apps/moryflow/pc/src/renderer/workspace/navigation/modules-registry.ts` 已将原 `Agent` 模块替换为 `Remote Agents`，并统一 `destination`、`label` 与 `mainViewState`。
3. `apps/moryflow/pc/src/renderer/workspace/navigation/layout-resolver.ts` 与 `workspace-shell-main-content.tsx` 已将主内容分发切换到 `remote-agents`。
4. Sidebar、ChatPane parking 与 keep-alive 相关测试、路由状态与显示文案均已同步迁移。

### 11.2 页面与组件目录

1. Renderer 目录已从 `workspace/components/agent-module/` 迁移到 `workspace/components/remote-agents/`。
2. 页面壳层已重命名为 `RemoteAgentsPage`，并固定为：
   - 页面标题：`Remote Agents`
   - 页面副标题：`Manage remote entry points for your workspace.`
3. 新增 `remote-agent-section.tsx` 作为轻量 section 容器，当前只承载 Telegram。
4. Telegram 配置相关子组件、校验与行为测试已整体迁移到 `remote-agents/telegram-*`，逻辑与 IPC 调用保持不变。

### 11.3 文档回写

1. `docs/design/moryflow/core/pc-navigation-and-workspace-shell.md` 已将模块层级事实更新为 `Remote Agents / Skills / Sites`。
2. `docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 已将 Telegram 的 UI 入口描述更新为 `Remote Agents` 模块。
3. `docs/design/moryflow/features/moryflow-pc-telegram-home-agent-entry-plan.md` 已收敛旧的 `Agent` 入口表述，避免继续把 Telegram 配置页误记为 agent 本体。

## 12. 当前验证基线

1. 在 `apps/moryflow/pc` 下执行受影响导航与页面测试：
   - `pnpm exec vitest run src/renderer/workspace/navigation/state.test.ts src/renderer/workspace/navigation/layout-resolver.test.ts src/renderer/workspace/navigation/modules-registry.test.ts src/renderer/workspace/components/workspace-shell-main-content-model.test.ts src/renderer/workspace/components/sidebar/components/modules-nav.test.tsx src/renderer/workspace/components/sidebar/components/sidebar-layout-router-model.test.ts src/renderer/workspace/components/chat-pane-portal-model.test.ts src/renderer/workspace/hooks/use-navigation.test.tsx src/renderer/workspace/components/sidebar/components/sidebar-layout-router.scroll.test.tsx`
   - 基线结果：`31 passed`
2. 在 `apps/moryflow/pc` 下执行 Telegram 迁移相关测试：
   - `pnpm exec vitest run src/renderer/workspace/components/remote-agents/telegram-section.validation.test.ts src/renderer/workspace/components/remote-agents/telegram-section.behavior.test.tsx src/renderer/workspace/components/remote-agents/telegram-runtime-error-guidance.test.ts`
   - 基线结果：`23 passed`
3. 在 `apps/moryflow/pc` 下执行全量 unit tests：
   - `pnpm exec vitest run`
   - 基线结果：`628 passed`
4. 在 `apps/moryflow/pc` 下执行类型校验：
   - `pnpm typecheck`
   - 基线结果：通过；pretypecheck 构建与 `tsc -p tsconfig.node.json && tsc -p tsconfig.json --noEmit` 均成功结束。

## 13. 后续衔接

当未来确实新增第二个远程入口时，再单独评估是否需要：

1. 提升 `Remote Agents` 页面为多入口列表。
2. 抽象共享的远程入口 section / status summary / health card。
3. 在 Main / IPC 层引入真实可验证的多渠道抽象。

在此之前，本方案就是当前最小、正确、可维护的重构终态。
