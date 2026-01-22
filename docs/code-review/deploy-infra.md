---
title: deploy/infra 测试环境 Code Review
date: 2026-01-22
scope: deploy/infra
status: done
---

<!--
[INPUT]: deploy/infra/docker-compose.test.yml, deploy/infra/test-env.sh
[OUTPUT]: 测试环境基础设施 review 发现 + 修复建议 + 进度记录
[POS]: Phase 0 / P0 模块审查记录（deploy 测试环境）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# deploy/infra 测试环境 Code Review

## 范围

- 入口点：`deploy/infra/test-env.sh`（start/stop/restart/logs/status/clean）
- 关键文件：`deploy/infra/docker-compose.test.yml`
- 外部依赖：Docker Compose、PostgreSQL 16、pgvector、Redis 7

## 结论摘要

- 高风险问题（P0）：无
- 中风险问题（P1）：无
- 低风险/清理项（P2）：已修复（healthcheck 用户对齐、健康轮询、移除固定容器名）

## 发现（按严重程度排序）

- [P2] `deploy/infra/docker-compose.test.yml` 的 `pg_isready -U postgres` 与可配置用户不一致（`POSTGRES_TEST_USER`/`VECTOR_POSTGRES_TEST_USER`），一旦改默认用户将导致健康检查失败。（已修复）
- [P2] `deploy/infra/test-env.sh` 的健康等待为固定 `sleep 5`，与“等待服务健康”文案不一致，慢机/首次拉镜像时容易造成测试启动早于服务就绪。（已修复）
- [P2] `deploy/infra/docker-compose.test.yml` 使用固定 `container_name`，不同 repo 或不同项目名并行启动时会发生容器名冲突。（已修复）

## 修复计划与进度

- 已完成：
  - healthcheck 使用容器环境变量校验 `POSTGRES_USER/POSTGRES_DB`
  - `test-env.sh` 轮询健康状态并设置超时
  - 移除固定 `container_name` 让 Compose 自动隔离
- 状态：done
- 验证：未实际启动容器；需手动执行 `docker compose -f deploy/infra/docker-compose.test.yml up -d`
