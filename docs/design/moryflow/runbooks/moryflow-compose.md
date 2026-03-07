---
title: Moryflow（4c6g）docker compose 部署
date: 2026-03-07
scope: moryflow, docker-compose
status: active
---

<!--
[INPUT]: Moryflow 使用单份 docker compose；域名反代在 megaboxpro；DB/Redis 与 Anyhunt Dev 物理隔离
[OUTPUT]: 可照做的部署顺序与最小环境变量清单
[POS]: Moryflow 部署 runbook（不讨论架构决策）

[PROTOCOL]: 仅在相关索引、跨文档事实引用或全局协作边界失真时，才同步更新对应文档。
-->

# Moryflow（4c6g）docker compose 部署

## 入口文档

- 架构与端口：`docs/design/anyhunt/core/domains-and-deployment.md`
- compose 文件：`deploy/moryflow/docker-compose.yml`

## 部署顺序（建议）

1. 拉取/构建镜像（按实际方式）
2. 启动 compose
3. 通过 megaboxpro 配置域名反代
4. 验收 `/health` 与关键页面

## 常用命令

```bash
cp deploy/moryflow/.env.example deploy/moryflow/.env
docker compose -f deploy/moryflow/docker-compose.yml --env-file deploy/moryflow/.env config
docker compose -f deploy/moryflow/docker-compose.yml up -d
docker compose -f deploy/moryflow/docker-compose.yml ps
docker compose -f deploy/moryflow/docker-compose.yml logs -f --tail=200
```

## 环境变量（示例口径）

> 具体以服务实际读取的变量为准；这里作为“需要哪些类别”的清单。

- `PUBLIC_BASE_URL=https://server.moryflow.com`
- `ALLOWED_ORIGINS=https://www.moryflow.com,https://admin.moryflow.com,https://server.moryflow.com`
- `COOKIE_DOMAIN=.moryflow.com`
- `POSTGRES_URL=...`
- `REDIS_URL=...`
- `SYNC_ACTION_SECRET=$(openssl rand -base64 32)`：云同步 receipt token 签名密钥，`moryflow-server` 必填；禁止复用 `STORAGE_API_SECRET`
- 多实例 `moryflow-server` 必须共享同一个 `SYNC_ACTION_SECRET`；轮换时需要整组实例同时切换，避免旧 receipt token 在默认 `900s` TTL 窗口内跨实例验签失败
