# Moryflow Harness Engineering 升级执行计划

> **给 Claude：** 必需子技能：使用 `superpowers:executing-plans` 逐任务执行本计划。

**目标：** 建立 Moryflow 的 Harness 闭环，把仓库契约、运行时场景回放、对话界面场景、Trace 评审与文档园艺接到同一套执行链路里。

**架构：** 长期事实固定写入 [harness-engineering-baseline.md](/Users/lin/.codex/worktrees/1573/moryflow/docs/design/moryflow/core/harness-engineering-baseline.md)。本计划只负责分阶段落地，不重复维护长期事实。

**技术栈：** pnpm workspace、Turborepo、Vitest、Playwright、React 19、Electron、NestJS、`@openai/agents-core`。

---

## 一、执行前提

执行本计划时，必须先接受以下前提：

1. 不新建独立平台仓库或平行工具链。
2. 不把 `docs/plans/*` 当成长期事实源。
3. 不在 PC / Mobile 各写一套语义不同的 Harness。
4. 每个阶段都按最小必要验证执行，不默认升级到根级全量。

## 二、交付顺序

固定执行顺序：

1. 阶段一：仓库契约与可机读架构
2. 阶段二：运行时场景回放 Harness
3. 阶段三：对话界面 Harness
4. 阶段四：Trace 驱动评审闭环
5. 阶段五：文档园艺与熵控制

顺序原因：

1. 没有阶段一，就没有统一契约和 Agent 表面清单。
2. 没有阶段二，就没有共享运行时的标准场景。
3. 没有阶段三，就无法把运行时语义稳定投影到界面。
4. 没有阶段四，生产 Trace 仍然只是存档。
5. 阶段五必须最后做，否则会在事实尚未稳定时过早清理文档。

## 三、阶段完成后的文档回写清单

每个阶段完成后，除代码与测试外，还必须同步以下文档。未回写完成，不视为该阶段真正完成。

### 3.1 阶段一完成后

必须回写：

1. `docs/design/moryflow/core/harness-engineering-baseline.md`
2. `docs/reference/testing-and-validation.md`
3. `docs/design/moryflow/core/index.md`

回写重点：

1. 仓库契约检查已落地。
2. `agent-surface.json` 已成为当前事实。
3. `harness:check` 进入验证基线。

### 3.2 阶段二完成后

必须回写：

1. `docs/design/moryflow/core/harness-engineering-baseline.md`
2. `docs/design/moryflow/core/agent-runtime-control-plane-adr.md`
3. `docs/design/moryflow/core/chat-stream-runtime-refactor.md`

回写重点：

1. 运行时场景回放 Harness 已落地。
2. 标准场景与夹具边界已经冻结。
3. 共享层与平台层的回放职责已明确。

### 3.3 阶段三完成后

必须回写：

1. `docs/design/moryflow/core/harness-engineering-baseline.md`
2. `docs/design/moryflow/core/ui-conversation-and-streaming.md`

回写重点：

1. 对话界面 Harness 的覆盖范围。
2. shared UI 与端侧壳层的断言边界。
3. approval / collapse / viewport 的标准场景。

### 3.4 阶段四完成后

必须回写：

1. `docs/design/moryflow/core/harness-engineering-baseline.md`
2. `docs/design/moryflow/core/agent-runtime-control-plane-adr.md`

如新增独立长期事实，再补：

1. `docs/design/moryflow/core/index.md`

回写重点：

1. Trace 聚合维度。
2. 工程评审摘要结构。
3. 高频失败项如何回写到测试与策略。

### 3.5 阶段五完成后

必须回写：

1. `docs/design/moryflow/core/harness-engineering-baseline.md`
2. `docs/reference/collaboration-and-delivery.md`
3. `docs/CLAUDE.md`（仅当 docs 治理边界失真时）

回写重点：

1. `docs:garden` 的当前事实。
2. 计划文档园艺输出类型。
3. `docs/plans/*` 的长期治理方式。

## 四、阶段一：仓库契约与可机读架构

**当前状态**

已落地，当前冻结产物为：

1. `scripts/check-doc-contracts.mjs`
2. `scripts/generate-agent-surface.mjs`
3. `generated/harness/agent-surface.json`
4. 根脚本 `pnpm harness:check`

**目标**

