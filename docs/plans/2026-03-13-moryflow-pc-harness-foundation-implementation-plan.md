# Moryflow PC Harness Foundation Implementation Plan

**Goal:** 为 `apps/moryflow/pc/tests` 建立统一的 Electron Playwright 测试底座，迁移现有 PC feature specs 到共享 foundation，并在其上新增 `Automations` feature harness。

**Architecture:** 保持 harness 分层不变：shared runtime harness 继续留在 `packages/agents-runtime`，shared conversation harness 继续留在 `packages/ui`，PC Electron harness 只负责产品壳层 smoke。通过 `tests/helpers/*` 抽象统一启动、workspace seed、日志采集和 fake server 生命周期，再让 `core-flow`、`chat-chips`、`agent-runtime-harness` 与新 `automations-harness` 共享同一底座。

**Tech Stack:** TypeScript, Playwright, Electron `_electron`, Node HTTP server, `fs/promises`

---

## Execution Status

- [x] Task 1: 抽取共享 PC harness foundation
- [x] Task 2: 迁移现有 PC Playwright specs 到共享底座
- [x] Task 3: 新增 `automations-harness.spec.ts`
- [x] Task 4: 回写 harness 基线文档与验证入口
- [x] Task 5: 运行最终验证

---

### Task 1: 抽取共享 PC harness foundation

**Files:**

- Create: `apps/moryflow/pc/tests/helpers/pc-harness.ts`
- Create: `apps/moryflow/pc/tests/helpers/workspace-seed.ts`
- Create: `apps/moryflow/pc/tests/helpers/log-capture.ts`
- Create: `apps/moryflow/pc/tests/helpers/fake-llm-server.ts`

**Step 1: 写失败测试或迁移用例约束**

- 先选一个现有 PC spec 作为迁移基线，确保以下能力可被 helper 提供：
  - 创建 `tempRoot` / `userDataRoot`
  - seed 默认 workspace
  - 启动 Electron
  - 设置语言
  - 获取 first window
  - 注册 stdout/stderr / page console / pageerror 日志
  - 可选挂 fake LLM server

**Step 2: 实现 foundation**

- `workspace-seed.ts`
  - 提供最小 `seedWorkspace({ rootDir, vaultName? })`
- `log-capture.ts`
  - 提供 attach / dump recent logs / dispose
- `fake-llm-server.ts`
  - 支持固定失败、延迟失败、请求计数
- `pc-harness.ts`
  - 提供统一 session factory，例如：
    - `createPCHarnessSession({ workspace, fakeLlm, envOverrides })`
  - 返回：
    - `electronApp`
    - `page`
    - `tempRoot`
    - `userDataRoot`
    - `workspace`
    - `logs`
    - `dispose()`

**Step 3: 最小验证**

Run:

- `pnpm --filter @moryflow/pc build`

Expected: helper 引入后 PC build 通过。

### Task 2: 迁移现有 PC Playwright specs 到共享底座

**Files:**

- Modify: `apps/moryflow/pc/tests/core-flow.spec.ts`
- Modify: `apps/moryflow/pc/tests/chat-chips.spec.ts`
- Modify: `apps/moryflow/pc/tests/agent-runtime-harness.spec.ts`

**Step 1: 迁移 `core-flow.spec.ts`**

- 改为使用 `pc-harness.ts` + `workspace-seed.ts`
- 删除重复的 `launchApp` / `mkdtemp` / `vault-store.json` 样板

**Step 2: 迁移 `chat-chips.spec.ts`**

- 改为复用 `pc-harness.ts`
- fake LLM server 改为走 `fake-llm-server.ts`
- 日志采集改为走 `log-capture.ts`

**Step 3: 迁移 `agent-runtime-harness.spec.ts`**

- 改为复用 `pc-harness.ts`
- fake LLM server 改为走 `fake-llm-server.ts`
- 保持现有断言语义不变

**Step 4: 迁移验证**

Run:

- `pnpm --filter @moryflow/pc exec playwright test tests/core-flow.spec.ts`
- `pnpm --filter @moryflow/pc exec playwright test tests/chat-chips.spec.ts`
- `pnpm --filter @moryflow/pc exec playwright test tests/agent-runtime-harness.spec.ts`

Expected: 迁移后旧 spec 语义不变、仍可通过。

### Task 3: 新增 `automations-harness.spec.ts`

**Files:**

- Create: `apps/moryflow/pc/tests/automations-harness.spec.ts`

**Step 1: 写 harness 场景**

- 固定只覆盖产品壳层 smoke：
  - 进入顶层 `Automations`
  - 打开 `New automation`
  - 默认不能在未确认 unattended execution 时提交
  - 选择 `Keep local only` 后创建最小 automation
  - 列表中可见新 automation
  - reload 后仍然存在
  - 从 chat header 点 `Automate` 可打开同一个 editor，并预填最近一条用户消息

**Step 2: 实现 spec**

- 复用 `pc-harness.ts`
- 不引入真实 Telegram / scheduler 时间推进
- 只验证当前产品壳层与本地持久化

**Step 3: 运行 feature harness**

Run:

- `pnpm --filter @moryflow/pc exec playwright test tests/automations-harness.spec.ts`

Expected: `Automations` 产品壳层 smoke 通过。

### Task 4: 回写 harness 基线文档与验证入口

**Files:**

- Modify: `docs/design/moryflow/core/harness-engineering-baseline.md`
- Modify: `docs/reference/testing-and-validation.md`
- Modify: `docs/design/moryflow/core/index.md`

**Step 1: 更新基线文档**

- 明确 PC Electron harness 已具备共享 foundation
- 明确 PC harness 以 feature-specific specs 扩展

**Step 2: 更新验证入口**

- `testing-and-validation.md` 中的 PC Electron Harness 不再只列单个 `agent-runtime-harness.spec.ts`
- 补充 `automations-harness.spec.ts` 作为 PC feature harness 之一

**Step 3: 最小文档验证**

Run:

- `pnpm harness:check`

Expected: 文档契约与生成产物检查通过。

### Task 5: 运行最终验证

**Files:**

- Review: 本计划涉及的全部新增与修改文件

**Step 1: 运行 PC build**

Run:

- `pnpm --filter @moryflow/pc build`

**Step 2: 运行 PC Playwright harness**

Run:

- `pnpm --filter @moryflow/pc exec playwright test tests/core-flow.spec.ts`
- `pnpm --filter @moryflow/pc exec playwright test tests/chat-chips.spec.ts`
- `pnpm --filter @moryflow/pc exec playwright test tests/agent-runtime-harness.spec.ts`
- `pnpm --filter @moryflow/pc exec playwright test tests/automations-harness.spec.ts`

**Step 3: 运行最小代码验证**

Run:

- `pnpm --filter @moryflow/pc typecheck`

**Step 4: 如环境阻塞则记录真实状态**

- 若 Electron build、Playwright 启动或本地依赖导致 harness 无法执行，记录具体阻塞点，不得宣称通过。
