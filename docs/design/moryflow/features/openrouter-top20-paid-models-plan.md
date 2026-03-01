---
title: Moryflow PC OpenRouter 前20付费模型接入计划（深度调研版）
date: 2026-03-01
scope: docs/design/moryflow/features
status: active
---

# Moryflow PC OpenRouter 前20付费模型接入计划（深度调研版）

## 0. 目标与边界

- 目标：以 OpenRouter 周榜真实用量为事实源，接入 **Top 20 paid** 模型，顺序严格沿用排行榜（先全量排序，再过滤 `:free`，再取前 20）。
- 目标：不是最小改动，而是一次性收口以下问题：
  - 榜单口径不可复现
  - reasoning 能力“看起来支持但实际不下发”
  - `maxOutput` 缺失导致默认回落 `4096`
  - paid-only 边界不清晰
- 范围：本计划为实施基线，后续按 L2 风险等级执行代码与测试。

## 1. 深度调研方法（可复现）

### 1.1 排行榜事实源（周榜）

- 页面：`https://openrouter.ai/rankings?view=week`
- 关键发现：页面 SSR 的 RSC Flight 数据 `self.__next_f.push(...)` 中包含 `rankingData` 与 `rankingType`。
- `rankingData` 字段：
  - `variant_permaslug`
  - `total_prompt_tokens`
  - `total_completion_tokens`
  - `date`
- 本次抓取结果：
  - `rankingType = week`
  - 日期覆盖：`2026-02-24` 到 `2026-02-28`
  - 明细行数：`367`

### 1.2 聚合与过滤口径

- 排序指标：按 `variant_permaslug` 聚合，计算
  - `weekly_total_tokens = sum(total_prompt_tokens + total_completion_tokens)`
- 免费过滤：`variant_permaslug` 含 `:free` 视为免费变体，剔除。
- Top 20 paid 规则：
  - 先按周用量做全量排序
  - 再过滤免费
  - 最后取前 20

### 1.3 模型能力参数事实源

- API：`https://openrouter.ai/api/frontend/models`
- 映射方式：按 `permaslug` 对齐模型元信息与 endpoint 能力。
- 提取字段：
  - `context_length`
  - `supports_reasoning`
  - `reasoning_config`
  - `input_modalities` / `output_modalities`
  - `endpoint.supported_parameters`
  - `endpoint.max_completion_tokens`
  - `endpoint.is_free`

### 1.4 额外核查（补全缺失上限）

- 两个模型在 endpoint 未给 `max_completion_tokens`：
  - `minimax/minimax-m2.1`
  - `z-ai/glm-4.7-20251222`
- 通过模型详情页核查：
  - `https://openrouter.ai/minimax/minimax-m2.1` 显示 `max output = 196.6K`
  - `https://openrouter.ai/z-ai/glm-4.7` 显示 `max output = 202,752`

## 2. 付费榜单结果（最终接入口径）

