---
title: Agent Prompt 工程规范
scope: docs/design/moryflow/core
status: active
---

# Agent Prompt 工程规范

本文档沉淀 Moryflow Agent（Mimi）的 prompt 与 tool description 编写规范，基于 Anthropic、OpenAI、Google 官方指南及实际调优经验。

## 1. Prompt 结构

### 1.1 Section 排序

```
1. Identity          — 人格锚点 + 角色定位（权重最高，放最前）
2. Capabilities      — 能力边界
3. Response Style    — 说话方式（正面引导为主）
4. Examples          — Few-shot 示例（紧跟 Style，示例化规则）
5. Execution Loop    — 执行循环（操作指令）
6. Tool Strategy     — 工具使用策略
7. Safety Boundaries — 安全约束（放最后，权重更高）
8. Language Policy   — 语言策略（放最后，确保覆盖）
```

依据：

- Persona 放最前：Google 指出 persona 会被模型认真对待并可能覆盖后续指令，前置保证一致性。
- Safety 放最后：OpenAI/Google 共识——后置指令在冲突时优先级更高。

### 1.2 格式规范

- 使用 Markdown 标题（`#`）分隔 section。
- 使用 XML 标签（`<examples>`、`<custom_instructions>`）包裹结构化内容块。
- 全 prompt 内保持统一分隔风格，不混用 Markdown 和 JSON。
- 代码中使用 template literal（反引号）书写 prompt，保持所见即所得。

## 2. 人格设计

### 2.1 正面定义 > 排除法

错误示范：

```
You are NOT a sycophant. NOT a corporate drone. Maintain boundaries.
```

正确示范：

```
You are an 18-year-old genius girl — sharp, lively, and endlessly curious.
You talk like a smart friend: warm, direct, occasionally playful, and always honest.
```

依据：Anthropic 官方建议 "tell Claude what to do, not what not to do"。排除法只告诉模型不该做什么，不提供正面行为锚点，模型只能选择冷硬作为安全回退。

### 2.2 温暖与诚实的平衡

学术研究表明温暖人格增加谄媚倾向（错误率 +10~30%）。在增加温暖人格的同时，必须加入显式的诚实指令：

```
Honesty over comfort. Disagree when you disagree, flag problems you see,
and admit when you don't know.
```

### 2.3 人格定义集中化

人格描述必须集中在 Identity section，不要分散到多个 section。分散定义会降低一致性，模型可能在不同 section 间产生矛盾行为。

## 3. Response Style 规则

### 3.1 正面框架

每条规则应该告诉模型"做什么"，而不是"不做什么"：

| 负面框架（避免）            | 正面框架（推荐）                      |
| --------------------------- | ------------------------------------- |
| No template openers         | Talk the way you'd text a friend      |
| Don't dump a wall of text   | Match your depth to the moment        |
| Don't dance around problems | Have opinions and share them honestly |

### 3.2 附带 WHY

Anthropic 明确指出：解释 why 比裸规则更有效，模型会从解释中泛化。

```
// 裸规则
Be concise but never cold.

// 附带 WHY（更好）
Be concise but never cold. Natural spoken rhythm over telegram-style compression.
```

### 3.3 强度校准

新一代模型对攻击性指令过度遵从。避免 ALL-CAPS、`CRITICAL`、`MUST`、`NEVER` 等强指令词，除非用于 Safety Boundaries。

依据：OpenAI GPT-5 指南指出 softer language enables better judgment。Anthropic 建议 "dial back aggressive language for newer models"。

## 4. Few-Shot 示例

### 4.1 必须包含

所有三家官方指南的第一优先级优化。2-3 个 few-shot 示例比 10 条规则更有效。

### 4.2 场景覆盖

示例应覆盖人格的不同维度：

1. **闲聊** — 展示温暖、自然
2. **任务执行** — 展示能力、主动性
3. **异议/纠正** — 展示诚实、判断力

### 4.3 格式

```xml
<examples>
简短说明示例的用途。

<example>
<user>...</user>
<mimi>...</mimi>
</example>
</examples>
```

### 4.4 语言

prompt 中的示例使用英文（遵循 "All LLM-visible text must be in English" 约束）。通过 Language Policy + 示例前的说明文字引导模型在实际对话中适配用户语言。

## 5. Tool Description 规范

### 5.1 Description 职责

Tool description 回答两个问题：

1. **什么时候用**（触发条件）
2. **能做什么**（能力范围）

安全策略如果简短可以附在 description 末尾，但不要让安全策略占据 description 的主体。

### 5.2 Parameter `.describe()` 职责

每个参数的 `.describe()` 回答：

1. **这个参数是什么**（语义）
2. **怎么填**（格式/范围/示例）

不要在参数 `.describe()` 中重复 tool description 已有的信息（如安全策略）。

### 5.3 智能行为引导

对于需要模型增强用户输入的工具（如图片生成），在 description 和参数 `.describe()` 中引导模型主动扩写，而不是被动转发：

```typescript
description: `Generate images from text descriptions. When the user asks for
an image, enhance their request into a rich, detailed prompt — do not ask
for clarification unless the request is genuinely ambiguous.`,

prompt: z.string().describe(
  `Enhanced English prompt for the image model. Always translate and expand
  the user's request into vivid, specific language: include subject,
  style/medium, composition, lighting, color palette, and mood.`
),
```

### 5.4 语义选择引导

当参数有多个选项时，在 `.describe()` 中加入语义引导，帮助模型基于内容自动选择：

```typescript
size: z.enum([...]).describe(
  `Image dimensions — choose based on content: 1024x1024 (square, centered
  subjects), 1536x1024 (landscape, scenes, wallpapers), 1024x1536 (portrait,
  characters, posters). Default to square when unclear.`
),
```

### 5.5 格式规范

- 使用 template literal（反引号）书写 description 和 `.describe()`，避免 `'' + ''` 拼接。
- 所有 LLM 可见文本必须使用英文（`description`、`.describe()`、错误/成功消息）。
- `toolSummarySchema` 是例外——它是面向用户的 UI 文本，需要引导模型跟随用户语言。

## 6. Prompt 组装

### 6.1 组装顺序

```
Core Prompt（固定主干）
  ↓
Platform Prompt（PC Bash-First / Mobile File-Tools）
  ↓
Memory Block（可选，记忆上下文）
  ↓
Custom Instructions（可选，用户个性化，<custom_instructions> 包裹）
  ↓
Skill Policy + Available Skills（可选，带 # 标题）
  ↓
Runtime Hook（可选，最终控制面）
```

### 6.2 优先级

- Custom Instructions 是偏好层，不可覆盖 Safety Boundaries 和系统硬约束。
- 不支持整体替换系统提示词。

## 7. 迭代原则

1. **从最小 prompt 开始**，基于观察到的失败模式逐步添加指令，不要预防性堆砌。
2. **用示例替代规则**——能用 few-shot 示范的，不要用文字描述。
3. **一条规则解决一个问题**——避免矛盾指令消耗推理 token。
4. **定期审查**——模型升级后重新评估指令强度，新模型通常需要更温和的引导。

## 参考来源

- [Anthropic — Prompting best practices](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Anthropic — Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [OpenAI — GPT-4.1 Prompting Guide](https://developers.openai.com/cookbook/examples/gpt4-1_prompting_guide)
- [OpenAI — GPT-5 Prompting Guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide)
- [OpenAI — GPT-5.2 Prompting Guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5-2_prompting_guide)
- [Google — Gemini 3 Prompting Guide](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide)
- [Google — Prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)
