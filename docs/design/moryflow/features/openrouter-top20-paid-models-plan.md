---
title: Moryflow PC OpenRouter 前20付费模型接入计划
date: 2026-03-01
scope: docs/design/moryflow/features
status: active
---

# Moryflow PC OpenRouter 前20付费模型接入计划

## 目标

- 用 OpenRouter 排行榜（Top Models）当前周榜数据替换 Moryflow PC 内置 OpenRouter 模型。
- 仅保留付费模型，移除免费模型与旧模型清单。
- 最终内置模型数量固定为 20，并严格保持排行榜顺序（按过滤免费后顺延）。

## 数据来源与口径

- 排行榜来源：`https://openrouter.ai/rankings`。
- 技术口径：解析同页 RSC 数据中的 `rankingData`（`rankingType=week`），按 `total_prompt_tokens + total_completion_tokens` 聚合排序。
- 免费过滤规则：剔除模型 ID 含 `:free` 的条目。
- 参数来源：`https://openrouter.ai/api/v1/models`（按 `canonical_slug/id` 对齐）。
- 采集时间：2026-03-01（Asia/Shanghai）。

## 接入清单（前20付费，顺序与排行榜一致）

| 排名 | 模型 ID                                  | 展示名                 | Context | Max Output | Input ($/1M tokens) | Output ($/1M tokens) |
| ---- | ---------------------------------------- | ---------------------- | ------: | ---------: | ------------------: | -------------------: |
| 1    | `minimax/minimax-m2.5-20260211`          | MiniMax M2.5           |  196608 |     196608 |               0.295 |                  1.2 |
| 2    | `google/gemini-3-flash-preview-20251217` | Gemini 3 Flash Preview | 1048576 |      65535 |                 0.5 |                    3 |
| 3    | `deepseek/deepseek-v3.2-20251201`        | DeepSeek V3.2          |  163840 |     163840 |                0.25 |                  0.4 |
| 4    | `moonshotai/kimi-k2.5-0127`              | Kimi K2.5              |  262144 |      65535 |                0.45 |                  2.2 |
| 5    | `anthropic/claude-4.6-opus-20260205`     | Claude Opus 4.6        | 1000000 |     128000 |                   5 |                   25 |
| 6    | `x-ai/grok-4.1-fast`                     | Grok 4.1 Fast          | 2000000 |      30000 |                 0.2 |                  0.5 |
| 7    | `anthropic/claude-4.6-sonnet-20260217`   | Claude Sonnet 4.6      | 1000000 |     128000 |                   3 |                   15 |
| 8    | `z-ai/glm-5-20260211`                    | GLM 5                  |  204800 |     131072 |                0.95 |                 2.55 |
| 9    | `anthropic/claude-4.5-sonnet-20250929`   | Claude Sonnet 4.5      | 1000000 |      64000 |                   3 |                   15 |
| 10   | `google/gemini-2.5-flash`                | Gemini 2.5 Flash       | 1048576 |      65535 |                 0.3 |                  2.5 |
| 11   | `google/gemini-2.5-flash-lite`           | Gemini 2.5 Flash Lite  | 1048576 |      65535 |                 0.1 |                  0.4 |
| 12   | `minimax/minimax-m2.1`                   | MiniMax M2.1           |  196608 |          - |                0.27 |                 0.95 |
| 13   | `openai/gpt-oss-120b`                    | gpt-oss-120b           |  131072 |          - |               0.039 |                 0.19 |
| 14   | `google/gemini-3.1-pro-preview-20260219` | Gemini 3.1 Pro Preview | 1048576 |      65536 |                   2 |                   12 |
| 15   | `openai/gpt-5.2-20251211`                | GPT-5.2                |  400000 |     128000 |                1.75 |                   14 |
| 16   | `anthropic/claude-4.5-haiku-20251001`    | Claude Haiku 4.5       |  200000 |      64000 |                   1 |                    5 |
| 17   | `google/gemini-2.0-flash-001`            | Gemini 2.0 Flash       | 1048576 |       8192 |                 0.1 |                  0.4 |
| 18   | `openai/gpt-5-nano-2025-08-07`           | GPT-5 Nano             |  400000 |     128000 |                0.05 |                  0.4 |
| 19   | `x-ai/grok-4-fast`                       | Grok 4 Fast            | 2000000 |      30000 |                 0.2 |                  0.5 |
| 20   | `z-ai/glm-4.7-20251222`                  | GLM 4.7                |  202752 |          - |                 0.3 |                  1.4 |

## 实施步骤

1. 清空 `packages/model-bank/src/aiModels/openrouter.ts` 的历史列表。
2. 写入上表 20 个模型，字段统一包含：`id`、`displayName`、`description`、`contextWindowTokens`、`maxOutput`、`pricing`、`abilities`、`type`。
3. 保持模型顺序与本清单一致，不做二次排序。
4. 保留免费模型过滤逻辑：本次不纳入任何 `:free` 变体。

## 验收标准

- OpenRouter 内置模型数为 20。
- 不包含任何 `:free` 模型。
- 首个模型为 `minimax/minimax-m2.5-20260211`，第 20 个为 `z-ai/glm-4.7-20251222`。
- 模型顺序与本文件清单一致。
