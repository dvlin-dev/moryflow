---
title: ADR-0002：Agent Runtime 控制面（Compaction/Permission/Truncation）
date: 2026-01-24
scope: agents-runtime, agents-tools, moryflow/pc, moryflow/mobile
status: active
---

<!--
[INPUT]: Agent Runtime 长对话溢出风险、工具执行风险、长输出污染上下文问题
[OUTPUT]: 对 Compaction / Permission / Truncation 的统一决策与边界
[POS]: Agent Runtime 控制面最终决策与落地路径（合并 OpenCode 对标分析）

[PROTOCOL]: 本文件变更需同步更新 `docs/CLAUDE.md` 与 `docs/architecture/CLAUDE.md`（若影响索引，同步 `docs/index.md`）。
-->

# ADR-0002：Agent Runtime 控制面（Compaction/Permission/Truncation）

## 背景

当前 Anyhunt/Moryflow 的 Agent Runtime 依赖 `@openai/agents-core`，但存在三个系统性风险：

1. **上下文无限增长**：长对话与工具输出积累导致模型上下文溢出。
2. **工具执行风险**：除 bash 外缺乏统一权限控制，read/edit/web 等能力缺乏审批边界。
3. **输出污染上下文**：工具返回的长文本直接进入上下文，导致后续推理成本飙升。

OpenCode 已在运行时层建立 **Compaction / Permission / Truncation** 控制面，验证过可行性，因此本 ADR 选择对齐并落地。

## 决策

在 Anyhunt/Moryflow 的 Agent Runtime 中引入统一控制面，包含：

- **Compaction**：上下文压缩（含工具输出修剪 + 摘要重写）。
- **Permission**：工具级权限（allow/deny/ask）。
- **Truncation**：工具输出统一截断与落地存储。

首期落地范围：**Moryflow PC + Mobile Runtime**，并抽象为可复用模块（`packages/agents-runtime` / `packages/agents-tools`）。策略默认值与执行边界见下文「策略细则（执行基线）」。

## 范围与实施原则

- 本 ADR 仅覆盖控制面能力：Compaction / Permission / Truncation / Doom Loop / 审批与审计 / 模式切换 / 配置与外部化。
- 首期落地覆盖 **Moryflow PC + Mobile Runtime**（其它端不在本轮范围）。
- 实施约束：不做历史兼容；无用代码直接删除；保持模块化与单一职责。
- Tool 外部化仅在 **桌面端** 启用；移动端保持禁用。

## 实施顺序（PC + Mobile 同步）

1. **Truncation**：统一输出后处理与落地存储。
   - PC：优先写入 `Vault/.agent-output/`，失败降级到应用数据目录；提供“查看完整输出”并调用系统打开文件。
   - Mobile：落地到应用数据目录；提供应用内预览入口（不依赖系统打开文件）。
2. **Permission**：统一权限评估 + once/always 审批 + 用户级规则持久化。
3. **Compaction**：阈值触发 + 历史裁剪 + 摘要重写。
4. **Doom Loop**：重复工具检测 + ask 审批 + 冷却/中止策略。
5. **模式切换**：`Agent` / `Agent-完全访问权限` 会话级切换与审计记录。
6. **外部化 & Hook**：
   - 配置/Agent 外部化：PC + Mobile 均支持用户级配置与 Agent Markdown。
   - Tool 外部化：仅桌面端启用；移动端保持禁用。

## 关键能力说明

### 1) Compaction

- 触发条件：历史近似 token/字节体积接近模型 context window。
- 修剪策略：优先清理旧 tool output，保护最近 N 轮对话。
- 摘要重写：使用 compaction agent 生成摘要，写回历史。
- 可观测性：记录压缩前/后体积与丢弃的工具类型。

### 2) Permission

- 权限域：`read / edit / bash / web_fetch / web_search / mcp`。
- 评估模型：`permission + pattern` → `allow/deny/ask`。
- ask 机制：UI/IPC 审批（once/always），中止通过全局 Stop/Cancel。
- 与沙盒协作：bash 仍走沙盒，但触发统一权限入口。

