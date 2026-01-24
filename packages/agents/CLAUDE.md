# Agents

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

OpenAI Agents SDK 的顶层聚合包（Anyhunt 内部封装），统一导出 core/openai/realtime 能力。

## 职责

- 聚合导出 `@anyhunt/agents-core` / `@anyhunt/agents-openai` / `@anyhunt/agents-realtime`
- 提供 `utils` 与 `realtime` 子路径入口
- 输出构建元信息（`src/metadata.ts` 自动生成）

## 约束

- 保持与上游 Agents SDK 的 API 一致性
- `src/metadata.ts` 由 `prebuild` 自动生成，禁止手改

## 近期变更

- 2026-01-24：刷新自动生成的 `metadata.ts`
