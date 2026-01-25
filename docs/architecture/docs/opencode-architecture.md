---
title: OpenCode 架构分析与 Anyhunt/Moryflow Agents 对齐建议
date: 2026-01-24
scope: agents-runtime
status: proposal
---

# OpenCode 架构分析与 Anyhunt/Moryflow Agents 对齐建议

> 本文档基于 **OpenCode 最新代码** 与 **Anyhunt/Moryflow 当前代码**做对比分析，聚焦 Agent Runtime 的可借鉴点与落地路径。
> OpenCode 参考快照：`.opencode-ref/`（opencode@`04b511e1fe135b70256c6aa4f41b81ce2571276c`，分支：`dev`，提交日期：2026-01-24）。

## 范围声明

- 本文仅对齐 **ADR-0002 控制面**（Compaction / Permission / Truncation / Doom Loop / 审批与审计 / 模式切换 / 配置与外部化 / Hook）。
- 首期落地仅覆盖 **Moryflow PC Runtime**。
- 事件总线、工具缓存、并发控制等非控制面能力不在本轮范围。

## 使用指南：准备参考快照（Snapshot）

> 背景：参考项目不会提交到本仓库，因此切到另一台机器时不会自动带上 `.opencode-ref/`。
> 阅读本文前请确认本地快照与本文一致。

### 1) 检查快照是否存在

- 仓库根目录下应存在：`.opencode-ref/`
- commit 应为：`04b511e1fe135b70256c6aa4f41b81ce2571276c`

### 2) 如果不存在：拉取并固定到本文 commit

```bash
# 在仓库根目录执行

git clone https://github.com/anomalyco/opencode .opencode-ref

git -C .opencode-ref checkout 04b511e1fe135b70256c6aa4f41b81ce2571276c
```

### 3) 如果已存在但版本不一致：切换到对应 commit

```bash

git -C .opencode-ref fetch --all --tags

git -C .opencode-ref checkout 04b511e1fe135b70256c6aa4f41b81ce2571276c
```

---

## 1. OpenCode 最新架构概览（2026-01）

**定位**：开源 AI 编码助手（CLI/桌面/Web/插件/SDK 一体）。

### 1.1 Monorepo 结构（关键包）

```
.opencode-ref/
├── packages/
│   ├── opencode/     # 核心引擎（Agent/Session/Tool/Permission/Config/Bus/...）
│   ├── plugin/       # 插件 SDK（@opencode-ai/plugin）
│   ├── sdk/          # OpenCode SDK（@opencode-ai/sdk）
│   ├── app/          # 主 UI（SolidJS）
│   ├── desktop/      # 桌面端（Tauri wrapper）
│   ├── web/          # 官网/文档（Astro + Solid）
│   ├── console/      # Web Console
│   ├── extensions/   # 扩展生态
│   ├── function/     # Function/Serverless 相关
│   ├── identity/     # 身份相关
│   ├── slack/        # Slack 集成
│   ├── ui/           # UI 组件库
│   └── util/         # 通用工具
└── .opencode/        # 项目级扩展目录（agent/command/tool/...）
```

### 1.2 技术栈要点

- 运行时：Bun + Node（部分场景）
- LLM：Vercel AI SDK（`ai`）+ 多 provider 适配
- 配置：JSONC + Markdown frontmatter + `.opencode/` 目录扫描
- 工具：内置工具 + 插件/本地工具发现机制
- 权限：Pattern + Action（allow/deny/ask）
- 事件：进程内 Bus + GlobalBus 跨 UI/CLI 订阅

---

## 2. OpenCode 值得借鉴的关键设计

### 2.1 分层配置 + `.opencode/` 扩展目录

**关键点**

- 多层配置合并：远端 `.well-known` → 全局 → 自定义路径 → 项目 → 内联变量
- `.opencode/` 目录支持 agent/command/mode/plugin/tool 扫描
- JSONC 支持 `{env:VAR}` / `{file:path}` 注入

**价值**

- 组织级统一默认配置 + 项目级覆盖
- Agent/Command/Tool 不必写死在代码中

**参考实现**

- `.opencode-ref/packages/opencode/src/config/config.ts`
- `.opencode-ref/packages/opencode/src/config/markdown.ts`

### 2.2 权限系统（PermissionNext）

**关键点**

- `allow / deny / ask` + 通配符匹配
- 权限请求通过 Bus 发布事件，UI 侧做审批
- 支持「once/always/reject」与持久化规则

