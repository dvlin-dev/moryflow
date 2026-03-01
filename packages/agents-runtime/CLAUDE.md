# /agents-runtime

> Agent 运行时抽象：模型工厂、Agent 工厂、会话适配与 Vault 工具

## 职责范围

- 运行时核心：`createAgentFactory`、`createModelFactory`
- 会话适配：`createSessionAdapter`
- 流式协议适配：`src/ui-stream.ts`（`RunStreamEvent -> UIMessageChunk`）
- Vault 工具：路径解析、读文件与 SHA256
- Prompt/上下文拼装、自动续写与标题生成

## 入口与关键文件

- `src/index.ts`：对外导出入口
- `src/agent-factory.ts`：Agent 实例管理与缓存
- `src/model-factory.ts`：多服务商模型构建与 reasoning 配置
- `src/ui-stream.ts`：跨平台流事件识别与映射（tool/model/approval）
- `src/vault-utils.ts`：Vault 路径与文件访问边界

## 约束与约定

- 仅使用 `@openai/agents-core` 与 `@openai/agents-extensions` 作为底层框架
- 仅通过 `PlatformCapabilities` 访问文件系统与路径能力
- Vault 路径必须使用 `path.relative` 校验边界，禁止 `startsWith` 前缀判断
- Prompt 内容使用中文；用户可见的错误信息使用英文

## 变更同步

- 修改运行时核心逻辑后，更新本文件的“近期变更”
- 如影响跨包依赖，更新根 `CLAUDE.md`

## 近期变更

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
- Prompt 更新为 tasks\_\* 任务模型（2026-01-25）

---

_版本: 1.0 | 更新日期: 2026-02-26_