### 3) Truncation

- 所有工具输出进入统一后处理层。
- 超限输出写入 Vault 或临时目录，返回预览 + 路径。
- UI 标识“输出已截断”。

## 对标摘要（OpenCode）

### 能力对比

| 能力         | OpenCode                                | Anyhunt/Moryflow 现状       | 差距/建议                                                |
| ------------ | --------------------------------------- | --------------------------- | -------------------------------------------------------- |
| 配置分层     | 远端/全局/项目/内联 + `.opencode/` 扫描 | 主要由 App 侧 Settings 注入 | **建议**：引入用户级扩展目录 + 内联覆盖                  |
| 权限系统     | 规则集 + ask/allow/deny + UI 审批       | 沙盒路径授权（仅 shell）    | **建议**：扩展为通用 Tool 权限层（read/edit/bash/web）   |
| 会话压缩     | Token-aware + compaction agent          | 无                          | **建议**：引入 history 修剪 + 摘要重写                   |
| Doom Loop    | 工具重复检测 + ask 审批                 | 仅 maxTurns                 | **建议**：增加重复工具检测 + 保护阈值                    |
| Hook 扩展点  | 多 Hook + Tool SDK                      | 无                          | **建议**：提供 runtime hook 接口（params/messages/tool） |
| 工具输出截断 | 统一截断 + 外置存储                     | 仅 read/preview 局部截断    | **建议**：统一 tool 输出截断 + 文件落地                  |
| 工具发现     | 内置 + 插件 + 本地扫描                  | 固定工具集                  | **建议**：允许用户级 tool/agent 定义                     |

### 落地路径（优先级）

> 已确认：本轮 **P0/P1/P2 全部落地**；Vault 外 `read` 默认 **ask**；审批 UI 已具备；工具输出截断需提供“查看完整输出”入口。
> 补充：**审批只在“有风险操作”触发**；输入框左侧增加模式切换（`Agent` / `Agent-完全访问权限`）。
> 补充：审批按钮仅保留 `once / always`；规则仅**用户级**持久化（无项目级）；配置层仅**用户级 + 内联**。

- **P0（安全与可控）**：Truncation、Permission。
- **P1（体验增强）**：Compaction、Doom Loop、模式切换、系统提示词/参数设置。
- **P2（可扩展性）**：Config/Agent/Tool 外部化、Hook。

## 落地任务清单与验收点

> 说明：以下清单用于把 P0/P1/P2 变为可执行任务。每项包含验收标准，便于确认落地结果。

### P0-1 统一工具输出截断（Truncation）

**任务**

1. 为所有工具增加统一输出后处理层（按行数/字节截断）。
2. 超限输出落地到 Vault 或应用数据目录，返回「截断预览 + 文件路径 + 下一步建议」。
3. UI 明确标识“已截断”，并在聊天消息内提供“查看完整输出”入口（PC 打开文件；Mobile 应用内预览）。
4. 增加 TTL 清理机制（默认 7 天）。

**验收**

- 大输出不会进入上下文，模型仍可继续对话。
- PC 可直接打开完整输出；Mobile 可在聊天内弹层查看。
- UI 清晰标识“已截断”，并提供可追踪路径。

**进度**

- 2026-01-25：已完成 Moryflow PC + Mobile 落地（统一后处理截断、Vault/应用目录落盘、聊天内“查看完整输出”、TTL 清理）。

### P0-2 工具权限系统扩展（Permission）

**任务**

1. 定义统一权限域（read/edit/bash/web_fetch/web_search/mcp）。
2. 执行前评估 `permission + pattern` → action（allow/deny/ask）。
3. 接入 `@openai/agents-core` 中断/恢复流程，UI 仅提供 `once/always`。
4. `always` 规则写入用户级存储；bash 仍走沙盒授权但统一由权限入口触发。
5. 落地审计日志（JSON Lines）。

**验收**

