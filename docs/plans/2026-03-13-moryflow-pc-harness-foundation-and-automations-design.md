# Moryflow PC Harness Foundation 与 Automations Feature Harness 冻结设计

## 目标

本次先收敛 `apps/moryflow/pc/tests` 的 Electron Playwright 测试底座，再在统一底座上补 `Automations` 的 feature harness。

冻结目标：

1. PC Electron harness 保持 feature-specific spec 组织，不引入第二套通用测试系统。
2. 现有重复的启动、seed、日志采集、fake server 生命周期抽成共享 helper。
3. `Automations` 新增独立 feature harness，但只验证产品壳层 smoke，不替代 unit / integration 测试。
4. 现有 PC specs 迁移到共享底座，避免继续复制样板。

## 冻结结论

### 1. Harness 分层不变

当前分层继续保持：

1. shared runtime harness 仍在 `packages/agents-runtime/test/runtime-harness.spec.ts`
2. shared conversation harness 仍在 `packages/ui/test/conversation-harness.test.tsx`
3. PC Electron harness 仍在 `apps/moryflow/pc/tests/*.spec.ts`

`Automations` 不进入 shared runtime harness，也不进入 shared conversation harness。

### 2. 先做 foundation，再补 feature harness

`Automations` 不能直接复制现有 Playwright spec 新增第四份启动样板。  
本次固定顺序是：

1. 先抽共享 foundation
2. 迁移现有 PC specs
3. 再新增 `automations-harness.spec.ts`

### 3. PC harness 继续按 feature-specific spec 拆分

冻结规则：

1. 一个 spec 文件只负责一个稳定产品语义
2. spec 共享底座，但不共享大段 `beforeAll/afterAll` 样板
3. 不把多个 feature 合并成一个超大 spec

目标形态：

- `core-flow.spec.ts`
- `chat-chips.spec.ts`
- `agent-runtime-harness.spec.ts`
- `automations-harness.spec.ts`

## Foundation 架构

建议新增：

- [apps/moryflow/pc/tests/helpers/pc-harness.ts](/Users/lin/.codex/worktrees/d000/moryflow/apps/moryflow/pc/tests/helpers/pc-harness.ts)
- [apps/moryflow/pc/tests/helpers/workspace-seed.ts](/Users/lin/.codex/worktrees/d000/moryflow/apps/moryflow/pc/tests/helpers/workspace-seed.ts)
- [apps/moryflow/pc/tests/helpers/log-capture.ts](/Users/lin/.codex/worktrees/d000/moryflow/apps/moryflow/pc/tests/helpers/log-capture.ts)
- [apps/moryflow/pc/tests/helpers/fake-llm-server.ts](/Users/lin/.codex/worktrees/d000/moryflow/apps/moryflow/pc/tests/helpers/fake-llm-server.ts)

### `pc-harness.ts`

职责：

1. 统一解析 `mainEntry` / `rendererEntry`
2. 统一启动 Electron app
3. 统一创建临时 `tempRoot` / `userDataRoot`
4. 统一语言初始化、首窗 ready、退出清理
5. 组合 `workspace-seed`、`log-capture`、可选 fake services

### `workspace-seed.ts`

职责：

1. 写 `vault-store.json`
2. 创建默认 vault 目录
3. 提供最小 workspace seed API

它只负责 workspace 初始状态，不负责 feature 数据。

### `log-capture.ts`

职责：

1. 收集 Electron stdout / stderr
2. 收集 `page.console` / `pageerror`
3. 测试失败时输出最近日志窗口

### `fake-llm-server.ts`

职责：

1. 统一 fake LLM server 生命周期
2. 支持固定失败、延迟失败、请求计数

它是现有 `agent-runtime-harness` / `chat-chips` 的共享底座，不为 `Automations` 特调。

## Automations Harness 范围

新增：

- [apps/moryflow/pc/tests/automations-harness.spec.ts](/Users/lin/.codex/worktrees/d000/moryflow/apps/moryflow/pc/tests/automations-harness.spec.ts)

首期只覆盖产品壳层 smoke：

1. 启动后可以进入顶层 `Automations` 模块
2. 点击 `New automation` 可以打开 editor
3. 创建态默认不能直接提交，必须显式勾选 `Confirm unattended execution`
4. 通过 `Keep local only` 创建最小 automation
5. 创建后 automation 会出现在列表
6. reload 后 automation 仍然存在
7. 从 chat header 点击 `Automate` 时，会打开同一个 editor，并预填最近一条用户消息

## 明确不放进 Automations Harness 的内容

以下内容继续留在 unit / integration：

1. scheduler 时间推进与 missed run 计算
2. `deny_on_ask` / runtime policy override
3. canonical `peerKey/threadKey`
4. endpoint verification
5. delivery 写回 `replySessionId`
6. Telegram inbound reply routing

理由：

1. 这些已有更稳定的测试层覆盖
2. 放进 Playwright 会显著提高脆弱性和调试成本
3. 这不符合 PC Electron harness 的职责边界

## 迁移范围

foundation 落地后，至少迁移：

1. [core-flow.spec.ts](/Users/lin/.codex/worktrees/d000/moryflow/apps/moryflow/pc/tests/core-flow.spec.ts)
2. [chat-chips.spec.ts](/Users/lin/.codex/worktrees/d000/moryflow/apps/moryflow/pc/tests/chat-chips.spec.ts)
3. [agent-runtime-harness.spec.ts](/Users/lin/.codex/worktrees/d000/moryflow/apps/moryflow/pc/tests/agent-runtime-harness.spec.ts)

这样可以证明共享底座是仓库级改进，而不是只为 `Automations` 单点服务。

## 文档同步要求

实现完成后，需要同步更新：

- [harness-engineering-baseline.md](/Users/lin/.codex/worktrees/d000/moryflow/docs/design/moryflow/core/harness-engineering-baseline.md)
- [testing-and-validation.md](/Users/lin/.codex/worktrees/d000/moryflow/docs/reference/testing-and-validation.md)

更新方向：

1. PC Electron harness 不再只指向单个 `agent-runtime-harness.spec.ts`
2. 明确 PC harness 已具备共享 foundation
3. 明确 feature harness 以独立 spec 形式扩展

## 验证基线

foundation 重构后，最小验证基线固定为：

1. `pnpm --filter @moryflow/pc build`
2. `pnpm --filter @moryflow/pc exec playwright test tests/core-flow.spec.ts`
3. `pnpm --filter @moryflow/pc exec playwright test tests/chat-chips.spec.ts`
4. `pnpm --filter @moryflow/pc exec playwright test tests/agent-runtime-harness.spec.ts`
5. `pnpm --filter @moryflow/pc exec playwright test tests/automations-harness.spec.ts`

## 实施入口

对应 implementation plan：

- [2026-03-13-moryflow-pc-harness-foundation-implementation-plan.md](/Users/lin/.codex/worktrees/d000/moryflow/docs/plans/2026-03-13-moryflow-pc-harness-foundation-implementation-plan.md)

当前这份设计文档只保留冻结方案；执行步骤、文件拆分与验证顺序统一以 implementation plan 为准。
