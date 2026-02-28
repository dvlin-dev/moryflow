---
title: Anyhunt 模型运行时与 Thinking 规范
date: 2026-02-28
scope: apps/anyhunt/server, apps/anyhunt/console, packages/model-bank, packages/agents-runtime
status: active
---

# 单一事实源

- `packages/model-bank` 是模型能力与 thinking 的唯一事实源。
- 历史多源链路（`agents-model-registry`、`model-registry-data`、`thinking-defaults`）已移除。

## Thinking 契约

- 统一使用 `thinking_profile` 契约，平台预设优先于临时 patch。
- Anyhunt 默认 `off`，仅在明确可用时开启等级。
- Unknown/非法等级必须显式降级或返回校验错误，不做静默兜底。

## 运行时规则

- provider 差异在 normalizer/adapter 层上收，不向 UI 泄漏 provider 特有分支。
- 重试边界明确：只允许可恢复场景，禁止无限重试。
- 观测要求：记录等级选择、降级原因、provider 映射结果。

## 需求清理与治理回写记录

- 2026-02-27：Model Bank 全量重构完成，冻结单一事实源。
- 2026-02-26：Thinking 统一重构完成，平台预设强约束生效。
- 2026-02-26：Anyhunt thinking 默认 `off` + 单次降级重试策略落地。
