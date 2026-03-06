---
title: Moryflow 部署与排障 Runbook
date: 2026-02-28
scope: www.moryflow.com, server.moryflow.com, moryflow.app
status: active
---

# 部署基线

- Compose 入口：`deploy/moryflow/docker-compose.yml`。
- 关键变量：`PUBLIC_BASE_URL`、`ALLOWED_ORIGINS`、`COOKIE_DOMAIN`、`POSTGRES_URL`、`REDIS_URL`。
- 反代需正确透传 `Host` 与 `X-Forwarded-*` 头。

## 桌面与移动发布

- PC 自动更新：R2-only，`latest*.yml` 禁缓存。
- macOS：必须签名 + 公证（Developer ID + Notarization）。
- iOS：建议 EAS 托管证书 + App Store Connect API Key 提交。

## 认证链路排障

- `ERR_CONNECTION_CLOSED` 先查入口 TLS/反代可用性，再查客户端逻辑。
- Token-first 链路要求：无 refresh token fail-fast；网络失败不盲目清会话。
- 登录/验证码流程要避免内嵌 form 冒泡导致弹窗异常关闭。
