# Agents Realtime

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Realtime 语音/流式 Agent 能力包，支持 Browser/Node/Workerd 多平台。

## 职责

- Realtime 协议与会话管理
- 多平台 shim 导出（`_shims`）
- Realtime 构建产物与 bundle 输出
- 输出构建元信息（`src/metadata.ts` 自动生成）

## 约束

- `src/metadata.ts` 由 `prebuild` 自动生成，禁止手改
- bundle 构建由 `vite build` 产出，避免手动修改产物

## 近期变更

- 刷新自动生成的 `metadata.ts`
