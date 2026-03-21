# Membership

> ⚠️ 本目录结构变更时，必须同步更新此文档

## 定位

PC 主进程内与 membership 账号、桌面端鉴权和 OAuth 回流相关的稳定模块。

## 职责

- membership API base URL 统一解析
- main 进程 membership 状态桥接
- access / refresh token 本地持久化
- OAuth deep link 与 loopback callback 处理
- 桌面端 membership 设备请求头
- membership 登录态变更后的运行时协调

## 约束

- membership base URL 只能以 `api-url.ts` 为事实源，禁止分散硬编码
- token-first auth 只允许发送桌面端设备上下文头，禁止在 main 进程自行拼装 `Origin/Referer`
- token 本地存储统一走 `storage/desktop-store.ts`
- OAuth 回流仅允许 `code + nonce` 契约，日志中必须脱敏

## 成员清单

| 文件/目录         | 类型 | 说明                              |
| ----------------- | ---- | --------------------------------- |
| `api-url.ts`      | 文件 | membership API base URL 事实源    |
| `bridge.ts`       | 文件 | main 进程 membership 状态桥接     |
| `token-store.ts`  | 文件 | access / refresh token 本地持久化 |
| `auth-headers.ts` | 文件 | 桌面端 membership 设备请求头      |
| `runtime.ts`      | 文件 | 登录态变化后的运行时协调          |
| `oauth/`          | 目录 | OAuth deep link / loopback 工具   |

## 常见修改场景

| 场景                    | 涉及文件                  | 注意事项                           |
| ----------------------- | ------------------------- | ---------------------------------- |
| 修改桌面端登录/刷新 URL | `api-url.ts`, `bridge.ts` | 不得分散出第二个 URL 事实源        |
| 修改本地 token 持久化   | `token-store.ts`          | 保持 store 名称与 key 不变         |
| 修改 OAuth 回流         | `oauth/`                  | 保持 `code + nonce` 契约与日志脱敏 |
| 修改登录态重协调        | `runtime.ts`              | 不得改变 reset / reinit 顺序       |
