# /api

> Anyhunt/Moryflow 共享 API 客户端与类型（不承载业务逻辑）

## 定位

- 提供统一的函数式 API Client（`createApiClient` / `createApiTransport`）与类型定义
- 规范 token 注入、401 刷新重试、错误结构

## 关键文件

- `src/client/create-api-client.ts`：统一请求入口，401 仅重试一次
- `src/client/transport.ts`：纯传输层（query/body/timeout/response 解析）
- `src/client/types.ts`：客户端与鉴权模式类型
- `src/membership/*`：会员模型与错误码映射

## 使用方式

```ts
import { createApiClient } from '@moryflow/api/client';

const client = createApiClient({
  baseUrl: MEMBERSHIP_API_URL,
  getAccessToken,
  onUnauthorized: refreshAccessToken,
});
```

## 约束

- 只接受 access token（refresh 由端侧管理）
- 401 只允许刷新重试一次，避免无限循环
- 禁止引入 axios，统一使用 fetch

## 稳定事实

- `AUTH_API` 维护共享认证路径常量，包含 Google OAuth start/check、bridge callback、exchange、refresh、logout 等端间共用入口。
- membership 相关模型与 thinking 合同以 `@moryflow/model-bank` 为单一事实源；本包不再维护独立默认映射。
- 传输层统一输出 RFC7807 风格错误解析，并兼容非 JSON 错误 body 与一次 401 刷新重试。
- 包导出以 `dist` 双格式产物为准，Node 侧 CJS/ESM 入口必须与构建产物保持一致。
