<!--
[INPUT]: 本目录下的 Markdown 文档与架构说明
[OUTPUT]: 统一的文档组织方式与写作约束（供人类与 AI 协作）
[POS]: docs/ 的写作约束与组织规范（索引入口在 docs/index.md）

[PROTOCOL]: 本文件变更时，需同步更新根 CLAUDE.md 的文档索引（若影响全局）。
-->

# docs/ 目录指南

> 最近更新：2026-01-14（Agent 硬取消/credits 分段检查）

> 本目录存放面向开发与协作的项目文档（非产品对外文档站点实现）。

> 说明：对外文档站点是**独立项目**（不与官网耦合）：
>
> - Aiget Dev Docs：`apps/aiget/docs` → `docs.aiget.dev`
> - Moryflow Docs：`apps/moryflow/docs` → `docs.moryflow.com`

## 写作约束

- 开发者相关内容使用中文；用户可见文案（若出现）使用英文。
- 以“可执行”为目标：域名、路由、职责边界、流程与配置要能落地。
- Markdown 文档建议包含 YAML Frontmatter（`title/date/scope/status`），便于后续文档站或索引生成。
- Aiget Dev API 域名统一使用 `server.aiget.dev`（不再使用 `aiget.dev` 作为 API 域名）。
- 排障/实验类记录优先放在 `docs/research/`，并在 `docs/index.md` 增加索引项，便于持续跟踪与后续归档。
- Research 文档更新时，在 `docs/index.md` 标注更新日期，便于协作追踪。
- Research 文档如更新测试验证结果或告警状态，同步刷新索引备注（例如 warnings 清理情况）。
- 进度类 Research 文档完成代码核对后，需要在正文标注核对日期，并更新文档版本与更新日志。

## 目录结构

- `docs/index.md`：统一入口索引（新增/移动文档时首先更新这里）。
- `docs/architecture/`：系统级架构决策与不变量（“最终真相”）；含 `adr/` 决策记录与 `auth/` 拆分文档。
- `docs/guides/`：开发指南（如何做、最佳实践、可复用做法）。
- `docs/runbooks/`：运行手册（部署/排障/操作清单，照做即可）。
- `docs/products/`：产品线内的内部方案（Aiget Dev / Moryflow）。
- `docs/_archived/`：已完成/归档的文档（progress.md、ui-migration-moryflow.md、console-refactor-plan.md）。
- `docs/_archived/plans/`：已完成或阶段性结束的计划类文档（仅保留追溯价值）。
- `docs/_archived/migrations/`：归档迁移记录。
