---
title: Moryflow PC 登录/注册触发 refresh 连接关闭（ERR_CONNECTION_CLOSED）排查与修复
date: 2026-02-24
scope: moryflow pc, auth, server.moryflow.com
status: active
---

<!--
[INPUT]: Moryflow PC 登录/注册后设置弹窗异常 + `/api/v1/auth/refresh` 长时间 pending 后 `ERR_CONNECTION_CLOSED`
[OUTPUT]: 根因判断 + 分层修复方案（入口链路、客户端兜底、回归验证）
[POS]: Moryflow PC 认证异常排障 Runbook

[PROTOCOL]: 仅在相关索引、跨文档事实引用或全局协作边界失真时，才同步更新对应文档。
-->

# Moryflow PC 登录/注册触发 refresh 连接关闭排查与修复

## 当前状态

1. PC 端认证链路已经切到 Token-first，不再依赖 Cookie fallback 建立本地会话。
2. `refreshAccessToken()` 在缺少 refresh token 时会 fail-fast 返回，不再发无意义网络请求。
3. 登录、验证码验证、refresh 网络超时、loading 行为与错误解析都已收口到当前实现。
4. 本文只保留当前根因判断、修复口径与验收标准；按日期维护的实施进度日志不再继续维护。

## 现象

- Moryflow PC 点击注册或登录后，设置弹窗表现为闪退或异常关闭。
- 开发者工具持续报错：`POST https://server.moryflow.com/api/v1/auth/refresh net::ERR_CONNECTION_CLOSED`
- 登录面板长期 loading，请求通常 pending 约 20s 后失败。

## 根因判断

1. `server.moryflow.com` 入口一度在 TLS/反代链路上异常关闭连接，问题不只在前端。
2. 旧的客户端刷新逻辑在 refresh token 缺失或网络失败时会放大异常表现，导致登录面板长时间 loading。
3. 认证请求路径、Better Auth baseURL 与出站 transport 语义曾存在不一致，造成局部 404、异常冒泡与 mock 失效。

## 当前修复口径

1. PC 与 Mobile 的认证接口统一显式走 `/api/v1/auth/*`。
2. 登录与验证码验证统一使用 Token-first 路径，成功后直接写入 access 与 refresh token。
3. refresh 请求带超时；网络错误不会清理仍有效的本地 access token。
4. 未登录场景不再展示全局 skeleton，只保留按钮级 loading 与表单错误回显。
5. `packages/api` 与 server-http-client 的 transport 语义已统一，避免非 `ok` 响应或 mock 环境下再次放大认证异常。

## 验收标准

1. 未登录启动时，登录页应快速可交互，不再被长时间 refresh loading 卡住。
2. 登录与注册失败时，界面显示明确错误，不出现设置弹窗异常关闭。
3. 认证链路恢复后，`/api/v1/auth/refresh` 能返回正常 HTTP 响应，不再 `ERR_CONNECTION_CLOSED`。
4. 相关前端与服务端回归测试覆盖并通过。

## 当前验证基线

1. `apps/moryflow/pc` 负责 auth session、login panel、otp form 与 account 区 loading 回归。
2. `apps/moryflow/mobile` 负责同类 auth API、session 与 refresh 路径回归。
3. Moryflow/Anyhunt server 负责 `/api/v1/auth/*`、token controller 与 transport 语义回归。
4. 线上入口 TLS/反代可用性仍是独立运维事实，需通过入口探针与部署配置持续观测。