| 付费排名 | 总榜排名 | 模型 ID                                  |       周总 Tokens |
| -------- | -------- | ---------------------------------------- | ----------------: |
| 1        | 1        | `minimax/minimax-m2.5-20260211`          | 1,661,269,784,551 |
| 2        | 2        | `google/gemini-3-flash-preview-20251217` | 1,033,434,174,924 |
| 3        | 3        | `deepseek/deepseek-v3.2-20251201`        |   799,002,275,535 |
| 4        | 4        | `moonshotai/kimi-k2.5-0127`              |   645,522,716,786 |
| 5        | 5        | `anthropic/claude-4.6-opus-20260205`     |   636,493,994,786 |
| 6        | 6        | `x-ai/grok-4.1-fast`                     |   628,085,546,425 |
| 7        | 7        | `anthropic/claude-4.6-sonnet-20260217`   |   619,488,482,520 |
| 8        | 8        | `z-ai/glm-5-20260211`                    |   568,785,460,697 |
| 9        | 10       | `anthropic/claude-4.5-sonnet-20250929`   |   521,901,432,640 |
| 10       | 11       | `google/gemini-2.5-flash`                |   492,428,222,523 |
| 11       | 13       | `google/gemini-2.5-flash-lite`           |   399,870,158,885 |
| 12       | 14       | `minimax/minimax-m2.1`                   |   334,660,728,309 |
| 13       | 15       | `openai/gpt-oss-120b`                    |   316,556,730,108 |
| 14       | 16       | `google/gemini-3.1-pro-preview-20260219` |   178,221,093,105 |
| 15       | 17       | `openai/gpt-5.2-20251211`                |   170,966,256,996 |
| 16       | 18       | `anthropic/claude-4.5-haiku-20251001`    |   166,857,433,921 |
| 17       | 19       | `google/gemini-2.0-flash-001`            |   154,820,965,410 |
| 18       | 20       | `openai/gpt-5-nano-2025-08-07`           |   150,606,665,853 |
| 19       | 21       | `x-ai/grok-4-fast`                       |   134,400,044,324 |
| 20       | 22       | `z-ai/glm-4.7-20251222`                  |   132,760,102,752 |

## 3. Top 20 Paid 模型能力参数矩阵

| 付费排名 | 总榜排名 | 模型 ID                                  |       周总 Tokens |   Context | Max Completion | reasoning | `reasoning` 参数 | `max_tokens` 参数 | tools | structured_outputs | 模态（in -> out）                   |
| -------- | -------- | ---------------------------------------- | ----------------: | --------: | -------------: | --------- | ---------------- | ----------------- | ----- | ------------------ | ----------------------------------- |
| 1        | 1        | `minimax/minimax-m2.5-20260211`          | 1,661,269,784,551 |   196,608 |        196,608 | true      | Y                | Y                 | Y     | Y                  | text -> text                        |
| 2        | 2        | `google/gemini-3-flash-preview-20251217` | 1,033,434,174,924 | 1,048,576 |         65,535 | true      | Y                | Y                 | Y     | Y                  | text,image,file,audio,video -> text |
| 3        | 3        | `deepseek/deepseek-v3.2-20251201`        |   799,002,275,535 |   163,840 |        163,840 | true      | Y                | Y                 | Y     | N                  | text -> text                        |
| 4        | 4        | `moonshotai/kimi-k2.5-0127`              |   645,522,716,786 |   262,144 |         65,535 | true      | Y                | Y                 | Y     | Y                  | text,image -> text                  |
| 5        | 5        | `anthropic/claude-4.6-opus-20260205`     |   636,493,994,786 | 1,000,000 |        128,000 | true      | Y                | Y                 | Y     | Y                  | text,image -> text                  |
| 6        | 6        | `x-ai/grok-4.1-fast`                     |   628,085,546,425 | 2,000,000 |         30,000 | true      | Y                | Y                 | Y     | Y                  | text,image -> text                  |
| 7        | 7        | `anthropic/claude-4.6-sonnet-20260217`   |   619,488,482,520 | 1,000,000 |        128,000 | true      | Y                | Y                 | Y     | Y                  | text,image -> text                  |
| 8        | 8        | `z-ai/glm-5-20260211`                    |   568,785,460,697 |   204,800 |        131,072 | true      | Y                | N                 | Y     | N                  | text -> text                        |
| 9        | 10       | `anthropic/claude-4.5-sonnet-20250929`   |   521,901,432,640 | 1,000,000 |         64,000 | true      | Y                | Y                 | Y     | N                  | text,image,file -> text             |
| 10       | 11       | `google/gemini-2.5-flash`                |   492,428,222,523 | 1,048,576 |         65,535 | true      | Y                | Y                 | Y     | Y                  | file,image,text,audio,video -> text |
| 11       | 13       | `google/gemini-2.5-flash-lite`           |   399,870,158,885 | 1,048,576 |         65,535 | true      | Y                | Y                 | Y     | Y                  | text,image,file,audio,video -> text |
| 12       | 14       | `minimax/minimax-m2.1`                   |   334,660,728,309 |   196,608 |              - | true      | Y                | Y                 | Y     | N                  | text -> text                        |
| 13       | 15       | `openai/gpt-oss-120b`                    |   316,556,730,108 |   131,072 |        131,072 | true      | Y                | Y                 | Y     | N                  | text -> text                        |
| 14       | 16       | `google/gemini-3.1-pro-preview-20260219` |   178,221,093,105 | 1,048,576 |         65,536 | true      | Y                | Y                 | Y     | Y                  | audio,file,image,text,video -> text |
| 15       | 17       | `openai/gpt-5.2-20251211`                |   170,966,256,996 |   400,000 |        128,000 | true      | Y                | Y                 | Y     | Y                  | file,image,text -> text             |
| 16       | 18       | `anthropic/claude-4.5-haiku-20251001`    |   166,857,433,921 |   200,000 |         64,000 | true      | Y                | Y                 | Y     | Y                  | image,text -> text                  |
| 17       | 19       | `google/gemini-2.0-flash-001`            |   154,820,965,410 | 1,048,576 |          8,192 | false     | N                | Y                 | Y     | Y                  | text,image,file,audio,video -> text |
| 18       | 20       | `openai/gpt-5-nano-2025-08-07`           |   150,606,665,853 |   400,000 |        128,000 | true      | Y                | Y                 | Y     | Y                  | text,image,file -> text             |
| 19       | 21       | `x-ai/grok-4-fast`                       |   134,400,044,324 | 2,000,000 |         30,000 | true      | Y                | Y                 | Y     | Y                  | text,image -> text                  |
| 20       | 22       | `z-ai/glm-4.7-20251222`                  |   132,760,102,752 |   202,752 |              - | true      | Y                | Y                 | Y     | N                  | text -> text                        |

