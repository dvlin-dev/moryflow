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

- 仅在职责范围、关键入口、公共契约或关键约束变化时更新本文件
- 如影响跨包依赖，更新根 `CLAUDE.md`