- Vault 外 read 默认 `ask`；edit/write/move/delete Vault 外默认 `deny`。
- `always` 规则用户级生效；会话内可复用。
- 审批走中断/恢复，流程可追踪且不会卡死会话。

**进度**

- 2026-01-26：确认审批 UI 放在工具卡内（once/always），权限规则直接写入用户级 JSONC（不做运行时存储过渡），Mobile 审计路径为 `Paths.document/agent-audit`。
- 2026-01-26：完成 PC + Mobile 权限落地（RunState 中断/恢复、tool-approval-request、审批卡与 JSONC 规则持久化、审计记录）。

### P1-3 会话压缩（Compaction）

**任务**

1. 在 `run()` 前计算历史上下文近似体积并判断阈值。
2. 优先修剪旧工具输出，保护最近 N 轮对话。
3. 触发摘要模式时，调用 compaction agent 生成摘要并重写历史。
4. 记录压缩前/后体积与丢弃工具类型统计。

**验收**

- 长对话接近阈值时触发压缩，避免上下文溢出。
- 重写历史后可继续对话，摘要可被 UI/日志验证。

**进度**

- 2026-01-26：完成 PC + Mobile Compaction 落地（阈值判断、旧工具输出裁剪、摘要重写与统计记录）。

### P1-4 Doom Loop 检测

**任务**

1. 追踪单次 run 的工具调用序列、总次数、连续重复次数。
2. 命中阈值时触发 `doom_loop` 审批（only once/always）。
3. 用户选择继续时重置计数并进入冷却窗口；选择停止时终止 run。

**进度**

- 2026-01-27：完成 PC + Mobile Doom Loop 落地（重复检测、审批接入、冷却与会话级 always）。

**验收**

- 连续相同 tool + 相同 args 能被检测并中断/继续。
- 终止时返回可读错误，且不会破坏会话历史。

### P1-5 模式切换（Agent / Agent-完全访问权限）

**任务**

1. 输入框工具栏增加模式切换入口（会话级）。
2. 切换到全权限时弹一次性确认，并记录审计。
3. 全权限模式下自动批准高风险操作（仍记录审计事件）。

**验收**

- 模式切换仅影响当前会话，且有明确提示。
- 全权限模式无审批卡片，但审计可追踪。

**进度**

- 2026-01-28：完成 PC + Mobile 模式切换落地（会话级模式存储、全权限确认、审计记录与自动批准）。

### P1-6 系统提示词与参数设置（桌面端 UI）

**任务**

1. 设置弹窗新增「System Prompt」Tab（默认/自定义模式）。
2. 自定义模式下提供默认模板并允许编辑；默认模式隐藏参数。
3. 参数仅暴露 `temperature / topP / maxTokens`，支持单独覆盖。

**验收**

- 默认模式不向用户暴露参数，运行时仍可正常工作。
- 自定义模式下可修改并生效；恢复默认不会污染其他设置。

### P2-7 Config/Agent/Tool 外部化

**任务**

1. 设计用户级 JSONC 配置加载顺序（用户级 → 内联覆盖）。
2. 支持 Agent Markdown（frontmatter + prompt body）。
3. 支持用户级 tool 动态加载（仅桌面端）并接入权限/截断。

**验收**

- 同名配置可被覆盖，加载顺序清晰可验证。
- 用户级 agent 文件可识别并用于运行。
- Tool 动态加载仅在 desktop 环境生效。

**进度**

- 2026-01-29：完成 PC + Mobile 用户级 JSONC 配置读取与 Agent Markdown 支持；桌面端按开关加载外部 tools。

**示例**

**1) 用户级 JSONC（配置 + Hook）**

> 路径：PC `~/.moryflow/config.jsonc`；Mobile `Paths.document/.moryflow/config.jsonc`  
> 说明：`tools.external` 仅 PC 生效，Mobile 忽略。

