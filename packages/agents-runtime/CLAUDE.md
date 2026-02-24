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

_版本: 1.0 | 更新日期: 2026-02-24_
