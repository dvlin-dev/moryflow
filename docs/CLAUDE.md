<!--
[INPUT]: docs/ 下的内部协作文档
[OUTPUT]: 精简且可执行的文档治理规则
[POS]: docs/ 协作规范

[PROTOCOL]: 本文件变更需同步 `docs/index.md`；若影响全局协作边界，需同步根 `CLAUDE.md`。
-->

# docs/ 目录指南

## 结构约束（强制）

- 正文文档仅允许放在 `docs/design/*`。
- `docs/design` 第一层只能有 `anyhunt`、`moryflow`。
- 每个产品只允许 `core`、`features`、`runbooks` 三个分类目录。
- 分类目录下禁止再建子目录。

## 生命周期与状态

仅允许 `draft`、`active`、`in_progress`、`completed`。

## 治理规则

- `CLAUDE.md` 不承载时间线播报（禁止“最近更新”流水）。
- 更新事实应写入对应 design 文档。
- 删除文档前先回写有效事实，再删除旧稿。
- 同功能文档优先并入单一事实源，避免重复维护。
- 禁止 `archive/` 文档目录。
- 允许保留可直接指导后续开发的详细文档；仅删除冗余与失效内容。
- 涉及多端 UI/交互方案的文档，必须明确“端能力矩阵（Web/PC/Mobile）+ 共享逻辑抽离边界（可复用/不可复用）”。
- 涉及重构与交互收敛的方案文档，必须采用单版本口径：禁止兼容分支、禁止双轨实现、禁止“旧版保留”描述。
- 涉及 Anyhunt 与 Moryflow 同类 chat 能力的方案，必须优先声明共享事实源与复用路径，禁止在两条业务线各自维护重复状态语义。
- 涉及“执行计划 + 进度同步”的方案文档，必须回写每轮 PR review 的问题判定、根因与闭环结果，禁止只改代码不回写事实。
- 涉及 Agent Prompt 与产物生成策略的方案文档，必须显式定义“在用户 Vault 内选择合适目录落盘”的规则（禁止默认写入 Vault 根目录）。

## 维护流程

1. 先确定事实归属（Anyhunt/Moryflow + core/features/runbooks）。
2. 修改目标事实文档并更新对应 `index.md`。
3. 涉及外部榜单/参数清单的文档，必须注明采集时间、来源链接与筛选口径。
4. 删除重复/过时文档。
5. 运行链接与层级校验，确保无断链与超层级目录。

## 近期变更

- 2026-03-02：`docs/design/moryflow/features/editor-selection-chat-reference-unification-plan.md` 已补充 PR review 问题闭环：同文本重复选中场景引入 `captureVersion` 单调身份，发送成功仅按版本精确清理引用（失败保留）。
- 2026-03-02：`docs/design/moryflow/features/editor-selection-chat-reference-unification-plan.md` 已回写执行进度：Step 1~5 全部完成（含 typecheck 与 test:unit 命令记录）。
- 2026-03-02：再次更新 `docs/design/moryflow/features/editor-selection-chat-reference-unification-plan.md`：明确“删除 Improve”在共享包层全端生效（Web/Mobile 同步移除但不补替代入口），并收敛字段命名为 `contextSummary` 单一口径。
- 2026-03-02：更新 `docs/design/moryflow/features/editor-selection-chat-reference-unification-plan.md`：Improve 口径由“入口下线”改为“功能直接删除（无开关/无兼容）”，并将选区引用上限统一为 1w 字。
- 2026-03-02：新增 `docs/design/moryflow/features/editor-selection-chat-reference-unification-plan.md`（PC 选区 AI 入口收敛方案），并同步 `docs/design/moryflow/features/index.md` 与 `docs/index.md` 入口索引。
- 2026-03-02：新增 `docs/design/moryflow/core/pc-permission-unification-plan.md` 作为 PC 权限重构事实源；`docs/design/moryflow/core/index.md` 已同步入口索引。
