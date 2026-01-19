<!--
[INPUT]: 本目录下的 Markdown 文档与架构说明
[OUTPUT]: 统一的文档组织方式与写作约束（供人类与 AI 协作）
[POS]: docs/ 的写作约束与组织规范（索引入口在 docs/index.md）

[PROTOCOL]: 本文件变更时，需同步更新根 CLAUDE.md 的文档索引（若影响全局）。
-->

# docs/ 目录指南

> 最近更新：2026-01-20（Console Fetchx 路由调整为 `/fetchx/*`；Console API 统一 `/api/v1/console/*`）

> 本目录存放面向开发与协作的项目文档（非产品对外文档站点实现）。

> 说明：对外文档站点是**独立项目**（不与官网耦合）：
>
> - Anyhunt Dev Docs：`apps/anyhunt/docs` → `docs.anyhunt.app`
> - Moryflow Docs：`apps/moryflow/docs` → `docs.moryflow.com`

## 写作约束

- 开发者相关内容使用中文；用户可见文案（若出现）使用英文。
- 以“可执行”为目标：域名、路由、职责边界、流程与配置要能落地。
- Markdown 文档建议包含 YAML Frontmatter（`title/date/scope/status`），便于后续文档站或索引生成。
- Anyhunt Dev API 域名统一使用 `server.anyhunt.app`（不再使用 `anyhunt.app` 作为 API 域名）。
- 排障/实验类记录优先放在 `docs/research/`，并在 `docs/index.md` 增加索引项，便于持续跟踪与后续归档。
- Research 文档更新时，在 `docs/index.md` 标注更新日期，便于协作追踪。
- Research 文档如更新测试验证结果或告警状态，同步刷新索引备注（例如 warnings 清理情况）。
- 进度类 Research 文档完成代码核对后，需要在正文标注核对日期，并更新文档版本与更新日志。

## 目录结构

- `docs/index.md`：统一入口索引（新增/移动文档时首先更新这里）。
- `docs/architecture/`：系统级架构决策与不变量（"最终真相"）；含 `adr/` 决策记录与 `auth/` 拆分文档。
- `docs/guides/`：开发指南（如何做、最佳实践、可复用做法）。
- `docs/runbooks/`：运行手册（部署/排障/操作清单，照做即可）。
- `docs/products/`：产品线内的内部方案（Anyhunt Dev / Moryflow）。
- `docs/_archived/`：已完成/归档的文档（progress.md、ui-migration-moryflow.md、console-refactor-plan.md）。
- `docs/_archived/plans/`：已完成或阶段性结束的计划类文档（仅保留追溯价值）。
- `docs/_archived/migrations/`：归档迁移记录。
- `docs/skill/`：Codex Skills 相关说明（Prompt/技能元信息），用于本仓库内的协作与对齐。

## 最近更新

- Digest 全量 Code Review：`docs/products/anyhunt-dev/reviews/digest-code-review-plan.md`（Admin 路由冲突消除、全模块分页协议统一 `page/limit`、关键投递/安全问题修复；修复完成先暂存区确认再推送）
- Reader 顶部导航 + Explore Topics 专用页（已落地）：`docs/products/anyhunt-dev/features/explore-topics-revamp.md`（`/`→`/welcome`；`/explore` 两栏工作台；`/topic/*`、`/inbox/*` 状态驱动 URL；Welcome 支持后台配置）
- Admin：手动充值 Credits（已落地）：`docs/products/anyhunt-dev/features/admin-credits-and-entitlements.md`（可审计的 credits 充值；落 `QuotaTransaction(ADMIN_GRANT)` + `AdminAuditLog`）
- 免费用户每日赠送 100 Credits（方案）：`docs/products/anyhunt-dev/features/daily-free-credits.md`（对齐 Moryflow：daily bucket 用 Redis+TTL，消费优先级 daily→monthly→purchased）
- www Reader/Developer 双模块布局方案：`docs/products/anyhunt-dev/features/www-reader-and-developer-split.md`（Reader 内操作不跳页：登录/设置弹窗；Developer 端保持 Header/Footer）
- www Reader SRP 与 Props 收敛重构计划：`docs/products/anyhunt-dev/features/www-reader-srp-and-props-refactor.md`（分支视图用 ViewModel 收敛 Props，按域拆分 SRP 组件，保持现有懒加载与错误边界策略）
- Aiget → Anyhunt 全量品牌迁移（无历史兼容）：`docs/migrations/aiget-to-anyhunt.md`（域名/包名/环境变量/API Key 前缀/Prisma 迁移重置）
- Anyhunt Dokploy 多项目部署清单：`docs/runbooks/deploy/anyhunt-dokploy.md`（补充 `ADMIN_EMAIL`/管理员 bootstrap 与旧路径报错排查）
- 合并冲突解决方案：dvlin-dev/agent-browser-research → main：`docs/research/merge-agent-browser-research.md`（2026-01-19：补充 Docker workspace 依赖修复）
- Console Agent Browser Playground 设计方案（L2 Browser + L3 Agent）：`docs/research/console-agent-browser-playground-design.md`（2026-01-20：独立模块路径 `/agent-browser/*`）
- Console Fetchx 路由调整：`docs/products/anyhunt-dev/features/unified-auth-and-digest-architecture.md`（2026-01-20：更新为 `/fetchx/*`）
- Console API 版本化：`docs/research/console-agent-browser-playground-design.md`（2026-01-20：统一 `/api/v1/console/*`）
- Skill：`code-simplifier` 文档中文化：`docs/skill/code-simplifier.md`（2026-01-19）
