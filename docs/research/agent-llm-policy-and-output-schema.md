---
title: Anyhunt Agent：API Key 级别 LLM 策略 + 输出 Schema 入参收紧方案
date: 2026-01-20
scope: apps/anyhunt/server (Agent + Console Playground)
status: superseded
---

> 本文已被新方案替代：`docs/architecture/admin-llm-provider-config.md`（LLM Provider/BaseURL/API Key 入库并在 Admin 动态配置）。

## 背景与问题

当前 Anyhunt Dev 的 Agent（`/api/v1/agent` 与 Console Playground 代理接口）存在两个会反复触发线上问题的“自由度”：

1. **输出 schema 入参过宽**：目前 `schema` 基本允许任意对象透传，可能产生：
   - schema 不是合法 JSON Schema / 结构不完整，导致 LLM 侧（或网关侧）报 400；
   - schema 过大/过深，造成提示词膨胀、成本与延迟不可控；
   - schema 中出现不支持字段（或字段类型错误）导致不可预测行为。
2. **模型/网关选择不受控**：请求允许随意传 `model`，导致：
   - 用户传入“不可用模型别名” → 400 / 失败但已产生部分成本；
   - 不同 API key 使用同一套全局 LLM 配置（`OPENAI_*`），缺少“API Key 级别的能力约束与默认值”，计费风险与可运维性差。

本方案目标是：**收紧输入、收敛模型选择、让能力与风险在 API Key 级别可控**。

## 非目标

- 本文不包含“Console Playground 复用浏览器 session”的改造（暂不做）。
- 本文不引入 Responses API（Anyhunt Server 只允许 `/chat/completions`）。

## 方案 A：收紧 Agent 输出 Schema 入参（必须做）

### 现状

- `CreateAgentTaskInput.schema` 目前是 `Record<string, unknown>`（语义上是 `properties`），下游在 `AgentService.buildAgentOutputType` 里拼装成 `json_schema`。

### 目标行为

- 只允许两类输出：
  - `text`：默认（不携带 schema）
  - `json_schema`：结构化输出（必须携带 schema 且通过校验）
- 对 `json_schema` 的 schema 做 **明确且可维护** 的 Zod 校验，拒绝不合法输入。

### 推荐 API 形态（不考虑历史兼容）

将请求字段从 `schema` 重命名为 `output`（或 `outputSchema`），明确表达“输出格式”：

```ts
// 伪代码示意
type AgentOutput =
  | { type: 'text' }
  | {
      type: 'json_schema';
      name?: string;
      strict?: boolean;
      schema: {
        type: 'object';
        properties: Record<string, JsonSchemaProperty>;
        required?: string[];
        additionalProperties?: boolean;
      };
    };
```

校验规则（建议最小可行集）：

- `properties` 必须是对象且 key 为合法字段名（长度/字符集限制）
- `required`（若存在）必须是 `properties` 的子集
- 限制规模（防止滥用）：
  - `properties` 最大字段数（如 50）
  - 每个字段定义最大深度（如 3）
  - schema JSON 字节数上限（如 16KB）

### 与 agents-core 的映射

- `text`：不设置 `outputType`（或保持 `text`）
- `json_schema`：映射为 agents-core 的 `JsonSchemaDefinition`

> 注意：Anyhunt Server 的网关兼容性问题要求在“纯文本输出”场景避免传 `response_format: { type: 'text' }`。
> 结构化输出则应使用 `json_schema`（必要时由 provider 负责注入 `response_format`）。

## 方案 B：把“模型选择/网关能力”下沉到 API Key 级别（必须做）

### 核心原则

- **请求不再自由选择 provider**：provider 只能由服务端预设与运维配置决定。
- **请求不再自由选择 model**：model 必须被 API key 的策略允许；默认 model 由 API key 配置决定。
- **不在数据库存第三方密钥**：第三方 provider key 由服务端环境变量/密钥管理提供，DB 只存“选择与策略”，不存 secret。

### 数据模型（建议最小实现）

在主库 `ApiKey` 上增加（字段名可调整）：

- `llmProviderId: string`：服务端预设 provider 的 id（例如 `openai` / `openrouter` / `gateway`）
- `llmModelId: string`：该 provider 下的默认 model id（例如 `gpt-4.1` / `claude-3-5-sonnet`）
- `llmEnabled: boolean`：是否允许该 api key 调用 LLM 能力（可选，但建议有）

为什么直接加在 `ApiKey` 上：

- 变更最小、无需新增表/新增复杂管理界面
- 足够支持“API key 级别默认模型与能力约束”

### Provider Registry（参考 Moryflow 思路）

服务端实现一个“只读 registry”：

- 基础数据来源：`@moryflow/agents-model-registry` 的 `providerRegistry/modelRegistry`
- 运行时配置来源：服务端环境变量（baseURL、鉴权 key、是否启用、允许模型集合）

运行时解析规则：

1. `ApiKey.llmProviderId` 必须存在于 registry 且启用
2. `ApiKey.llmModelId` 必须存在于该 provider 的允许集合（或 allowCustomModels 逻辑）
3. 对外 API（`/api/v1/agent`）默认使用 `ApiKey` 上的默认模型，不接受任意 `model` 覆盖（或仅允许在“同 provider 白名单”内覆盖）

### 执行路径（高层）

- `ApiKeyGuard` 认证后，能够拿到 `apiKeyId`
- `AgentService` 在创建任务前加载该 API key 的 LLM 策略，得到：
  - `provider`（OpenAI-compatible / OpenAI SDK）
  - `modelId`
  - `capabilities`（是否允许结构化输出、最大 tokens、是否允许 web_search 等）
- 若不满足策略：直接 4xx 拒绝（不创建 Browser Session、不扣费）

## 推进计划（可跟踪）

### Phase 1：输出 Schema 收紧（1-2 天）

- [ ] 定义新的 `AgentOutput` Zod schema（替代当前 `schema` 任意对象）
- [ ] 更新 Anyhunt Server 的请求 DTO 与 Swagger
- [ ] 对无效 schema 返回 400（统一错误格式）
- [ ] 补充单元测试：非法 schema / required 不匹配 / 过大 schema

### Phase 2：API Key LLM 策略（2-4 天）

- [ ] 主库 Prisma：为 `ApiKey` 增加 `llmProviderId/llmModelId/(llmEnabled)`
- [ ] Console：API Key 管理页增加“默认模型/Provider”配置（仅展示服务端支持项）
- [ ] Server：实现 registry + 校验 + 默认模型选择（禁止随意 model）
- [ ] 计费：在扣费前做策略校验与 fail-fast（避免无效调用产生成本）

### Phase 3：请求模型字段收口（可选）

- [ ] 移除（或仅保留内部调试）`CreateAgentTaskInput.model`
- [ ] Console Playground 若需要“临时切换模型”，通过“切换 API key”完成，而非请求内传 `model`