**价值**

- 工具执行可控，尤其是写入/执行类操作
- 权限规则可随 Agent / 用户配置调整

**参考实现**

- `.opencode-ref/packages/opencode/src/permission/next.ts`
- `.opencode-ref/packages/opencode/src/agent/agent.ts`（默认权限策略）

### 2.3 会话压缩（Token-aware compaction）

**关键点**

- `isOverflow` + `prune`：优先修剪旧工具输出
- `compaction` Agent 生成摘要并插入新消息
- 可通过 Config / Plugin hooks 关闭或扩展

**价值**

- 高效控制上下文窗口，减少“死循环 + 长对话爆窗”

**参考实现**

- `.opencode-ref/packages/opencode/src/session/compaction.ts`
- `.opencode-ref/packages/opencode/src/session/processor.ts`

### 2.4 流式事件增强 + Doom Loop 保护

**关键点**

- 流式事件涵盖 reasoning/tool-input start-delta-end
- 发现连续重复 tool-call 触发 `doom_loop` 权限审批

**价值**

- UI 可实时显示“工具参数构建中”“推理中”
- Doom loop 由用户决策中止或继续

**参考实现**

- `.opencode-ref/packages/opencode/src/session/processor.ts`

### 2.5 工具输出截断与外置存储

**关键点**

- 统一截断策略（行/字节）
- 输出写入 `Global.Path.data/tool-output`
- 提示用户使用工具读取指定文件而非直接塞上下文

**价值**

- 避免长输出拖垮上下文
- 将“完整输出”转成可控文件读取流程

**参考实现**

- `.opencode-ref/packages/opencode/src/tool/truncation.ts`

### 2.6 Plugin Hooks（跨层扩展点）

**关键点**

- `chat.params`/`chat.headers`/`tool.execute.before`/`tool.execute.after`
- `experimental.chat.messages.transform` / `experimental.chat.system.transform`
- Tool SDK 内置 `context.ask()` 与权限协作

**价值**

- 插件可定制系统提示、参数、输出加工、审批流程

**参考实现**

- `.opencode-ref/packages/plugin/src/index.ts`
- `.opencode-ref/packages/plugin/src/tool.ts`

### 2.7 Tool Registry & 自定义工具发现

**关键点**

- 内置工具 + `.opencode/tools` + plugin tools 合并
- 统一 Tool 定义 + 参数 schema + 输出截断

**价值**

- 工具生态可扩展，且统一遵守权限/截断规则

**参考实现**

- `.opencode-ref/packages/opencode/src/tool/registry.ts`

---

## 3. Anyhunt/Moryflow 当前 Agents 架构（2026-01）

### 3.1 核心包与职责

| 模块                      | 作用                                                                | 关键文件                                                          |
| ------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `@anyhunt/agents-runtime` | 平台无关运行时（ModelFactory/AgentFactory/Session/Vault/Reasoning） | `packages/agents-runtime/src/index.ts`                            |
| `@anyhunt/agents-tools`   | 工具集合（文件/搜索/web/task/plan）                                 | `packages/agents-tools/src/create-tools.ts`                       |
| `@anyhunt/agents-mcp`     | MCP 工具桥接                                                        | `packages/agents-mcp/src/tools.ts`                                |
| `@anyhunt/agents-sandbox` | Shell 沙盒与路径授权                                                | `packages/agents-sandbox/src/authorization/path-authorization.ts` |
| Moryflow PC Runtime       | 实际运行入口（创建 tools、agent、mcp manager）                      | `apps/moryflow/pc/src/main/agent-runtime/index.ts`                |

### 3.2 运行时核心要点

- 基于 `@openai/agents-core` + `@openai/agents-extensions`（非自研框架）
- Agent 工厂缓存按 `modelId` 构建（`createAgentFactory`）
- ModelFactory 统一管理 providers & reasoning 参数
- 会话历史由 `SessionStore` 管理，`SessionAdapter` 拼装输入
- 工具集包含子代理 `task`（explore/research/batch）与 `manage_plan`
- Web Fetch 内置 SSRF 防护 + 内容截断
- Shell 工具走 `agents-sandbox`（路径授权 + 沙盒执行）

**参考实现**

- `packages/agents-runtime/src/agent-factory.ts`
- `packages/agents-runtime/src/model-factory.ts`
- `packages/agents-runtime/src/session.ts`
- `packages/agents-runtime/src/auto-continue.ts`
- `packages/agents-tools/src/task/task-tool.ts`
- `packages/agents-tools/src/task/manage-plan.ts`
- `packages/agents-tools/src/web/web-fetch-tool.ts`

