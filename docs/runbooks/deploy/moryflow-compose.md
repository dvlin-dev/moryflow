---
title: Moryflow（4c6g）docker compose 部署
date: 2026-01-12
scope: moryflow, docker-compose
status: active
---

<!--
[INPUT]: Moryflow 使用单份 docker compose；域名反代在 megaboxpro；DB/Redis 与 Anyhunt Dev 物理隔离
[OUTPUT]: 可照做的部署顺序与最小环境变量清单
[POS]: Moryflow 部署 runbook（不讨论架构决策）

[PROTOCOL]: 本文件变更如影响端口/域名/环境变量口径，需同步更新 `docs/architecture/domains-and-deployment.md` 与根 `CLAUDE.md`。
-->

# Moryflow（4c6g）docker compose 部署

## 入口文档

- 架构与端口：`docs/architecture/domains-and-deployment.md`
- compose 文件：`deploy/moryflow/docker-compose.yml`

## 部署顺序（建议）

1. 拉取/构建镜像（按实际方式）
2. 启动 compose
3. 通过 megaboxpro 配置域名反代
4. 验收 `/health` 与关键页面

## 常用命令

```bash
docker compose -f deploy/moryflow/docker-compose.yml up -d
docker compose -f deploy/moryflow/docker-compose.yml ps
docker compose -f deploy/moryflow/docker-compose.yml logs -f --tail=200
```

## 环境变量（示例口径）

> 具体以服务实际读取的变量为准；这里作为“需要哪些类别”的清单。

- `PUBLIC_BASE_URL=https://app.moryflow.com`
- `ALLOWED_ORIGINS=https://www.moryflow.com,https://admin.moryflow.com,https://app.moryflow.com`
- `COOKIE_DOMAIN=.moryflow.com`
- `POSTGRES_URL=...`
- `REDIS_URL=...`
