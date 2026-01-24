---
title: packages/ui Code Review
date: 2026-01-24
scope: packages/ui
status: done
---

<!--
[INPUT]: packages/ui
[OUTPUT]: 问题清单 + 修复建议 + 进度记录
[POS]: Phase 4 / P3 模块审查记录（packages/ui）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# packages/ui Code Review

## 范围

- UI 组件库：`packages/ui/src/`
- 样式入口：`packages/ui/styles/`
- 包配置：`packages/ui/package.json`

## 结论摘要

- 高风险问题（P1）：0 个
- 中风险问题（P2）：0 个
- 低风险/规范问题（P3）：6 个（已修复）
- 待确认/延后：0 个

## 发现（按严重程度排序）

- [P3] Sidebar 使用 `radix-ui` 聚合包且 `offExamples` 命名不一致
  - 调研：
    - 包内其它组件统一使用 `@radix-ui/react-slot`，Sidebar 的 `radix-ui` import 造成依赖不一致与包体冗余
    - `offcanvas` 为业内通用命名（侧边栏折叠/抽屉语义），更清晰
  - 解决方案（已落地）：
    - Sidebar 改为 `@radix-ui/react-slot`
    - `offExamples` 统一为 `offcanvas`
    - 移除 `radix-ui` 依赖
  - 关联改动：
    - `packages/ui/src/components/sidebar.tsx`
    - `packages/ui/package.json`

- [P3] Base UI Accordion open 状态冗余 + 类型不匹配风险
  - 调研：
    - `@base-ui-components/react/accordion` 的 value 为数组结构（类型声明）
    - 现有实现通过 `useState + useEffect` 派生状态，额外渲染且依赖链过长
  - 解决方案（已落地）：
    - 内部状态改为数组类型
    - `isOpen` 直接由当前 value 派生，移除多余 state/effect
    - 精简 AccordionItem context（移除未使用 setter）
  - 关联改动：
    - `packages/ui/src/animate/primitives/base/accordion.tsx`

- [P3] Highlight 组件暴露 `ref` 但未 `forwardRef`
  - 调研：
    - 函数组件未使用 `forwardRef` 时，`ref` 不会透传（`useImperativeHandle` 实际无效）
  - 解决方案（已落地）：
    - 移除无效 `ref` props 与 `useImperativeHandle`
    - 保留内部测量 `ref` 逻辑
  - 关联改动：
    - `packages/ui/src/animate/primitives/effects/highlight.tsx`

- [P3] Chart Tooltip 对 `0` 值不渲染
  - 调研：
    - 0 是合法数据点，使用 truthy 判断会误删有效值
  - 解决方案（已落地）：
    - 改为 `value !== undefined && value !== null` 判断
    - 补充回归单测
  - 关联改动：
    - `packages/ui/src/components/chart.tsx`
    - `packages/ui/test/chart.test.tsx`

- [P3] 多个组件缺少 client 边界，lib 入口混入 client-only 导出
  - 调研：
    - React hooks 在 RSC/SSR 场景要求明确的 client 边界
    - `getStrictContext` 属于 client-only hook，放在通用 `lib` 入口会污染边界
  - 解决方案（已落地）：
    - 为 hook 组件与动画基元补齐 `use client`
    - `lib/index.ts` 移除 `getStrictContext` 统一入口导出（保留直达路径）
  - 关联改动：
    - `packages/ui/src/components/form.tsx`
    - `packages/ui/src/components/input-otp.tsx`
    - `packages/ui/src/components/live-waveform.tsx`
    - `packages/ui/src/animate/primitives/base/accordion.tsx`
    - `packages/ui/src/animate/primitives/base/files.tsx`
    - `packages/ui/src/animate/primitives/effects/highlight.tsx`
    - `packages/ui/src/hooks/use-controlled-state.tsx`
    - `packages/ui/src/lib/get-strict-context.tsx`
    - `packages/ui/src/lib/index.ts`

- [P3] packages/ui 缺少单测基线
  - 调研：
    - 仓库门禁要求 `pnpm test:unit`，packages/ui 未配置单测入口
  - 解决方案（已落地）：
    - 新增 vitest 配置与基础用例（Accordion/Chart）
    - 增加 `test:unit` 脚本与测试依赖
  - 关联改动：
    - `packages/ui/vitest.config.ts`
    - `packages/ui/test/accordion.test.tsx`
    - `packages/ui/test/chart.test.tsx`
    - `packages/ui/package.json`

## 修复计划与进度

- 状态：done
- 已完成：以上问题全部修复并补充单测
- 验证记录（2026-01-24）：
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test:unit`