---

## 4. 对比分析与可借鉴清单

### 4.1 能力对比

| 能力         | OpenCode                                | Anyhunt/Moryflow 现状       | 差距/建议                                                |
| ------------ | --------------------------------------- | --------------------------- | -------------------------------------------------------- |
| 配置分层     | 远端/全局/项目/内联 + `.opencode/` 扫描 | 主要由 App 侧 Settings 注入 | **建议**：引入用户级扩展目录 + 内联覆盖                  |
| 权限系统     | 规则集 + ask/allow/deny + UI 审批       | 沙盒路径授权（仅 shell）    | **建议**：扩展为通用 Tool 权限层（read/edit/bash/web）   |
| 会话压缩     | Token-aware + compaction agent          | 无                          | **建议**：引入 history 修剪 + 摘要重写                   |
| Doom Loop    | 工具重复检测 + ask 审批                 | 仅 maxTurns                 | **建议**：增加重复工具检测 + 保护阈值                    |
| Hook 扩展点  | 多 Hook + Tool SDK                      | 无                          | **建议**：提供 runtime hook 接口（params/messages/tool） |
| 工具输出截断 | 统一截断 + 外置存储                     | 仅 read/preview 局部截断    | **建议**：统一 tool 输出截断 + 文件落地                  |
| 工具发现     | 内置 + 插件 + 本地扫描                  | 固定工具集                  | **建议**：允许用户级 tool/agent 定义                     |

---

## 5. 建议落地路径（优先级）

> 已确认：本轮 **P0/P1/P2 全部落地**；Vault 外 `read` 默认 **ask**；审批 UI 已具备；工具输出截断需提供“查看完整输出”入口。
> 补充：**审批只在“有风险操作”触发**；输入框左侧增加模式切换（`Agent` / `Agent-完全访问权限`）。
> 补充：审批按钮仅保留 `once / always`；规则仅**用户级**持久化（无项目级）；配置层仅**用户级 + 内联**。

### P0（立即收益）

1. **会话压缩（Compaction）**
   - **触发条件**：在 `run()` 之前计算「历史上下文的近似体积」与目标模型 context window；当接近阈值时触发压缩。
   - **裁剪顺序**：
     - 先保护最近 N 轮 user/assistant（例如 2~4 轮）。
     - 优先修剪旧的 tool output（read/web_fetch/search 等），保留 tool input / 关键行动记录。
     - 若仍超阈值，再进入摘要阶段。
   - **摘要阶段**：
     - 调用专用 compaction agent 生成「下一步可继续工作的摘要」。
     - 用 `SessionStore.clearHistory + appendHistory([summaryItem, ...tail])` 重写历史。
   - **产物与可观测性**：
     - 保存 summary item（便于 UI 展示“已压缩”）。
     - 记录压缩前/后体积与被丢弃的 tool 统计，方便调参。

2. **Doom Loop 检测**
   - **监控维度**：
     - 单次 run 的总工具调用数（maxToolCalls）。
     - 连续相同 tool + 相同 args 的次数（sameToolThreshold）。
     - 连续失败/重试次数（maxAttempts）。
   - **判定逻辑**：
     - 达到阈值 → 标记为 `doom_loop` 状态。
     - 触发后走 UI 审批；仅提供 `once / always`（继续执行）。
   - **处理策略**：
     - 默认 `ask`：允许用户继续或中止。
     - 若用户选择继续（once/always）→ 重置计数或设定冷却窗口。
     - 若用户中止 → 终止 run 并返回可读错误（通过全局 Stop/Cancel）。

### P1（体验增强）

3. **统一工具输出截断**
   - **统一入口**：为所有工具增加「输出后处理」层（类似 OpenCode 的 Truncate），统一做行数/字节数限制。
   - **落地规则**：
     - 输出超限 → 写入 Vault 或临时目录（例如 `vault/.agent-output/`）。
     - 返回「截断预览 + 文件路径 + 下一步建议（read/grep）」。
   - **UI 反馈**：
     - 标记“已截断”，避免用户误以为完整结果。
     - **必须在聊天消息内提供完整输出入口**（打开文件），便于查看完整结果。

