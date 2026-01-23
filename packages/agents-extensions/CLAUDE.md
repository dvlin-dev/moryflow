# Agents Extensions

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Agents SDK 的扩展包，补充外围集成能力（如 WebSocket/Provider 适配等）。

## 职责

- 提供与 `agents-core` 兼容的扩展实现
- 统一扩展导出入口与类型定义
- 输出构建元信息（`src/metadata.ts` 自动生成）

## 约束

- 保持与 `@anyhunt/agents` 的 API 协同
- `src/metadata.ts` 由 `prebuild` 自动生成，禁止手改

## 近期变更

- 刷新自动生成的 `metadata.ts`
