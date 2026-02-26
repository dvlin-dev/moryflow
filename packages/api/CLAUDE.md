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

## 最近变更

- Membership 模型类型契约升级：`thinking_profile` 改为强制字段（含 `supportsThinking/defaultLevel/levels`），与 Moryflow Server `/v1/models` 契约保持一致（2026-02-26）
- 错误响应解析增强：非 JSON `content-type` 场景下，仍尝试解析 body（支持 `text/plain + JSON 字符串` 与纯文本错误消息），避免前端降级显示 `Request failed (status)`
- 修复包入口声明：CJS 导出统一指向 `.cjs` 产物（`main`/`exports.require`），避免 Node 运行期解析到不存在的 `dist/*.js` 报 `MODULE_NOT_FOUND`
- 增加 `onUnauthorized` 重试回调（用于刷新 access）
- 会员展示文案统一为英文，移除未使用的会员比较/错误映射导出
- `MEMBERSHIP_API_URL` 默认值对齐 `server.moryflow.com`
- FileIndex 类型收敛为 v2（向量时钟），移除旧版兼容结构
- FileIndex 增加 `lastSyncedSize/lastSyncedMtime` 字段用于本地变更预过滤
- 错误解析统一为 RFC7807（ProblemDetails），补齐 requestId 与 errors 透传
- 非 JSON 成功响应视为异常（`UNEXPECTED_RESPONSE`）
- 新增 create-client 非 JSON 回归测试，补齐 `test:unit`
- 修复 raw/stream 响应被提前消费导致调用方二次读取 body 失败的问题
- 错误消息回退增强：`detail -> message -> title -> Request failed`
- `createApiTransport` 增加 `baseUrl` 归一化（自动补尾 `/`），避免 `new URL(path, baseUrl)` 在子路径场景下丢段
