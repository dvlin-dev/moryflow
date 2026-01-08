# @aiget/auth-client

> 通用 Auth 客户端 SDK（按业务线配置）

## 定位

提供面向 Web/PC/移动端的统一 Auth 调用封装，不内置域名与业务线配置。

## 职责

- 提供 `createAuthClient` 工厂方法
- 封装注册/登录/刷新/登出/查询用户的请求流程
- 支持 Google/Apple 登录流程（start/token）
- 统一 `X-Client-Type` 处理与错误包装

## 约束

- `baseUrl` 必须指向 `/api/v1/auth`（如 `https://app.moryflow.com/api/v1/auth`）
- Web 默认使用 Cookie（`credentials: include`）；Native 必须传 refresh token
- 不保存任何 token 状态；由调用方负责持久化
- 订阅等级类型复用 `@aiget/types`

## 成员清单

| 文件            | 类型 | 说明               |
| --------------- | ---- | ------------------ |
| `src/index.ts`  | 入口 | 导出客户端与类型   |
| `src/client.ts` | 实现 | 请求封装与错误处理 |
| `src/types.ts`  | 类型 | DTO 与客户端类型   |

## 使用方式

```typescript
import { createAuthClient } from '@aiget/auth-client';

const auth = createAuthClient({
  baseUrl: 'https://app.moryflow.com/api/v1/auth',
  clientType: 'web',
});

const result = await auth.login({ email, password });
```
