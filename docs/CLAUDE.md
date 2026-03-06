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

- 2026-03-06：Memox 一期 PR review 再次收口：已回写 `KnowledgeSourceRevisionService.finalize()` processing slot 生命周期修复、`ApiKeyCleanupProcessor` 模块 wiring、`IdempotencyService.begin()` 并发唯一键竞争回退，以及 `SourcesModule` 公开 OpenAPI 注册表；相关事实已同步到主文档与一期 hardening runbook。
- 2026-03-06：Memox 一期 review 追加硬化已回写到主事实源：`sources/` 公开契约新增结构化 ingest 错误语义（`413/429/503/409` + RFC7807 details）、`pending_upload_expires_at` 与小时级 zombie revision cleanup；同时补齐 `ScopeRegistry`“派生统计而非主事实源”、graph canonical conflict 收敛规则，以及当前 `Export API` 的 `application/json + 分页读取 + 流式上传` 契约。
- 2026-03-06：Memox 一期 review 二次硬化已完成最终数据库收口：使用真实目标连接 `/Users/lin/code/moryflow/apps/anyhunt/server/.env` 对主库/向量库执行零兼容 reset + migrate，主库 `20260306173000_init` 与向量库 `20260306173100_init` 已成功应用，`prisma migrate status` 两边均为 `Database schema is up to date`；`docs/design/anyhunt/features/memox-memory-architecture-and-moryflow-pc-integration.md` 中的一期状态已恢复为 `completed`。
- 2026-03-06：保留阶段 A 历史注记：API Key hash-only、Console `plainKey/keyPreview + 本地明文副本`、Playground `hasUsableKey` 门禁、Memory 过期过滤+事务化、Export 流式异步上传、Entity 聚合语义统一等前置清理已完成；但这些只视为生产化前置收口，不再作为当前架构事实源。
- 2026-03-07：cloud-sync PR 评论继续收口：PC/Mobile `sync-engine` 新增防御式 commit 失败分支，任何 `commitResult.success === false` 都统一进入 `needs_recovery`，不再把“prepared journal + 未 commit 对象”误报为同步成功；同步更新 `cloud-sync-unified-implementation.md`、主审计文档、`apps/moryflow/pc/src/main/CLAUDE.md` 与 `apps/moryflow/mobile/lib/CLAUDE.md`。
- 2026-03-06：cloud-sync PR 评论继续收口：`StorageClient` 已移除 download URL 对 `expectedSize` 的签名绑定，避免 batch download action 带 `size` 时生成的合法 URL 被 `downloadFile` 误判为 `INVALID_SIGNATURE`；`SyncCommitService` 已新增 `fileId` 级重复 receipt 拒绝；PC no-op sync 早返回不再调用未配对的 `activityTracker.endSync()`。同步更新 `cloud-sync-unified-implementation.md`、主审计文档、`apps/moryflow/server/CLAUDE.md` 与 `apps/moryflow/pc/src/main/CLAUDE.md`。
- 2026-03-06：cloud-sync PR 评论再次收口：`SyncObjectVerifyService` 将 upload commit 对象合同失败显式收口为 `404 SYNC_UPLOADED_OBJECT_NOT_FOUND` / `409 SYNC_UPLOADED_OBJECT_CONTRACT_MISMATCH`；共享 path canonical helper 移除 `.trim()` 并改为拒绝首尾空白 path，PC `activityTracker.endSync()` 统一覆盖早返回路径；同步更新 `cloud-sync-unified-implementation.md`、主审计文档、`apps/moryflow/server/CLAUDE.md` 与 `apps/moryflow/pc/src/main/CLAUDE.md`。
- 2026-03-06：cloud-sync PR 评论继续收口：`SyncActionTokenService` 将 malformed/context-mismatch receipt 收口为 `400 INVALID_SYNC_ACTION_RECEIPT`，将过期 receipt 收口为 `409 SYNC_ACTION_RECEIPT_EXPIRED`，避免 `/sync/commit` 将客户端合同错误误报成 `500 INTERNAL_ERROR`；同步更新 `cloud-sync-unified-implementation.md`、主审计文档与 `apps/moryflow/server/CLAUDE.md`。
- 2026-03-06：cloud-sync 代码复审补充收口已闭环：`storage/download` 现明确区分“对象/指定 revision 不存在 -> 404 FILE_NOT_FOUND”与“对象仍存在但 `contentHash` 漂移 -> 409 SNAPSHOT_MISMATCH`；`sync/commit`额外补齐 duplicate`actionId`防线（DTO + service 双层拒绝），并新增`src/storage/storage.controller.spec.ts`、`src/sync/dto/sync.dto.spec.ts`、`src/sync/sync.service.spec.ts` 回归。
- 2026-03-06：根据新一轮方案 review 继续补全文档事实源：`cloud-sync-unified-implementation.md` 新增 `deviceId` 唯一性前置假设、`storageRevision != ETag` 说明、orphan cleanup 无时间窗口、tombstone 永久保留与 Step 6 压测门槛；`cloud-sync-operations.md` 新增 `INTERNAL_API_TOKEN` 泄露处置、outbox `leaseMs` 规则与灾难恢复边界；主审计文档同步回写这些补充已纳入 Step 6 闭环。
- 2026-03-06：cloud-sync recovery 不变量继续回写：PC/Mobile `apply-journal` 的 `write_file` replay 改为“先验证 staged temp，再删除 `replacePath/targetPath`”，并在 `cloud-sync-unified-implementation.md` 与主审计文档补充“temp 缺失时旧文件必须保留”的恢复约束，同时新增 PC/Mobile `recovery-coordinator.spec.ts` 回归覆盖。
- 2026-03-06：cloud-sync 终局收口继续回写：`SYNC_ACTION_SECRET` 改为必填并 fail-fast，internal 控制面路由固定为裸 `/internal/*`（不挂 `/api` 前缀），`SyncFile.storageRevision` 升级为非空列并通过 migration 删除遗留 null revision 元数据；同步更新 `cloud-sync-unified-implementation.md`、`moryflow-pc-cloud-sync-collaboration-audit-2026-03-06.md`、`cloud-sync-operations.md` 与 `apps/moryflow/server/CLAUDE.md`。
- 2026-03-06：cloud-sync 最终 review 的 4 个阻断项已闭环并回写事实源：`conflict` 下载合同新增 `remoteStorageRevision`，`SyncActionTokenService` 收口 `issuedAt/expiresAt` TTL，`GET /internal/metrics/sync` 接入 `InternalApiTokenGuard`，并新增 `POST /internal/sync/outbox/claim` / `ack` 形成 outbox claim/ack 内部控制面；同步更新 `cloud-sync-unified-implementation.md`、`moryflow-pc-cloud-sync-collaboration-audit-2026-03-06.md` 与 `cloud-sync-operations.md`。
- 2026-03-06：cloud-sync Step 6 已完成并回写：新增 `docs/design/moryflow/runbooks/cloud-sync-operations.md`，补齐 `GET /internal/metrics/sync`、恢复流程与上线闸门；`pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 与 sync internal metrics E2E 全部通过，`docs/design/moryflow/features/cloud-sync-unified-implementation.md` 与 `moryflow-pc-cloud-sync-collaboration-audit-2026-03-06.md` 已更新为最终完成态。
- 2026-03-06：cloud-sync 冻结方案已完成最终实施回写：主审计文档改为“最终审计与实施闭环版”，`cloud-sync-unified-implementation.md` 改写为当前真实协议（`server-authoritative action plan`、`receipt-only commit`、`apply journal + recovery`、`file lifecycle outbox` 解耦），并同步更新 features/docs 索引口径。
- 2026-03-06：cloud-sync 实施继续推进到 Step 3：Storage 预签名 URL 已开始签入关键合同字段，download endpoint 新增 `storageRevision/contentHash` 快照校验，PC/Mobile executor 改为校验“本地内容必须匹配服务端合同”，并将该进展回写到主审计文档的 Step 3 当前进度。
- 2026-03-06：按冻结稿开始实施 cloud-sync 重构：已完成共享 path canonical helper、PC/Mobile fileId 注册从 vectorize 解耦、Server `sync-plan/sync-upload-contract/sync-object-verify/sync-commit/file-lifecycle-outbox` 服务拆分、`SyncCommitRequest.vectorizeEnabled` 删除，以及 Search `SyncFile` 真相过滤；主审计文档已回写 Step 0/1/2/5 当前进度。
- 2026-03-06：继续补强 `docs/design/moryflow/features/moryflow-pc-cloud-sync-collaboration-audit-2026-03-06.md` 的实施可执行性：新增 Step 0~5 的首批目标文件、禁止事项与零兼容前置硬约束，并将“文档可执行性判断”从“接近可执行”升级为“已达到可执行冻结稿标准”。
- 2026-03-06：继续补强 `docs/design/moryflow/features/moryflow-pc-cloud-sync-collaboration-audit-2026-03-06.md` 为“零兼容冻结稿”：新增协议不变量（`vectorClock/storageRevision/actionId/file lifecycle event`）、模块依赖方向、代码落位建议、旧合同删除清单，以及结构闸门；明确后续实施必须先删除旧 `sync <-> vectorize` 耦合，再进入重构实现。
- 2026-03-06：更新 `docs/design/moryflow/features/moryflow-pc-cloud-sync-collaboration-audit-2026-03-06.md` 的向量化边界口径：明确 `cloud sync` 与 `vectorize/Memox` 必须解耦，sync 域只负责 `file lifecycle outbox`，不得直接依赖 Memox/向量化成功与否；并同步把 Step 5 从“服务端接管 vector lifecycle”改为“通过文件生命周期事件解耦 projection 域”，更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-06：再次升级 `docs/design/moryflow/features/moryflow-pc-cloud-sync-collaboration-audit-2026-03-06.md` 为“三次深度复审与冻结实施版”：在原二次复审基础上补充 2 个更深层阻断项（`download` 非 snapshot-stable、`conflict` 缺少 staged group/orphan cleanup），并新增模块化/SRP 冻结边界与按模块实施蓝图；阻断项从 5 类扩展为 7 类，同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-06：重写 `docs/design/moryflow/features/moryflow-pc-cloud-sync-collaboration-audit-2026-03-06.md` 为“二次根因复审版”：不再沿用旧的“已闭环可上线”口径，明确当前仍存在 5 项阻断上线的架构级问题（canonical path 缺失、PC 新文件纳入同步依赖 vectorize 副作用、sync 协议仍为 client-authoritative、本地 apply 无事务语义、向量生命周期未归并到 sync 真相源），并同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-06：`docs/design/moryflow/features/moryflow-pc-cloud-sync-collaboration-audit-2026-03-06.md` 已回写第三轮闭环：新增“fileId 复用导致对象代际误删”的深层问题、`storageRevision` 条件删除方案、legacy delayed cleanup 策略、PC/Mobile 编排级回归与最新验证证据；同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md` 口径。
- 2026-03-06：`docs/design/moryflow/features/moryflow-pc-cloud-sync-collaboration-audit-2026-03-06.md` 已从“问题审计”回写为“执行闭环”状态：新增逐项修复状态（P0/P1 全量）、Task A~E 完成态、Server/PC/Mobile 定向回归结果、最终判断与剩余风险；同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md` 描述口径。
- 2026-03-06：更新 `docs/design/moryflow/features/moryflow-pc-cloud-sync-collaboration-audit-2026-03-06.md` 第二轮深挖内容，新增并发一致性（`download/delete` 乐观锁缺失）、冲突命名跨平台风险、R2/DB 事务顺序风险、状态与缓存语义问题，以及 PC/Mobile 对照结论；同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md` 描述口径。
- 2026-03-06：新增 `docs/design/moryflow/features/moryflow-pc-cloud-sync-collaboration-audit-2026-03-06.md`，完成 Moryflow PC 云同步/协同深度审计（文档与代码对照、功能正常性结论、最佳实践评估、风险分级与修复优先级）；同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md` 索引入口。
- 2026-03-06：`docs/design/moryflow/features/chat-intent-driven-viewport-scroll-plan.md` 已完成并回写执行闭环：shared web viewport 从“DOM 变化驱动”重构为“意图驱动”，新增 `navigateToLatest/preserveAnchor`，PC/Console/Admin 已接入稳定 `viewportAnchorId`；定向单测、受影响包 typecheck、根级 `pnpm lint/typecheck` 通过，`pnpm test:unit` 仍受 admin/auth 与 pc/better-sqlite3 既有基线阻塞。同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-06：`docs/design/moryflow/features/ai-round-auto-collapse-plan.md` 已追加 review finding 闭环：Assistant Round 的 `startedAt` 不再以“请求开始 / running 状态开始”起算，而是统一收口为“首个 assistant 可见内容出现”；PC 新增 `onFirstRenderableAssistantChunk`，Mobile 新增 `assistant-round-timing` 纯函数，并回写定向验证结果。同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-06：`docs/design/moryflow/features/ai-round-auto-collapse-plan.md` 已补充摘要 `已处理 0s` 根因治理闭环：Assistant Round 时长事实源改为显式 round timestamps，summary 统一过滤 `durationMs <= 0`；并回写定向验证通过与根级 `pnpm test:unit` 现存基线失败说明。同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-06：`docs/design/moryflow/features/ai-round-auto-collapse-plan.md` 已从“仅折前置 assistant messages”升级为“折同轮前置 messages + 最后一条 assistant message 的前置 orderedParts”；Step 1~5 已全部完成并回写验证结果。同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-06：新增 `docs/design/moryflow/features/ai-round-auto-collapse-plan.md` 并按“文档先行 + 分步执行 + 每步回写”推进：已完成共享 round 折叠算法、PC/Console/Admin/Mobile 接入与受影响测试；同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md` 索引。
- 2026-03-05：`docs/design/moryflow/features/moryflow-pc-menubar-quick-chat-plan.md` 已完成 review findings 根因收口：`closeBehavior=quit` 改为 macOS 主窗口 close 时显式 `requestQuit()`；新增 `unread-revision-tracker` 并在 `deleted` 事件与 `before-quit` 执行 revision 回收，避免未读映射长期增长；回写验证结果（`@moryflow/pc` `typecheck` + `test:unit`，`125 files / 501 tests` 全通过）。
- 2026-03-05：`docs/design/moryflow/features/moryflow-pc-menubar-quick-chat-plan.md` 已完成 Step 6 并收口为 `completed`：补齐执行进度记录，回写 `@moryflow/pc` 受影响校验结果（`typecheck` + `test:unit`，`124 files / 498 tests` 全通过），同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-05：`docs/design/moryflow/features/moryflow-pc-menubar-quick-chat-plan.md` 已按 review 全量收口：移除 `menubarUnreadCount` 持久化（改为运行时内存态）、补齐 `Launch at Login` 错误码与 Promise reject 语义、固定 `wasOpenedAtLogin` 启动判定、明确“非 macOS 隐藏入口”，并新增“8. 执行计划（按步骤）”落地清单。
- 2026-03-05：`docs/design/moryflow/features/moryflow-pc-menubar-quick-chat-plan.md` 已补齐 `Launch at Login` 本期落地细则：明确当前未实现且本期必做，新增主进程 `launch-at-login` 模块与 `app.getLoginItemSettings/setLoginItemSettings` 事实源口径，补充 IPC 返回结构、失败回滚策略、实施步骤与回归测试项。
- 2026-03-05：`docs/design/moryflow/features/moryflow-pc-menubar-quick-chat-plan.md` 托盘菜单文案进一步精简：`Open Moryflow`/`Quit Moryflow` 收敛为 `Open`/`Quit`，并同步更新相关风险说明文案。
- 2026-03-05：`docs/design/moryflow/features/moryflow-pc-menubar-quick-chat-plan.md` 默认快捷键已从 `Cmd+Shift+K` 收敛为 `Cmd+Shift+M`（持久化字段默认值同步为 `CommandOrControl+Shift+M`），以对齐产品名称首字母口径。
- 2026-03-05：`docs/design/moryflow/features/moryflow-pc-menubar-quick-chat-plan.md` 已收敛为“确认版单方案”（状态改为 `active`）：移除方案对比与未采用分支；托盘右键菜单固定为 `Open / Quick Chat / Launch at Login / Quit`，不包含 TG 控制项；保留“收到新消息后 badge”能力。同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-05：新增 `docs/design/moryflow/features/moryflow-pc-menubar-quick-chat-plan.md`，沉淀 Moryflow PC macOS 菜单栏常驻 + Quick Chat 居中浮层方案（问题根因、UI/UX 交互、Tray/窗口生命周期、IPC 合同与实施步骤）；同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md` 索引入口。
- 2026-03-05：完成 `docs/design/moryflow/core/agents-tools-runtime-inventory-and-pruning-plan.md` 执行回写：`packages/agents-tools` 已删除死 API（`createBaseTools*`、非沙盒 `createBashTool` 与 `platform/bash-tool.ts`）、PC 装配 API 改名为 `createPcTools*`（与 `createMobileTools*` 对齐），并同步更新 `agent-runtime-control-plane-adr`、`moryflow-agent-runtime-tool-simplification-plan`、`docs/design/moryflow/core/index.md`、`docs/index.md` 与相关 CLAUDE 记录；L2 校验 `pnpm lint/typecheck/test:unit` 已通过。
- 2026-03-05：`docs/design/moryflow/features/chat-tool-bash-card-redesign-plan.md` 已新增 Step 6 并回写执行闭环：Tool 外层摘要统一收口为“优先 Tool 内置 `input.summary`，缺失时命令句式 fallback”；Web/PC/Mobile/Console/Admin 全端完成“外层摘要折叠 + 内层 Bash Card”结构对齐，并补齐对应测试与类型校验结果。
- 2026-03-05：`docs/design/moryflow/features/chat-tool-bash-card-redesign-plan.md` 已完成 Step 5 收口并将文档状态更新为 `completed`：根级 `pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 全部通过（同轮校验），并同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md` 的状态口径。
- 2026-03-05：`docs/design/moryflow/features/chat-tool-bash-card-redesign-plan.md` 已按 Step 1~5 回写执行进度：完成共享命令摘要模块、Web/PC Bash Card 重构、PC/Console/Admin 接入、Mobile 接入（含 `lib/chat/tool-shell` 测试）；并记录受影响包验证结果与 mobile `check:type` 既有基线说明。
- 2026-03-05：新增 `docs/design/moryflow/features/chat-tool-bash-card-redesign-plan.md`，收敛“当前所有 Tool 渲染”到 Codex Bash 交互基线（两行 Header、固定输出滚动区、顶部模糊蒙版、右下角状态浮层、移除前置状态 icon 与弱价值入口）；并同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md` 索引。
- 2026-03-05：`docs/design/moryflow/core/pc-global-full-access-unrestricted-plan.md` 已完成最终收口：阶段 3~6 全部标记完成，新增本轮验证记录（agents-runtime / agents-sandbox / agents-tools / @moryflow/pc 定向测试与 typecheck 全通过），文档状态更新为 `completed`；并同步更新 `docs/design/moryflow/core/index.md` 与 `docs/index.md` 的完成态索引口径。
- 2026-03-05：按最新决策再次收口 `docs/design/moryflow/core/pc-global-full-access-unrestricted-plan.md`：Full Access 改为“仅危险级 deny 拦截”，`permission.rules` 非危险 deny 清理出执行链路；`Deny` 明确为“仅当前请求生效 + 可用于本次上下文推理 + 不持久化”；并移除 UI 侧 `approvalDenyHint` 要求，仅保留 `Approve once / Always allow / Deny` 与 `How to apply this approval` 说明。
- 2026-03-05：为 `docs/design/moryflow/core/pc-global-full-access-unrestricted-plan.md` 补充 i18n key 落地清单：复用 `approveOnce/approveAlways`，新增 `denyOnce`、`approvalHowToApplyTitle`、`approvalAlwaysAllowHint`，并要求 `en/zh-CN/ja/de/ar` 统一同一组 key。
- 2026-03-05：按最新讨论更新 `docs/design/moryflow/core/pc-global-full-access-unrestricted-plan.md`：Ask 审批改为 `Approve once / Always allow / Deny`，并冻结“只记住 allow、deny 仅当前请求不持久化”；按钮区新增固定补充说明（`How to apply this approval` + `Always allow` 作用范围 + `Deny` 仅本次）；同步更新 `docs/design/moryflow/core/index.md` 与 `docs/index.md` 摘要口径。
- 2026-03-05：按 C 端口径简化 `docs/design/moryflow/core/pc-global-full-access-unrestricted-plan.md` 的用户文案表达（该版本已在同日后续条目更新为 `Approve once / Always allow / Deny`）；并新增“C 端文案（简短易懂）”统一短句；同步简化 `docs/design/moryflow/core/index.md` 与 `docs/index.md` 对该方案的描述。
- 2026-03-05：完成 `docs/design/moryflow/core/pc-global-full-access-unrestricted-plan.md` 二次 review 收口：补齐 deny 一票否决优先级（`HARD_DENY > 显式 deny > allow > rules > ask`）、统一 `toolPolicy` 配置路径（`agents.runtime.permission.toolPolicy`）、明确 `Bash(commandPattern)` 为 `argv[0]` 命令族匹配并定义多段命令判定规则；同步补充零兼容清理策略与缺失测试/文件清单，并更新 `docs/design/moryflow/core/index.md`、`docs/index.md` 摘要口径。
- 2026-03-05：按讨论确认更新 `docs/design/moryflow/core/pc-global-full-access-unrestricted-plan.md`：新增 Ask“同类策略记忆”方案（结构化 tool-policy + DSL 展示），冻结优先级（Hard Deny > deny_type > allow_type > rules > ask），并确认口径 B（命中同类 allow 后外部路径审批直通）；文件级改造清单新增 IPC/审批动作/规则引擎/回归测试条目。
- 2026-03-05：将 `docs/design/moryflow/core/pc-global-full-access-unrestricted-plan.md` 从讨论稿升级为“决策冻结稿”：明确三项冻结约束（全局开关、入口保留对话内、`full_access` unrestricted + 危险命令硬拦截），补充 `generateSeatbeltProfile` 结论（需改但非单点），并新增按模块分组的文件级改造清单；同步更新 `docs/design/moryflow/core/index.md` 与 `docs/index.md` 描述口径。
- 2026-03-05：更新 `docs/design/moryflow/core/pc-global-full-access-unrestricted-plan.md` 讨论约束：权限模式改为全局后，切换入口仍保留在对话输入区（不新增设置页并行入口），并将该约束同步到目标模型、架构设计与验收标准。
- 2026-03-05：新增 `docs/design/moryflow/core/pc-global-full-access-unrestricted-plan.md`（讨论稿），定义“全局权限开关 + full_access 全系统放开（仅保留危险命令硬拦截）”的目标模型、改造边界、风险与待确认项；并同步更新 `docs/design/moryflow/core/index.md` 与 `docs/index.md` 入口索引。
- 2026-03-05：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 第 34 节新增“34.8 PR #143 会话切换回填回归闭环”，修复 `useStoredMessages` 在“切回已访问会话且 revision 未变化”场景误判旧快照导致面板空白的问题（引入 session switch generation 判定），并补充回归测试与受影响验证结果。
- 2026-03-05：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 第 34 节新增“34.7 PR #143 代理探测评论闭环”，确认并修复直连探测 `fetch` 误传 `agent:null` 导致可达性误判问题；补充回归测试（直连探测不得携带 `agent` 字段）与受影响验证结果。
- 2026-03-05：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 第 34 节新增“34.6 PR #143 评论追加闭环”，回写 3 条 review 结论（session 级 revision 隔离、TG 会话同步富文本保留、`getMessages` 与 revision 对齐）及新增回归测试与全量验证结果。
- 2026-03-05：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 第 34 节“Agent 入口自动代理探测与智能预填”已按“文档先行 -> 分步执行 -> 每步回写”完成闭环：新增 `detectProxySuggestion` IPC/主进程探测服务/Renderer 自动应用防覆盖策略，并回写验证结果（`@moryflow/pc typecheck`、`test:unit` 通过）。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 新增并完成第 31 节“Agent 配置 C 端新手化重构”：默认界面收敛为 3 步任务流（Connect/Proxy/Who can message），开发参数统一折叠到 `Developer Settings`，并回写 TDD Red/Green 与受影响验证（行为测试 + 校验测试 + `@moryflow/pc typecheck`）。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 新增第 30 节“TG/PC 同一 Agent 协议收口（含 TG 强制 Full Access）”，并按“文档先行 -> 分步执行 -> 每步回写”流程跟踪会话级 thinking 持久化、TG 入站参数统一与 reasoning 结构保真改造。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 第 30 节已完成执行闭环：TG 入站固定 `full_access`、TG/PC 统一会话级 `preferredModelId + thinking + thinkingProfile` 事实源、`reasoning_text` 到 UI reasoning part 保真映射；并完成 L2 校验（`pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 全通过）。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 已新增并完成第 29 节“Chat 面板实时同步重构（C 方案）”：落地 `chat:message-event` 正文事件总线、TG 入站实时预览快照广播、Renderer 同会话即时刷新；并回写 TDD Red/Green 与受影响验证结果（`31 passed` + `@moryflow/pc typecheck` 通过）。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-server-google-sign-in-plan.md` 已补充 PR 新评论闭环：`google/start/check` 从“复用 Better Auth `sign-in/social`”收口为“配置级无副作用预检”，根治双次消耗 `/sign-in/**` 限流导致“预检通过但正式启动 429”问题。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-server-google-sign-in-plan.md` 已完成 Step 6（PR 评论闭环）：补齐 `google/start/check` 启动预检（server 204 无副作用探测 + pc fail-fast），并回写验证结果；同步更新 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-server-google-sign-in-plan.md` 已完成 Step 5：修复线上 `state_mismatch`（server 新增 `social/google/start` 并透传 Better Auth state cookie，PC 改为仅打开 start URL）；文档状态回写为 `completed`，并同步 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-server-google-sign-in-plan.md` 已补充最佳实践加固结论：callbackURL 固定基于 `BETTER_AUTH_URL` 生成（不信任请求 Host/Proto），`google/start` 内部转发改为白名单头并禁止透传 `content-length/transfer-encoding/connection`，从根因上消除回调污染与头冲突风险。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 第 26 节新增“代理默认值效率优化”：在无已存值时默认预填 `http://127.0.0.1:6152`（对齐验收环境 Surge 系统代理），并约束 `proxyEnabled=false` + 默认值未改动时不写入 keytar。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 第 26 节新增“验收后追加修复”：Proxy 配置从 `Advanced` 前移为主表单默认可见；`Save Telegram` 新增 runtime 失败复核并明确“失败态不清空 bot token 输入”交互约束。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 已新增第 26 节“Telegram Proxy 三协议支持修复”执行后回写：runtime 与连通测试统一收口到 `proxy-agent`（`http/https/socks5`），并补齐 TDD Red/Green 与 L2 全量校验结果（`pnpm lint/typecheck/test:unit` 通过）。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 已完成第 27 节“Telegram 统一收口重构”全流程回写：修复 `sendMessageDraft` this 绑定报错、补齐 `/start`/`/new` Telegram command menu 注册、打通 TG->Chat 面板统一回写广播链路、增加 workspace 绝对路径防漂移校验，并完成 `pnpm lint/typecheck/test:unit` L2 验证；同步更新 `docs/design/moryflow/features/index.md`。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 已新增第 28 节“TG 流式逐字慢输出收口”：定位 `onDeltaText` 串行 await 引起网络反压，改为 preview 非阻塞合并发送（queued draft + 单飞 + 节流 + 流结束排空），并完成受影响测试与 `pnpm --filter @moryflow/pc typecheck` 验证。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 已完成第 25 节回写闭环：新增“Telegram Proxy 显式配置与连通测试”执行后进度（主进程/IPC 合同、keytar 托管、runtime 代理注入、Renderer `Test Proxy` 交互、TDD Red/Green 与 L2 校验证据）。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 已完成 `sendMessageDraft` 流式适配全流程回写：新增外部能力边界、方案对比、Step 23 执行进度（协议扩展、runtime 发送状态机、PC 流式编排、配置/UI/IPC 扩展）与验证证据；文档状态更新为 `completed`，并同步 `docs/design/moryflow/features/index.md` 与 `docs/index.md`。
- 2026-03-04：PR #136 新增 1 条评论已完成根因收口：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 新增“21.13”，为 webhook update 处理补充失败计数与限次跳过策略（达到上限后推进 watermark 并释放 buffered 队列），避免缺口长期不补齐导致内存集合增长。
- 2026-03-04：`moryflow-pc-home-chat-layout-assessment-and-refactor-plan.md` 已回写 PR #138 追加评审闭环（导航 bootstrap 竞态 + modules registry 未知 destination 静默回退），并记录对应回归测试 `use-navigation.test.tsx` / `modules-registry.test.ts` 与受影响验证结果。
- 2026-03-04：Home/Chat 布局重构全量 L2 校验完成并通过：`pnpm lint`、`pnpm typecheck`、`pnpm test:unit`；方案文档 `moryflow-pc-home-chat-layout-assessment-and-refactor-plan.md` 状态已更新为 `completed`。
- 2026-03-04：`moryflow-pc-home-chat-layout-assessment-and-refactor-plan.md` 已完成 Task 4~6 回写并标记 `completed`：modules registry 收口、main content key-based keep-alive 泛化、导航兼容层清理（新增 `normalizeNoVaultNavigationView`，移除对外 `from/toNavigationView`）；受影响验证 `pnpm --filter @moryflow/pc typecheck/test:unit` 通过。
- 2026-03-04：`moryflow-pc-home-chat-layout-assessment-and-refactor-plan.md` 已回写 Task 3 完成：新增 `navigation/layout-resolver.ts` 作为单一布局派生入口，并将 sidebar/chat-pane/main-content/top-bar 的状态判断统一改为消费 `resolveWorkspaceLayout`；`@moryflow/pc typecheck/test:unit` 通过。
- 2026-03-04：`moryflow-pc-home-chat-layout-assessment-and-refactor-plan.md` 已回写实施进度：Task 1（导航状态判别联合）与 Task 2（use-navigation + shell 适配）完成，并通过 `pnpm --filter @moryflow/pc typecheck` 与 `pnpm --filter @moryflow/pc test:unit`。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-home-chat-layout-assessment-and-refactor-plan.md` 已补充实施任务清单（Task 1~6）：按“状态模型 -> 导航 Hook -> 单一布局派生 -> 模块 registry -> keep-alive 泛化 -> 清理回写”顺序执行，并明确每 Task 校验与最终 L2 闸门。
- 2026-03-04：`docs/design/moryflow/features/moryflow-pc-home-chat-layout-assessment-and-refactor-plan.md` 已按评审确认收口口径：语义顶层采用“工作区/模块”，UI 主感知保持顶部 `Home/Chat` Tab，并明确 `agent-workspace` 与 `agent-module` 命名解耦约束。
- 2026-03-04：新增 `docs/design/moryflow/features/moryflow-pc-home-chat-layout-assessment-and-refactor-plan.md`（Home/Chat Tab 布局评估与重构方案），并同步 `docs/design/moryflow/features/index.md` 与 `docs/index.md` 索引入口。
- 2026-03-04：PR #136 新增 2 条评论已完成根因收口：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 新增“21.12”，覆盖 `channel_post` 缺失 `from` 时 `sender_chat` 回退映射，以及 Telegram settings 应用层 `accountId` 统一 trim/校验后再写入 secrets + store（避免 orphan secret）。
- 2026-03-04：PR #136 新增 2 条评论已完成根因收口：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 新增“21.11”，覆盖 webhook bootstrap 阶段 `safeWatermark=null` 乱序丢消息修复（改为内存去重，不提前落盘）与主进程 ingress 复用重构（按 host/port 单监听多路由，避免多账号 `EADDRINUSE`）。
- 2026-03-04：PR #136 新增 5 条评论已完成根因收口：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 新增“21.10”，覆盖无 workspace 导航回落修复（仅豁免 `agent-module`）、Telegram 启动容错（init 失败不阻断主窗口）、webhook 连续 watermark 推进、polling 毒性 update 限次跳过、以及 runtime status 覆写竞态修复与回归测试。
- 2026-03-03：PR #136 第四次追加评论（启动窗口 mention 校验）已完成根因收口：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 新增“21.9”，修复 `normalize-update` 在缺失 `botUsername` 时的 mention 误放行，并在 `telegram-runtime.handleWebhookUpdate` 前置 identity 保障（含并发 `getMe` 复用）与回归测试。
- 2026-03-03：PR #136 第三次追加评论（2 条未解决线程）已完成根因收口：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 新增“21.8”，覆盖 webhook `update_id` 去重（safe watermark + in-flight 去重 + 单调水位）与 `telegram service.init()` 失败回滚（`initPromise` + 成功后置位）及回归测试，并完成全量 L2 校验（`pnpm lint/typecheck/test:unit`）。
- 2026-03-03：PR #136 二次追加评论（3 条未解决线程）已完成根因收口：`docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md` 新增“21.7”，覆盖 pairing 审批状态门禁（仅 `pending` 可 approve/deny）、settings partial update 的 defined-key 合并语义、以及 polling 409（`error_code` 分类 + 409 分支 continue）修复与回归测试；并完成全量 L2 校验（`pnpm lint/typecheck/test:unit`）。
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
