---
title: 工程基线 / Root Tooling Code Review
date: 2026-01-23
scope: root configs, scripts
status: done
---

<!--
[INPUT]: package.json, pnpm-workspace.yaml, pnpm-lock.yaml, turbo.json, eslint.config.mjs, tsconfig.base.json, .npmrc, scripts/*
[OUTPUT]: 工程基线 review 发现与修复建议
[POS]: Phase 0 / P0 模块审查记录（工程基线）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# 工程基线 / Root Tooling Code Review

## 范围

- 入口点：根 `package.json` 的脚本（lint/typecheck/test/build）
- 关键文件：`package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`、`turbo.json`、`eslint.config.mjs`、`tsconfig.base.json`、`.npmrc`
- 脚本：`scripts/`（embed 元信息与系统兼容性补丁）

## 结论摘要

- 高风险问题（P0）：无
- 中风险问题（P1）：1 个（npmrc 与 Docker 安装规范冲突，已修复）
- 低风险问题（P2/P3）：2 个（元信息脚本前缀、跨平台 clean，已修复）

## 发现（按严重程度排序）

- [P1] `.npmrc` 仍开启 `shamefully-hoist=true` 且未显式设置 `node-linker=hoisted`，与根 `CLAUDE.md` 的 Docker 约束（“node-linker=hoisted 且关闭 shamefully-hoist”）不一致，可能导致 Docker 安装阶段失败或依赖布局不一致。（已修复）
- [P2] `scripts/embedMeta.cjs` 仍以 `@moryflow/` 过滤依赖版本，当前 packages 已迁移至 `@anyhunt/*`，会导致 `@anyhunt/agents*` 生成的 metadata 缺失内部依赖版本。（已修复）
- [P3] 根 `clean` 脚本使用 `rm -rf node_modules`，在 Windows 环境不可用，与 `supportedArchitectures` 的 win32 声明不一致。（已修复）

## 修复计划与进度

- 已完成：
  - `.npmrc` 对齐 Docker 安装策略（`node-linker=hoisted` + `shamefully-hoist=false`）
  - `scripts/embedMeta.cjs` 同步为 `@anyhunt/` 前缀
  - `clean` 脚本改为跨平台实现（`node scripts/clean.cjs`）
- 状态：done
- 验证：`pnpm lint` / `pnpm typecheck` / `pnpm test:unit`
