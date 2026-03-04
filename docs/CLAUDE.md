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

- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-server-google-sign-in-plan.md` 已完成 Step 5：修复线上 `state_mismatch`（server 新增 `social/google/start` 并透传 Better Auth state cookie，PC 改为仅打开 start URL）；文档状态回写为 `completed`，并同步 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-server-google-sign-in-plan.md` 已补充最佳实践加固结论：callbackURL 固定基于 `BETTER_AUTH_URL` 生成（不信任请求 Host/Proto），`google/start` 内部转发改为白名单头并禁止透传 `content-length/transfer-encoding/connection`，从根因上消除回调污染与头冲突风险。
- 2026-03-03：`docs/design/moryflow/features/moryflow-pc-server-google-sign-in-plan.md` 已补充新增 PR review 闭环：Windows/Linux `second-instance/argv` OAuth 回流、deep link 日志 `code/nonce` 脱敏、`openExternal` 失败语义透传（main bool + preload 抛错）、server/pc deep link scheme 大小写口径统一。
- 2026-03-03：`docs/design/moryflow/features/moryflow-pc-server-google-sign-in-plan.md` 已回写 review 闭环：OAuth listener 清理、deep link scheme 单一配置源、Apple 按钮恢复非目标占位、Auth API 路径常量去兼容分支。
- 2026-03-03：`docs/design/moryflow/features/moryflow-pc-server-google-sign-in-plan.md` 已完成 Step 4 回写与 L2 校验闭环：`pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 全部通过；文档状态更新为 `completed`，并同步 `docs/design/moryflow/features/index.md` 与 `docs/index.md` 索引状态。
- 2026-03-03：`docs/design/moryflow/features/moryflow-pc-server-google-sign-in-plan.md` 已回写 Step 1~3 执行记录（服务端 basePath+Google provider、AuthSocial bridge+原子交换码、PC main/preload/renderer/UI 接入与对应测试命令）。
- 2026-03-03：按 review 结论重写 `docs/design/moryflow/features/moryflow-pc-server-google-sign-in-plan.md`：补齐 `AuthSocialController` 与 `AuthController` 路由优先级约束、OAuth callback/bridge callback 语义拆分、交换码原子消费（GETDEL/Lua）与防重放规则、最小票据存储（exchange 时再签发 token）以及 Google Console/环境变量部署矩阵。
- 2026-03-03：新增 `docs/design/moryflow/features/moryflow-pc-server-google-sign-in-plan.md`，明确 Moryflow PC + Server Google 登录接入方案（系统浏览器 OAuth、回调桥接、Token-first 一次性交换码、最小复用边界）；同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-03：按 docs 治理边界将 `docs/plans/2026-03-03-chat-chip-style-unification-design.md` 并入 `docs/design/moryflow/features/editor-selection-chat-reference-unification-plan.md`（新增“12. 胶囊样式统一闭环”），删除 `docs/plans` 正文落点；同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-03：在完成 miniwiki 高价值内容合并并校准后，已删除 `.mini-wiki` 全量历史产物（`wiki/config/meta/.gitignore`），仓库文档事实源收敛到 `docs/design/*`。
- 2026-03-03：合并 miniwiki 高价值内容并完成源码级校准：`docs/design/moryflow/core/model-bank-rebuild.md` 新增“MiniWiki 合并后的接口事实快照”（明确 `@moryflow/model-bank` 根入口与 `@moryflow/model-bank/registry` 子路径边界）；`docs/design/moryflow/core/agent-runtime-control-plane-adr.md` 新增“Runtime/Tools 接口快照”并修正过时引用（移除不存在的 `packages/agents-tools/src/task/manage-plan.ts`）；同步更新 `docs/design/moryflow/core/index.md` 与 `docs/index.md`。
- 2026-03-03：`docs/design/moryflow/core/permission-first-authorization-full-access-reminder.md` 已新增线上问题根因与修复结论：审批协议改为幂等结构化结果（`approved/already_processed`），并补充 PC/Mobile 结果态与回归测试收口；同步更新 `docs/design/moryflow/core/index.md` 与 `docs/index.md`。
- 2026-03-03：再次更新 `docs/design/moryflow/core/permission-first-authorization-full-access-reminder.md` 第 11 节，回写“审批异常文案分支”向“结构化幂等审批协议（approved/already_processed）”收口、PC/Mobile 同步实现与回归验证（PC `320` tests、Mobile `32` tests）。
- 2026-03-03：更新 `docs/design/moryflow/core/permission-first-authorization-full-access-reminder.md` 第 11 节为“已完成”，回写“`Enable Full access` 后审批过期竞态”根因、实现收口与测试结论；并同步 `docs/design/moryflow/core/index.md` 与 `docs/index.md` 入口说明。
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