## 4. 已识别根因（含 PR 评论问题）

1. `packages/model-bank/src/aiModels/openrouter.ts` 多数模型缺少 `settings.extendParams`，导致 reasoning profile 在 resolver 里退化为 off-only。
2. 当前 openrouter reasoning 映射要求有 `reasoningEffort/effort/thinkingLevel/thinkingBudget` 之一；仅 `enableReasoning` 不会产出有效 payload（会出现“能选但不下发”）。
3. 部分模型未写 `maxOutput`，registry 会回退 `4096`，与真实模型上限严重偏差。
4. `openai/gpt-oss-120b` 在 frontend model 数据中存在 free endpoint 与 paid endpoint 共存，paid-only 边界需要显式策略。
5. 目前榜单 derivation 逻辑未固化为可回放流程，容易出现“看起来排序对，实际上口径漂移”。

## 5. 一次性收口方案（实施蓝图）

### 5.1 榜单与模型清单生成标准化

- 新增可复现实本（建议放在 `packages/model-bank/scripts/`）：
  - 输入：`rankings?view=week` 页面 HTML + `api/frontend/models`
  - 处理：聚合周总 tokens、过滤 `:free`、截取 paid 前 20
  - 输出：标准化 JSON（rank、id、weeklyTokens、capabilities）
- `openrouter.ts` 不再手工维护排序逻辑，改为按该 JSON 生成/更新。

### 5.2 `openrouter.ts` 全量字段收口

- 每个模型必须显式给出：
  - `maxOutput`
  - `settings.extendParams`（若支持 reasoning）
- `maxOutput` 取值优先级：
  1. endpoint `max_completion_tokens`
  2. 模型详情页明确值（仅用于 endpoint 缺失场景）
  3. 若仍缺失，阻断生成并报错（禁止静默回退 4096）

### 5.3 thinking 映射层根治（非补丁）