把当前文档治理升级成可被脚本检查的仓库契约，并生成 Agent 可读的仓库表面清单。

**涉及文件**

- 新建：`scripts/check-doc-contracts.mjs`
- 新建：`scripts/check-doc-contracts.test.mjs`
- 新建：`scripts/generate-agent-surface.mjs`
- 新建：`generated/harness/agent-surface.json`
- 修改：`package.json`
- 修改：`docs/reference/testing-and-validation.md`
- 修改：`docs/design/moryflow/core/index.md`

**任务 1：实现文档契约检查脚本**

脚本至少校验：

1. `docs/plans/*` 是否声明稳定事实回写目标。
2. `CLAUDE.md` 中列出的关键入口文件是否存在。
3. `generated`、`.tanstack`、`routeTree.gen.*` 是否被手改。
4. 文件数不足的目录下是否错误新增 `CLAUDE.md` / `AGENTS.md`。

**任务 2：实现 Agent 表面清单生成脚本**

输出 `generated/harness/agent-surface.json`，至少包含：

1. 平台：PC / Mobile / Server / WWW。
2. 共享包：`agents-runtime`、`agents-tools`、`model-bank`、`ui`。
3. 运行时能力：工具、权限域、模式、Task、Trace、MCP。
4. 长期事实源入口。

**任务 3：把检查接入根脚本**

在根 `package.json` 新增：

```json
{
  "scripts": {
    "harness:check": "node scripts/check-doc-contracts.mjs && node scripts/generate-agent-surface.mjs"
  }
}
```

**验收标准**

1. 修改 `CLAUDE.md` 后删除被引用文件，`check-doc-contracts` 能报错。
2. 修改 generated 文件，`check-doc-contracts` 能报错。
3. `agent-surface.json` 可稳定生成，且字段结构固定。

**验证命令**

```bash
node scripts/check-doc-contracts.test.mjs
pnpm harness:check
```

## 五、阶段二：运行时场景回放 Harness

**当前状态**

已落地，当前冻结产物为：

1. `packages/agents-runtime/test/runtime-harness.spec.ts`
2. `packages/agents-runtime/test/harness-fixtures/*`
3. `apps/moryflow/mobile/lib/chat/__tests__/approval-store.spec.ts` 中的 `once/always` 桥接断言
4. PC 平台差异继续复用 `src/main/agent-runtime/permission-runtime.test.ts`

**目标**

把运行时关键状态机从点状单测升级为标准场景回放。

**涉及文件**

- 新建：`packages/agents-runtime/test/harness-fixtures/permission-ask.json`
- 新建：`packages/agents-runtime/test/harness-fixtures/compaction-threshold.json`
- 新建：`packages/agents-runtime/test/harness-fixtures/doom-loop.json`
- 新建：`packages/agents-runtime/test/harness-fixtures/tool-output-truncation.json`
- 新建：`packages/agents-runtime/test/runtime-harness.spec.ts`
- 修改：`packages/agents-runtime/package.json`
- 修改：`apps/moryflow/pc/src/main/agent-runtime/__tests__/prompt-resolution.test.ts`
- 修改：`apps/moryflow/mobile/lib/agent-runtime/__tests__/task-state-service.spec.ts`

**任务 1：定义场景夹具格式**

夹具最少包含：

1. `name`
2. `platform`
3. `mode`
4. `history`
5. `toolCall`
6. `expected.events`
7. `expected.taskState`
8. `expected.traceMarkers`

推荐格式示例：

```json
{
  "name": "permission ask then resume",
  "platform": "pc",
  "mode": "ask",
  "history": [{ "role": "user", "content": "读取 /external/docs/a.md" }],
  "toolCall": {
    "name": "read_file",
    "arguments": { "path": "/external/docs/a.md" }
  },
  "expected": {
    "events": ["tool_call_started", "permission_ask", "tool_call_resumed", "tool_call_completed"],
    "taskState": null,
    "traceMarkers": ["permission:ask", "permission:resume"]
  }
}
```

**任务 2：实现共享执行器**

`runtime-harness.spec.ts` 的执行器职责固定为：

1. 读取夹具。
2. 构造标准 `RunContext` 与平台能力快照。
3. 驱动共享运行时控制面。
4. 收集事件序列、状态快照、工具摘要、Trace 标记。
5. 对照夹具断言。

