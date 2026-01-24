# Agents OpenAI

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

OpenAI 模型适配器，为 Agent 框架提供 OpenAI API 的统一接口。

## 职责

- OpenAI Chat Completions API 封装
- 流式响应处理
- 消息格式转换
- Tracing 导出
- 工具调用处理

## 约束

- 依赖 agents-core 和 agents-adapter
- 保持与 OpenAI API 的兼容性
- 支持流式和非流式两种模式
- **禁止 deep import**：禁止从 `@anyhunt/agents-core/dist/*` 导入（会被 package `exports` 拦截且 Docker 构建期易失效）；统一从 `@anyhunt/agents-core`（公开导出）导入
- **构建顺序**：在 Docker/CI 中必须先构建 `agents-core`（生成 `dist/*.d.ts`）再构建 `agents-openai`

## 成员清单

| 文件                                | 类型 | 说明                      |
| ----------------------------------- | ---- | ------------------------- |
| `index.ts`                          | 入口 | 主导出                    |
| `openaiProvider.ts`                 | 核心 | OpenAI Provider 实现      |
| `openaiChatCompletionsModel.ts`     | 核心 | Chat Completions 模型封装 |
| `openaiChatCompletionsStreaming.ts` | 核心 | 流式响应处理              |
| `openaiChatCompletionsConverter.ts` | 工具 | 消息格式转换              |
| `openaiResponsesModel.ts`           | 核心 | Responses API 模型        |
| `openaiTracingExporter.ts`          | 工具 | Tracing 导出              |
| `tools.ts`                          | 工具 | 工具调用处理              |
| `defaults.ts`                       | 配置 | 默认配置                  |
| `logger.ts`                         | 工具 | 日志工具                  |
| `metadata.ts`                       | 配置 | 元数据                    |
| `types/`                            | 目录 | 类型定义                  |
| `utils/`                            | 目录 | 工具函数                  |
| `memory/`                           | 目录 | 记忆管理                  |

## 常见修改场景

| 场景          | 涉及文件                            | 注意事项          |
| ------------- | ----------------------------------- | ----------------- |
| 修改 API 调用 | `openaiChatCompletionsModel.ts`     | 注意 API 版本兼容 |
| 修改流式处理  | `openaiChatCompletionsStreaming.ts` | 注意错误处理      |
| 修改消息转换  | `openaiChatCompletionsConverter.ts` | 保持类型安全      |
| 新增工具类型  | `tools.ts`                          | 遵循 OpenAI 规范  |

## 依赖关系

```
agents-openai/
├── 依赖 → agents-core（核心抽象）
├── 依赖 → agents-adapter（适配器接口）
├── 依赖 → openai（OpenAI SDK）
└── 被依赖 ← agents-realtime
└── 被依赖 ← agents（顶层导出）
```

## 近期变更

- 2026-01-24：刷新自动生成的 `metadata.ts`
