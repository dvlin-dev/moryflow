---
title: Moryflow PC Code Review
date: 2026-02-26
scope: apps/moryflow/pc
status: in_progress
---

<!--
[INPUT]: apps/moryflow/pc（本轮仅模块 A：auth / settings-dialog / payment-dialog）
[OUTPUT]: 模块 A 修复结果 + 验证结果 + 下一步计划
[POS]: Phase 3 / P2 模块审查记录（Moryflow PC）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Moryflow PC Code Review

## 当前范围

- 项目：`apps/moryflow/pc`
- 本轮模块：`auth / settings-dialog / payment-dialog`
- 执行方式：按 `A-1 ~ A-6` 逐步修复并回写台账

## 模块 A 修复结果（已完成）

### S1

- [done] `ProviderDetails` 拆分为容器 + 控制器 hook + 预设/自定义子组件
  - 关键位置：
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/provider-details.tsx:27`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/use-provider-details-controller.ts:53`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/provider-details-preset.tsx:51`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/provider-details-custom.tsx:47`
  - 结果：`provider-details.tsx` 从 901 行收敛到 105 行。

- [done] `McpSection` 渲染期 `setState` 清理，改为 `renderContentByState()`
  - 关键位置：
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/mcp-section.tsx:205`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/mcp-section.tsx:211`

- [done] `AddModelDialog/EditModelDialog` 迁移到 `RHF + zod/v3`
  - 关键位置：
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/add-model-dialog.tsx:99`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/add-model-dialog.tsx:211`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/edit-model-dialog.tsx:211`

- [done] `CloudSyncSection` 状态片段化（`sectionState + renderContentByState + renderUsageByState`）
  - 关键位置：
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section.tsx:118`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section.tsx:125`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section.tsx:197`

### S2

- [done] `McpDetails` 测试逻辑与展示拆分
  - 关键位置：
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/mcp/mcp-details.tsx:58`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/mcp/use-mcp-details-test.ts:17`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/mcp/mcp-test-result-dialog.tsx:1`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/mcp/mcp-verified-tools.tsx:1`
  - 结果：`mcp-details.tsx` 收敛到 272 行。

- [done] `LoginPanel` 拆分为流程容器 + 子片段（header/fields/terms）
  - 关键位置：
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/login-panel.tsx:140`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/login-panel-auth-fields.tsx:211`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/login-panel-mode-header.tsx:8`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/login-panel-terms.tsx:3`
  - 结果：`login-panel.tsx` 收敛到 159 行。

### S3

- [done] `SectionContent` 收敛 loading 守卫与 section 分发
  - 关键位置：
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/section-content.tsx:50`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/section-content.tsx:61`

- [done] `PaymentDialog` 增加 checkout 打开失败态与重试状态机
  - 关键位置：
    - `apps/moryflow/pc/src/renderer/components/payment-dialog/index.tsx:37`
    - `apps/moryflow/pc/src/renderer/components/payment-dialog/index.tsx:86`

## 验证结果（本地）

- `pnpm --filter @moryflow/pc typecheck`
  - 结果：fail
  - 原因：workspace 缺少 `node_modules`，依赖模块不可解析（命令输出含 `Local package.json exists, but node_modules missing`）。

- `pnpm --filter @moryflow/pc test:unit`
  - 结果：fail
  - 原因：`vitest: command not found`（同样由 `node_modules` 缺失导致）。

## 下一步

1. 在仓库根安装依赖后，重跑模块 A 验证命令。
2. 验证通过后进入模块 B 预扫描（`chat-pane / input-dialog / command-palette`）。

## 进度记录

| Date | Module | Action | Status | Notes |
| --- | --- | --- | --- | --- |
| 2026-02-26 | 模块 A（auth/settings-dialog/payment-dialog） | 预扫描 | done | 输出 `S1x4 / S2x2 / S3x2`，给出 `A-1~A-6` 计划 |
| 2026-02-26 | 模块 A（auth/settings-dialog/payment-dialog） | 分步修复（A-1~A-6） | done | 全部代码改造落地，等待依赖安装后补齐 typecheck/test:unit 验证 |
