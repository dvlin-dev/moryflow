---
title: Moryflow Admin Code Review
date: 2026-02-26
scope: apps/moryflow/admin
status: in_progress
---

<!--
[INPUT]: apps/moryflow/admin（模块 A：auth/dashboard/users）组件与状态流实现
[OUTPUT]: 预扫描问题清单（S1/S2/S3）+ 分步修复计划 + 进度台账
[POS]: Phase 3 / P6 模块审查记录（Moryflow Admin）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Moryflow Admin Code Review

## 范围

- 项目：`apps/moryflow/admin`
- 本轮模块：`auth / dashboard / users`
- 页面入口：
  - `src/pages/LoginPage.tsx`
  - `src/pages/DashboardPage.tsx`
  - `src/pages/UsersPage.tsx`
  - `src/pages/UserDetailPage.tsx`
- 特性目录：
  - `src/features/auth`
  - `src/features/dashboard`
  - `src/features/users`
- 审查基线：`docs/guides/frontend/component-design-quality-index.md`

## 结论摘要（模块 A：修复完成）

- `S1`（必须改）：1 项（已修复）
- `S2`（建议本轮改）：2 项（已修复）
- `S3`（可延后）：1 项（已修复）
- 当前状态：模块 A 已完成修复并通过模块级校验

## 发现（按严重度排序）

- [S1][已修复] `SetTierDialog` 在切换目标用户时可能保留旧等级，存在误提交风险
  - 证据：
    - `SetTierDialog` 增加 `currentTier/open` 变化时 `form.reset`，确保切换目标用户后表单值同步
    - `Select` 改为受控 `value`，移除 `defaultValue` 残留态
    - `UsersPage` 在对话框关闭时清理 `selectedUser`，避免 stale props 持续挂载
  - 定位：
    - `apps/moryflow/admin/src/features/users/components/set-tier-dialog.tsx:61`
    - `apps/moryflow/admin/src/features/users/components/set-tier-dialog.tsx:66`
    - `apps/moryflow/admin/src/features/users/components/set-tier-dialog.tsx:87`
    - `apps/moryflow/admin/src/pages/UsersPage.tsx:52`
    - `apps/moryflow/admin/src/pages/UsersPage.tsx:114`
  - 风险：
    - 管理员在未二次确认时可能把用户等级错误写回，属于业务操作错误风险

- [S2][已修复] `UsersPage` 列表区使用链式三元渲染多状态，违反“状态片段化 + switch”规范
  - 证据：
    - 列表区状态收敛为 `UsersTableViewState`，通过 `renderRowsByState + switch` 分发
    - 新增 `error` 显式状态，页面状态边界更清晰
  - 定位：
    - `apps/moryflow/admin/src/features/users/components/users-table.tsx:30`
    - `apps/moryflow/admin/src/features/users/components/users-table.tsx:90`
    - `apps/moryflow/admin/src/features/users/components/users-table.tsx:150`
  - 风险：
    - 状态扩展（如 error/no-filter-result）时可读性快速恶化，漏分支概率升高

- [S2][已修复] `UsersPage` 同文件承载筛选编排、请求分页、表格渲染与弹窗状态，职责边界偏重
  - 证据：
    - 筛选区拆分为 `UsersFilterBar`
    - 列表渲染拆分为 `UsersTable`
    - 页面层收敛为“筛选状态 + 查询 + 分页 + 对话框编排”
  - 定位：
    - `apps/moryflow/admin/src/features/users/components/users-filter-bar.tsx:28`
    - `apps/moryflow/admin/src/features/users/components/users-table.tsx:76`
    - `apps/moryflow/admin/src/pages/UsersPage.tsx:33`
    - `apps/moryflow/admin/src/pages/UsersPage.tsx:111`
  - 风险：
    - 后续改动集中在单文件，review 面积过大且回归成本偏高

- [S3][已修复] `usersApi` 列表接口参数通过字符串拼接构造，缺少统一编码与可维护性收敛
  - 证据：
    - 查询路径提取到 `query-paths.ts`，统一使用 `URLSearchParams` 构建
    - 新增 `api-paths.test.ts` 覆盖可选参数与编码场景
  - 定位：
    - `apps/moryflow/admin/src/features/users/query-paths.ts:4`
    - `apps/moryflow/admin/src/features/users/query-paths.ts:26`
    - `apps/moryflow/admin/src/features/users/api.ts:19`
    - `apps/moryflow/admin/src/features/users/api-paths.test.ts:4`
  - 风险：
    - 参数扩展时更容易出现编码遗漏、重复拼接和条件分支散落

## 分步修复计划（模块 A）

1. A-1：修复 `SetTierDialog` 状态同步（受控值 + `currentTier` 变化重置 + 关闭时清理 `selectedUser`）。（已完成）
2. A-2：将 `UsersPage` 列表区改为“状态片段 + `renderContentByState/switch`”，移除链式三元。（已完成）
3. A-3：拆分 `UsersPage`（筛选区 / 列表区 / 对话框编排）并保持页面层仅做装配。（已完成）
4. A-4：重构 `usersApi` 查询参数构造为 `URLSearchParams`（或等价方法）统一编码。（已完成）
5. A-5：模块级回归与一致性复查（组件边界、状态模型、请求参数映射）。（已完成）

## 建议验证命令（执行修复后）

- `pnpm --filter @moryflow/admin lint`
- `pnpm --filter @moryflow/admin typecheck`
- `pnpm --filter @moryflow/admin test:unit`

## 进度记录

| Step | Module | Action | Status | Validation | Updated At | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| A-0 | auth/dashboard/users | 预扫描（不改代码） | done | n/a | 2026-02-26 | 识别 `S1x1 / S2x2 / S3x1` |
| A-1 | auth/dashboard/users | 修复 `SetTierDialog` 目标用户切换状态同步 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | `SetTierDialog` 改为受控值 + `currentTier` 变化重置；对话框关闭时清理 `selectedUser` |
| A-2 | auth/dashboard/users | `UsersPage` 列表区状态片段化（移除链式三元） | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `UsersTableViewState` 与 `renderRowsByState + switch`；补齐 error 状态片段 |
| A-3 | auth/dashboard/users | `UsersPage` 职责拆分（筛选/列表/弹窗编排） | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `UsersFilterBar` 与 `UsersTable`；`UsersPage` 收敛为容器编排层 |
| A-4 | auth/dashboard/users | `usersApi` 查询参数构造收敛 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `query-paths.ts`；列表与删除记录查询改为 `URLSearchParams` |
| A-5 | auth/dashboard/users | 模块级回归与一致性复查 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit`（pass） | 2026-02-26 | 新增 `set-tier-dialog.test.tsx` 与 `api-paths.test.ts`；全量单测 13 files / 69 tests 通过 |
