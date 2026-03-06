---
title: Anyhunt 部署与排障 Runbook
date: 2026-02-28
scope: anyhunt.app, server.anyhunt.app, console.anyhunt.app, admin.anyhunt.app
status: active
---

# 部署前检查

- 数据基础设施：PostgreSQL（主库 + 向量库）、Redis。
- 域名与证书：`anyhunt.app`、`server.anyhunt.app`、`console.anyhunt.app`、`admin.anyhunt.app`、`docs.anyhunt.app`。
- 关键环境变量：`ALLOWED_ORIGINS`、`TRUSTED_ORIGINS`、`BETTER_AUTH_URL`、`SERVER_URL`。

## 建议发布顺序

1. `anyhunt-server`
2. `anyhunt-www`
3. `anyhunt-console`
4. `anyhunt-admin`
5. `anyhunt-docs`

## 常见故障

- 旧路径报错（如 `apps/aiget/...`）：检查 Dokploy 项目目录与 Dockerfile 路径是否已切换到 `apps/anyhunt/*`。
- 鉴权跨域异常：校验 `TRUSTED_ORIGINS` 与反向代理头透传。
- API 404：确认客户端是否仍调用已删除旧路径（`/api/v1/console/*`、旧 digest ApiKey 路径）。