```jsonc
{
  // 用户级配置
  "agents": {
    "runtime": {
      "mode": { "default": "agent" },
      "agent": { "id": "writer" },
      "tools": { "external": { "enabled": true } },
      "hooks": {
        "chat": {
          "system": { "mode": "append", "text": "You must reply in short bullet points." },
          "params": { "temperature": 0.2, "maxTokens": 512 },
        },
        "tool": {
          "before": [{ "tool": "read", "mergeInput": { "encoding": "utf-8" } }],
          "after": [{ "tool": "read", "prependText": "[preview]\\n" }],
        },
      },
    },
  },
}
```

**2) Agent Markdown**

> 路径：PC `~/.moryflow/agents/*.md`；Mobile `Paths.document/.moryflow/agents/*.md`

```markdown
---
{
  'id': 'writer',
  'name': 'Writer',
  'description': 'Short, factual answers.',
  'modelSettings': { 'temperature': 0.2, 'maxTokens': 512 },
}
---

You are a concise writing assistant. Always respond with short bullet points.
```

**3) 外部工具模块（仅 PC）**

> 路径：`~/.moryflow/tools/*.ts|*.js`  
> 说明：支持 `default` / `createTools` / `tools` 导出。

```ts
import { tool } from '@openai/agents-core';
import { z } from 'zod';

export const createTools = () => [
  tool({
    name: 'hello',
    description: 'Say hello to a name.',
    parameters: z.object({ name: z.string() }),
    async execute({ name }) {
      return `Hello ${name}`;
    },
  }),
];
```

### P2-8 Plugin Hook 接口

**任务**

1. 定义最小 Hook 集合：`chat.params`、`chat.system`、`tool.before`、`tool.after`。
2. 约定执行顺序（内置 → 用户）并 fail-safe。
3. 提供示例 Hook（改温度、追加系统提示、格式化输出）。

**验收**

- Hook 能改变模型参数或 system prompt。
- Hook 失败不会中断主流程。
- 输出可被 Hook 后处理并正确返回。

**进度**

- 2026-01-29：完成 `chat.params`/`chat.system`/`tool.before`/`tool.after` hook，顺序内置→用户，失败不阻断。

## 策略细则（执行基线）

> 本节用于锁定默认策略与阈值，后续实现按此执行；若需调整，走 ADR 更新。

### A. Compaction 策略

- **触发阈值**：
  - 若可拿到模型 context window：当「历史近似 token > 0.8 × usable」触发。
  - `usable = contextWindow - outputBudget`，默认 `outputBudget = min(4096, contextWindow × 0.2)`。
  - 无法拿到 context window 时，按 **120k 字符**阈值触发（可配置）。
- **上下文窗口来源**：
  - 优先使用用户配置的 `customContext`（模型自定义上下文）。
  - 会员模型不读取自定义上下文，仅使用模型注册表限制。
- **近似 token 估算**：默认按 `字符数 / 4` 估算；可替换为真实 tokenizer。
- **保护策略**：
  - 保护最近 **3 轮 user/assistant**。
  - 优先清理旧的 **tool output**，保留 tool input/结果摘要。
- 受保护的工具输出（默认）：`task`、`tasks_*`、`write`、`edit`、`move`、`delete`。
- **摘要重写**：
  - 使用 compaction agent 生成摘要，要求包含：已完成事项、当前进度、涉及文件、下一步。
  - 摘要输入优先使用未裁剪历史，按 prompt 上限截断；若超限或为空则降级使用已裁剪历史。
  - 历史重写为 `[summaryItem, ...recentTurns]`。
  - summaryItem 使用 system 消息落地，前缀固定为 `【会话摘要】`，内容语言与对话一致。
- **失败兜底**：摘要失败时仅执行 pruning，不阻断本次 run。
- **可观测性**：记录压缩前/后体积、摘要长度、被丢弃工具类型统计。
- **发送前预处理**：
  - PC/Mobile 在发送前执行 compaction，并同步 UI 消息列表。
  - 本回合 runtime 识别已预处理状态，避免重复压缩导致 UI/历史错位。

**示例（理解“裁剪旧工具输出”）**

假设一段对话如下（简化）：

