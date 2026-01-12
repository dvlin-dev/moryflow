---
title: 本地开发环境（Monorepo）
date: 2026-01-12
scope: dev
status: active
---

<!--
[INPUT]: pnpm workspace + turborepo；本地 Node/pnpm；可选 Docker（测试 DB/Redis）
[OUTPUT]: 最小可用的本地开发步骤与常用命令
[POS]: 新同学/新机器的“开机指南”

[PROTOCOL]: 本文件变更需同步更新 `docs/index.md` 与 `docs/CLAUDE.md`。
-->

# 本地开发环境（Monorepo）

## 版本要求

- Node：以 `.node-version` 为准
- pnpm：固定 `9.12.2`（避免容器内 corepack pnpm@9.14+ 的 `depNode.fetching` 报错）

## 安装依赖

```bash
pnpm -v
pnpm install
```

## 常用命令

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

## 测试数据库（Postgres/Redis）

```bash
docker compose -f deploy/infra/docker-compose.test.yml up -d
```

> 运行特定服务的集成测试与 e2e，请按各 app 的 `package.json` 脚本执行。
