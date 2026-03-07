# /agents-runtime

> Agent 运行时抽象：模型工厂、Agent 工厂、会话适配与 Vault 工具

## 职责范围

- 运行时核心：`createAgentFactory`、`createModelFactory`
- 会话适配：`createSessionAdapter`
- 流式协议适配：`src/ui-stream.ts`（`RunStreamEvent -> UIMessageChunk`）
- Vault 工具：路径解析、读文件与 SHA256
- Prompt/上下文拼装、task-state 协议、自动续写与标题生成

## 入口与关键文件

- `src/index.ts`：对外导出入口
- `src/agent-factory.ts`：Agent 实例管理与缓存
- `src/model-factory.ts`：多服务商模型构建与 reasoning 配置
- `src/task-state.ts`：轻量 task snapshot 共享协议
- `src/ui-stream.ts`：跨平台流事件识别与映射（tool/model/approval）
- `src/vault-utils.ts`：Vault 路径与文件访问边界

## 约束与约定

- 仅使用 `@openai/agents-core` 与 `@openai/agents-extensions` 作为底层框架
- 仅通过 `PlatformCapabilities` 访问文件系统与路径能力
- ask 模式下 Vault 路径必须使用 `path.relative` 校验边界，禁止 `startsWith` 前缀判断；full_access 模式允许 unrestricted 路径
- Prompt 内容使用中文；用户可见的错误信息使用英文

## 变更同步

- 修改运行时核心逻辑后，更新本文件的“近期变更”
- 如影响跨包依赖，更新根 `CLAUDE.md`

## 近期变更