1. 用户：请统计本仓库待办列表并汇总。
2. Agent 调用 `grep` → 输出 2 万行（已截断，完整输出落盘到 `Vault/.agent-output/2026-01-26-todo.jsonl`）。
3. Agent 基于结果生成汇总并给出结论。
4. 又经过多轮工具调用（read/ls/search_in_file）持续堆积输出，历史体积触发阈值。

触发 compaction 后的处理：

- **旧的 tool output items 会从上下文中移除**（只影响下一次 `run()` 的输入，不删除落盘文件）。
- **tool input 与结果摘要会保留**，并生成一条系统摘要写入历史：
  - `【会话摘要】已完成：扫描待办并分类；当前进度：已标注高优先级 12 项；涉及文件：docs/index.md、apps/...；下一步：逐条确认待办归属并分配负责人。`
- 最近 3 轮 user/assistant 对话完整保留，保证上下文连续。
- 若要回溯完整输出，仍可通过 `Vault/.agent-output/2026-01-26-todo.jsonl` 查看（UI 也保留“查看完整输出”入口）。

结论：**裁剪的是“上下文负载”，不是“历史文件”**；核心信息通过摘要与保护策略保留，完整输出仍可追溯。

### B. Doom Loop 策略

- **阈值**：
  - `maxAttempts = 3`（单次 run 内的重试循环）
  - `maxToolCalls = 60`（单次 run 工具调用上限）
  - `sameToolThreshold = 5`（相同 tool + 相同 args 连续次数）
  - `maxSignatureBytes = 8KB`（参数哈希上限；超限仅按 toolName 计数）
  - `cooldownToolCalls = 3`（审批通过后跳过 3 次工具检测）
- **判定与处理**：
  - 命中阈值 → 标记 `doom_loop`。
  - 若 UI/IPC 可用：`ask` 用户继续（once/always）；中止通过全局 Stop/Cancel。
  - `always` 仅本次会话生效，不做持久化；触发后自动跳过审批并重置计数。
  - 无 UI 时默认 **终止** 并返回可读错误（提示用户调整指令）。
- **计数口径**：
  - `sameToolThreshold` 使用稳定化后的参数哈希（stable JSON），参数超限时仅按 toolName 计数。
  - 命中后续写需重置连续计数并进入短冷却窗口。
- **冷却策略**：用户允许继续时重置连续计数并设置短冷却窗口。

### C. Truncation 策略

- **阈值**：`maxLines = 2000`、`maxBytes = 50KB`（默认值，可配置）。
- **落地路径**：
  - 首选写入 `Vault/.agent-output/`。
  - 写入失败时降级到应用数据目录。
- **保留策略**：默认 **7 天**自动清理。
- **返回格式**：`preview + fullPath + nextStep hint`（建议 read/grep）。
- **UI 规则**：必须标识“已截断”，避免用户误解为完整输出。
- **UI 入口**：聊天消息内提供“查看完整输出”入口（打开文件；桌面端可直接调用系统打开）。

### D. Permission 策略

- **权限域**：`read / edit / bash / web_fetch / web_search / mcp`。
- **默认规则**：
  - **read**：Vault 内 `allow`；Vault 外 `ask`；`*.env*`、`*.pem`、`*.key` 等敏感文件默认 `ask`。`read/ls/glob/grep/search_in_file` 归为 read 域。
  - **edit/write/move/delete**：Vault 内 `allow`；Vault 外 `deny`（或 `ask`，需显式开启）。
  - **bash**：一律 `ask`，并保持沙盒授权与隔离。
  - **web_fetch/web_search**：默认 `allow`（依赖 SSRF 防护与协议限制）。
  - **mcp**：仅允许已配置服务器；新增服务器需 `ask`。
