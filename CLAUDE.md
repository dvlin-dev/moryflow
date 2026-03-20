# Moryflow 主仓库

> 本文件是仓库级协作入口，仅包含常驻身份、边界、硬约束和路由。

## 项目概述

本 monorepo 以 Moryflow 为主产品，同时承载共同演进的 Anyhunt 能力平台：

- 主产品：Moryflow（笔记 + AI 工作流 + 站点发布）
- 能力平台：Anyhunt Dev（Fetchx / Memox / Sandx 能力）

Moryflow 与 Anyhunt Dev 是独立业务线，拥有各自的品牌、计费和数据隔离；仅共享 `packages/*` 基础设施代码。

## 核心同步协议（强制）

1. `CLAUDE.md` 仅承载稳定上下文：目录职责、结构边界、公共契约、关键约束、核心入口。
2. 仅在目录职责、结构、跨模块契约或关键约束失真时才更新 `CLAUDE.md`。
3. 文件头注释仅在 `[INPUT] / [OUTPUT] / [POS]`、`[PROPS] / [EMITS]`、`[PROVIDES] / [DEPENDS]` 事实变更时更新。
4. 业务代码、共享包、脚本和局部 `CLAUDE.md` 禁止包含 `[UPDATE]`、日期、PR 编号、步骤进度、评审关闭、验证播报等任何时间线式日志。
5. 新需求的设计文档 / 实现计划默认先落在 `docs/plans/*`；`docs/design/*` 和 `docs/reference/*` 仅存放已采纳的稳定事实。
6. `index.md` 仅做导航；设计/运维正文是唯一事实源；历史过程依赖 git / PR / changelog。
7. PR 合并前，`docs/plans/*` 中已采纳的稳定事实必须回写到对应的 `docs/design/*` 或 `docs/reference/*`；被正式正文吸收的计划文档必须删除或精简——禁止长期重复维护。
8. `completed / implemented / confirmed` 文档在合并前必须冻结为"当前状态 / 当前实现 / 当前验证基线"，移除冗余过程日志。
9. 无向后兼容——直接删除/重构无用代码，不保留废弃注释。
10. 除非直接影响现有用户数据，否则一律重构到最佳实践，不迁就旧代码/数据结构。
11. 仅在当前目录（含所有子目录）文件数 `> 10` 时才创建新的 `CLAUDE.md` 和 `AGENTS.md` 符号链接。

## 全局边界

- 仓库叙事：Moryflow 是主产品；Anyhunt 作为能力平台和母品牌同处一个 monorepo
- Moryflow：`www.moryflow.com` + `server.moryflow.com` + `moryflow.app`
- Anyhunt Dev：`anyhunt.app` + `server.anyhunt.app/api/v1` + `console.anyhunt.app` + `admin.anyhunt.app`
- API Key 前缀：Moryflow=`mf_`，Anyhunt Dev=`ah_`
- Anyhunt Dev 默认通过 API Key + 动态限速对外提供能力

## 协作规则

- 对话语言跟随用户语言
- 面向用户的文案、错误消息和 API 响应消息使用英文
- Git commit message 必须使用英文
- 三思而后行——禁止猜测实现；优先复用已有接口、类型和工具函数
- 根因修复优先——禁止打补丁
- 外部评审反馈：先验证再行动——复现或读代码确认对当前代码库的适用性
- **设计系统（强制）**：所有 UI 变更必须先读 `docs/reference/design-system.md` 并遵循 macOS 原生质感设计规范
- 交互设计做减法：少打扰、少术语、少入口、明确下一步
- 请求与状态管理：`Zustand Store + Methods + Functional API Client`
- AI agent 未经用户明确授权不得执行 `git commit` / `git push` / `git tag`
- 若用户已为当前 PR 明确授权提交，该授权仅覆盖达到可合并状态所需的连续 `commit` / `push` / 评论回复 / review thread 解决 / CI 修复操作；不延伸到其他 PR、tag、release 或 merge

请求与状态设计事实源：

- `docs/design/anyhunt/core/request-and-state-unification.md`
- `docs/design/moryflow/core/ui-conversation-and-streaming.md`

## 全局部署陷阱

- TanStack Start SSR 禁止在服务端复用 Router 单例；每次请求必须创建新 router
- 反向代理部署必须启用 `trust proxy`
- `deploy/moryflow/docker-compose.yml`：`moryflow-server` 必须显式注入并共享 `SYNC_ACTION_SECRET`
- `**/.tanstack/**`、`**/routeTree.gen.*` 等生成文件禁止手动编辑
- TanStack Start/Nitro 服务端构建必须避免多 React 实例；显式设置 `nitro.noExternals=false`
- 默认不在 `self-hosted` runner 上触发 `pull_request` / `pull_request_target` 的构建、测试或打包；外部贡献检查必须使用 GitHub-hosted runner 或隔离的短生命周期执行环境

## 文档路由

- 文档入口：`docs/index.md`
- 设计索引：`docs/design/index.md`
- 参考索引：`docs/reference/index.md`
- Anyhunt 核心：`docs/design/anyhunt/core/index.md`
- Moryflow 核心：`docs/design/moryflow/core/index.md`

按任务选择文档：

| 任务                                                          | 优先阅读                                       |
| ------------------------------------------------------------- | ---------------------------------------------- |
| UI 变更、样式、交互、组件设计、颜色/圆角/动效                 | `docs/reference/design-system.md`              |
| 仓库背景、目录结构、迁移参考                                  | `docs/reference/repository-context.md`         |
| 协作规则、PR 就绪、评论/CI 跟进、计划回写、文档同步、git 提交 | `docs/reference/collaboration-and-delivery.md` |
| 测试要求、风险分级、验证命令                                  | `docs/reference/testing-and-validation.md`     |
| 状态管理、表单、Zod、DTO、命名、安全                          | `docs/reference/engineering-standards.md`      |
| SSR、反向代理、构建、包产物、部署基线                         | `docs/reference/build-and-deploy-baselines.md` |

## 工作模式

1. 从最小范围计划开始，说明动机和风险；关键需求不确定时先澄清
2. 聚焦单一问题——禁止盲目变更
3. 按风险分级执行最小必要验证；仅在确实需要时才升级到根级全量验证
4. 仅更新事实源正文、必要的索引和已失真的相关 `CLAUDE.md` 文件

## 命名约定

- `CLAUDE.md` 是主文件
- `AGENTS.md` 是指向 `CLAUDE.md` 的符号链接，用于 agents.md 规范兼容