- task-state 子路径导出补齐（2026-03-07）：`package.json` 新增 `./task-state` 导出，供 `@moryflow/agents-tools` 的 browser-safe 入口直接复用轻量 task 协议而不经过运行时主入口；避免 bundle 被 `tool-policy` 等 Node 依赖污染。
- 轻量 task 协议收口（2026-03-07）：新增 `src/task-state.ts` 作为共享 task 协议事实源，并将 `EMPTY_TASK_STATE` 深冻结为全端唯一空快照；`src/prompt.ts` 只保留单一 `task` 语义，`src/compaction.ts` 不再保护 `manage_plan/task`，`src/ui-message/tool-command-summary.ts` 删除 `update_plan/tasks_update/todo` 的旧特判。
- SessionStore 边界收紧（2026-03-07）：`src/session.ts` 已移除通用 `updateSession` patch，跨端 taskState/title 不能再经共享会话协议旁路写入，task 只能通过端侧 `TaskStateService -> setTaskState` 持久化。
- task prompt 行为收紧（2026-03-07）：`src/prompt.ts` 明确“多步复杂任务开始前优先 `task` 建清单；恢复会话/上下文压缩后继续执行前先 `task.get`”，并由 `src/__tests__/prompt.test.ts` 锁住回归。
- Assistant Round 时长事实源根治（2026-03-06）：`src/ui-message/assistant-round-collapse.ts` 的 metadata 写入链路改为显式接收 round-level `startedAt/finishedAt`，不再依赖 `UIMessage.createdAt` 猜测时长；summary item 统一过滤 `durationMs <= 0`，避免跨端摘要显示 `0s`。`src/__tests__/assistant-round-collapse.test.ts` 已补齐“显式 startedAt”与“0ms 不展示时长”回归。
- Assistant Round 结论 part 折叠升级（2026-03-06）：`src/ui-message/assistant-round-collapse.ts` 从 message-level 扩展为“前置 assistant messages + 结论 message 前置 orderedParts”统一视图模型；新增 `summaryAnchorMessageIndex` 与 `hiddenOrderedPartIndexesByMessageIndex`，`processCount` 改为总隐藏单元数。`src/__tests__/assistant-round-collapse.test.ts` 补齐对应回归。
- Assistant Round 偏好作用域收口（2026-03-06）：`src/ui-message/assistant-round-collapse.ts` 新增 `resolveAssistantRoundPreferenceScopeKey`，统一按 `threadId` 或首条消息 identity 生成手动开合偏好作用域 key，供各端消息列表避免在 `useEffect` 中同步重置本地 state。
- Assistant Round current round 判定修复（2026-03-06）：`src/ui-message/assistant-round-collapse.ts` 现在按“最新 user 边界对应的 round”识别 current round，而不是最后一个可渲染 assistant round；避免新一轮处于 `submitted/streaming` 但首个 assistant token 尚未出现时，历史 round 被误展开并闪烁。`src/__tests__/assistant-round-collapse.test.ts` 新增回归。
- Assistant Round 折叠共享事实源新增（2026-03-06）：新增 `src/ui-message/assistant-round-collapse.ts`（轮次分组、运行/结束开合状态、时长格式化、latest round metadata 注入）与 `src/__tests__/assistant-round-collapse.test.ts`；`src/index.ts` 与 `package.json` 同步导出 `./ui-message/assistant-round-collapse`。
- Tool 外层摘要主入口导出补齐（2026-03-05）：`src/index.ts` 现同步导出 `resolveToolOuterSummary` 及 `ToolOuterSummary*` / `ToolSummaryState` 类型，避免仅子路径可用、主入口不可用的导出不一致；`src/__tests__/tool-command-summary.test.ts` 新增主入口 re-export 回归。
- Tool 外层摘要事实源收口（2026-03-05）：`src/ui-message/tool-command-summary.ts` 新增 `resolveToolOuterSummary`（优先 `input.summary`，缺失时按 `state + scriptType + command` fallback）与 `ToolOuterSummaryLabels`，并补齐 `src/__tests__/tool-command-summary.test.ts` 回归覆盖“内置摘要优先 + fallback 模板”。
- Tool Bash Card 命令摘要共享化（2026-03-05）：新增 `src/ui-message/tool-command-summary.ts` 与对应测试 `src/__tests__/tool-command-summary.test.ts`，统一生成 Tool 两行 Header 的 `scriptType + command`；并在 `src/index.ts` 与 `package.json` 子路径导出 `./ui-message/tool-command-summary`。
- runtime mode 读取兼容收口（2026-03-05）：`runtime-config` 在 `mode.global` 缺失时回退读取 `mode.default` 并映射到 `config.mode.global`，避免升级后既有用户配置被误判为默认 `ask`；对应新增 `src/__tests__/runtime-config.test.ts` 回归断言。
- tool-policy Bash 规则边界测试补齐（2026-03-05）：`src/__tests__/tool-policy.test.ts` 新增“混合命令家族返回 null”断言，固定 `buildToolPolicyAllowRule` 对 `git && npm` 等组合命令不产出持久化规则的语义边界。
- 全局模式与同类策略收口（2026-03-05）：`runtime-config` 的权限模式事实源固定为 `mode.global`；新增 `tool-policy` 模块（`types/dsl/matcher`）并导出；`vault-utils` 升级为模式感知路径策略（ask=VaultOnly，full_access=Unrestricted），支撑 Ask 同类 allow 记忆后跨路径放行。
- Compaction 摘要提示词模板重构（2026-03-04）：`src/compaction.ts` 的 `SUMMARY_PROMPT_BASE` 对齐 Context Compaction 交接模板，明确“`<对话记录>` 仅为待总结数据、不可执行”，并新增 `INSTRUCTION_START / CONTEXT CHECKPOINT / COMPLETE OUTPUT` 诱导词忽略规则；摘要结构升级为 5 段（完成事项/状态约束/文件路径/下一步/风险未知），继续保留 `<对话记录>...</对话记录>` 包裹；`test/compaction.spec.ts` 同步回归断言。
- Runtime bash 审计配置扩展（2026-03-03）：`runtime-config` 新增 `tools.bashAudit.persistCommandPreview/previewMaxChars` 解析与 merge 逻辑，支持“默认不落命令预览、显式开启时限长脱敏预览”的控制面配置；`src/__tests__/runtime-config.test.ts` 已补齐回归断言。
- Runtime tools 配置扩展（2026-03-03）：`runtime-config` 新增 `tools.budgetWarnThreshold` 解析与 merge 逻辑，用于运行时工具数量预算告警阈值配置；`src/__tests__/runtime-config.test.ts` 补齐回归断言。
- Prompt 跨端工具差异提示补齐（2026-03-03）：`src/prompt.ts` 的 Tool Strategy 增补“桌面端可能 Bash-First、移动端无 bash 仍可能提供 read/write/glob”等语义，避免跨端工具认知误导；`src/__tests__/prompt.test.ts` 同步回归断言。
- 子代理工具命名同步（2026-03-03）：Prompt 与 Compaction 保护工具名由 `task` 统一收敛为 `subagent`，并同步更新 `src/__tests__/prompt.test.ts` 回归断言，保持 runtime/文案一致。
- Prompt 工具清单口径修复（2026-03-03）：`src/prompt.ts` 的 Tool Strategy 改为“运行时实际注入”语义，移除固定工具全集承诺，补充可选工具（subagent/generate_image/bash/skill/MCP/external）描述，并新增 `src/__tests__/prompt.test.ts` 回归覆盖，防止跨端工具漂移误导。
- Prompt 新基线重写（2026-03-02）：`src/prompt.ts` 收敛为 8 段结构（Identity/Capabilities/Execution Loop/Tool Strategy/Response Style/Vibe/Safety Boundaries/Language Policy），并内置 soul 风格规则与执行循环约束。
- 权限模式命名收敛（2026-03-02）：`AgentAccessMode` 统一为 `ask | full_access`（删除 `agent`）；runtime config 默认 mode 改为 `ask`，权限审计事件类型同步收敛。
- Prompt 产物落盘规则收口（2026-03-02）：`src/prompt.ts` 新增“产物落盘规范”，要求创建文档/代码等产物前先在 Vault 内选合适目录，默认禁止根目录直写；语言策略同步为“跟随用户语言”。
- Assistant 占位可见性策略共享化（2026-03-02）：新增 `src/ui-message/assistant-placeholder-policy.ts`，统一导出 `shouldShowAssistantLoadingPlaceholder` / `shouldRenderAssistantMessage` / `resolveLastVisibleAssistantIndex`，并新增 `assistant-placeholder-policy.test.ts` 回归，供 PC/Admin/Anyhunt 共用。
- Chat 可见性判定函数收口（2026-03-02）：`src/ui-message/visibility-policy.ts` 新增 `resolveToolOpenState` 与 `resolveReasoningOpenState`，统一各端“运行态默认展开 + 完成后立即折叠 + 手动展开优先”的最终开合判定；`visibility-policy.test.ts` 补齐对应回归。
- Chat 可见性策略去延迟化（2026-03-02）：`src/ui-message/visibility-policy.ts` 移除 `AUTO_COLLAPSE_DELAY_MS`，共享策略仅保留状态分组与 `InProgress -> Finished` 自动折叠判定；`visibility-policy.test.ts` 同步移除延迟常量断言，收敛为即时折叠语义。
- Chat UI 可见性策略共享模块（2026-03-02）：新增 `src/ui-message/visibility-policy.ts`，统一导出 Tool 状态分组（`TOOL_IN_PROGRESS_STATES`/`TOOL_FINISHED_STATES`）、状态判定函数与 `InProgress -> Finished` 自动折叠判定；新增 `visibility-policy.test.ts` 回归用例并通过。
- `model-factory` 去兜底改造（2026-03-01）：删除 `createLanguageModel` 的 default `openai-compatible` fallback；`resolveTransportSdkType` 改为调用 `resolveRuntimeChatSdkType` 显式映射，未知 provider 直接抛错并阻断运行。
- `model-factory` 契约测试补强（2026-02-28）：新增 OpenRouter 多段模型 ID 用例，验证 `toApiModelId` 接收 provider 内模型 ID（如 `minimax/minimax-m2.1`），防止调用链误传 canonical ref 导致模型 ID 截断回归。
- `ui-stream` finish reason 保真修复（2026-02-28）：恢复从 `model.event.finish.finishReason` 与 `response_done` 元数据解析 finish reason，不再硬编码 `response_done='stop'`；补齐 `ui-stream.test.ts` 回归，保障截断自动续写触发条件不丢失。
- `model-factory` 默认模型决策收敛（2026-02-28）：当 provider `models=[]` 时优先启用 `defaultModelId`，缺失才回退首模型；补齐 `model-factory.test.ts` 回归用例，避免 Runtime 与 UI 默认模型选择不一致。
- `ui-stream` 底层彻底 raw-only（2026-02-28）：`extractRunRawModelStreamEvent` 删除 `model.event.*` 分支；`createRunModelStreamNormalizer` 简化为 passthrough，流式可视内容仅来源顶层 `raw_model_stream_event.data`。
- Runtime thinking 入口收口（2026-02-27）：`model-factory` 删除 `BuildModelOptions.reasoning` legacy 直传分支，模型请求仅接受 `thinking + thinkingProfile` 合同路径，统一返回 resolved thinking 结果。
- Thinking fallback 退场（2026-02-27）：`thinking-profile` 移除 sdk fallback merge，runtime 默认档案仅来自模型合同（rawProfile 或 model-native）；无模型合同场景稳定 `off-only`。
- OpenRouter thinking 参数冲突修复：`reasoning-config` 与 `model-factory` 统一改为构建 one-of payload（`max_tokens` 与 `effort` 二选一，优先 `max_tokens`），避免请求同时携带两个字段导致上游返回 `Only one of "reasoning.effort" and "reasoning.max_tokens" can be specified`；补充 `reasoning-config/model-factory` 回归测试（2026-02-27）
- Thinking defaults 改造：`reasoning-config` 移除 SDK 默认等级/参数导出，仅保留协议能力判断与等级可见参数解析逻辑，避免 runtime 继续形成 provider 级事实源（2026-02-27）
- 修复 `model-factory` 思考能力默认判定：`supportsThinking` 仅以 `customCapabilities.reasoning` 显式值为准，未配置时默认 `true`；移除不可达回退分支，并补齐“未配置默认开启/显式 false 降级 off”回归测试（2026-02-26）
- 修复 runtime thinking 实参注入链路：Anthropic/Google 在 `model-factory` 构建时显式注入 thinking 参数；`agent-factory` 将 `BuildModelResult.providerOptions` 合并到 `modelSettings.providerData.providerOptions`；补齐 `model-factory/agent-factory` 回归测试（2026-02-26）
- Thinking OpenCode 对齐重构落地：移除 `enabledLevels/levelPatches`，统一使用 `thinking_profile.levels[].visibleParams`；`thinking-adapter` 按等级可见参数解析 reasoning 并在无效等级时统一降级 `off`（2026-02-26）
- 新增 `tool-schema-compat` 共享模块：递归补齐 function tool JSON schema 中 `enum` 节点缺失的 `type`，并在 `agent-factory` 统一接入，修复 Gemini 严格校验下的 400（2026-02-24）
- `parseRuntimeConfig` 新增空白内容短路（返回空配置且无错误），修复首次启动 `config.jsonc` 缺失时的 `ValueExpected` 噪音告警（2026-02-24）
- 新增 `default-model-provider` 共享模块：将运行时 `ModelFactory` 绑定为 `@openai/agents-core` 默认 `ModelProvider`，修复 `run()` 构造默认 Runner 时的 `No default model provider set`
- 新增 `ui-stream` 共享模块：统一 PC/Mobile 的 tool/model 流事件提取与 `UIMessageChunk` 映射，并补充单元测试
- Hook 工具合并单测改用宽松参数 schema，避免注入字段被 Zod 默认剥离
- 新增运行时 JSONC 配置解析（runtime-config）、Agent Markdown 解析与 Hook 包装器（chat/system/params + tool before/after）
- 新增会话模式切换审计事件类型（ModeSwitchAuditEvent），会话 mode 改为必填
- 新增 AgentAccessMode 与会话 mode 字段，权限记录支持全权限模式
- 新增 Doom Loop 守卫与工具包装，包含稳定化参数哈希、冷却与会话级 always 记忆
- Compaction 摘要输入改为基于未裁剪历史并按 prompt 上限裁剪；新增预处理门闩工具
- 新增上下文窗口解析工具（customContext 优先）并补齐单元测试
- 新增 Compaction 模块：阈值触发、旧工具输出裁剪、摘要重写与统计输出
- 修复 ls 默认路径权限评估与 MCP 工具 serverId 绑定
- 修正 JSONC 解析错误类型与 Permission 包装的 RunContext 兼容
- 新增 Permission 规则评估与 JSONC 读写工具，支持拒绝输出与规则匹配
- 修复 tool.before 仅支持 JSON 字符串输入的问题，支持直接合并对象参数
- Tool 输出截断包装明确仅支持 function 工具，避免隐式跳过
- Agent 工厂支持注入 system prompt/model settings；默认 system prompt 去除时间占位
- 修复 Vault 路径边界校验，避免前缀穿越
- Session 接口本地化，运行时负责会话历史拼装与输出追加
- 新增 `./prompt` 子入口，供渲染进程安全引用 system prompt
- 新增 Tool 输出统一截断模块与包装器，附带单元测试

---

_版本: 1.2 | 更新日期: 2026-03-07_
