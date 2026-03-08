# Moryflow 主产品仓库

> 本文档是仓库级协作入口。只保留 always-on 的身份、边界、硬约束与路由。

## 项目概述

当前仓库以 Moryflow 为主产品，同时承载与之协作演进的 Anyhunt 能力平台代码：

- 主产品：Moryflow（笔记 AI 工作流 + 网站发布）
- 协作能力平台：Anyhunt Dev（Fetchx / Memox / Sandx 等能力）

Moryflow 与 Anyhunt Dev 分属两条独立业务线，身份、计费与数据不互通；仅共享 `packages/*` 基础设施代码。

## 核心同步协议（强制）

1. `CLAUDE.md` 只承载稳定上下文：目录职责、结构边界、公共契约、关键约束、核心入口。
2. 只有当目录职责、结构、跨模块契约、关键约束失真时，才更新对应 `CLAUDE.md`。
3. 文件 Header 仅在 `[INPUT] / [OUTPUT] / [POS]`、`[PROPS] / [EMITS]`、`[PROVIDES] / [DEPENDS]` 等事实变化时更新。
4. 业务代码、共享包、脚本与局部 `CLAUDE.md` 禁止记录 `[UPDATE]`、日期、PR 编号、Step 进度、review 闭环、验证播报等时间线式日志。
5. `index.md` 只做导航；design/runbook 正文是唯一事实源；历史过程统一依赖 git / PR / changelog。
6. `completed / implemented / confirmed` 文档在合并前必须冻结为“当前状态 / 当前实现 / 当前验证基线”，删除冗余过程日志。
7. 不做向后兼容，无用代码直接删除/重构，不保留废弃注释。
8. 除非直接影响用户已有数据，否则一律按最佳实践重构，不兼容旧代码/旧数据结构。
9. 仅当“当前目录（包含所有子目录）”文件数 `> 10` 时，才允许新增 `CLAUDE.md` 与 `AGENTS.md` 软链接。

## 全局边界

- 仓库主叙事：Moryflow 是当前主产品；Anyhunt 作为能力平台与母品牌存在于同一 monorepo
- Moryflow：`www.moryflow.com` + `server.moryflow.com` + `moryflow.app`
- Anyhunt Dev：`anyhunt.app` + `server.anyhunt.app/api/v1` + `console.anyhunt.app` + `admin.anyhunt.app`
- API Key 前缀：Moryflow=`mf_`，Anyhunt Dev=`ah_`
- Anyhunt Dev 当前默认以 API Key + 动态限流策略对外提供能力

## 协作总则

- 开发者相关内容使用中文；用户可见文案、报错信息、API 响应消息使用英文；对话沟通使用中文
- 先查后做，不猜实现；接口、类型、工具优先复用
- 根因治理优先，禁止补丁式修复
- 外部 review 先判定后执行，先复现或走读确认其对当前代码库成立
- 交互设计做减法：少打扰、少术语、少入口、明确下一步
- 请求与状态统一采用 `Zustand Store + Methods + Functional API Client`
- AI Agent 不得擅自执行 `git commit` / `git push` / `git tag`，除非用户明确授权

请求与状态的设计事实源：

- `docs/design/anyhunt/core/request-and-state-unification.md`
- `docs/design/moryflow/core/ui-conversation-and-streaming.md`

## 全局部署陷阱

- TanStack Start SSR 禁止在服务端复用 Router 单例；必须每个请求创建新 router
- 反向代理部署必须启用 `trust proxy`
- `deploy/moryflow/docker-compose.yml` 中的 `moryflow-server` 必须显式注入并共享 `SYNC_ACTION_SECRET`
- `**/.tanstack/**`、`**/routeTree.gen.*` 等 generated 文件禁止手改
- TanStack Start/Nitro 服务端构建需避免多份 React 实例，显式配置 `nitro.noExternals=false`

## 文档路由

- docs 总入口：`docs/index.md`
- Design 总索引：`docs/design/index.md`
- Reference 总索引：`docs/reference/index.md`
- Anyhunt Core：`docs/design/anyhunt/core/index.md`
- Moryflow Core：`docs/design/moryflow/core/index.md`

按任务选择文档：

| 任务                                 | 优先阅读                                       |
| ------------------------------------ | ---------------------------------------------- |
| 仓库背景、目录结构、迁移参考         | `docs/reference/repository-context.md`         |
| 协作规则、PR、文档同步、git 提交     | `docs/reference/collaboration-and-delivery.md` |
| 测试要求、风险分级、校验命令         | `docs/reference/testing-and-validation.md`     |
| 状态管理、表单、Zod、DTO、命名、安全 | `docs/reference/engineering-standards.md`      |
| SSR、反代、构建、包产物、部署基线    | `docs/reference/build-and-deploy-baselines.md` |

## 工作方式

1. 先给出最小范围计划，说明动机与风险；关键需求不确定时先澄清
2. 聚焦单一问题，不盲改
3. 按风险等级执行最小必要验证；仅在确有必要时升级到根级全量
4. 仅更新已经失真的事实源正文、必要索引与相关 `CLAUDE.md`

## 命名约定

- `CLAUDE.md` 是主文件
- `AGENTS.md` 是指向 `CLAUDE.md` 的软链接，用于兼容 agents.md 规范
