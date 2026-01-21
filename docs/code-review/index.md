---
title: 全量 Code Review 计划（索引）
date: 2026-01-21
scope: monorepo
status: active
---

<!--
[INPUT]: 本仓库的全量代码（apps/*, packages/*, tooling/*, deploy/*, scripts/* + 根配置）
[OUTPUT]: 可执行的 Code Review 模块拆分 + 优先级 + 执行顺序 + 进度追踪入口
[POS]: docs/code-review/ 的入口；后续每个模块的 review 记录与修复跟踪都从这里索引

[PROTOCOL]: 本文件新增/变更时，需要同步更新 `docs/index.md` 与 `docs/CLAUDE.md`（文档索引与目录结构）。
-->

# 全量 Code Review（索引）

目标：把整个 Monorepo 按“可执行的模块”拆开，先做高风险/高收益部分（安全、Auth、计费/配额、数据一致性、队列/异步），再覆盖核心用户流程，最后清理基础设施与工程配置问题。

注意：本目录只记录“怎么 review / review 什么 / 进度与结果”；具体的 code review 结论与修复进展，按模块分别写到对应文档（见下方模块清单的 `Doc` 列）。

## 仓库模块地图（按目录）

- Anyhunt Dev（开发者平台）
  - `apps/anyhunt/server/`：统一后端（NestJS + Prisma + PostgreSQL/Redis），承载抓取/抽取/Agent/浏览器/计费等核心能力
  - `apps/anyhunt/console/`：开发者控制台（Web）
  - `apps/anyhunt/admin/www/`：运营管理后台（Web）
  - `apps/anyhunt/www/`：官网/Reader（Web）
  - `apps/anyhunt/docs/`：对外文档站（独立 docs 项目）
- Moryflow（核心产品）
  - `apps/moryflow/server/`：工作流/发布/AI 代理等核心后端（NestJS + Prisma）
  - `apps/moryflow/publish-worker/`：发布相关 worker
  - `apps/moryflow/vectorize/`：向量化任务（worker/服务形态）
  - `apps/moryflow/pc/`：桌面端（Electron + React）
  - `apps/moryflow/mobile/`：移动端（Expo + React Native）
  - `apps/moryflow/admin/`：管理后台（Web）
  - `apps/moryflow/www/`：官网（含 server 目录）
  - `apps/moryflow/site-template/`：用户发布站点模板
  - `apps/moryflow/docs/`：对外文档站（独立 docs 项目）
- 共享 packages（两条业务线复用）
  - `packages/ui/`：统一 UI 组件库与样式入口
  - `packages/types/`：跨产品共享类型
  - `packages/api/`：API 客户端工具
  - `packages/config/`：共享配置
  - `packages/auth-server/`、`packages/identity-db/`：认证/身份相关基建
  - `packages/agents*/`：Agent 平台能力（runtime/tools/mcp/openai/sandbox 等）
  - `packages/embed*/`：嵌入 SDK
  - `packages/sync/`、`packages/tiptap/`：同步与编辑器能力（来自 Moryflow）
- 工具链与部署
  - `tooling/`：eslint/ts/tailwind 配置包
  - `deploy/`：基础设施与部署配置（含测试环境 compose）
  - `.github/workflows/ci.yml`：CI
  - `scripts/`、`templates/`：脚本与模板
  - `archive/`：外部仓库快照（仅查阅，注意敏感信息与许可证风险）

## Review 实践（统一做法）

建议每个模块按以下固定步骤执行，保证可复盘、可并行：

1. **边界**：列出该模块的入口点（HTTP routes/queues/cron/CLI）、依赖（DB/Redis/外部 API）、以及数据模型（Prisma tables/types）。
2. **风险优先**：先扫安全与数据正确性（Auth、权限、SSRF、注入、幂等、并发/重试、队列重复消费、资源泄露）。
3. **可观测性**：日志/trace/metrics 是否能定位问题（request id、关键维度、错误分层）。
4. **测试**：单测覆盖核心逻辑；集成测试覆盖 DB/Redis；E2E 覆盖关键流程（如有前端）。
5. **修复闭环**：每个问题必须对应修复 PR/commit 或明确“弃修原因 + 风险接受人 + 截止日期”。

## 优先级与执行顺序（全局）

排序规则（从高到低）：

- **P0（必须优先）**：安全/权限、Auth、API Key、配额与计费、支付回调、队列与异步一致性、SSRF/抓取隔离、数据库迁移与数据一致性。
- **P1（核心流程）**：Anyhunt Dev 的抓取/爬取/抽取/浏览器/Agent 工作流；Moryflow 的核心业务（Auth/Quota/Sync/Site 发布）。
- **P2（平台能力）**：packages 共享库（agents/\*、ui、api、types、config、embed、i18n 等）的边界、抽象与测试质量。
- **P3（工程与运维）**：CI、lint/typecheck/test、构建产物/生成物规范、Docker/部署脚本、模板与脚手架、archive 快照与许可证/安全扫尾。

建议执行阶段（可并行但要保持依赖顺序）：

1. **Phase 0**：根配置/CI/生成物规范（避免 review 过程中被工具链噪声干扰）
2. **Phase 1**：Anyhunt Dev 后端（server）P0 模块
3. **Phase 2**：Moryflow 后端（server）P0 模块
4. **Phase 3**：核心前端（console/admin/www/pc/mobile）关键流程
5. **Phase 4**：packages/_ 与 tooling/_（作为平台基建统一收口）
6. **Phase 5**：deploy/_、scripts/_、templates/_、archive/_（收尾与风险确认）

## 模块清单（按优先级）

说明：

- `Status` 建议使用：`todo` / `in_progress` / `blocked` / `done` / `wontfix`
- `Doc` 是后续要创建的模块 review 文档路径（本索引先把“坑位”列出来）

### P0 - 安全 / Auth / 配额计费 / 数据一致性（先做）

| Priority | Module                                    | Scope                                                                                                       | Directories / Key Files                                                                                                                                                                                            | Doc                                                      | Status |
| -------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------ |
| P0       | 工程基线（可安装性/CI 门禁/生成物）       | 确保“任何人/CI 都能装得起来并跑通 lint/typecheck/test”，同时明确 generated 规则（避免无意义 diff 与线上坑） | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, `eslint.config.mjs`, `tsconfig.base.json`, `tsc-multi*.json`, `.github/workflows/ci.yml`（当前仅 `workflow_dispatch` 手动触发）, `scripts/` | `docs/code-review/root-tooling.md`                       | todo   |
| P0       | Anyhunt Server：Auth & Session            | 登录/回调/cookie/跨域/信任反代/权限边界                                                                     | `apps/anyhunt/server/src/auth/`, `apps/anyhunt/server/src/user/`, `apps/anyhunt/server/src/common/guards/`                                                                                                         | `docs/code-review/anyhunt-server-auth.md`                | todo   |
| P0       | Anyhunt Server：API Key & Quota           | API Key 存储/校验；限流/配额扣减一致性                                                                      | `apps/anyhunt/server/src/api-key/`, `apps/anyhunt/server/src/quota/`, `apps/anyhunt/server/src/billing/`                                                                                                           | `docs/code-review/anyhunt-server-api-key-quota.md`       | todo   |
| P0       | Anyhunt Server：Billing & Payment         | 订阅/充值/对账/幂等；支付回调安全                                                                           | `apps/anyhunt/server/src/payment/`, `apps/anyhunt/server/src/billing/`                                                                                                                                             | `docs/code-review/anyhunt-server-billing-payment.md`     | todo   |
| P0       | Anyhunt Server：抓取安全（SSRF/网络隔离） | URL 校验、内网阻断、代理/重定向策略                                                                         | `apps/anyhunt/server/src/common/validators/`, `apps/anyhunt/server/src/scraper/`, `apps/anyhunt/server/src/crawler/`, `apps/anyhunt/server/src/browser/`                                                           | `docs/code-review/anyhunt-server-ssrf-sandbox.md`        | todo   |
| P0       | Anyhunt Server：Queue/异步一致性          | BullMQ/Redis 可靠性、重复投递、幂等、DLQ                                                                    | `apps/anyhunt/server/src/queue/`, `apps/anyhunt/server/src/digest/`, `apps/anyhunt/server/src/batch-scrape/`                                                                                                       | `docs/code-review/anyhunt-server-queue.md`               | todo   |
| P0       | Anyhunt Server：Prisma/迁移/多数据库边界  | Schema 设计、迁移策略、读写分离/事务边界                                                                    | `apps/anyhunt/server/prisma/`, `apps/anyhunt/server/src/prisma/`, `apps/anyhunt/server/src/vector-prisma/`                                                                                                         | `docs/code-review/anyhunt-server-prisma.md`              | todo   |
| P0       | Moryflow Server：Auth & Quota & Payment   | 核心产品的账户/配额/支付闭环                                                                                | `apps/moryflow/server/src/auth/`, `apps/moryflow/server/src/quota/`, `apps/moryflow/server/src/payment/`, `apps/moryflow/server/src/admin-payment/`, `apps/moryflow/server/prisma/`                                | `docs/code-review/moryflow-server-auth-quota-payment.md` | todo   |
| P0       | packages：identity/auth 基建              | 统一身份/鉴权相关的共享代码正确性                                                                           | `packages/auth-server/`, `packages/identity-db/`                                                                                                                                                                   | `docs/code-review/packages-auth-identity.md`             | todo   |
| P0       | deploy：测试环境与基础设施                | 测试 DB/Redis 与本地可复现性                                                                                | `deploy/infra/docker-compose.test.yml`, `deploy/infra/`                                                                                                                                                            | `docs/code-review/deploy-infra.md`                       | todo   |

### P1 - 核心业务能力（主流程）

| Priority | Module                                       | Scope                                        | Directories / Key Files                                                                                                                                                             | Doc                                                       | Status |
| -------- | -------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------ |
| P1       | Anyhunt Server：Scraper/Crawler/Extract/Map  | Fetchx 核心能力在 Anyhunt 统一后端的实现质量 | `apps/anyhunt/server/src/scraper/`, `apps/anyhunt/server/src/crawler/`, `apps/anyhunt/server/src/extract/`, `apps/anyhunt/server/src/map/`, `apps/anyhunt/server/src/batch-scrape/` | `docs/code-review/anyhunt-server-fetchx-core.md`          | todo   |
| P1       | Anyhunt Server：Browser（Agent Browser）     | 浏览器会话、CDP、安全、资源回收、持久化      | `apps/anyhunt/server/src/browser/`                                                                                                                                                  | `docs/code-review/anyhunt-server-browser.md`              | todo   |
| P1       | Anyhunt Server：Agent/LLM/Embedding          | 提示词/工具调用/流式协议/策略注入/成本控制   | `apps/anyhunt/server/src/agent/`, `apps/anyhunt/server/src/llm/`, `apps/anyhunt/server/src/embedding/`, `apps/anyhunt/server/src/console-playground/`                               | `docs/code-review/anyhunt-server-agent-llm.md`            | todo   |
| P1       | Anyhunt Server：Memory/Graph/Search/Relation | Memox 能力在 Anyhunt 统一后端的落地质量      | `apps/anyhunt/server/src/memory/`, `apps/anyhunt/server/src/graph/`, `apps/anyhunt/server/src/search/`, `apps/anyhunt/server/src/relation/`, `apps/anyhunt/server/src/entity/`      | `docs/code-review/anyhunt-server-memox-core.md`           | todo   |
| P1       | Anyhunt Server：Digest（投递/模板/队列）     | Digest 生成、投递链路、模板安全、退订/合规   | `apps/anyhunt/server/src/digest/`, `apps/anyhunt/server/src/email/`, `apps/anyhunt/server/src/webhook/`                                                                             | `docs/code-review/anyhunt-server-digest.md`               | todo   |
| P1       | Moryflow：Publish/Vectorize/AI Proxy         | 发布 worker、向量化任务、模型代理与成本边界  | `apps/moryflow/publish-worker/`, `apps/moryflow/vectorize/`, `apps/moryflow/server/src/ai-proxy/`, `apps/moryflow/server/src/vectorize/`                                            | `docs/code-review/moryflow-publish-vectorize-ai-proxy.md` | todo   |

### P2 - 前端应用（用户体验与端到端稳定性）

| Priority | Module                               | Scope                                     | Directories / Key Files                                                      | Doc                                        | Status |
| -------- | ------------------------------------ | ----------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------ | ------ |
| P2       | Anyhunt Console（开发者控制台）      | 登录态、API Key 管理、核心工作台流程、E2E | `apps/anyhunt/console/`                                                      | `docs/code-review/anyhunt-console.md`      | todo   |
| P2       | Anyhunt Admin（运营后台）            | 权限边界、敏感操作审计、充值/配额管理     | `apps/anyhunt/admin/www/`                                                    | `docs/code-review/anyhunt-admin.md`        | todo   |
| P2       | Anyhunt WWW（官网/Reader/Developer） | SSR/SEO/跳转、读者流程、性能与稳定性      | `apps/anyhunt/www/`                                                          | `docs/code-review/anyhunt-www.md`          | todo   |
| P2       | Moryflow PC                          | 桌面端主流程、性能、崩溃边界、打包产物    | `apps/moryflow/pc/`                                                          | `docs/code-review/moryflow-pc.md`          | todo   |
| P2       | Moryflow Mobile                      | Expo/RN 关键流程、离线/同步、权限与隐私   | `apps/moryflow/mobile/`                                                      | `docs/code-review/moryflow-mobile.md`      | todo   |
| P2       | Moryflow Admin/WWW/Site Template     | 站点发布链路与模板安全、SEO 与构建策略    | `apps/moryflow/admin/`, `apps/moryflow/www/`, `apps/moryflow/site-template/` | `docs/code-review/moryflow-web-surface.md` | todo   |

### P3 - packages/_ 与 tooling/_（平台基建与复用质量）

| Priority | Module                                          | Scope                                  | Directories / Key Files                                                                                                                                                                                                                                                           | Doc                                             | Status |
| -------- | ----------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------ |
| P3       | packages/ui（组件库与样式入口）                 | 统一 UI、可访问性、样式扫描、暗坑清理  | `packages/ui/`, `packages/ui/styles/`                                                                                                                                                                                                                                             | `docs/code-review/packages-ui.md`               | todo   |
| P3       | packages/types + packages/api + packages/config | 类型源头、API 客户端、共享配置边界     | `packages/types/`, `packages/api/`, `packages/config/`                                                                                                                                                                                                                            | `docs/code-review/packages-types-api-config.md` | todo   |
| P3       | packages/agents\*（Agent 平台能力）             | 工具协议/运行时/模型注册/沙盒/测试质量 | `packages/agents/`, `packages/agents-core/`, `packages/agents-runtime/`, `packages/agents-tools/`, `packages/agents-mcp/`, `packages/agents-openai/`, `packages/agents-sandbox/`, `packages/agents-realtime/`, `packages/agents-model-registry/`, `packages/model-registry-data/` | `docs/code-review/packages-agents.md`           | todo   |
| P3       | packages/embed\* + packages/i18n                | 嵌入 SDK、国际化边界、构建与发布       | `packages/embed/`, `packages/embed-react/`, `packages/i18n/`                                                                                                                                                                                                                      | `docs/code-review/packages-embed-i18n.md`       | todo   |
| P3       | packages/sync + packages/tiptap                 | 同步与编辑器能力（跨端一致性）         | `packages/sync/`, `packages/tiptap/`                                                                                                                                                                                                                                              | `docs/code-review/packages-sync-tiptap.md`      | todo   |
| P3       | tooling/\*（eslint/ts/tailwind）                | 规则正确性、迁移成本、开发体验         | `tooling/eslint-config/`, `tooling/typescript-config/`, `tooling/tailwind-config/`                                                                                                                                                                                                | `docs/code-review/tooling-config.md`            | todo   |

### P3 - 收尾（低频但必须确认）

| Priority | Module                     | Scope                                        | Directories / Key Files  | Doc                                     | Status |
| -------- | -------------------------- | -------------------------------------------- | ------------------------ | --------------------------------------- | ------ |
| P3       | deploy/\*（除测试环境外）  | 生产部署文件、反代与 trust proxy 约束核对    | `deploy/`                | `docs/code-review/deploy-prod.md`       | todo   |
| P3       | templates/_ & scripts/_    | 脚手架与脚本的可维护性与安全性               | `templates/`, `scripts/` | `docs/code-review/templates-scripts.md` | todo   |
| P3       | archive/\*（外部仓库快照） | 仅查阅：是否包含敏感信息/许可证风险/误用风险 | `archive/`               | `docs/code-review/archive-snapshot.md`  | todo   |

## 单模块 Review 文档模板（建议）

后续创建每个模块的 review 文档时，建议统一结构（便于对比与跟踪）：

```md
---
title: <模块名> Code Review
date: 2026-01-21
scope: <module>
status: draft
---

## 范围

- 入口点（routes/queues/cron/CLI）
- 关键目录/文件
- 外部依赖（DB/Redis/第三方）

## 结论摘要

- 高风险问题（P0）
- 中风险问题（P1）
- 低风险/清理项（P2）

## 发现（按严重程度排序）

- [P0] ...
- [P1] ...
- [P2] ...

## 修复计划与进度

- PR/Commit：
- 验证方式（测试命令/回归步骤）：
- 状态：todo / in_progress / done
```