- 在 `packages/model-bank/src/thinking/reasoning.ts` 增加 openrouter boolean 模式支持：
  - 当模型仅暴露 `enableReasoning` 且无 effort/budget 时，允许生成 `reasoning` 开关 payload。
- 维持 openrouter one-of 约束：`effort` 与 `max_tokens` 互斥。
- 为 mandatory reasoning 模型增加策略位（在模型卡 settings 标记），在 UI 层禁用 `off` 或自动回退到默认 reasoning 等级。

### 5.4 paid-only 边界策略

- 选型层：仅接受 `variant_permaslug` 不含 `:free` 的条目。
- 运行层：对“同 permaslug 同时存在 free endpoint”的模型（当前 `openai/gpt-oss-120b`）增加校验与告警：
  - 记录模型 endpoint 明细快照
  - 每次榜单刷新时自动检查 `is_free` endpoint 是否混入
  - 若策略不满足，阻断自动更新并人工确认

### 5.5 回归测试（L2 必做）

- `thinking/resolver.test.ts`
  - 覆盖 openrouter boolean-only reasoning 模型
  - 覆盖 one-of 冲突与 mandatory 策略
- `registry/index.test.ts`
  - 断言 OpenRouter Top20 模型 `maxOutputTokens > 4096`
  - 断言模型顺序与 paid ranking 一致
- 新增榜单解析单测
  - 用固定 HTML fixture 解析 `rankingData`
  - 断言 paid 前 20 与当前文档一致

## 6. 付费前20执行映射（`extendParams` 与 `maxOutput`）

| 付费排名 | 模型 ID                                  | 执行 `extendParams`                          | `maxOutput` 执行值 | 说明                                           |
| -------- | ---------------------------------------- | -------------------------------------------- | -----------------: | ---------------------------------------------- |
| 1        | `minimax/minimax-m2.5-20260211`          | `['enableReasoning','reasoningBudgetToken']` |            196,608 | mandatory reasoning，走 budget 控制            |
| 2        | `google/gemini-3-flash-preview-20251217` | `['thinkingLevel','urlContext']`             |             65,535 | 明确支持 effort（含 minimal）                  |
| 3        | `deepseek/deepseek-v3.2-20251201`        | `['enableReasoning','reasoningBudgetToken']` |            163,840 | budget 控制                                    |
| 4        | `moonshotai/kimi-k2.5-0127`              | `['enableReasoning','reasoningBudgetToken']` |             65,535 | `supports_reasoning_effort=false`              |
| 5        | `anthropic/claude-4.6-opus-20260205`     | `['enableReasoning','reasoningBudgetToken']` |            128,000 | budget 控制                                    |
| 6        | `x-ai/grok-4.1-fast`                     | `['reasoningEffort']`                        |             30,000 | xAI 系列优先 effort                            |
| 7        | `anthropic/claude-4.6-sonnet-20260217`   | `['enableReasoning','reasoningBudgetToken']` |            128,000 | budget 控制                                    |
| 8        | `z-ai/glm-5-20260211`                    | `['enableReasoning']`                        |            131,072 | 无 `max_tokens`，需 boolean reasoning 映射支持 |
| 9        | `anthropic/claude-4.5-sonnet-20250929`   | `['enableReasoning','reasoningBudgetToken']` |             64,000 | budget 控制                                    |
| 10       | `google/gemini-2.5-flash`                | `['thinkingBudget','urlContext']`            |             65,535 | Google 系列已有 budget 先例                    |
| 11       | `google/gemini-2.5-flash-lite`           | `['thinkingBudget','urlContext']`            |             65,535 | 同上                                           |
| 12       | `minimax/minimax-m2.1`                   | `['enableReasoning','reasoningBudgetToken']` |            196,608 | endpoint 缺失，采用模型页明确值                |
| 13       | `openai/gpt-oss-120b`                    | `['reasoningEffort']`                        |            131,072 | effort 支持明确；并做 free endpoint 监控       |
| 14       | `google/gemini-3.1-pro-preview-20260219` | `['thinkingLevel3','urlContext']`            |             65,536 | effort 集合为 low/medium/high                  |
| 15       | `openai/gpt-5.2-20251211`                | `['gpt5_2ReasoningEffort','textVerbosity']`  |            128,000 | 与 OpenAI 侧保持一致                           |
| 16       | `anthropic/claude-4.5-haiku-20251001`    | `['enableReasoning','reasoningBudgetToken']` |             64,000 | budget 控制                                    |
| 17       | `google/gemini-2.0-flash-001`            | `[]`                                         |              8,192 | `supportsReasoning=false`                      |
| 18       | `openai/gpt-5-nano-2025-08-07`           | `['gpt5ReasoningEffort','textVerbosity']`    |            128,000 | 与 OpenAI 侧保持一致                           |
| 19       | `x-ai/grok-4-fast`                       | `['reasoningEffort']`                        |             30,000 | xAI 系列 effort                                |
| 20       | `z-ai/glm-4.7-20251222`                  | `['enableReasoning','reasoningBudgetToken']` |            202,752 | endpoint 缺失，采用模型页明确值                |

