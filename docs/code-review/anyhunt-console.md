---
title: Anyhunt Console Code Review
date: 2026-02-25
scope: apps/anyhunt/console
status: in_progress
---

<!--
[INPUT]: apps/anyhunt/console（重点：api-keys、settings、webhooks）
[OUTPUT]: 问题清单 + 分级 + 分步修复计划 + 进度记录
[POS]: Phase 3 / P2 模块审查记录（Anyhunt Console）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt Console Code Review

## 范围

- 项目：`apps/anyhunt/console`
- 本轮模块：`src/features/api-keys`、`src/features/settings`、`src/features/webhooks`
- 页面入口：`src/pages/ApiKeysPage.tsx`、`src/pages/SettingsPage.tsx`、`src/pages/WebhooksPage.tsx`
- 审查基线：`docs/guides/frontend/component-design-quality-index.md`

## 结论摘要（模块 A：修复完成）

- `S1`（必须改）：3 项
- `S2`（建议本轮改）：2 项
- `S3`（可延后）：0 项
- 当前状态：模块 A 已完成修复并通过模块级校验
- 补充动作：已按新准则完成“状态片段化 + renderByState”补扫，清理改动区同类状态三元渲染点

## 发现（按严重度排序）

- [S1][已修复] `WebhooksPage` 单文件复杂度超阈值，职责混杂
  - 证据：
    - 文件行数 `327`（阈值：>300 必须拆分）
    - 同文件同时承担 API Key 选择、Webhook 列表渲染、行级操作、4 个对话框状态编排
  - 定位：
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:52`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:124`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:175`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:299`
  - 风险：
    - 维护成本高，后续改动容易引入回归；不符合“容器/编排/展示分层”约束

- [S1][已修复] 表单实现违反“RHF + zod”强制规范（使用多处 `useState` 管理表单）
  - 证据：
    - `Settings` 页面 Profile/Security 表单均为手写受控输入
    - `CreateApiKeyDialog`、`CreateWebhookDialog`、`EditWebhookDialog` 同样使用 `useState` 管理表单字段
  - 定位：
    - `apps/anyhunt/console/src/pages/SettingsPage.tsx:60`
    - `apps/anyhunt/console/src/pages/SettingsPage.tsx:139`
    - `apps/anyhunt/console/src/features/api-keys/components/create-api-key-dialog.tsx:29`
    - `apps/anyhunt/console/src/features/webhooks/components/create-webhook-dialog.tsx:28`
    - `apps/anyhunt/console/src/features/webhooks/components/edit-webhook-dialog.tsx:62`
  - 风险：
    - 校验与类型推断分散，后续字段扩展容易出现重复逻辑与漏校验

- [S1][已修复] Webhook API Key 选择存在“失效值可继续使用”的状态漏洞
  - 证据：
    - 下拉选项只展示 `activeKeys`，但选中值用 `selectedKeyId || activeKeys[0]?.id`
    - `selectedKey` 从 `apiKeys`（全量）查找，导致选中值失效后仍可能取到非 active key
  - 定位：
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:62`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:63`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:64`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:147`
  - 风险：
    - UI 与真实可选项不一致；会出现“下拉不含该值但请求仍使用该 key”的行为

- [S2][已修复] `WebhooksPage` 对话框状态使用 4 个布尔开关，状态模型可读性差
  - 证据：
    - `create/edit/delete/regenerate` 四个开关 + `selectedWebhook` 并存
  - 定位：
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:53`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:54`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:55`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:56`
    - `apps/anyhunt/console/src/pages/WebhooksPage.tsx:57`
  - 建议：
    - 收敛为判别状态（`dialog: { type: 'create'|'edit'|'delete'|'regenerate'|null, webhookId?: string }`）

- [S2][已修复] Webhook create/edit 表单字段与事件选择逻辑重复
  - 证据：
    - 两个对话框各自维护 `name/url/events` 与 `handleEventToggle`
  - 定位：
    - `apps/anyhunt/console/src/features/webhooks/components/create-webhook-dialog.tsx:28`
    - `apps/anyhunt/console/src/features/webhooks/components/create-webhook-dialog.tsx:34`
    - `apps/anyhunt/console/src/features/webhooks/components/edit-webhook-dialog.tsx:62`
    - `apps/anyhunt/console/src/features/webhooks/components/edit-webhook-dialog.tsx:68`
  - 建议：
    - 抽离共享 `WebhookFormFields`（展示）+ `schemas.ts`（校验）+ RHF 表单状态

## 分步修复计划（模块 A）

1. A-1：重构 `WebhooksPage` 结构，拆分为 `KeySelectorCard`、`WebhookTable`、`WebhookDialogs` 三段（先不改交互语义）。
2. A-2：修复 API Key 选中状态漏洞，确保“当前值必须属于 active keys”。
3. A-3：把 `settings/api-keys/webhooks` 的表单统一迁移到 RHF + `zod/v3`。
4. A-4：抽离 Webhook create/edit 共享字段组件与 schema，消除重复逻辑。
5. A-5：模块回归与一致性复查（组件边界、props、状态模型）。

## 进度记录

| Step | Module | Action | Status | Validation | Updated At | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| A-0 | api-keys/settings/webhooks | 预扫描（不改代码） | done | n/a | 2026-02-25 | 识别 `S1x3 / S2x2` |
| A-1 | api-keys/settings/webhooks | 分步重构与修复 | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | `S1x3 / S2x2` 已修复；新增 `webhooks/utils.test.ts` 回归测试 |
| A-1b | api-keys/settings/webhooks | 状态渲染准则补扫修复（变更区） | done | `pnpm --filter @anyhunt/console lint` / `typecheck` / `test:unit` | 2026-02-25 | `create-api-key-dialog`、`webhook-api-key-card`、`WebhooksPage` 等已改为显式状态片段/渲染方法 |

## 验证记录

- `pnpm --filter @anyhunt/console lint`：pass
- `pnpm --filter @anyhunt/console typecheck`：pass
- `pnpm --filter @anyhunt/console test:unit`：pass
- 说明：工作树依赖安装时因全仓 postinstall 触发外部数据缺失报错，改用 `pnpm install --ignore-scripts` 完成本模块校验环境准备。
