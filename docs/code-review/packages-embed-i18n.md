---
title: packages/embed & packages/i18n Code Review
date: 2026-01-24
scope: packages/embed, packages/embed-react, packages/i18n
status: done
---

<!--
[INPUT]: packages/embed, packages/embed-react, packages/i18n
[OUTPUT]: 问题清单 + 修复建议 + 进度记录
[POS]: Phase 4 / P3 模块审查记录（Embed/i18n）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# packages/embed & packages/i18n Code Review

## 范围

- Embed SDK：`packages/embed/`
- Embed React：`packages/embed-react/`
- i18n：`packages/i18n/`

## 结论摘要

- 高风险问题（P1）：0 个
- 中风险问题（P2）：1 个（已修复）
- 低风险/规范问题（P3）：4 个（已修复）
- 待确认/延后：0 个

## 发现（按严重程度排序）

- [P2] Embed 组件对 photo/link 类型不渲染
  - 调研：
    - oEmbed 规范中，`photo` 类型通常返回 `url` 字段而非 `html`
    - 当前实现仅渲染 `html`，导致 `photo/link` 类型在 UI 中为空白
  - 解决方案（已落地）：
    - `photo` 类型渲染 `<img>`（支持宽高与 fallback alt）
    - `link`/无 `html` 场景回退为外链 `<a>`（指向原始 URL）
    - 补充单元测试覆盖 photo/link 渲染路径
  - 关联改动：
    - `packages/embed-react/src/components/Embed.tsx`
    - `packages/embed-react/test/embed.test.tsx`

- [P3] Embed/Embed-React 内部 import 使用 `.ts/.tsx` 后缀
  - 调研：
    - 仓库内多数包采用“无后缀 import + tsc-multi 输出 .js”模式
    - 保留 `.ts` 后缀会导致构建产物路径与规范不一致
  - 解决方案（已落地）：
    - 移除本地 import 的 `.ts/.tsx` 后缀
    - 同步移除 `allowImportingTsExtensions` 配置
  - 关联改动：
    - `packages/embed/src/index.ts`
    - `packages/embed/src/client.ts`
    - `packages/embed/src/utils/index.ts`
    - `packages/embed/src/utils/provider-detect.ts`
    - `packages/embed-react/src/index.ts`
    - `packages/embed-react/src/components/index.ts`
    - `packages/embed-react/src/hooks/index.ts`
    - `packages/embed-react/src/hooks/useEmbedContext.ts`
    - `packages/embed-react/tsconfig.json`
    - `packages/embed/tsconfig.json`

- [P3] Embed-React 缺少 client 边界与请求生命周期保护
  - 调研：
    - Hooks/组件在 RSC/SSR 场景需要显式 `use client` 边界
    - 异步请求未防抖/未标记 latest，可能覆盖最新状态或在卸载后更新
  - 解决方案（已落地）：
    - Hook/组件补齐 `use client` 边界
    - `useEmbed` 增加 mounted/refetch guard，避免竞态更新
  - 关联改动：
    - `packages/embed-react/src/context.tsx`
    - `packages/embed-react/src/components/Embed.tsx`
    - `packages/embed-react/src/components/EmbedProvider.tsx`
    - `packages/embed-react/src/components/EmbedSkeleton.tsx`
    - `packages/embed-react/src/hooks/useEmbed.ts`
    - `packages/embed-react/src/hooks/useEmbedContext.ts`

- [P3] i18n 常量文件存在未使用字段，storage key 硬编码
  - 调研：
    - `LANGUAGE_COOKIE_NAME`/header/日期模板等常量未被引用
    - `useLanguage` 直接写死 storage key，易出现多处不一致
  - 解决方案（已落地）：
    - 删除未使用常量，缩小维护面
    - `useLanguage` 改用 `LANGUAGE_STORAGE_KEY`
  - 关联改动：
    - `packages/i18n/src/core/constants.ts`
    - `packages/i18n/src/hooks/useLanguage.ts`

- [P3] Embed/i18n 核心文件缺少标准化文件头注释
  - 调研：
    - 仓库约束要求关键文件包含 `[PROVIDES]/[INPUT]/[POS]` 等头注释
  - 解决方案（已落地）：
    - 补齐 Embed/i18n 关键入口与核心模块的头注释与协议说明
  - 关联改动：
    - `packages/embed/src/index.ts`
    - `packages/embed/src/client.ts`
    - `packages/embed/src/types.ts`
    - `packages/embed/src/errors.ts`
    - `packages/embed/src/utils/index.ts`
    - `packages/embed/src/utils/provider-detect.ts`
    - `packages/embed-react/src/index.ts`
    - `packages/embed-react/src/context.tsx`
    - `packages/embed-react/src/components/Embed.tsx`
    - `packages/embed-react/src/components/EmbedProvider.tsx`
    - `packages/embed-react/src/components/EmbedSkeleton.tsx`
    - `packages/embed-react/src/hooks/useEmbed.ts`
    - `packages/embed-react/src/hooks/useEmbedContext.ts`
    - `packages/i18n/src/index.ts`
    - `packages/i18n/src/core/i18n.ts`
    - `packages/i18n/src/core/constants.ts`
    - `packages/i18n/src/core/types.ts`
    - `packages/i18n/src/hooks/useTranslation.ts`
    - `packages/i18n/src/hooks/useLanguage.ts`
    - `packages/i18n/src/utils/format-helpers.ts`
    - `packages/i18n/src/utils/date-locale.ts`
    - `packages/i18n/src/utils/validation.ts`
    - `packages/i18n/src/translations/index.ts`

## 修复计划与进度

- 状态：done
- 已完成：以上问题全部修复并补充单测
- 验证记录（2026-01-24）：
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test:unit`
