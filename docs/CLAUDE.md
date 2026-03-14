<!--
[INPUT]: docs/ 下的内部协作文档
[OUTPUT]: 精简且可执行的文档治理规则
[POS]: docs/ 协作规范

[PROTOCOL]: 仅在 docs 结构、治理规则或入口职责变化时更新本文件；禁止记录时间线。
-->

# docs/ 目录指南

## 结构约束（强制）

- `docs/` 第一层只允许 `design`、`reference` 与少量根索引/治理文件。
- 架构正文仅允许放在 `docs/design/*`。
- `docs/design` 第一层只能有 `anyhunt`、`moryflow`。
- 每个产品只允许 `core`、`features`、`runbooks` 三个分类目录。
- `docs/design/*/*` 下禁止再建子目录。
- `docs/reference` 仅允许扁平 Markdown 文档与 `index.md`，禁止继续创建子目录。

## 文档职责

- `CLAUDE.md` 只记录稳定协作边界：目录职责、结构边界、公共契约、关键约束、核心入口。
- `index.md` 只做导航：保留文档入口、状态与一行摘要，禁止承担 changelog。
- design/runbook 正文是唯一事实源：协议、架构、运维、验收结论都直接写入正文。
- `docs/reference/*` 承接协作规则、工程规范、验证流程与部署/构建基线。
- 新需求的 design doc / implementation plan 默认先落在 `docs/plans/*`，作为执行期工作区。
- 云同步与 Memox 的跨服务验证基线统一沉淀在 `docs/reference/cloud-sync-and-memox-validation.md`，用于排障顺序、成功标准、测试分层以及“当前 blocker / 当前证据 / 下一步排查顺序”的单版本上下文维护。
- 云同步与 Memox 的线上执行手册统一沉淀在 `docs/reference/cloud-sync-and-memox-production-validation-playbook.md`，用于固定验收顺序、HTTP 命令模板、PC 触发步骤与失败分流。
- 文档默认只保留当前真相；历史过程依赖 git / PR，不在 docs 体系重复维护。

## 生命周期与状态

仅允许 `draft`、`active`、`in_progress`、`completed`。

## 清理原则

- `completed` 文档默认去日志化；保留最终方案、最终约束、最终结论，不保留逐轮执行播报。
- 删除文档前先回写有效事实，再删除旧稿。
- 同功能文档优先并入单一事实源，避免重复维护。
- PR 合并前必须完成 `docs/plans/* -> docs/design/* | docs/reference/*` 的稳定事实收敛；计划文档只保留尚未进入正式正文的执行内容。
- `docs/plans/*` 中只有“被采纳的稳定事实”才强制回写；回写时优先更新已有 `docs/design/*` 或 `docs/reference/*`，纯执行计划、已过时方案与已被正文吸收的内容可直接删除。
- `docs/design/*` 文件名只表达主题、架构、基线或能力边界；流程状态统一放在 frontmatter `status`，不再把 `plan`、`todo`、`draft` 等过程词写进正式正文文件名。
- 仅在“摘要入口 + 详细正文”承担不同抽象层级时，才允许双层保留；禁止两篇文档重复维护同一批事实。
- 禁止 `archive/` 文档目录。
- 允许保留可直接指导后续开发的详细文档；仅删除冗余与失效内容。
- 涉及多端 UI/交互方案的文档，必须明确端能力矩阵与共享逻辑抽离边界。
- 涉及重构与交互收敛的方案文档，必须采用单版本口径：禁止兼容分支、禁止双轨实现、禁止“旧版保留”描述。

## 维护流程

1. 先确定事实归属（Anyhunt/Moryflow + core/features/runbooks）。
2. 若是架构/协议/运维事实，直接修改 `docs/design/*` 正文；若是协作/工程/验证/部署规则，修改 `docs/reference/*`。
3. `docs/plans/*` 中被采纳的稳定事实，必须先判断归属并回写到正式正文；回写后删除冗余 plan，避免长期双写。
4. 仅在导航失真时更新对应 `index.md`。
5. 涉及外部榜单、参数清单或时间敏感数据的文档，必须注明采集时间、来源链接与筛选口径。
6. 仅在 docs 治理规则或全局协作边界变化时更新本文件与根 `CLAUDE.md`。
7. 删除重复/过时文档，并确保无断链与超层级目录。