4. **权限系统扩展**
   - **权限域设计**：`read / edit / bash / web_fetch / web_search / mcp` 等。
   - **评估流程**：
     - tool 执行前 → 根据 `permission + pattern` 计算 action（allow/deny/ask）。
     - `ask` 走 IPC/UI 审批 → 仅提供 `once / always`。
     - `always` 写入**用户级**持久化规则（无项目级）。
   - **与沙盒对齐**：
     - bash 仍走沙盒授权逻辑，但统一入口由权限系统触发。
     - read/edit 只允许 Vault 内路径；**Vault 外 read 默认 `ask`**；edit/write/move/delete 默认 `deny`。
   - **审批最小化原则**：
     - 只对「高风险操作」触发审批（Vault 外读、敏感文件、bash、未知 MCP）。
     - 低风险操作（Vault 内 read/edit、web_fetch/search）默认不弹审批。
     - 若用户选择 `Always allow`，后续同类操作不再弹窗。

5. **系统提示词与参数设置**
   - **入口**：设置弹窗新增「System Prompt」Tab。
   - **模式**：
     - 默认：隐藏 prompt 与参数，不向用户暴露；运行时使用内置默认提示词与模型默认参数。
     - 自定义：展示 prompt 与参数；初始化为默认模板 + 默认参数，用户可编辑。
   - **系统提示词**：
     - 自定义内容直接替换默认提示词（不拼接）。
     - 默认模板不使用 `{{current_time}}` 等动态占位符。
   - **参数范围**：仅暴露 `temperature / topP / maxTokens`；默认使用模型默认值，仅对开启覆盖的参数注入 `modelSettings`。

### P2（可扩展性）

6. **Config/Agent/Tool 外部化**
   - **配置分层**：`~/.moryflow/config.jsonc`（用户级）→ 内联配置（UI/CLI 参数，最高优先级）。
   - **Agent Markdown**：
     - frontmatter 描述 `model / tools / permission / temperature / steps`。
     - body 作为 system prompt（支持多段模块化模板）。
   - **Tool 外部化**：
     - 用户级 `~/.moryflow/tools/*.ts` 自动加载（桌面端可用）。
     - 统一 schema 校验 + 输出截断 + 权限控制。
     - **安全边界**：仅桌面端启用动态工具加载，避免在 server 侧加载任意代码。

7. **Plugin Hook 接口**
   - **最小 Hook 集合**：
     - `chat.params`：改温度/推理参数/headers。
     - `chat.system`：系统提示拼接或替换。
     - `tool.before / tool.after`：工具参数与输出拦截。
   - **执行策略**：
     - Hook 失败不影响主流程（fail-safe）。
     - 明确 Hook 顺序：内置 → 用户。
   - **用途示例**：
     - 注入企业合规提示、日志追踪、工具输出格式化等。

### 输入框模式切换（Agent / Agent-完全访问权限）

**目标**：在消息列表内减少审批频率，同时给高级用户明确的“全权限会话”入口。

**UI 位置**：

- 输入框下方工具栏左侧（与模型选择、上下文范围同一层级）。
- 形态：分段按钮或下拉（默认 `Agent`）。

**模式定义**：

- `Agent`：默认安全模式，遵循权限策略与风险审批（仅高风险 ask）。
- `Agent-完全访问权限`：会话级覆盖策略，将高风险操作默认 `allow`（不弹审批），**敏感文件也不提示**；仍记录审计日志；仅保留系统级硬限制（例如 OS/沙盒能力限制）。

**交互细节**：

- 切换到全权限时弹出一次性确认（说明风险 + 当前仅对本次会话生效）。
- 列表中显示当前模式标识（例如输入框上方小徽标）。
- 权限卡片仍可用于展示“自动批准记录”（非阻断），便于回溯。

### 审批 UI（消息列表内）

**原则**：不弹窗、不中断阅读流，审批只在高风险时出现，样式接近 Notion 的“轻量卡片”。

**复用现有能力**：

- 复用 `MessageList`/`MessageItem` 渲染体系（参考 `docs/architecture/ui-message-list-unification.md`）。
- 优先复用 `@anyhunt/ui/ai/confirmation`，不满足时允许改造组件。
- 事件通道沿用现有 runtime → UI 消息流协议（与 `UIMessageChunk` 同一序列）。
  - 参考 `docs/research/agent-browser-chat-streaming-uimessagechunk.md` 的消息分段规范。

**消息形态**：

- `type: approval`（系统消息），插入在触发审批的 assistant/tool 输出附近。
- 字段建议：`id`、`permissionDomain`、`summary`、`targets`、`riskFlags`、`argsPreview`、`rulePattern`。

