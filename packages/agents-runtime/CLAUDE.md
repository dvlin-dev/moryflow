# /agents-runtime

> Agent 运行时抽象：模型工厂、Agent 工厂、会话适配与 Vault 工具

## 职责范围

- 运行时核心：`createAgentFactory`、`createModelFactory`
- 会话适配：`createSessionAdapter`
- Vault 工具：路径解析、读文件与 SHA256
- Prompt/上下文拼装、自动续写与标题生成

## 入口与关键文件

- `src/index.ts`：对外导出入口
- `src/agent-factory.ts`：Agent 实例管理与缓存
- `src/model-factory.ts`：多服务商模型构建与 reasoning 配置
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

- 修复 Vault 路径边界校验，避免前缀穿越

---

_版本: 1.0 | 更新日期: 2026-01-24_
