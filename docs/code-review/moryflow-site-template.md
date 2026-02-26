---
title: Moryflow Site Template Code Review
date: 2026-02-26
scope: apps/moryflow/site-template
status: in_progress
---

<!--
[INPUT]: apps/moryflow/site-template（模块 A：layouts/templates）
[OUTPUT]: 模块 A 问题清单（S1/S2/S3）+ 修复落地记录 + 进度台账
[POS]: Phase 3 / P2 模块审查记录（Moryflow Site Template）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Moryflow Site Template Code Review

## 范围

- 项目：`apps/moryflow/site-template`
- 本轮模块：`src/layouts`、`src/templates`
- 约束：仅处理 `apps/moryflow/site-template`；`apps/anyhunt/docs` 与 `apps/moryflow/docs` 不纳入本轮

## 结论摘要（模块 A：修复完成）

- `S1`（必须改）：2 项
- `S2`（建议本轮改）：3 项
- `S3`（可延后）：1 项
- 当前状态：模块 A 已完成 A-1~A-5 修复落地与文档回写

## 发现（按严重度排序）

- [S1][已修复] 布局模板“双真源”导致语义漂移
  - 证据：
    - 删除 `src/layouts/*`，保留 `src/templates/*` 作为发布模板真源
    - `build` 增加模板契约校验：`src/build.ts:18`、`src/build.ts:79`
  - 修复：
    - 移除 React 布局双轨实现，发布模板统一回到 `src/templates/*`

- [S1][已修复] `layouts` 产物与发布导出链路脱节
  - 证据：
    - `build` 不再产出 `single/multi.html`，只生成样式并做契约校验：`src/build.ts:98`、`src/build.ts:111`
    - `sync` 继续从 `src/templates/*` 导出：`scripts/sync.ts:135`、`scripts/sync.ts:192`
  - 修复：
    - 消除“改 layouts 不生效”的路径，发布链路单一且可验证

- [S2][已修复] 主题切换按钮在多模板重复粘贴
  - 证据：
    - 页面模板改为片段占位：`src/templates/page.html:26`、`src/templates/index-page.html:17`
    - 统一片段源：`src/templates/fragments/theme-toggle-button.html:1`
    - `sync` 片段注入：`scripts/sync.ts:45`、`scripts/sync.ts:88`
  - 修复：
    - 主题按钮维护点收敛为单文件

- [S2][已修复] `MultiPage` 内联样式导致样式源分散
  - 证据：
    - `src/layouts/MultiPage.tsx` 已移除，布局样式统一由 `src/styles` + `src/templates/*.css` 承载
  - 修复：
    - 删除内联样式路径，消除分散样式源

- [S2][已修复] `page.html` 与 `sidebar.html` 插槽契约不显式
  - 证据：
    - 页面插槽注释显式化：`src/templates/page.html:14`
    - 侧边栏片段契约注释：`src/templates/sidebar.html:1`
  - 修复：
    - 明确插槽边界，降低重排误改风险

- [S3][已修复] 品牌外链文案多点硬编码
  - 证据：
    - 模板改为占位：`src/templates/page.html:36`、`src/templates/index-page.html:25`
    - 统一片段源：`src/templates/fragments/brand-footer-link.html:1`
  - 修复：
    - 品牌文案收敛为单一片段源

## 修复执行（模块 A）

1. A-1：删除 `src/layouts/*`，发布模板真源收敛为 `src/templates/*`。
2. A-2：统一 `favicon` 占位写法；在 `sync` 对非 page 模板落地默认值 `/favicon.ico`。
3. A-3：新增模板片段目录 `src/templates/fragments/`，抽离 theme-toggle 与品牌 footer。
4. A-4：移除 `MultiPage` 内联样式来源（随 layouts 删除完成收敛）。
5. A-5：`build` 新增模板契约校验（占位符缺失即失败），并执行模块级命令验证。

## 模块 A 验证命令（修复阶段执行）

```bash
pnpm --filter @moryflow/site-template typecheck
pnpm --filter @moryflow/site-template build
pnpm --filter @moryflow/site-template sync
rg -n "PAGE_TEMPLATE|SIDEBAR_TEMPLATE|INDEX_PAGE_TEMPLATE|ERROR_404_TEMPLATE|THEME_TOGGLE_SCRIPT|favicon" apps/moryflow/pc/src/main/site-publish/template
```

## 验证结果

- `pnpm --filter @moryflow/site-template typecheck`：**pass**
- `pnpm --filter @moryflow/site-template build`：**pass**
- `pnpm --filter @moryflow/site-template sync`：**skip**（本轮按范围仅改 `site-template`，避免触发 `apps/moryflow/pc/src/main/site-publish/template/*` 生成物变更）
- 静态校验：**pass**
  - `src/layouts` 已删除；
  - `page/index/404` 已统一 `{{favicon}}` 占位；
  - `THEME_TOGGLE_BUTTON` / `BRAND_FOOTER_LINK` 片段占位已接入；
  - `build` 契约校验已生效。

## 进度记录

| Step | Module            | Action                    | Status | Validation                                          | Updated At | Notes                                                                      |
| ---- | ----------------- | ------------------------- | ------ | --------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| A-0  | layouts/templates | 预扫描（仅问题清单）      | done   | n/a                                                 | 2026-02-26 | 输出 `S1x2 / S2x3 / S3x1`，待确认后进入 A-1                                |
| A-1  | layouts/templates | 分步重构与修复（A-1~A-5） | done   | `typecheck` pass + `build` pass；`sync` 按范围 skip | 2026-02-26 | 完成单一真源收敛、模板片段化、契约校验接入、`site-template/CLAUDE.md` 同步 |