**任务 3：固定首批 4 个标准场景**

1. `permission ask -> approve once -> resume`
2. `context window near limit -> compaction`
3. `same tool repeated -> doom loop guard`
4. `large tool output -> truncate + externalize`

**任务 4：桥接平台差异**

共享 Harness 只定义统一语义。平台层只补差异：

1. PC：
   - `bash`
   - `subagent`
   - `MCP`
   - `full_access`
2. Mobile：
   - 无 `bash`
   - 无外部工具
   - 文件搜索工具仍在

禁止：

1. PC 和 Mobile 各自复制完整场景定义。
2. 同一场景在不同平台拥有不同语义名称。

**验收标准**

1. 同一夹具可在共享运行时层稳定执行。
2. PC / Mobile 只对平台差异做补充断言。
3. 共享层和平台层对同一场景的最终语义一致。

**验证命令**

```bash
pnpm --filter @moryflow/agents-runtime test
pnpm --filter @moryflow/pc test:unit -- src/main/agent-runtime
pnpm --filter @moryflow/mobile test:unit
```

## 六、阶段三：对话界面 Harness

**当前状态**

已落地，当前冻结产物为：

1. `packages/ui/test/conversation-harness.test.tsx`
2. `apps/moryflow/mobile/lib/chat/__tests__/conversation-harness.spec.ts`
3. `apps/moryflow/pc/tests/agent-runtime-harness.spec.ts`
4. PC 壳层继续复用 `conversation-section`、`tool-part`、`approval controller`、`task-hover-panel` 相关测试

**目标**

把运行时事件如何投影成消息流与交互语义，固定为可回放的界面场景。

**涉及文件**

- 新建：`packages/ui/test/conversation-harness.test.tsx`
- 新建：`apps/moryflow/pc/tests/agent-runtime-harness.spec.ts`
- 新建：`apps/moryflow/mobile/lib/chat/__tests__/conversation-harness.spec.ts`
- 修改：`packages/ui/test/message-list.test.tsx`
- 修改：`packages/ui/test/conversation-viewport.test.tsx`
- 修改：`apps/moryflow/pc/tests/core-flow.spec.ts`

**任务 1：定义标准界面场景**

固定以下场景：

1. Tool / Reasoning 运行中展开，完成后折叠。
2. assistant round 结束后只保留结论可见。
3. disclosure 交互不打断 viewport follow。
4. approval request 插入与恢复不破坏消息顺序。
5. task snapshot 只从 session summary 投影。

**任务 2：建立共享界面 Harness**

共享 Harness 只消费共享消息模型，输出统一断言：

1. 可见 part 顺序。
2. disclosure 状态。
3. round 折叠结果。
4. viewport 意图。

**任务 3：补端侧冒烟覆盖**

1. PC：
   - 用 Playwright 跑最小真实链路
   - 场景固定为“发送消息 -> tool 卡片 -> approval -> resume”
2. Mobile：
   - 继续以单测为主
   - 场景名与共享 Harness 完全一致

**验收标准**

1. 共享界面语义与 PC / Mobile 壳层不漂移。
2. 共享断言变化时，端侧场景能同步暴露问题。

**验证命令**

```bash
pnpm --filter @moryflow/ui test
pnpm --filter @moryflow/pc test:e2e -- agent-runtime-harness
pnpm --filter @moryflow/mobile test:unit
```

## 七、阶段四：Trace 驱动评审闭环

**当前状态**

已落地，当前冻结产物为：

1. `apps/moryflow/server/src/agent-trace/agent-trace-review.service.ts`
2. `apps/moryflow/server/src/agent-trace/agent-trace-review.service.spec.ts`
3. `scripts/review-agent-traces.mjs`
4. `apps/moryflow/pc/src/main/agent-runtime/server-tracing-processor.ts` 中的 metadata 标准化
5. 根脚本 `pnpm trace:review`

当前边界：

1. 服务端聚合直接消费现有 `metadata + spans`，未额外引入新表
2. 若上游 Trace metadata 未稳定写入 `approval / compaction / doomLoop` 标记，对应聚合会退化为部分可见

**目标**

把 `agent-trace` 从“可查询日志”升级为“可驱动工程迭代的评审输入”。

**涉及文件**

