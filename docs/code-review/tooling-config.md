---
title: tooling/* Code Review
date: 2026-01-24
scope: tooling/*
status: done
---

## 范围

- `tooling/eslint-config/`
- `tooling/typescript-config/`
- `tooling/tailwind-config/`（已判定未使用，已移除）

## 结论

- ESLint 配置存在规则缺口与依赖声明不完整，已补齐
- Tailwind 配置包在仓库内无引用，按“无用即删”原则移除

## 问题与修复

### 1) React ESLint 配置缺少官方推荐规则

- 影响：React/JSX 规范检查不足，潜在问题无法被 lint 捕获
- 解决方案：引入 `eslint-plugin-react` 与 `eslint-plugin-react-hooks` 的推荐配置
- 修复文件：`tooling/eslint-config/react.mjs`

### 2) eslint-plugin-prettier 推荐配置缺少依赖声明

- 影响：`eslint-config-prettier` 未在 config 包内显式声明，跨项目复用容易报错
- 解决方案：补齐 `eslint-config-prettier` 依赖
- 修复文件：`tooling/eslint-config/package.json`

### 3) NestJS ESLint 配置未声明 Vitest 全局

- 影响：使用 `vi` 的测试可能被误报未定义
- 解决方案：补齐 `globals.vitest`
- 修复文件：`tooling/eslint-config/nestjs.mjs`

### 4) Tailwind 配置包未被引用

- 影响：无效维护成本
- 解决方案：移除 `tooling/tailwind-config/`，后续由应用侧 `@source` 扫描路径兜底
- 修复文件：删除 `tooling/tailwind-config/*`

## 验证

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit`