**交互**：

- 仅两个按钮：`Allow once` / `Always allow`。
- **拒绝**：通过全局 Stop/Cancel 中止 run（避免卡片上再加按钮）。
- 处理后卡片变为只读状态并展示审批结果（once/always）。

**状态**：

- `pending` / `approved-once` / `approved-always` / `stopped`。

**字段结构（JSON 草案）**：

```json
{
  "type": "approval",
  "id": "perm_01H...",
  "permissionDomain": "read",
  "summary": "Read file outside Vault",
  "targets": ["/Users/.../secrets.json"],
  "riskFlags": ["outside_vault", "sensitive"],
  "argsPreview": "{ path: ... }",
  "rulePattern": "read:/Users/**",
  "createdAt": "2026-01-24T12:00:00Z"
}
```

**状态机**：

- `pending` → `approved-once`（单次放行）
- `pending` → `approved-always`（写入用户级规则）
- `pending` → `stopped`（用户点击 Stop/Cancel）

**全权限模式（静默记录）**：

- `Agent-完全访问权限` 模式下不显示审批卡片。
- 仅在审计日志记录“自动批准事件”，不打断消息流。

**审计字段（最小集合）**：

- `eventId`：唯一 ID
- `sessionId`：会话 ID
- `mode`：`agent` / `full_access`
- `decision`：`once` / `always` / `auto`（全权限静默）
- `permissionDomain`：`read/edit/bash/web_fetch/web_search/mcp`
- `targets`：路径/域名/命令摘要
- `rulePattern`：若为 always
- `timestamp`：ISO 时间

**审计落地位置**：

- 首选：Runtime 内的轻量审计日志（与 session 记录同源存储，便于回放）。
- UI 不展示（全权限静默）；仅在开发排查或导出日志时可见。

**审计日志格式（JSON Lines）**：

```
{"eventId":"perm_evt_01H...","sessionId":"sess_01H...","mode":"full_access","decision":"auto","permissionDomain":"read","targets":["/Users/.../secrets.json"],"rulePattern":null,"timestamp":"2026-01-24T12:00:00Z"}
```

**导出入口（仅开发/诊断）**：

- 通过运行时诊断入口导出（不在 C 端 UI 暴露）。
- 仅用于排查审批争议或安全事件，不进入普通用户路径。

---

## 6. 落地任务清单（含验收点）

> 说明：以下清单是“把 P0/P1/P2 变成可执行任务”的拆解，不是代码实现。每项都包含验收标准，方便你判断是否真的落地。

### P0-1 会话压缩（Compaction）

**任务**

1. 在 `run()` 前计算历史上下文的“近似体积”（token 估算或字符/字节近似），并结合模型 context window 判断是否接近阈值。
2. 增加「修剪策略」：保护最近 N 轮对话，优先清理旧的工具输出（read/web_fetch/search 等），保留关键输入与执行结果。
3. 触发摘要模式时，调用 compaction agent 生成摘要，并用 `clearHistory + appendHistory` 重写历史。
4. 记录压缩前/后体积、摘要长度、被丢弃的 tool 类型等指标，便于调参。

**验收**

- 长对话在接近阈值时触发压缩，不会直接失败或崩溃。
- 历史重写后，下一轮对话仍可基于摘要正常继续。
- UI 能看到“已压缩”提示（或日志中可追踪）。

### P0-2 Doom Loop 检测

**任务**

1. 跟踪单次 run 的工具调用序列、总次数、连续重复调用次数。
2. 当触发阈值时进入 `doom_loop` 状态并触发审批（仅 `once / always` 继续；always 仅会话内有效）。
3. 支持用户中止或继续，并在继续后设定冷却或重置计数。

**验收**

- 连续相同 tool + 相同 args 的重复调用会被检测出来。
- 用户中止后，run 能被终止且返回可读错误（由全局 Stop/Cancel 触发）。
- 相关事件/日志可追踪（方便排查）。

### P1-3 工具输出统一截断

**任务**

1. 在工具执行完成后增加统一输出后处理层（按行数/字节截断）。
2. 超限输出落地到 Vault 或临时目录，并返回“截断预览 + 文件路径 + 下一步建议”。
3. UI 标记输出被截断，并在聊天消息内提供“查看完整输出”入口（打开文件；桌面端可直接调用系统打开）。

**验收**

- 大输出不再塞满上下文；模型仍可继续执行下一轮。
- 可通过 `read/grep` 等工具读取完整输出。
- UI/日志中明确标识“截断”，并可进入完整输出。