- **审批最小化原则**：仅对高风险操作触发审批（Vault 外读、敏感文件、bash、未知 MCP），低风险操作默认不弹。
- **审批交互**：UI 仅提供 `once / always` 继续；拒绝通过全局 Stop/Cancel。UI 可复用 `@anyhunt/ui/ai/confirmation`（不满足时允许改造）。
- **规则持久化**：`always` 仅写入用户级存储（不分项目）。
- **评估规则**：按 `permission + pattern` 进行匹配，后写优先。
- **匹配对象**：
  - file：`vault:/relative/path` 或 `fs:/absolute/path`（分隔符统一为 `/`）。
  - web：`url:https://host/path`（或 `query:<search>`）。
  - bash：`shell:<command>`。
  - mcp：`mcp:<serverId>/<toolName>`。
  - pattern 默认使用 glob；如需正则，以 `regex:` 前缀标记。

### E. 外部化与 Hook 策略

- **配置层级**：
  - 用户级：`~/.moryflow/config.jsonc` / `~/.anyhunt/config.jsonc`
  - 内联：UI/CLI 传入配置（最高优先级）
- **移动端路径**：`Paths.document/.moryflow/`（`config.jsonc`、`agents/`）。
- **Agent 外部化**：`~/.moryflow/agents/*.md`（JSONC frontmatter + prompt body）。
- **Tool 外部化**：`~/.moryflow/tools/*.ts`（仅桌面端启用，需显式开关）。
- **Hook 顺序**：内置 → 用户；失败不阻断主流程（fail-safe）。

### F. 模式切换（Agent / Agent-完全访问权限）

- **入口**：输入框工具栏左侧切换。
- **Agent 模式**：遵循权限策略与审批最小化原则。
- **Agent-完全访问权限**：会话级覆盖，默认 `allow` 高风险操作（不弹审批，**敏感文件也不提示**），仅保留系统级硬限制与审计记录。
- **静默记录**：全权限模式下不显示审批卡片，仅记录自动批准事件。
- **审计字段**：`eventId/sessionId/mode/decision/permissionDomain/targets/rulePattern/timestamp`。
- **落地位置**：Runtime 侧轻量审计日志（随 session 存储），UI 默认不展示。
- **日志格式**：JSON Lines；仅用于诊断，不进入 C 端 UI。

### G. 配置与规则格式（执行规范）

- **推荐存储**：用户级 JSONC（可手工编辑），路径为 `~/.moryflow/config.jsonc` / `~/.anyhunt/config.jsonc`。
- **持久化方式**：原子写入（临时文件 + rename），仅保存运行时策略与规则。
- **默认结构**（示例）：

```jsonc
{
  "agents": {
    "runtime": {
      "agent": { "id": "writer" },
      "mode": { "default": "agent" },
      "compaction": { "fallbackCharLimit": 120000, "protectedTurns": 3 },
      "truncation": { "maxLines": 2000, "maxBytes": 51200, "ttlDays": 7 },
      "doomLoop": { "maxAttempts": 3, "maxToolCalls": 60, "sameToolThreshold": 5 },
      "tools": { "external": { "enabled": true } },
      "hooks": {
        "chat": {
          "system": { "mode": "append", "text": "You must reply in Markdown." },
          "params": { "temperature": 0.2, "maxTokens": 2048 },
        },
        "tool": {
          "before": [{ "tool": "read", "mergeInput": { "offset": 1 } }],
          "after": [{ "tool": "read", "appendText": "\\n[read completed]" }],
        },
      },
      "permission": {
        "rules": [
          { "domain": "read", "pattern": "vault:**/*.md", "decision": "allow" },
          { "domain": "read", "pattern": "fs:**/*.env*", "decision": "ask" },
          { "domain": "bash", "pattern": "*", "decision": "ask" },
        ],
      },
    },
  },
}
```

**Agent Markdown 示例（JSONC frontmatter）**

```md
---
{
  'id': 'writer',
  'name': 'Writer',
  'description': 'Write succinctly',
  'modelSettings': { 'temperature': 0.2 },
}
---

You are a writing assistant. Keep responses short and clear.
```

**Hook 规则说明**

- `chat.system`：`append|prepend|replace`（默认 append）。
- `chat.params`：覆盖 ModelSettings（仅允许已知字段）。
- `tool.before.mergeInput`：仅对可解析为 JSON object 的输入生效；作为默认值，**不会覆盖已有输入参数**。
- `tool.after.prependText/appendText`：仅对字符串输出生效。

