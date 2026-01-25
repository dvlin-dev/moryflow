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

- Tool 输出截断包装明确仅支持 function 工具，避免隐式跳过
- Agent 工厂支持注入 system prompt/model settings；默认 system prompt 去除时间占位
- 修复 Vault 路径边界校验，避免前缀穿越
- Session 接口本地化，运行时负责会话历史拼装与输出追加
- 新增 `./prompt` 子入口，供渲染进程安全引用 system prompt
- 新增 Tool 输出统一截断模块与包装器，附带单元测试

---

_版本: 1.0 | 更新日期: 2026-01-26_