- 新建：`apps/moryflow/server/src/agent-trace/agent-trace-review.service.ts`
- 新建：`apps/moryflow/server/src/agent-trace/agent-trace-review.service.spec.ts`
- 新建：`scripts/review-agent-traces.mjs`
- 修改：`apps/moryflow/pc/src/main/agent-runtime/server-tracing-processor.ts`
- 修改：`apps/moryflow/server/src/agent-trace/agent-trace.module.ts`
- 修改：`apps/moryflow/server/src/agent-trace/agent-trace.service.ts`
- 修改：`docs/design/moryflow/core/agent-runtime-control-plane-adr.md`

**任务 1：补齐聚合元数据**

PC 侧 Trace 元数据最少补齐：

1. 平台
2. 运行时模式
3. 模型标识
4. 工具名
5. 工具状态
6. `compaction / permission / doom loop` 标记

**任务 2：实现评审服务**

服务端聚合输出至少包含：

1. 高频失败工具
2. 高频审批路径
3. `compaction` 触发率
4. `doom loop` 命中率
5. 长 Trace / 高 Token / 高频中断分布

**任务 3：实现评审命令**

`review-agent-traces.mjs` 输出必须是工程摘要，而不是原始 JSON 倾倒。固定结构建议：

1. 总体概览
2. 失败工具 Top N
3. 审批热点 Top N
4. 上下文膨胀与压缩概况
5. 建议回写项

**任务 4：固定回写流程**

1. 运行时改动上线前，先看回放 Harness。
2. 上线后每周至少产出一次 Trace 评审摘要。
3. 高频失败项必须回写到测试、Prompt 或权限策略。

**验收标准**

1. Trace 评审输出可直接用于工程评审。
2. 高频失败项可稳定聚合，不依赖人工翻日志。

**验证命令**

```bash
pnpm --filter @moryflow/server test -- src/agent-trace/agent-trace-review.service.spec.ts
node scripts/review-agent-traces.mjs
```

## 八、阶段五：文档园艺与熵控制

**当前状态**

已落地，当前冻结产物为：

1. `scripts/check-plan-drift.mjs`
2. `scripts/check-plan-drift.test.mjs`
3. 根脚本 `pnpm docs:garden`
4. 已删除 `docs/plans/2026-03-09-moryflow-download-surfaces-audit.md` 并清理长期文档悬空引用

**目标**

控制 `docs/plans/*` 熵增，避免执行期文档长期承担稳定事实。

**涉及文件**

- 新建：`scripts/check-plan-drift.mjs`
- 新建：`scripts/check-plan-drift.test.mjs`
- 修改：`docs/CLAUDE.md`
- 修改：`package.json`

**任务 1：识别陈旧计划文档**

`check-plan-drift.mjs` 至少识别：

1. 已有稳定事实源，但计划文档仍长期保留独占事实。
2. 计划文档引用的文件已不存在。
3. 计划文档中的“当前状态”与核心文档冲突。

**任务 2：固定输出类型**

脚本输出只允许：

1. `keep`
2. `rewrite-to-design`
3. `delete`

**任务 3：接入轻量脚本**

在根 `package.json` 新增：

```json
{
  "scripts": {
    "docs:garden": "node scripts/check-plan-drift.mjs"
  }
}
```

**验收标准**

1. 脚本能识别陈旧 `docs/plans/*`。
2. 不误伤仍在执行中的计划文档。

**验证命令**

```bash
node scripts/check-plan-drift.test.mjs
pnpm docs:garden
```

## 九、完成标准

本计划完成后，必须同时满足以下 5 条：

1. Agent 相关改动具备 `harness:check` 门禁。
2. 共享运行时具备标准场景回放能力。
3. 对话界面具备共享场景 Harness 和端侧冒烟覆盖。
4. Trace 可以稳定产出工程评审摘要。
5. `docs/plans/*` 具备漂移检测与园艺输出。

当需要明确进入“可提 PR”状态时，在以上 5 条都满足后，还要额外补齐：

1. `pnpm lint`
2. `pnpm typecheck`

## 十、执行建议

建议按三周切分：

1. 第 1 周：阶段一 + 阶段二
2. 第 2 周：阶段三 + 阶段四
3. 第 3 周：阶段五 + 文档回写清理

如果只能先做一件事，优先做阶段一。  
如果只能先做一个最直接降低风险的点，优先做阶段二。
