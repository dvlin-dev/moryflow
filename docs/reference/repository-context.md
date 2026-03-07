---
title: 仓库上下文
date: 2026-03-08
scope: monorepo
status: active
---

<!--
[INPUT]: 仓库全局身份、业务边界、目录结构、技术栈与迁移参考
[OUTPUT]: 稳定的仓库上下文入口
[POS]: docs/reference/ 仓库背景文档

[PROTOCOL]: 仅在业务线边界、目录结构、技术栈基线或迁移参考失真时更新本文件。
-->

# 仓库上下文

## 项目概述

当前仓库以 Moryflow 为主产品，同时承载与之协作演进的 Anyhunt 能力平台代码：

- 主产品：Moryflow（笔记 AI 工作流 + 网站发布）
- 协作能力平台：Anyhunt Dev（Fetchx / Memox / Sandx 等能力）

## 业务边界

- Moryflow 是当前仓库的主产品叙事；Anyhunt Dev 作为能力平台与母品牌存在于同一 monorepo。
- Moryflow 与 Anyhunt Dev 是两条独立业务线，不共享账号、Token、数据库。
- 两条业务线只共享 `packages/*` 基础设施代码，不共享身份、计费与订阅数据。
- Moryflow 当前以产品应用为主；Anyhunt Dev 当前以 API Key + 动态限流策略对外提供能力。

## 域名与 API Key 口径

- Moryflow 主站：`www.moryflow.com`
- Moryflow 应用/API：`server.moryflow.com`
- Moryflow 发布站：`moryflow.app`
- Anyhunt 官网：`anyhunt.app`
- Anyhunt Dev API：`server.anyhunt.app/api/v1`
- Anyhunt 控制台：`console.anyhunt.app`
- Anyhunt 管理后台：`admin.anyhunt.app`

API Key 前缀：

- Moryflow：`mf_`
- Anyhunt Dev：`ah_`

## 源仓库参考

以下仓库仍可作为迁移期参考：

| 产品               | 绝对路径                          | 说明                      |
| ------------------ | --------------------------------- | ------------------------- |
| Fetchx（原 AIGET） | `/Users/bowling/code/me/fetchx`   | 网页抓取与数据提取平台    |
| Memox（原 MEMAI）  | `/Users/bowling/code/me/memai`    | AI 记忆与知识图谱服务     |
| Moryflow           | `/Users/bowling/code/me/moryflow` | 笔记 AI 工作流 + 网站发布 |

## Monorepo 结构

```text
Anyhunt/
├── apps/
│   ├── anyhunt/
│   │   ├── www/
│   │   ├── docs/
│   │   ├── server/
│   │   ├── console/
│   │   ├── admin/
│   │   ├── fetchx/
│   │   ├── memox/
│   │   └── sandx/
│   └── moryflow/
│       ├── server/
│       ├── mobile/
│       ├── pc/
│       ├── site-template/
│       ├── admin/
│       ├── docs/
│       └── www/
├── packages/
├── tooling/
├── deploy/
└── docs/
```

## 技术栈速查

| 层级         | 技术                                                    |
| ------------ | ------------------------------------------------------- |
| 包管理       | pnpm workspace + Turborepo                              |
| 后端         | NestJS 11 + Prisma 7 + PostgreSQL 16 + Redis 7 + BullMQ |
| 前端         | React 19 + Vite + TailwindCSS v4 + shadcn/ui            |
| 移动端       | Expo + React Native + uniwind                           |
| 桌面端       | Electron + React                                        |
| 认证         | Better Auth                                             |
| AI/LLM       | OpenAI / Anthropic / Google（Vercel AI SDK）            |
| 向量数据库   | pgvector                                                |
| 浏览器自动化 | Playwright                                              |
| 校验         | Zod                                                     |

## 继续阅读

- 设计总索引：`docs/design/index.md`
- 协作与交付：`docs/reference/collaboration-and-delivery.md`
- 测试与验证：`docs/reference/testing-and-validation.md`
- 构建与部署基线：`docs/reference/build-and-deploy-baselines.md`