## 7. 验收标准（实施后）

- OpenRouter 内置模型固定 20，且顺序与“paid 前 20”完全一致。
- 不包含任何 `:free` 模型 ID。
- 每个模型都具备可验证的 `maxOutput`（无 4096 回退）。
- reasoning 支持模型均具备有效 `extendParams`，不存在 off-only 误降级。
- `pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 全部通过（L2）。

## 8. 已确认决策（按推荐执行）

1. `minimax/minimax-m2.1` 与 `z-ai/glm-4.7-20251222` 的 `maxOutput` 按模型页值落地（196,608 / 202,752）。
2. mandatory reasoning 模型在 UI 层禁止 `off`，避免语义冲突。
3. `openai/gpt-oss-120b` 采用“自动监控 + 失败阻断”策略，防止 free endpoint 混入 paid-only 接入。

## 9. 实施回写（2026-03-01）

### 9.1 已完成实现

- 已在 `packages/model-bank/src/aiModels/openrouter.ts` 按 paid 前 20 顺序落地：
  - 20/20 模型完成 `settings.extendParams` 映射
  - 补齐缺失 `maxOutput`：
    - `minimax/minimax-m2.1` -> `196608`
    - `z-ai/glm-4.7-20251222` -> `202752`
- 已在 `packages/model-bank/src/types/aiModel.ts` 新增 `settings.reasoningRequired`。
- 已在 `packages/model-bank/src/thinking/resolver.ts` 实现 mandatory reasoning 模型去除 `off` 等级。
- 已在 `packages/model-bank/src/thinking/contract.ts` 增加 mandatory 模型 `off` 选择拦截（返回 `THINKING_LEVEL_INVALID`）。
- 已在 `packages/model-bank/src/thinking/reasoning.ts` 增加 OpenRouter boolean-only reasoning（`enableReasoning`）映射。

### 9.2 回归测试覆盖

- `packages/model-bank/src/thinking/reasoning.test.ts`
  - 新增 openrouter boolean-only reasoning 用例
- `packages/model-bank/src/thinking/resolver.test.ts`
  - 新增 mandatory 模型无 `off` 用例
  - 新增 boolean-only 控制用例
- `packages/model-bank/src/thinking/contract.test.ts`
  - 新增 mandatory 模型 profile 去除 `off` 用例
  - 新增 mandatory 模型拒绝 `off` 选择用例
- `packages/model-bank/src/registry/index.test.ts`
  - 新增 OpenRouter paid top20 顺序 + `maxOutput > 4096` 用例

### 9.3 校验结果

- `pnpm lint`：通过
- `pnpm typecheck`：通过
- `pnpm test:unit`：通过
