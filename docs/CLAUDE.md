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

- 2026-03-03：PR #136 二次追加评论（3 条未解决线程）已完成根因收口：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 新增“21.7”，覆盖 pairing 审批状态门禁（仅 `pending` 可 approve/deny）、settings partial update 的 defined-key 合并语义、以及 polling 409（`error_code` 分类 + 409 分支 continue）修复与回归测试；并完成全量 L2 校验（`pnpm lint/typecheck/test:unit`）。
- 2026-03-03：再次更新 `docs/design/moryflow/core/permission-first-authorization-full-access-reminder.md` 第 11 节，回写“审批异常文案分支”向“结构化幂等审批协议（approved/already_processed）”收口、PC/Mobile 同步实现与回归验证（PC `320` tests、Mobile `32` tests）。
- 2026-03-03：更新 `docs/design/moryflow/core/permission-first-authorization-full-access-reminder.md` 第 11 节为“已完成”，回写“`Enable Full access` 后审批过期竞态”根因、实现收口与测试结论；并同步 `docs/design/moryflow/core/index.md` 与 `docs/index.md` 入口说明。
- 2026-03-03：`docs/design/moryflow/features/moryflow-pc-telegram-home-agent-entry-plan.md` 已从 `draft` 回写为 `completed`：Home Modules 已落地 `Agent > Skills > Sites`，`Agent` 点击右侧直出 Telegram 页面；Settings 内 `telegram` 分区已移除；并同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md` 完成态口径。
- 2026-03-03：PR #136 新增安全评论（settings-store secret 落盘）已闭环：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 新增“21.6 追加评论收口”，确认 `normalizeAccount` 旧实现存在扩展字段落盘风险，并记录白名单持久化修复（`sanitizeAccountPatch`）与回归测试 `settings-store.test.ts`。
- 2026-03-03：PR #136 第三轮修复已执行完成：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 的“21.5 执行结果”已回写，覆盖 webhook 超限/超时路径“先返回 4xx 再强制断流”、`fallback/retry` 预算解耦、polling non-retryable 终态停机，以及受影响验证 + 全量 `pnpm lint/typecheck/test:unit` 通过证据。
- 2026-03-03：PR #136 第三轮 review 事实与修复方案已回写：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 新增“21. PR #136 评论收敛与第三轮修复方案”，覆盖 3 条未解决线程的有效性判定与根因修复路线（webhook 超限连接释放、fallback/retry 预算解耦、polling non-retryable 分层停机），并明确 L2 验收标准。
- 2026-03-03：Telegram 架构文档补充 P3 分层收口证据：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 的“20.4 执行结果”已新增 4 个分层服务单测（`settings-application-service`、`pairing-admin-service`、`inbound-reply-service`、`runtime-orchestrator`）与最新 L2 校验结果（`pnpm lint/typecheck/test:unit` 通过，`@moryflow/pc` 为 98 files / 341 tests）。
- 2026-03-03：Telegram 第二轮 review findings 已完成闭环并回写：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 的“20.4 执行结果（已完成）”已补齐，覆盖 service 分层重构（orchestrator/reply/settings/pairing）、webhook 监听边界解耦（默认 `127.0.0.1:8787`）、body 错误码细分（`400/408/413/500`）、Settings 前置校验与审批失败态，以及 L2 全量验证通过记录（`pnpm lint/typecheck/test:unit`）。
- 2026-03-03：Telegram 第二轮 review findings 已先行回写“执行前方案”并进入实现：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 新增“20. 第二轮 Review Findings 闭环计划（执行前）”，覆盖 service 分层重构、webhook 监听边界解耦（默认 `127.0.0.1:8787`）、webhook body 错误码细分、以及 Settings UI 审批失败态与 webhook 条件校验前置。
- 2026-03-03：Telegram 剩余三项已全部收口并回写：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 的“19. 剩余三项收口进度”已更新为 completed；webhook ingress 主进程接入、keytar 写路径显式失败语义与对应测试已完成，且全量 `pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 均通过。
- 2026-03-03：按“先文档后修复”流程闭环 Telegram review finding（P2）：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 新增并回写 Finding #1（问题定义、执行前方案、执行后结果）；`packages/channels-telegram/src/telegram-runtime.ts` 统一 update 失败异常流与退避、并在失败前推进已成功项 safe watermark；`packages/channels-telegram/test/telegram.test.ts` 新增 watermark 语义回归用例并通过受影响验证。
- 2026-03-03：Telegram polling 根因修复完成：`packages/channels-telegram/src/telegram-runtime.ts` 中 update 处理失败从“批内 break”收敛为“先落已处理 safe watermark，再抛到外层统一退避分支”，避免同一失败 update 的快速重试循环；`packages/channels-telegram/test/telegram.test.ts` 新增回归测试验证退避生效。
- 2026-03-03：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 状态已收敛为 `completed`，并新增 Step 6（全量 lint/typecheck/test:unit 通过、关键链路补强、改动暂存与最终 code review 闭环）。
- 2026-03-03：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 的 Step 3 已补充 pairing 过期治理：`channel_pairing_requests` 在查询/按 ID 读取前对 `expires_at` 到期请求执行 `pending -> expired` 收敛，避免审批队列长期堆积。
- 2026-03-03：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 已回写执行进度 Step 5（Settings UI 完成）：Settings 新增 Telegram 分区与单账号主路径（Enable/Token/Mode/Save）、高级折叠参数区、Pairing 审批中心（Approve/Deny），并同步 `settings` i18n 导航键（`telegram`/`telegramDescription`）。
- 2026-03-03：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 已回写执行进度 Step 2~4（PC 装配 + 持久化 + IPC）：新增 `apps/moryflow/pc/src/main/channels/telegram/{service,settings-store,secret-store,sqlite-store}`，完成 runtime 生命周期装配、safe watermark/会话/配对持久化、keytar 凭据托管，以及 `telegram:*` IPC 与 `desktopAPI.telegram.*` 预加载桥接。
- 2026-03-03：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 已回写执行进度 Step 1（共享包完成）：新增 `packages/channels-core`（envelope/policy/thread/retry/ports）与 `packages/channels-telegram`（config/update normalize/runtime/send fallback/retry），并同步 `tsc-multi.stage1/stage2/tsc-multi.json` 构建链路；对应单测 `@moryflow/channels-core`（5）与 `@moryflow/channels-telegram`（4）已通过。
- 2026-03-03：更新 `docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md`：将“开工前确认 3 项”正式标记为已确认，并同步写入“最终决策”章节（PC 内置 pairing 审批中心、单账号 UI + 多账号底层模型、群聊默认 `requireMention=true`）。
- 2026-03-03：更新 `docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md`：补充“复用性评估（面向未来多渠道扩展）”“Notion 风格最少交互 UI 方案”“开工前仅需最终确认 3 项（pairing 审批入口、单账号 UI 策略、群聊 requireMention 默认）”。
- 2026-03-03：更新 `docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md`：按确认结果追加两项硬约束（Token 仅受信进程托管、pairing 持久化首版必做），并新增“不开 webhook 的影响评估”结论（默认 polling 不影响核心功能，webhook 为显式 opt-in）；同步补齐 offset 安全水位语义与 pairing 存储模型约束。
- 2026-03-03：更新 `docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md`：将 3 个待决策项改为已确认（DM 默认 `pairing`、默认 polling + webhook 显式开启、底层多账号一次到位），并新增“一次性执行蓝图（代码落位/协议边界/启动时序/验收）”；同步 `docs/design/moryflow/features/index.md` 与 `docs/index.md` 索引口径。
- 2026-03-03：更新 `docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md`，补充剩余三项决策点的 OpenClaw 对标结论与推荐口径：DM 默认 `pairing`、运行默认 polling（webhook 显式开启）、底层多账号模型一次到位（UI 可单账号优先）。
- 2026-03-03：更新 `docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 决策口径：明确首版 **仅支持 Telegram Bot API**，不引入 MTProto 用户号接入；并将该项在“讨论决策点”中标记为已决策。
- 2026-03-03：新增 `docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md`，沉淀 OpenClaw Telegram 接入调研事实，并给出 Moryflow PC 一次性接入 + 共享包抽离（`packages/channels-core`、`packages/channels-telegram`）的目标架构；同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-03：更新 `docs/design/moryflow/features/moryflow-agent-runtime-tool-simplification-plan.md` 状态为 `completed`，三项根因问题按序收口完成：①统一审计写入基座（防路径注入）；②bash 审计默认无明文，仅保留指纹与结构化特征并支持显式脱敏预览开关；③`subagent` 删除 `explore/research/batch` 角色分流，改为单一全能力面；同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-03：更新 `docs/design/moryflow/features/moryflow-agent-runtime-tool-simplification-plan.md` 状态为 `completed`，回写 P1 全量落地（bash 描述增强、命令审计、工具清单回归测试）与 P2 收口结论（tool budget 告警已实现，external sandbox/tee transform 本轮明确不引入）；同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-03：更新 `docs/design/moryflow/features/moryflow-agent-runtime-tool-simplification-plan.md`，新增对 `vercel-labs/bash-tool`（本地 commit `134d5fb`）的代码级对照、借鉴/不借鉴决策与 P0/P1/P2 分阶段落地路线；同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md` 描述口径。
- 2026-03-03：更新 `docs/design/moryflow/features/moryflow-agent-runtime-tool-simplification-plan.md`、`moryflow-agent-tool-inventory-accuracy-fix-plan.md` 与 `docs/design/moryflow/core/agent-tasks-system.md`，将子代理工具命名从 `task` 收敛为 `subagent`，并明确其与 `tasks_*` 的语义分层，避免概念混淆。
- 2026-03-03：更新 `docs/design/moryflow/features/moryflow-agent-runtime-tool-simplification-plan.md`，补充“仅 PC 改 Bash-First、Mobile 继续沿用文件/搜索工具”的端能力矩阵与验收项，消除跨端语义歧义。
- 2026-03-03：`docs/design/moryflow/features/pc-skills-builtin-online-sync-plan.md` 已补充第四轮 PR review 闭环：读取旧 `curatedPreinstalled` 时迁移 `skippedPreinstall` 以保留历史卸载偏好；远端同步覆盖新增 `requireExistingTarget` 写入边界守卫，避免卸载与后台同步并发时被静默装回。
- 2026-03-03：新增 `docs/design/moryflow/features/moryflow-agent-runtime-tool-simplification-plan.md`，基于 Vercel Filesystem+Bash 实践提出 Moryflow PC Agent Runtime Bash-First 工具收敛方案（移除默认文件/搜索工具注入，保留非重叠高价值工具）。
- 2026-03-03：`docs/design/moryflow/core/index.md` 去重 `permission-first-authorization-full-access-reminder.md` 重复入口，保留在“详细规范”单一事实源，避免摘要区与规范区双维护漂移。
- 2026-03-03：`docs/design/moryflow/features/pc-skills-builtin-online-sync-plan.md` 已补充第四轮 PR review 闭环：读取旧 `curatedPreinstalled` 时迁移 `skippedPreinstall` 以保留历史卸载偏好；远端同步覆盖新增 `requireExistingTarget` 写入边界守卫，避免卸载与后台同步并发时被静默装回。
- 2026-03-03：更新 `docs/design/moryflow/core/permission-first-authorization-full-access-reminder.md` 执行进度：已完成主进程审批上下文 IPC、单次提醒消费持久化、会话切换后挂起审批即时放行，以及渲染层首次升级弹窗接入；L2 校验（`pnpm lint` / `pnpm typecheck` / `pnpm test:unit`）通过。
- 2026-03-03：新增 `docs/design/moryflow/features/moryflow-agent-tool-inventory-accuracy-fix-plan.md`，收敛 Agent Prompt 工具清单为“运行时实际注入口径”，并补齐跨端差异修复计划与验收标准。
- 2026-03-03：`docs/design/moryflow/features/pc-skills-builtin-online-sync-plan.md` 已回写第二轮 PR review 闭环：修复远端同步覆盖 `disabled`、预装 skill 卸载后回弹、以及上游 frontmatter 命名漂移导致的 skill 初始化风险。
- 2026-03-03：`docs/design/moryflow/features/pc-skills-builtin-online-sync-plan.md` 已补充第三轮 PR review 闭环：远端快照改为基于 Git tree 保留文件可执行权限，并将体积限制前置到下载前/下载中，避免超大文件先整块读入内存。
- 2026-03-03：`docs/design/moryflow/features/pc-skills-builtin-online-sync-plan.md` 已同步新增自动预装 `macos-automation`，清单更新为 16 个内置（14 预装 + 2 推荐）。
- 2026-03-03：`docs/design/moryflow/features/pc-skills-builtin-online-sync-plan.md` 已回写 review 闭环：移除兼容目录自动导入，新增远端下载 host 白名单与鉴权头隔离。
- 2026-03-03：`docs/design/moryflow/features/pc-skills-builtin-online-sync-plan.md` 已补充安全扫描闭环：`agent-browser` 示例脚本移除疑似明文口令赋值写法，改为仅提示环境变量注入。
- 2026-03-03：`docs/design/moryflow/features/pc-skills-builtin-online-sync-plan.md` 已补充 GitGuardian 闭环：模板中的旧口令环境变量已收敛为 `APP_LOGIN_SECRET`，规避 `Generic Password` 误报并保持凭证注入语义不变。
- 2026-03-03：`docs/design/moryflow/features/pc-skills-builtin-online-sync-plan.md` 已回写执行进度闭环（Step 1~6 全部 DONE）与验证记录（`pnpm --filter @moryflow/pc typecheck/test:unit`、`pnpm lint/typecheck/test:unit` 全通过）。
- 2026-03-03：更新 `docs/design/moryflow/features/pc-skills-builtin-online-sync-plan.md`：去除“单 manifest 汇总检查”，改为“每次启动按 skills 列表逐项在线检查”；同时明确本次按零兼容执行（直接清空旧 skills 状态后重建）。
- 2026-03-03：新增 `docs/design/moryflow/features/pc-skills-builtin-online-sync-plan.md`（Moryflow PC 内置 skills 扩展与在线同步方案），并同步 `docs/design/moryflow/features/index.md`。
- 2026-03-02：`docs/design/moryflow/features/editor-selection-chat-reference-unification-plan.md` 已补充第二轮 PR review 闭环：`onSubmit` 返回 `{ submitted }`，前置校验提前返回不再误触发“发送成功清理引用”路径。
- 2026-03-02：`docs/design/moryflow/features/editor-selection-chat-reference-unification-plan.md` 已补充 PR review 问题闭环：同文本重复选中场景引入 `captureVersion` 单调身份，发送成功仅按版本精确清理引用（失败保留）。
- 2026-03-02：`docs/design/moryflow/features/editor-selection-chat-reference-unification-plan.md` 已回写执行进度：Step 1~5 全部完成（含 typecheck 与 test:unit 命令记录）。
- 2026-03-02：再次更新 `docs/design/moryflow/features/editor-selection-chat-reference-unification-plan.md`：明确“删除 Improve”在共享包层全端生效（Web/Mobile 同步移除但不补替代入口），并收敛字段命名为 `contextSummary` 单一口径。
- 2026-03-02：更新 `docs/design/moryflow/features/editor-selection-chat-reference-unification-plan.md`：Improve 口径由“入口下线”改为“功能直接删除（无开关/无兼容）”，并将选区引用上限统一为 1w 字。
- 2026-03-02：新增 `docs/design/moryflow/features/editor-selection-chat-reference-unification-plan.md`（PC 选区 AI 入口收敛方案），并同步 `docs/design/moryflow/features/index.md` 与 `docs/index.md` 入口索引。
- 2026-03-02：新增 `docs/design/moryflow/core/pc-permission-unification-plan.md` 作为 PC 权限重构事实源；`docs/design/moryflow/core/index.md` 已同步入口索引。
