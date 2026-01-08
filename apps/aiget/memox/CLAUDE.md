# Memox

> 原子能力：AI 记忆 API（语义记忆、实体提取、知识图谱）

## 概述

Memox 是 Aiget 平台的 AI 记忆服务，为 AI 应用提供长期记忆能力。类似 mem0.ai，支持语义记忆存储、实体提取、关系建立和知识图谱构建。

## 应用结构

| 应用   | 路径         | 说明                                    |
| ------ | ------------ | --------------------------------------- |
| Server | `../server/` | Memox 后端 API（已并入 Aiget 统一后端） |
| WWW    | `../www/`    | Aiget Dev 官网（模块页：`/memox`）      |

## 域名规划（统一口径）

| 服务       | 域名              | 说明                 |
| ---------- | ----------------- | -------------------- |
| Memox API  | aiget.dev/api/v1  | 统一 API 服务        |
| 用户控制台 | console.aiget.dev | Aiget Dev 控制台     |
| 管理后台   | admin.aiget.dev   | 统一管理后台         |
| 落地页     | aiget.dev/memox   | Aiget Dev 官网模块页 |

## API Key 前缀

`ag_` - Aiget Dev 统一 API Key

## 核心功能

- **语义记忆**：存储和搜索语义化的记忆内容
- **实体提取**：自动从内容中提取实体
- **关系建立**：建立实体之间的关系
- **知识图谱**：构建和遍历知识图谱
- **向量搜索**：基于 pgvector 的语义相似度搜索

## 开发命令

```bash
# 启动 Aiget Server（包含 Memox 模块）
pnpm --filter @aiget/aiget-server start:dev

# 启动 WWW 开发
pnpm dev:aiget:www

# 类型检查
pnpm --filter @aiget/aiget-server typecheck
pnpm --filter @aiget/aiget-www typecheck

# 数据库
pnpm --filter @aiget/aiget-server prisma:generate
pnpm --filter @aiget/aiget-server prisma:migrate
```

## 技术栈

| 层级   | 技术                       |
| ------ | -------------------------- |
| 后端   | NestJS 11 + Prisma 7       |
| 数据库 | PostgreSQL 16 + pgvector   |
| 缓存   | Redis 7 + BullMQ           |
| 前端   | TanStack Start + Vite 7    |
| 样式   | TailwindCSS v4 + shadcn/ui |
| 认证   | Better Auth                |
| 向量化 | OpenAI Embeddings          |
| LLM    | OpenAI / Anthropic         |

## 模块概览

```
apps/aiget/server/src/
├── memory/      # 核心记忆服务（公开 API：/api/v1/memories）
├── entity/      # 实体（公开 API：/api/v1/entities）
├── relation/    # 关系（公开 API：/api/v1/relations）
├── graph/       # 图谱（公开 API：/api/v1/graph）
├── embedding/   # 向量嵌入（内部依赖）
├── auth/        # Better Auth（console/admin）
├── api-key/     # API Key 管理（Authorization: Bearer <ag_...>）
├── quota/       # 配额管理
├── payment/     # Creem 支付
├── webhook/     # Webhook 通知
└── common/      # 共享工具
```

## 与 Aiget Dev 集成

- **认证**：使用 Aiget Dev Auth（`console.aiget.dev`），与 Moryflow 不互通
- **积分/订阅**：仅在 Aiget Dev 业务线内配置，不与 Moryflow 共享
- **控制台**：在 `console.aiget.dev` 管理
- **文档**：对外文档为独立站点 `docs.aiget.dev`（实现：`apps/aiget/docs`；仓库协作文档仍在 `docs/`）

---

_版本: 1.0 | 迁移日期: 2026-01-05_