### P1-4 工具权限系统扩展

**任务**

1. 定义统一权限域（read/edit/bash/web_fetch/web_search/mcp 等）。
2. 在工具执行前计算 `permission + pattern` → action（allow/deny/ask）。
3. 结合 UI/IPC 仅支持 `once / always`，always 规则持久化到**用户级**。
4. 与现有沙盒路径授权对齐（bash 权限仍走沙盒，但触发由统一入口管理）。

**验收**

- Vault 外路径的 read 默认 `ask`（read 域包含 `read/ls/glob/grep/search_in_file`）；edit/write/move/delete 默认 `deny`。
- “always” 规则仅用户级持久化并在后续调用生效。
- 权限逻辑有最小单测覆盖（评估+持久化）。

### P2-5 Config/Agent/Tool 外部化

**任务**

1. 设计多层配置加载顺序（用户级 → 内联覆盖）。
2. 支持 Markdown Agent（frontmatter + prompt body，用户级）。
3. 支持用户级 tool 动态加载（仅桌面端），并接入权限与截断。
4. 解析配置建议使用 JSONC（`jsonc-parser`）与 Markdown frontmatter（`gray-matter`）；工具编译建议使用 `esbuild`。

**验收**

- 同名配置可被覆盖，加载顺序清晰可验证。
- 用户级 agent 文件可被识别并用于运行。
- Tool 动态加载仅在 desktop 环境生效，server 侧禁用。

### P2-6 Plugin Hook 接口

**任务**

1. 定义最小 Hook 集合：`chat.params`、`chat.system`、`tool.before`、`tool.after`。
2. 约定 Hook 执行顺序（内置 → 用户）并做 fail-safe。
3. 提供示例 Hook（改温度、追加系统提示、格式化输出）。

**验收**

- Hook 能实际改变模型参数或 system prompt。
- Hook 执行失败不会中断主流程。
- 输出可被 Hook 后处理并正确返回。

---

## 7. 策略基线（已定）

> 详细策略以 ADR 为准：`docs/architecture/adr/adr-0002-agent-runtime-control-plane.md`。
> 本节为执行基线摘要，变更需先更新 ADR 再同步此处。

- **Compaction**：0.8 × usable 阈值触发；保护最近 3 轮；优先修剪旧 tool output；摘要重写历史。
- **Doom Loop**：`maxAttempts=3`、`maxToolCalls=60`、`sameToolThreshold=5`；默认 ask 或终止。
- **Truncation**：`maxLines=2000`、`maxBytes=50KB`；输出落地到 `Vault/.agent-output/`；保留 7 天。
- **UI 入口**：截断输出在聊天消息内提示，并提供“查看完整输出”（打开文件；桌面端可直接调用系统打开）。
- **Permission**：read Vault 内 allow、敏感文件 ask（read 域包含 `read/ls/glob/grep/search_in_file`）；edit/write/move/delete Vault 外 deny；bash 永远 ask；审批仅 `once / always`。
- **配置持久化**：用户级 JSONC（`~/.moryflow/config.jsonc` / `~/.anyhunt/config.jsonc`），仅保存规则与阈值。
- **外部化/Hook**：用户级 → 内联覆盖；Hook 顺序内置 → 用户，失败不阻断。

---

## 8. 参考文件索引

### OpenCode

- Bus：`.opencode-ref/packages/opencode/src/bus/index.ts`
- Config：`.opencode-ref/packages/opencode/src/config/config.ts`
- Config Markdown：`.opencode-ref/packages/opencode/src/config/markdown.ts`
- Permission：`.opencode-ref/packages/opencode/src/permission/next.ts`
- Agent：`.opencode-ref/packages/opencode/src/agent/agent.ts`
- Compaction：`.opencode-ref/packages/opencode/src/session/compaction.ts`
- Session Processor：`.opencode-ref/packages/opencode/src/session/processor.ts`
- LLM Stream：`.opencode-ref/packages/opencode/src/session/llm.ts`
- Tool Registry：`.opencode-ref/packages/opencode/src/tool/registry.ts`
- Tool Truncation：`.opencode-ref/packages/opencode/src/tool/truncation.ts`
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

---

_文档版本: 2.4 | 最近更新: 2026-01-24 | OpenCode 快照: opencode@`04b511e1fe135b70256c6aa4f41b81ce2571276c`（`.opencode-ref/`）_
