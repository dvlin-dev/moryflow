---
title: Anyhunt 迁移与切换 Runbook
date: 2026-02-28
scope: apps/anyhunt/*
status: active
---

# 品牌与域名迁移（Aiget -> Anyhunt）

- 根域名切换为 `anyhunt.app`；旧域名不做兼容跳转。
- API 入口固定：`https://server.anyhunt.app/api/v1`。
- NPM scope：`@aiget/* -> @anyhunt/*`。
- 环境变量前缀：`AIGET_* -> ANYHUNT_*`。

## 路由切换规则

- 会话接口统一 `app` 通道：`/api/v1/app/*`。
- 公共内容统一 `public` 通道：`/api/v1/public/*`。
- 旧 `console` 与旧 digest ApiKey 路径已下线。

## 治理回写记录（需求清理）

- 2026-02-28：文档治理升级，不保留 `archive` 文档，删除前先回写有效事实。
- 2026-02-26：CI 测试命令移除 `--maxWorkers=2` 透传，统一默认并发策略。
- 2026-02-24：Auth 与全量请求统一改造完成（Store + Methods + Functional API Client）。
