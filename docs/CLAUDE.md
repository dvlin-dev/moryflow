<!--
[INPUT]: 本目录下的 Markdown 文档与架构说明
[OUTPUT]: 统一的文档组织方式与写作约束（供人类与 AI 协作）
[POS]: docs/ 目录的工作约定与索引入口

[PROTOCOL]: 本文件变更时，需同步更新根 CLAUDE.md 的文档索引（若影响全局）。
-->

# docs/ 目录指南

> 本目录存放面向开发与协作的项目文档（非产品对外文档站点实现）。

> 说明：对外文档站点是**独立项目**（不与官网耦合）：
>
> - Aiget Dev Docs：`apps/aiget/docs` → `docs.aiget.dev`
> - Moryflow Docs：`apps/moryflow/docs` → `docs.moryflow.com`

## 写作约束

- 开发者相关内容使用中文；用户可见文案（若出现）使用英文。
- 以“可执行”为目标：域名、路由、职责边界、流程与配置要能落地。
- Markdown 文档建议包含 YAML Frontmatter（`title/date/scope/status`），便于后续文档站或索引生成。

## 目录结构

- `docs/architecture/`：架构与部署设计（当前阶段的“最终真相”优先写在这里，含 OAuth 登录与 Auth 数据库隔离等关键约束）。
- `docs/architecture/open-source-package.md`：把 Monorepo 内单个包拆分为开源仓库的可复用方案（Git Subtree 双向同步）。
- `docs/architecture/auth/`：Auth（两套业务线）拆分设计文档。
- `docs/architecture/aiget-dokploy-deployment.md`：Aiget Dev Dokploy 多项目部署清单。
- 部署落点与端口分配：以 `docs/architecture/domains-and-deployment.md` 与 `docs/architecture/refactor-and-deploy-plan.md` 为准（Moryflow compose + Aiget Dokploy 多项目 + megaboxpro 反代到 `IP:端口`）。
- `docs/features/`：功能层设计（用户系统两套 Auth + Google/Apple 登录、改造计划、订阅/钱包、API Key 等可复用能力）。
- `docs/features/index.md`：功能层文档索引。
- `docs/features/user-system/quick-start.md`：Auth 服务模板的快速接入说明。
- `docs/features/user-system/fetchx-integration-plan.md`：Fetchx 试点接入方案（官网/console/admin，含 Auth Client 接入细节）。
- `docs/features/scheduled-digest/overview.md`：功能：定时内容订阅（Email Digest）（自定义 cron + 时区、抓全文、AI 摘要、用户全局去重）。
- `docs/progress.md`：改造进度记录与下一步清单。
- `docs/*.md`：一次性记录、handoff、复盘等。
