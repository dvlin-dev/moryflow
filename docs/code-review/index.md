---
title: 全量 Code Review 计划（索引）
date: 2026-01-26
scope: monorepo
status: active
---

<!--
[INPUT]: 本仓库的全量代码（apps/*, packages/*, tooling/*, deploy/*, scripts/* + 根配置）
[OUTPUT]: 可执行的 Code Review 模块拆分 + 优先级 + 执行顺序 + 进度追踪入口 + 统一审查规范
[POS]: docs/code-review/ 的入口；后续每个模块的 review 记录与修复跟踪都从这里索引

[PROTOCOL]: 本文件新增/变更时，需要同步更新 `docs/index.md` 与 `docs/CLAUDE.md`（文档索引与目录结构）。
-->

# 全量 Code Review（索引）

目标：把整个 Monorepo 按“可执行的模块”拆开，先做高风险/高收益部分（安全、Auth、计费/配额、数据一致性、队列/异步），再覆盖核心用户流程，最后清理基础设施与工程配置问题。

注意：本目录只记录“怎么 review / review 什么 / 进度与结果”；具体的 code review 结论与修复进展，按模块分别写到对应文档（见下方模块清单的 `Doc` 列）。

## 近期更新

- 2026-02-26：Moryflow Site Template 组件优化专项结项：模块 A/B/C 与项目复盘全部完成（模板/样式/脚本生成链路收敛，`sync` 确定性与新鲜度守卫落地），详见 `docs/code-review/moryflow-site-template.md` 与 `docs/code-review/frontend-component-optimization-rollout.md`。
- 2026-02-26：Anyhunt Console 完成首个项目闭环（模块 D D-6b~D-6c + 模块 E + 项目复盘全部完成），并补齐 `AgentBrowserLayoutPage` 布局状态片段化收口；模块级 `lint` + `typecheck` + `test:unit` 通过：`docs/code-review/anyhunt-console.md`。
- 2026-02-26：Anyhunt Console 模块 D 进入 D-6 一致性复查，完成 D-6a（`FlowRunner` 分层拆分 + `BrowserSessionPanel` 表单初始化抽离为 `use-browser-session-forms`），通过模块级 `lint` + `typecheck` + `test:unit`：`docs/code-review/anyhunt-console.md`。
- 2026-02-26：Anyhunt Console 模块 D 修复推进：D-4e 完成（`browser-session-sections.tsx` 第五批分区拆分：`OpenUrl/Snapshot/Delta/Action/ActionBatch/Screenshot`，并收敛为 45 行导出层），通过模块级 `lint` + `typecheck` + `test:unit`：`docs/code-review/anyhunt-console.md`。
- 2026-02-26：Anyhunt Console 模块 D 修复推进：D-4d 完成（`browser-session-sections.tsx` 第四批分区拆分：`Session/Tabs/Windows`；主文件 1299 行降到 494 行），通过模块级 `lint` + `typecheck` + `test:unit`：`docs/code-review/anyhunt-console.md`。
- 2026-02-26：Anyhunt Console 模块 D 修复推进：D-4c 完成（`browser-session-sections.tsx` 第三批分区拆分：`Intercept/Headers/NetworkHistory/Diagnostics`；主文件 1773 行降到 1299 行，并收敛 Detection Risk 状态渲染），通过模块级 `lint` + `typecheck` + `test:unit`：`docs/code-review/anyhunt-console.md`。
- 2026-02-26：Anyhunt Console 模块 D 修复推进：D-5 完成（`api.ts` 拆分为 `browser-api.ts` 与 `agent-api.ts`，保留兼容导出层并切换主要调用方到分域导入），通过模块级 `lint` + `typecheck` + `test:unit`：`docs/code-review/anyhunt-console.md`。
- 2026-02-26：Anyhunt Console 模块 D 修复推进：D-4b 完成（`browser-session-sections.tsx` 第二批分区拆分，`StorageSection` 与 `ProfileSection` 独立文件化），通过模块级 `lint` + `typecheck` + `test:unit`：`docs/code-review/anyhunt-console.md`。
- 2026-02-26：Anyhunt Console 模块 D 修复推进：D-4a 完成（`browser-session-sections.tsx` 首批分区拆分，`StreamingSection` 与 `CdpSection` 独立文件化），通过模块级 `lint` + `typecheck` + `test:unit`：`docs/code-review/anyhunt-console.md`。
- 2026-02-26：Anyhunt Console 模块 D 修复推进：D-3 完成（section 状态容器 + 结果状态 + session lifecycle handlers 抽离），通过模块级 `lint` + `typecheck` + `test:unit`：`docs/code-review/anyhunt-console.md`。
- 2026-02-26：Anyhunt Console 模块 D 修复推进：D-3b 完成（抽离 `use-browser-session-panel-results` 与 `use-browser-session-lifecycle-actions`，`BrowserSessionPanel` 进一步收敛为装配层），通过模块级 `lint` + `typecheck` + `test:unit`：`docs/code-review/anyhunt-console.md`。
- 2026-02-26：Anyhunt Console 模块 D 修复推进：D-3a 完成（抽离 section 配置与 open-state hook，`BrowserSessionPanel` 移除 17 个开关 `useState`），通过模块级 `lint` + `typecheck` + `test:unit`：`docs/code-review/anyhunt-console.md`。
- 2026-02-26：Anyhunt Console 模块 D 修复推进：D-2 完成（抽离 `browser-context-options` mapper，`BrowserSessionPanel` Session/Window 参数组装去重，并补齐 mapper 单测），通过模块级 `lint` + `typecheck` + `test:unit`：`docs/code-review/anyhunt-console.md`。
- 2026-02-26：Anyhunt Console 模块 D 修复推进：D-1 完成（`AgentBrowserLayoutPage` 改为 active-key only，补齐 `AgentBrowserLayoutPage.test.tsx` 回归测试），并通过模块级 `typecheck` + `test:unit`：`docs/code-review/anyhunt-console.md`。
- 2026-02-26：Anyhunt Console 模块 D（`agent-browser-playground`）完成预扫描并输出问题分级（`S1x3 / S2x3`），进入 D-1 分步修复：`docs/code-review/anyhunt-console.md`。
- 2026-02-25：Anyhunt Console 模块 C review follow-up 完成（修复 `Memories` 请求启用边界；统一 `Memories/Entities/Graph/Embed` API Key 选择复用；Graph 可视化继续拆分减责）：`docs/code-review/anyhunt-console.md`。
- 2026-02-25：Anyhunt Console 模块 C 修复闭环：C-2~C-5 完成（统一 API Key 收敛、Graph 分层重构、Embed RHF+zod/v3 改造、模块级回归通过）：`docs/code-review/anyhunt-console.md`。
- 2026-02-25：Anyhunt Console 模块 C 修复推进：C-1 完成（`MemoxPlaygroundPage` 拆分为容器 + request/result 组件，并抽离 request mapper + 单测）并通过模块级校验：`docs/code-review/anyhunt-console.md`。
- 2026-02-25：Anyhunt Console 模块 C（`memox/embed playground`）完成预扫描并输出问题分级（`S1x3 / S2x3`），进入 C-1~C-5 分步修复准备：`docs/code-review/anyhunt-console.md`。
- 2026-02-25：Anyhunt Console 模块 B 修复闭环：B-4/B-5/B-6 完成（统一 API Key 选择收敛、新增共享页面壳层 `PlaygroundPageShell`、模块级回归通过）：`docs/code-review/anyhunt-console.md`。
- 2026-02-25：Anyhunt Console 模块 B 修复推进：B-3 完成（`ExtractPlaygroundPage` 拆分为 container/request/result 结构）并通过模块级校验：`docs/code-review/anyhunt-console.md`。
- 2026-02-25：Anyhunt Console 模块 B 修复推进：B-2 完成（`ScrapeResult` 拆分为 cards/tabs/view-model，移除默认 Tab 链式三元），并通过模块级校验：`docs/code-review/anyhunt-console.md`。
- 2026-02-25：Anyhunt Console 模块 B 启动修复，已完成 B-1（`ScrapeForm` 拆分为 mapper + sections，并通过模块级校验）：`docs/code-review/anyhunt-console.md`。
- 2026-02-25：Anyhunt Console 模块 B（`scrape/crawl/search/map/extract`）完成预扫描并输出问题分级（`S1x3 / S2x2`）：`docs/code-review/anyhunt-console.md`。
- 2026-02-25：Anyhunt Console 模块 A 按“状态片段化 + `renderContentByState` + 禁止链式三元”完成变更区补扫修复并回写台账：`docs/code-review/anyhunt-console.md`、`docs/code-review/frontend-component-optimization-rollout.md`。
- 2026-02-25：Anyhunt Console 模块 A（`api-keys/settings/webhooks`）完成修复并通过模块级校验（`typecheck` + `test:unit`）；新增 `webhooks/utils.test.ts` 回归测试：`docs/code-review/anyhunt-console.md`。
- 2026-02-25：Anyhunt Console 模块 A（`api-keys/settings/webhooks`）完成预扫描并输出问题分级（`S1x3 / S2x2`）：`docs/code-review/anyhunt-console.md`。
- 2026-02-25：新增前端组件优化专项执行计划（按项目/按模块，要求每步回写执行台账）：`docs/code-review/frontend-component-optimization-rollout.md`。
- 2026-02-25：Anyhunt/Moryflow 路由口径统一回写：Auth 与 Webhook 文档示例统一为 `/api/v1/*`（移除 VERSION_NEUTRAL 旧描述）。
- 2026-02-02：Anyhunt Server Auth/Billing/API Key Review 文档路径示例更新为 `/api/v1/app/*`。

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
  - `packages/agents*/`：Agent 平台能力（已迁移至 `@openai/agents-core`，仅保留 adapter/runtime/tools/mcp/sandbox/model-registry 等）
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

0. **对齐规范**：先确认该模块适用的强制规范（见下方“统一审查标准”），避免在 review/修复过程中引入风格或结构偏差。
1. **边界**：列出该模块的入口点（HTTP routes/queues/cron/CLI）、依赖（DB/Redis/外部 API）、以及数据模型（Prisma tables/types）。
2. **风险优先**：先扫安全与数据正确性（Auth、权限、SSRF、注入、幂等、并发/重试、队列重复消费、资源泄露）。
3. **可观测性**：日志/trace/metrics 是否能定位问题（request id、关键维度、错误分层）。
4. **测试**：单测覆盖核心逻辑；集成测试覆盖 DB/Redis；E2E 覆盖关键流程（如有前端），并遵守仓库测试门禁要求。
5. **修复闭环**：每个问题必须对应修复 PR/commit 或明确“弃修原因 + 风险接受人 + 截止日期”。修复中涉及“非行为变更”的重构时，必须遵循 `docs/skill/code-simplifier.md`。

## PR Review 记录

- PR-60 Agent Browser 改动 Code Review：`docs/code-review/anyhunt-server-agent-browser-pr60.md`（2026-01-25，修复完成）

## 统一审查标准（强制）

> 任何 review/修复必须遵守以下强制规范；若发现不符合项，记录为问题并在修复时对齐。

- **代码原则**：遵循 `CLAUDE.md` 的《## 代码原则》（SRP/OCP/LoD/DIP、early return、DRY、禁止兼容层/废弃注释）。
- **目录规范**：遵循 `CLAUDE.md` 的《### 后端模块结构（NestJS）》与《### 前端组件结构》，不符合的目录结构必须在修复中收敛。
- **表单与 Zod 规范**：前端表单必须使用 RHF + `zod/v3`；后端只能用 `zod`；类型必须由 schema 推断。
- **生成物规则**：`**/.tanstack/**`、`**/routeTree.gen.*` 等 generated 文件不可手改。
- **安全基线**：URL 校验、私有 IP 屏蔽、API Key 仅存哈希、反代 `trust proxy` 等硬约束必须覆盖。

## 前端性能审查标准（Vercel React Best Practices）

前端模块 review 需遵循 Vercel React Best Practices（重点关注性能与可维护性）：

- **异步与瀑布**：避免串行 `await` 导致瀑布；能并行就并行（`Promise.all`）。
- **包体与加载**：避免 barrel import；重组件使用动态加载；延后第三方脚本。
- **渲染与重渲染**：拆分昂贵渲染、稳定依赖、避免不必要订阅；长列表使用 `content-visibility` 等策略。
- **客户端请求**：去重请求（如 SWR）、避免重复监听器。
- **SSR/流式**：对支持 SSR 的应用，确认数据获取与 streaming 策略无阻塞、无重复实例。

## 优先级与执行顺序（全局）

排序规则（从高到低）：

- **P0（必须优先）**：安全/权限、Auth、API Key、配额与计费、支付回调、队列与异步一致性、SSRF/抓取隔离、数据库迁移与数据一致性。
- **P1（核心流程）**：Anyhunt Dev 的抓取/爬取/抽取/浏览器/Agent 工作流；Moryflow 的核心业务（Auth/Quota/Sync/Site 发布）。
- **P2（平台能力）**：packages 共享库（agents/\*、ui、api、types、config、embed、i18n 等）的边界、抽象与测试质量。
- **P3（工程与运维）**：CI、lint/typecheck/test、构建产物/生成物规范、Docker/部署脚本、模板与脚手架、archive 快照与许可证/安全扫尾。

建议执行阶段（可并行但要保持依赖顺序）：

1. **Phase 0**：工程基线 + 详细设计对齐 + 测试基础设施
2. **Phase 1**：Moryflow 后端（server）P0 模块
3. **Phase 2**：Anyhunt Dev 后端（server）P0 模块
4. **Phase 3**：核心前端（console/admin/www/pc/mobile）关键流程
5. **Phase 4**：packages/_ 与 tooling/_（作为平台基建统一收口）
6. **Phase 5**：deploy/_、scripts/_、templates/_、archive/_（收尾与风险确认）

补充说明（与本仓库当前策略一致）：

- CI（GitHub Actions）当前是**有意关闭自动触发**的（仅 `workflow_dispatch` 手动触发）。因此本计划的“工程基线”模块不以“打开 CI”为目标，而是以**本地可复现验证**为门禁：每次修复都应至少跑通 `pnpm lint`、`pnpm typecheck`、`pnpm test:unit`（必要时再跑 `pnpm build` / `pnpm test:e2e`）。

## 模块清单（按执行步骤）

说明：

- `Priority` 用于标注风险等级（P0→P3），每个阶段内按 P0→P3 排序。
- `Status` 建议使用：`todo` / `in_progress` / `blocked` / `done` / `wontfix`
- `Doc` 是后续要创建的模块 review 文档路径（本索引先把“坑位”列出来）

### Phase 0 - 工程基线 / 详细设计 / 测试基础设施

| Priority | Module                               | Scope                                                                                                   | Directories / Key Files                                                                                                      | Doc                                | Status |
| -------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------ |
| P0       | 工程基线（可安装性/验证门禁/生成物） | 确保“任何人都能装得起来并跑通 lint/typecheck/test”，同时明确 generated 规则（避免无意义 diff 与线上坑） | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, `eslint.config.mjs`, `tsconfig.base.json`, `scripts/` | `docs/code-review/root-tooling.md` | done   |
| P0       | deploy：测试环境与基础设施           | 测试 DB/Redis 与本地可复现性                                                                            | `deploy/infra/docker-compose.test.yml`, `deploy/infra/`                                                                      | `docs/code-review/deploy-infra.md` | done   |
| P2       | 详细设计/方案文档（仅审查）          | 对齐架构与方案假设，确保 review 过程与设计约束一致                                                      | `docs/architecture/`, `docs/research/`, `docs/products/`                                                                     | `docs/code-review/design-docs.md`  | done   |

### Phase 1 - Moryflow 后端（P0 优先 → P1）

| Priority | Module                                  | Scope                           | Directories / Key Files                                                                                                                                                             | Doc                                                       | Status  |
| -------- | --------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------- |
| P0       | Moryflow Server：Auth & Quota & Payment | 核心产品的账户/配额/支付闭环    | `apps/moryflow/server/src/auth/`, `apps/moryflow/server/src/quota/`, `apps/moryflow/server/src/payment/`, `apps/moryflow/server/src/admin-payment/`, `apps/moryflow/server/prisma/` | `docs/code-review/moryflow-server-auth-quota-payment.md`  | done    |
| P1       | Moryflow：Publish/AI Proxy              | 发布 worker、模型代理与成本边界 | `apps/moryflow/publish-worker/`, `apps/moryflow/server/src/ai-proxy/`                                                                                                               | `docs/code-review/moryflow-publish-vectorize-ai-proxy.md` | done    |
| P1       | Moryflow：Vectorize（暂不处理）         | 将由 Anyhunt 的 Memox 替换      | `apps/moryflow/vectorize/`, `apps/moryflow/server/src/vectorize/`                                                                                                                   | `docs/code-review/moryflow-publish-vectorize-ai-proxy.md` | wontfix |

### Phase 2 - Anyhunt 后端（P0 优先 → P1）

| Priority | Module                                       | Scope                                        | Directories / Key Files                                                                                                                                                             | Doc                                                  | Status                                                                                          |
| -------- | -------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| P0       | Anyhunt Server：Auth & Session               | 登录/回调/cookie/跨域/信任反代/权限边界      | `apps/anyhunt/server/src/auth/`, `apps/anyhunt/server/src/user/`, `apps/anyhunt/server/src/common/guards/`                                                                          | `docs/code-review/anyhunt-server-auth.md`            | done (2026-01-25 fix)                                                                           |
| P0       | Anyhunt Server：API Key & Quota              | API Key 存储/校验；限流/配额扣减一致性       | `apps/anyhunt/server/src/api-key/`, `apps/anyhunt/server/src/quota/`, `apps/anyhunt/server/src/billing/`                                                                            | `docs/code-review/anyhunt-server-api-key-quota.md`   | done (fix)                                                                                      |
| P0       | Anyhunt Server：Billing & Payment            | 订阅/充值/对账/幂等；支付回调安全            | `apps/anyhunt/server/src/payment/`, `apps/anyhunt/server/src/billing/`                                                                                                              | `docs/code-review/anyhunt-server-billing-payment.md` | done (2026-01-25 fix)                                                                           |
| P0       | Anyhunt Server：抓取安全（SSRF/网络隔离）    | URL 校验、内网阻断、代理/重定向策略          | `apps/anyhunt/server/src/common/validators/`, `apps/anyhunt/server/src/scraper/`, `apps/anyhunt/server/src/crawler/`, `apps/anyhunt/server/src/browser/`                            | `docs/code-review/anyhunt-server-ssrf-sandbox.md`    | done (2026-01-26 fix)                                                                           |
| P0       | Anyhunt Server：Queue/异步一致性             | BullMQ/Redis 可靠性、重复投递、幂等、DLQ     | `apps/anyhunt/server/src/queue/`, `apps/anyhunt/server/src/digest/`, `apps/anyhunt/server/src/batch-scrape/`                                                                        | `docs/code-review/anyhunt-server-queue.md`           | done (2026-01-24 fix)                                                                           |
| P0       | Anyhunt Server：Prisma/迁移/多数据库边界     | Schema 设计、迁移策略、读写分离/事务边界     | `apps/anyhunt/server/prisma/`, `apps/anyhunt/server/src/prisma/`, `apps/anyhunt/server/src/vector-prisma/`                                                                          | `docs/code-review/anyhunt-server-prisma.md`          | done (2026-01-26 fix)                                                                           |
| P1       | Anyhunt Server：Scraper/Crawler/Extract/Map  | Fetchx 核心能力在 Anyhunt 统一后端的实现质量 | `apps/anyhunt/server/src/scraper/`, `apps/anyhunt/server/src/crawler/`, `apps/anyhunt/server/src/extract/`, `apps/anyhunt/server/src/map/`, `apps/anyhunt/server/src/batch-scrape/` | `docs/code-review/anyhunt-server-fetchx-core.md`     | done (2026-01-26 fix)                                                                           |
| P1       | Anyhunt Server：Browser（Agent Browser）     | 浏览器会话、CDP、安全、资源回收、持久化      | `apps/anyhunt/server/src/browser/`                                                                                                                                                  | `docs/code-review/anyhunt-server-browser.md`         | done (2026-01-26 fix)                                                                           |
| P1       | Anyhunt Server：Agent/LLM/Embedding          | 提示词/工具调用/流式协议/策略注入/成本控制   | `apps/anyhunt/server/src/agent/`, `apps/anyhunt/server/src/llm/`, `apps/anyhunt/server/src/embedding/`                                                                              | `docs/code-review/anyhunt-server-agent-llm.md`       | done (2026-01-26 fix; embedding keep)                                                           |
| P1       | Anyhunt Server：Memory/Graph/Relation/Entity | Memox 能力在 Anyhunt 统一后端的落地质量      | `apps/anyhunt/server/src/memory/`, `apps/anyhunt/server/src/graph/`, `apps/anyhunt/server/src/relation/`, `apps/anyhunt/server/src/entity/`                                         | `docs/code-review/anyhunt-server-memox-core.md`      | in_progress (实现已同步；Mem0 v1 对齐、Filters DSL、R2 导出、Token 认证；events 等平台能力暂缓) |
| P1       | Anyhunt Server：Digest（投递/模板/队列）     | Digest 生成、投递链路、模板安全、退订/合规   | `apps/anyhunt/server/src/digest/`, `apps/anyhunt/server/src/email/`, `apps/anyhunt/server/src/webhook/`                                                                             | `docs/code-review/anyhunt-server-digest.md`          | todo                                                                                            |

### Phase 3 - 核心前端（Anyhunt Dev + Moryflow）

核心前端范围：

**Anyhunt Dev**

- 开发者控制台：`apps/anyhunt/console/`
- 运营管理后台：`apps/anyhunt/admin/www/`
- 官网/Reader：`apps/anyhunt/www/`

**Moryflow**

- 桌面端：`apps/moryflow/pc/`
- 移动端：`apps/moryflow/mobile/`
- 管理后台：`apps/moryflow/admin/`
- 官网：`apps/moryflow/www/`
- 发布站点模板：`apps/moryflow/site-template/`

| Priority | Module                               | Scope                                                 | Directories / Key Files                                                      | Doc                                        | Status                                    |
| -------- | ------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| P2       | Anyhunt Console（开发者控制台）      | 登录态、API Key 管理、核心工作台流程、E2E + 性能规范  | `apps/anyhunt/console/`                                                      | `docs/code-review/anyhunt-console.md`      | done（模块 A/B/C/D/E + 项目复盘全部完成） |
| P2       | Anyhunt Admin（运营后台）            | 权限边界、敏感操作审计、充值/配额管理 + 性能规范      | `apps/anyhunt/admin/www/`                                                    | `docs/code-review/anyhunt-admin.md`        | todo                                      |
| P2       | Anyhunt WWW（官网/Reader/Developer） | SSR/SEO/跳转、读者流程、性能与稳定性（含 SSR 规范）   | `apps/anyhunt/www/`                                                          | `docs/code-review/anyhunt-www.md`          | todo                                      |
| P2       | Moryflow PC                          | 桌面端主流程、性能、崩溃边界、打包产物 + 性能规范     | `apps/moryflow/pc/`                                                          | `docs/code-review/moryflow-pc.md`          | done (2026-01-26, preload CJS)            |
| P2       | Moryflow Mobile                      | Expo/RN 关键流程、离线/同步、权限与隐私 + 性能规范    | `apps/moryflow/mobile/`                                                      | `docs/code-review/moryflow-mobile.md`      | todo                                      |
| P2       | Moryflow Admin/WWW/Site Template     | 站点发布链路与模板安全、SEO 与构建策略（含 SSR 规范） | `apps/moryflow/admin/`, `apps/moryflow/www/`, `apps/moryflow/site-template/` | `docs/code-review/moryflow-web-surface.md` | done (2026-01-24)                         |

### Phase 4 - packages/_ 与 tooling/_（平台基建与复用质量）

| Priority | Module                                          | Scope                                                                                                                           | Directories / Key Files                                                                                                                                                                                  | Doc                                             | Status            |
| -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------- |
| P3       | packages/ui（组件库与样式入口）                 | 统一 UI、可访问性、样式扫描、暗坑清理                                                                                           | `packages/ui/`, `packages/ui/styles/`                                                                                                                                                                    | `docs/code-review/packages-ui.md`               | done              |
| P3       | packages/types + packages/api + packages/config | 类型源头、API 客户端、共享配置边界                                                                                              | `packages/types/`, `packages/api/`, `packages/config/`                                                                                                                                                   | `docs/code-review/packages-types-api-config.md` | done              |
| P3       | packages/agents\*（Agent 平台能力）             | 工具协议/运行时/模型注册/沙盒/测试质量（已迁移至 `@openai/agents-core`，聚焦 adapter/runtime/tools/mcp/sandbox/model-registry） | `packages/agents-adapter/`, `packages/agents-runtime/`, `packages/agents-tools/`, `packages/agents-mcp/`, `packages/agents-sandbox/`, `packages/agents-model-registry/`, `packages/model-registry-data/` | `docs/code-review/packages-agents.md`           | done (2026-01-24) |
| P3       | packages/embed\* + packages/i18n                | 嵌入 SDK、国际化边界、构建与发布                                                                                                | `packages/embed/`, `packages/embed-react/`, `packages/i18n/`                                                                                                                                             | `docs/code-review/packages-embed-i18n.md`       | done              |
| P3       | packages/sync + packages/tiptap                 | 同步与编辑器能力（跨端一致性）                                                                                                  | `packages/sync/`, `packages/tiptap/`                                                                                                                                                                     | `docs/code-review/packages-sync-tiptap.md`      | todo              |
| P3       | tooling/\*（eslint/ts）                         | 规则正确性、迁移成本、开发体验（tailwind-config 已移除）                                                                        | `tooling/eslint-config/`, `tooling/typescript-config/`                                                                                                                                                   | `docs/code-review/tooling-config.md`            | done (2026-01-24) |

### Phase 5 - deploy/_、scripts/_、templates/_、archive/_（收尾）

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

## Review 执行计划（逐步）

先按阶段顺序执行（严格按下列顺序；可并行但不跨阶段跳跃）：

1. **Phase 0**：工程基线 + 详细设计对齐 + 测试基础设施
2. **Phase 1**：Moryflow 后端（server）P0 模块
3. **Phase 2**：Anyhunt Dev 后端（server）P0 模块
4. **Phase 3**：核心前端（console/admin/www/pc/mobile）关键流程
5. **Phase 4**：packages/_ 与 tooling/_（作为平台基建统一收口）
6. **Phase 5**：deploy/_、scripts/_、templates/_、archive/_（收尾与风险确认）

每个模块按以下步骤执行，并在“进度同步区”更新记录：

1. **范围确认**：入口点/依赖/数据模型清单，避免漏评或超范围。
2. **规范对齐**：对照“统一审查标准 + 前端性能规范”，列出不符合项。
3. **风险扫描**：安全/权限/一致性/幂等/队列/资源回收优先。
4. **测试审计**：单测/集成/E2E 缺口与覆盖清单。
5. **修复计划**：按严重程度拆分修复项，保持单一逻辑变更。
6. **验证与回归**：至少跑通 `pnpm lint`、`pnpm typecheck`、`pnpm test:unit`；必要时补充模块级验证。
7. **文档同步**：更新对应模块 review 文档 + 本页“进度同步区”。

## 进度同步区（每次 review/修复后追加）

> 约定：每次 review 结束或修复落地后，在此追加一行，并同步模块 `Status`。

| 日期       | 模块                         | 结论摘要                                                                               | 修复记录（PR/commit） | 状态        |
| ---------- | ---------------------------- | -------------------------------------------------------------------------------------- | --------------------- | ----------- |
| 2026-01-26 | anyhunt-server-prisma        | 完成 review 文档；记录多数据库边界与迁移一致性问题                                     | -                     | in_progress |
| 2026-01-26 | anyhunt-server-prisma        | 修复完成（migrate deploy 对齐/环境校验/db push guard/测试重置）                        | -                     | done        |
| 2026-01-26 | anyhunt-server-fetchx-core   | 完成 review 文档；列出 headers 覆盖/超时语义/SSRF 错误码/计费语义问题                  | -                     | in_progress |
| 2026-01-26 | anyhunt-server-fetchx-core   | 修复完成（headers 合并/SSRF 403/syncTimeout/原子队列/敏感头不落库）                    | -                     | done        |
| 2026-01-26 | packages-types-api-config    | 完成 review + 修复（类型包收敛、会员文案英文化、配置升级、协议标注）                   | -                     | done        |
| 2026-01-26 | tooling-config               | 完成 review + 修复（React 规则补齐、Prettier 依赖、Vitest 全局、移除 tailwind-config） | -                     | done        |
| 2026-01-25 | anyhunt-server-api-key-quota | 修复完成：有效订阅 tier、扣减边界、退款/购买幂等、DTO 对齐                             | -                     | done        |
| 2026-01-25 | anyhunt-server-billing       | 完成 review；存在 P0 幂等/权益授予/重放风险                                            | -                     | in_progress |
| 2026-01-25 | moryflow-pc                  | 修复完成：外链/导航安全、sandbox、英文文案、Lucide、hooks 单测；E2E 待补               | -                     | in_progress |
| 2026-01-24 | anyhunt-server-auth          | 完成复审（Better Auth best practices）；待修复 CSRF/Token/Origin/事务/限流             | -                     | in_progress |
| 2026-01-24 | moryflow-pc                  | 完成 review 并补充修复方案；存在外链导航安全、Zod 规范、性能与测试缺口等问题           | -                     | in_progress |
| 2026-01-24 | packages-embed-i18n          | 完成 review + 修复（Embed fallback、client 边界、i18n 常量清理、单测补齐）             | ecdb3b5               | done        |
| 2026-01-23 | root-tooling                 | 完成 review；存在 P1 npmrc 冲突与脚本清理项                                            | -                     | in_progress |
| 2026-01-23 | root-tooling                 | 修复完成（npmrc 对齐/clean 跨平台；embedMeta 仅注入 name/version）                     | -                     | done        |
| 2026-01-23 | moryflow-auth-quota-payment  | 完成 review；存在 P1 安全问题与 P2 一致性问题                                          | -                     | in_progress |
| 2026-01-23 | moryflow-publish-ai-proxy    | 修复完成（欠费门禁/断连取消/Publish 容错/SSE backpressure/参数透传）                   | -                     | done        |
| 2026-01-22 | deploy/infra                 | 完成首轮 review；存在 P2 可靠性问题（healthcheck/等待/容器名冲突）                     | -                     | in_progress |
| 2026-01-22 | deploy/infra                 | 修复完成（healthcheck/健康轮询/容器名冲突）                                            | -                     | done        |
| 2026-01-22 | design-docs                  | 完成审查；存在 P2 文档索引/状态/域名规划不一致                                         | -                     | done        |
| 2026-01-22 | design-docs                  | 修复完成（补齐 frontmatter/清理索引/对齐域名规划/清理缺失引用）                        | -                     | done        |
