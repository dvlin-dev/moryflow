---
title: ADR-0002：Agent Runtime 控制面（Compaction/Permission/Truncation）
date: 2026-01-24
scope: agents-runtime, agents-tools, moryflow/pc
status: active
---

<!--
[INPUT]: Agent Runtime 长对话溢出风险、工具执行风险、长输出污染上下文问题
[OUTPUT]: 对 Compaction / Permission / Truncation 的统一决策与边界
[POS]: `docs/architecture/docs/opencode-architecture.md` 的落地前提

[PROTOCOL]: 本文件变更需同步更新 `docs/architecture/docs/opencode-architecture.md` 与 `docs/CLAUDE.md`（若影响全局）。
-->

# ADR-0002：Agent Runtime 控制面（Compaction/Permission/Truncation）

## 背景

当前 Anyhunt/Moryflow 的 Agent Runtime 依赖 `@openai/agents-core`，但存在三个系统性风险：

1. **上下文无限增长**：长对话与工具输出积累导致模型上下文溢出。
2. **工具执行风险**：除 bash 外缺乏统一权限控制，read/edit/web 等能力缺乏审批边界。
3. **输出污染上下文**：工具返回的长文本直接进入上下文，导致后续推理成本飙升。

OpenCode 已在运行时层建立 **Compaction / Permission / Truncation** 控制面，验证过可行性。

## 决策

在 Anyhunt/Moryflow 的 Agent Runtime 中引入统一控制面，包含：

- **Compaction**：上下文压缩（含工具输出修剪 + 摘要重写）。
- **Permission**：工具级权限（allow/deny/ask）。
- **Truncation**：工具输出统一截断与落地存储。

首期落地范围：**Moryflow PC Runtime**，并抽象为可复用模块（`packages/agents-runtime` / `packages/agents-tools`）。策略默认值与执行边界见下文「策略细则（执行基线）」。

## 范围与实施原则

- 本 ADR 仅覆盖控制面能力：Compaction / Permission / Truncation / Doom Loop / 审批与审计 / 模式切换 / 配置与外部化。
- 首期仅落地在 **Moryflow PC Runtime**（其它端不在本轮范围）。
- 实施约束：不做历史兼容；无用代码直接删除；保持模块化与单一职责。

## 方案要点

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

## 策略细则（执行基线）

> 本节用于锁定默认策略与阈值，后续实现按此执行；若需调整，走 ADR 更新。

### A. Compaction 策略

- **触发阈值**：
  - 若可拿到模型 context window：当「历史近似 token > 0.8 × usable」触发。
  - `usable = contextWindow - outputBudget`，默认 `outputBudget = min(4096, contextWindow × 0.2)`。
  - 无法拿到 context window 时，按 **120k 字符**阈值触发（可配置）。
- **近似 token 估算**：默认按 `字符数 / 4` 估算；可替换为真实 tokenizer。
- **保护策略**：
  - 保护最近 **3 轮 user/assistant**。
  - 优先清理旧的 **tool output**，保留 tool input/结果摘要。
  - 受保护的工具输出（默认）：`task`、`manage_plan`、`write`、`edit`、`move`、`delete`。
- **摘要重写**：
  - 使用 compaction agent 生成摘要，要求包含：已完成事项、当前进度、涉及文件、下一步。
  - 历史重写为 `[summaryItem, ...recentTurns]`。
  - summaryItem 使用 system 消息落地，前缀固定为 `【会话摘要】`，内容语言与对话一致。
- **失败兜底**：摘要失败时仅执行 pruning，不阻断本次 run。
- **可观测性**：记录压缩前/后体积、摘要长度、被丢弃工具类型统计。

### B. Doom Loop 策略

- **阈值**：
  - `maxAttempts = 3`（单次 run 内的重试循环）
  - `maxToolCalls = 60`（单次 run 工具调用上限）
  - `sameToolThreshold = 5`（相同 tool + 相同 args 连续次数）
- **判定与处理**：
  - 命中阈值 → 标记 `doom_loop`。
  - 若 UI/IPC 可用：`ask` 用户继续（once/always）；中止通过全局 Stop/Cancel。
  - `always` 仅本次会话生效，不做持久化。
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
- **审批交互**：UI 仅提供 `once / always` 继续；中止通过全局 Stop/Cancel。UI 可复用 `@anyhunt/ui/ai/confirmation`（不满足时允许改造）。
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
- **Agent 外部化**：`~/.moryflow/agents/*.md`。
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
      "mode": { "default": "agent" },
      "compaction": { "maxChars": 120000, "recentTurns": 3 },
      "truncation": { "maxLines": 2000, "maxBytes": 51200, "ttlDays": 7 },
      "doomLoop": { "maxAttempts": 3, "maxToolCalls": 60, "sameToolThreshold": 5 },
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
