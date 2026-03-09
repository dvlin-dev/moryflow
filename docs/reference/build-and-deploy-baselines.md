---
title: 构建与部署基线
date: 2026-03-08
scope: monorepo
status: active
---

<!--
[INPUT]: SSR、反向代理、构建链路、包构建与部署相关全局约束
[OUTPUT]: 稳定的构建与部署基线
[POS]: docs/reference/ 部署与构建规范

[PROTOCOL]: 仅在构建链路、部署约束或包产物规则失真时更新本文件。
-->

# 构建与部署基线

## SSR 与反向代理

- TanStack Start SSR 禁止复用 Router 单例；服务端必须为每个请求创建新 router
- 反向代理部署下必须启用 `trust proxy`
- 上游必须转发 `Host`、`X-Forwarded-Proto`、`X-Forwarded-For`
- Nitro 构建必须避免多份 React 实例；TanStack Start 项目需显式配置 `nitro.noExternals=false`

## Moryflow 云同步部署

- `deploy/moryflow/docker-compose.yml` 中的 `moryflow-server` 必须显式注入 `SYNC_ACTION_SECRET`
- 多实例必须共享同一个 `SYNC_ACTION_SECRET`
- 轮换时需考虑 `SYNC_ACTION_RECEIPT_TTL_SECONDS` 默认 `900s` 的旧 token 失效窗口

## Generated 文件

- `**/.tanstack/**`、`**/routeTree.gen.*` 等生成物视为 generated
- 禁止手改 generated 文件

## CI 信任边界

- 默认公开 CI 使用 GitHub-hosted runner；`pull_request` 校验不得落到仓库自有 `self-hosted` runner
- `self-hosted` workflow 仅允许可信入口，例如 `workflow_dispatch` 或受保护分支上的 `push`
- 禁止使用 `pull_request_target` 直接执行 PR HEAD 代码到仓库自有 `self-hosted` runner
- 公开 PR 的 required checks 只依赖 GitHub-hosted CI；`self-hosted` workflow 作为补充验证，不作为外部贡献的默认 merge gate
- 如需在自托管环境验证外部贡献，必须使用与仓库常驻 runner 隔离的短生命周期执行环境，并避免复用不可信 cache / workspace / artifacts

## 包命名

| 类型     | 模式                       | 示例                       |
| -------- | -------------------------- | -------------------------- |
| 应用包   | `@anyhunt/{product}-{app}` | `@moryflow/server`         |
| 共享包   | `@anyhunt/{name}`          | `@moryflow/api`            |
| UI 包    | `@moryflow/ui`             | 唯一                       |
| 配置包   | `@anyhunt/{name}-config`   | `@moryflow/eslint-config`  |
| Agent 包 | `@anyhunt/agents-{name}`   | `@moryflow/agents-runtime` |

## 包构建

- `packages/` 下共享包统一使用 `tsc-multi` 构建 ESM/CJS 双格式产物
- 源码导入保持无后缀，由构建阶段自动改写
- `packages/ui` 与 `tooling/*` 直接使用源码，不走 `tsc-multi`

关键约束：

- Docker / CI 固定使用 pnpm `9.12.2`
- Docker 安装依赖使用 `node-linker=hoisted` 且关闭 `shamefully-hoist`
- Prisma 相关版本必须精确一致
- Docker 构建若引用根 `tsconfig`，必须一并复制对应配置文件

## 常用命令

```bash
pnpm --filter @moryflow/types build
pnpm -r build
pnpm typecheck
```

## 继续阅读

- 测试与验证：`docs/reference/testing-and-validation.md`
- Anyhunt 部署 runbook：`docs/design/anyhunt/runbooks/deployment-and-troubleshooting.md`
- Moryflow 部署 runbook：`docs/design/moryflow/runbooks/deployment-and-troubleshooting.md`
