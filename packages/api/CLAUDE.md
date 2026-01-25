# /api

> Anyhunt/Moryflow 共享 API 客户端与类型（不承载业务逻辑）

## 定位

- 提供统一的 API Client（`createServerApiClient`）与类型定义
- 规范 token 注入、401 刷新重试、错误结构

## 关键文件

- `src/client/create-client.ts`：统一请求入口，401 仅重试一次
- `src/client/types.ts`：`TokenProvider` 与客户端接口类型
- `src/membership/*`：会员模型与错误码映射

## 使用方式

```ts
import { createServerApiClient } from '@anyhunt/api/client';

const client = createServerApiClient({
  baseUrl: MEMBERSHIP_API_URL,
  tokenProvider: { getToken: getAccessToken },
  onUnauthorized: refreshAccessToken,
});
```

## 约束

- 只接受 access token（refresh 由端侧管理）
- 401 只允许刷新重试一次，避免无限循环
- 禁止引入 axios，统一使用 fetch

## 最近变更

- 增加 `onUnauthorized` 重试回调（用于刷新 access）
- 会员展示文案统一为英文，移除未使用的会员比较/错误映射导出
- `MEMBERSHIP_API_URL` 默认值对齐 `app.moryflow.com`
- FileIndex 类型收敛为 v2（向量时钟），移除旧版兼容结构
- FileIndex 增加 `lastSyncedSize/lastSyncedMtime` 字段用于本地变更预过滤
- 错误解析统一为 RFC7807（ProblemDetails），补齐 requestId 与 errors 透传