### H. 审批与审计落地

- **审批交互**：聊天消息内展示审批卡片，仅提供 `once / always`；拒绝通过全局 Stop/Cancel。
- **审计落地**：JSON Lines，按 `sessionId` 分文件，建议目录 `~/.moryflow/logs/agent-audit/`。
- **审计事件**：全权限模式下的自动批准也必须记录（`mode=full_access`）。

### I. 系统提示词与参数设置（桌面端）

- **入口**：设置弹窗新增「System Prompt」Tab。
- **模式**：
  - **默认**：隐藏 prompt 与参数，不向用户暴露；运行时使用内置默认提示词与模型默认参数。
  - **自定义**：展示 prompt 与参数；初始化为默认模板 + 默认参数，用户可编辑。
- **系统提示词**：
  - 自定义内容**直接替换**默认提示词（不拼接）。
  - 默认模板不使用 `{{current_time}}` 等动态占位符。
- **模型参数（common set）**：`temperature` / `topP` / `maxTokens`。
  - 仅在自定义模式中配置；默认仍使用模型默认参数。
  - 通过 “Use model default” 开关控制覆盖；仅对开启覆盖的参数注入 `modelSettings`。

## 影响

**正向影响**

- 长对话稳定性显著提升。
- 工具执行安全边界清晰且可审计。
- 模型上下文压力减少，响应更稳定。

**成本/复杂度**

- Runtime 与 UI 需要新增审批与提示机制。
- 需要维护压缩与权限规则配置。

## 备选方案

1. **维持现状**：仅依赖 maxTurns 与沙盒路径授权。风险仍在。
2. **仅局部修复**：只加 compaction，不处理权限与截断。短期可行但安全边界不足。

## 风险与缓解

- **摘要质量不足** → 允许用户手动触发或禁用；保留最近 N 轮保护区。
- **权限弹窗过多** → 提供 “always” 规则与规则模板。
- **输出截断影响可读性** → 提供清晰路径与 read/grep 指引。

## 参考与索引

### OpenCode（对标参考）

- Permission：`.opencode-ref/packages/opencode/src/permission/next.ts`
- Compaction：`.opencode-ref/packages/opencode/src/session/compaction.ts`
- Session Processor：`.opencode-ref/packages/opencode/src/session/processor.ts`
- Tool Truncation：`.opencode-ref/packages/opencode/src/tool/truncation.ts`
- Tool Registry：`.opencode-ref/packages/opencode/src/tool/registry.ts`
- Plugin SDK：`.opencode-ref/packages/plugin/src/index.ts`
- Tool SDK：`.opencode-ref/packages/plugin/src/tool.ts`

### Anyhunt/Moryflow

- Runtime 导出：`packages/agents-runtime/src/index.ts`
- Agent 工厂：`packages/agents-runtime/src/agent-factory.ts`
- Model 工厂：`packages/agents-runtime/src/model-factory.ts`
- Session 适配：`packages/agents-runtime/src/session.ts`
- 自动续写：`packages/agents-runtime/src/auto-continue.ts`
- 工具集：`packages/agents-tools/src/create-tools.ts`
- Task 子代理：`packages/agents-tools/src/task/task-tool.ts`
- 计划管理：`packages/agents-tools/src/task/manage-plan.ts`
- Web Fetch：`packages/agents-tools/src/web/web-fetch-tool.ts`
- MCP 工具桥接：`packages/agents-mcp/src/tools.ts`
- 沙盒授权：`packages/agents-sandbox/src/authorization/path-authorization.ts`
- PC 端运行入口：`apps/moryflow/pc/src/main/agent-runtime/index.ts`

### OpenCode 参考快照（可选）

如需校验对标细节，可在仓库根目录拉取快照：

```bash
git clone https://github.com/anomalyco/opencode .opencode-ref

git -C .opencode-ref checkout 04b511e1fe135b70256c6aa4f41b81ce2571276c
```
