<!--
[INPUT]: 架构/部署相关文档（域名、路由、服务边界、数据模型、运维约束）
[OUTPUT]: 可执行的系统设计说明，供实现与部署对齐
[POS]: docs/architecture/ 的协作入口与索引

[PROTOCOL]: 本目录新增/更新“最终决策类”文档时，应同步更新 docs/CLAUDE.md 与根 CLAUDE.md 的文档索引（若影响全局）。
-->

# docs/architecture/ 指南

## 目标

- 把“已拍板的架构决策”固化为可执行规范，避免口头约定漂移。
- 以个人/小团队可维护为优先：复杂度足够低，但保留未来升级空间。

## 文档清单

- `domains-and-deployment.md`：域名职责 + 三机部署（megaboxpro/4c6g/8c16g）+ 反代路由的可执行方案（含 OAuth 登录）。
  - Moryflow：`www.moryflow.com`（营销）+ `docs.moryflow.com`（文档）+ `server.moryflow.com`（应用+API）+ `moryflow.app`（发布站）
  - Anyhunt Dev：`anyhunt.app`（官网）+ `server.anyhunt.app`（API `/api/v1`）+ `docs.anyhunt.app`（文档）+ `console.anyhunt.app` / `admin.anyhunt.app`（Web 前端）
- `admin-llm-provider-config.md`：Admin 动态配置 LLM Providers/Models（入库 baseUrl/apiKey，加密存储；Agent/Playground 运行时路由）。
- `llm-admin-provider-rollout.md`：LLM Admin 配置改造进度（Agent + Extract；含 DB 升级要点与部署清单）。
- `anyhunt-llm-provider-alignment.md`：Anyhunt LLM Provider 对齐进度（AI SDK + Console 模型选择）。
- `moryflow-anyhunt-model-thinking-level-plan.md`：Moryflow/Anyhunt 模型思考等级分层方案（对标 OpenCode；两轮均已完成，且已补齐 PR#97 增量评论修复，REVIEW-02/FIX-08/FIX-09/TEST-04 全部 done）。
- `thinking-opencode-aligned-c-end-rebuild-plan.md`：Thinking 统一重构方案（OpenCode 对齐，C 端优先；零兼容、模块化单一职责、平台预设强约束保证稳定性、模型原生等级直出、废弃 `enabledLevels/levelPatches`；2026-02-27 已完成 Section 13 根因治理收口，并补充 Raw-only 收口：无 reasoning 不注入补文案、日志全环境常开且启动清空）。
- `model-bank-rebuild-plan.md`：Model Bank 重构方案（单一事实源，零兼容；thinking 等级/默认值/互斥规则统一收敛 `packages/model-bank`，runtime/provider 仅做协议适配，UI 不再维护独立等级枚举）。
- `auth.md`：Auth 系统入口（支持 Google/Apple 登录、不做跨域互通），指向 `auth/` 拆分文档。
- `auth/`：Auth 拆分文档目录（域名与路由、服务与网络、认证与 Token、数据库、配额与 API Keys）。
- `auth/unified-token-auth-v2-plan.md`：统一 Token Auth V2 改造方案（跨 Anyhunt + Moryflow，active，Step 1~7 已完成）。
- `auth/auth-and-global-rate-limit-defense-plan.md`：Moryflow Server 分层限流方案（Auth + 全局双层，Redis 存储，active；Step 1~5 完成，Step 6 灰度待执行）。
- `auth/auth-zustand-method-refactor-plan.md`：Auth 与全量请求统一改造计划（Zustand + Methods + Functional API Client，completed；2026-02-24 完成 Step 1~13，覆盖客户端 + 服务端出站 HTTP + WebSocket，全量请求统一与旧范式清理落地）。
- `auth/access-token-storage-plan.md`：Access Token 本地存储方案（Zustand + Persist，draft）。
- `auth/moryflow-pc-mobile-access-token-upgrade.md`：Moryflow PC/Mobile Access Token 持久化升级方案（draft）。
- `api-client-unification.md`：API Client 统一封装方案（Anyhunt + Moryflow，draft）。
- `anyhunt-console-public-api-key-plan.md`：Console 公共 API 化与 API Key 明文存储方案（active）。
- `anyhunt-request-log-module-plan.md`：Anyhunt 统一日志系统方案（用户行为 + 错误排查 + IP 监控，30 天保留，implemented）。
- `anyhunt-api-channel-routing.md`：Anyhunt app/public/apikey 通道路由规范与迁移清单（implemented）。
- `auth/unified-auth-rebuild-file-map.md`：Auth 统一改造涉及文件与模块清单（含潜在漏改提示）。
- `agent-tasks-system.md`：Moryflow Agent Tasks 系统方案（替代 Plan）。
- `agent-skills.md`：Agent Skills（面向 C 端的“技能库”）接入方案（implemented）。
- `adr/`：架构决策记录（ADR）。任何关键约束调整都应该新增 ADR，而不是在群聊里“口头改掉”。
- `adr/adr-0002-agent-runtime-control-plane.md`：Agent Runtime 控制面（Compaction/Permission/Truncation）决策。
- `ui-message-list-unification.md`：消息列表与输入框 UI 组件抽离方案（Moryflow/Anyhunt 统一，先对齐样式再统一抽象）。
- `ui-message-list-turn-anchor-adoption.md`：Moryflow PC 消息列表交互复用改造方案（Following 模式，active）。
- `adr/adr-0002-agent-runtime-control-plane.md`：Agent Runtime 控制面（含 OpenCode 对标与落地路径）。

> 说明：部署/操作类文档已迁移到 `docs/runbooks/`；开发指南类文档已迁移到 `docs/guides/`；旧计划文档归档于 `docs/_archived/`。

## 近期更新

- `thinking-opencode-aligned-c-end-rebuild-plan.md`：0.4 第二轮 Root-Cause Follow-up 全部完成（2026-02-28）：默认模型决策单规则（`defaultModelId` 优先）、model-bank `provider/modelId` canonical 单轨、custom provider 去前缀协议（显式 `providerType` + 结构判定）、`agent-options` 删除 legacy context 桥接。
- `thinking-opencode-aligned-c-end-rebuild-plan.md`：新增并完成 Section 15（Root-Cause Hardening Batch-3，2026-02-28）：Membership `thinking_profile` 去白名单、Membership key 类型去硬编码、Provider/Thinking 类型单源化（移除 `as unknown as` 强转）、`buildThinkingProfileFromRaw` 单源化落地、provider reasoning 适配下沉 `model-bank` 并由 runtime + 双 server factory 统一消费。
- `thinking-opencode-aligned-c-end-rebuild-plan.md`：0.3 Root-Cause Follow-up 已完成（`1 -> 2 -> 3 -> 4 -> 5`）：顶层流单通道、`sdkType` 必填、thinking 映射单源 `model-bank`、移除 run-item reasoning 导出、override 快照只读化（2026-02-27）。
- `thinking-opencode-aligned-c-end-rebuild-plan.md`：补丁治理二次整改已完成（按 `2 -> 1 -> 5 -> 3 -> 4 -> 6` 顺序执行），删除 UI 双轨 fallback / DOM 事件桥接 / runtime legacy reasoning 直传，收敛为 model-bank resolver 单路径、raw-only reasoning 渲染与 `agent:test-provider` fail-fast 契约（2026-02-27）。
- `thinking-opencode-aligned-c-end-rebuild-plan.md`：Section 13 根因治理修复已完成并回写（Step A~D 全部 done）：统一 canonical 流协议去重、thinking 语义 transport/semantic 解耦、渲染状态契约化与验收闸门闭环；新增 Raw-only 收口（无补文案 + 全环境日志）（2026-02-27）。
- `model-bank-rebuild-plan.md`：Section 12 follow-up 已完成（implemented）：Settings Dialog thinking 下拉改为模型合同驱动，移除 `sdkType` 兜底取数；补齐 providerId 透传链路与回归测试（2026-02-27）。
- `model-bank-rebuild-plan.md`：Section 11 复查修复已完成（Step A~D 全部 done）：PC 默认等级优先级、sdk 级 fallback 退场、Anyhunt Admin 等级合同化、目录级 CLAUDE 回写补齐全部收口（2026-02-27）。
- `model-bank-rebuild-plan.md`：补充最终收口记录（`@moryflow/model-bank` 导出契约改为 dist 双格式 + wildcard 子路径导出，修复 CJS 运行时导入与 exports 覆盖测试不一致；全仓闸门复跑通过）（2026-02-27）。
- `model-bank-rebuild-plan.md`：补齐漏项审计结论并扩展执行范围：纳入 `@moryflow/model-registry-data` 与 `prepare:model-registry-data` 构建链路退场、`apps/moryflow/admin` 与 `apps/anyhunt/admin/www` 模型表单改造、server `PRESET_PROVIDERS/getSdkType` 向 `model-bank` 统一解析迁移、以及 CLAUDE/索引文档反向修订闸门（2026-02-27）。
- `model-bank-rebuild-plan.md`：升级为“全量重构方案（单一事实源，零兼容）”，新增全量数据口径清单（云端 DB/下发合同/PC 本地设置/agents-model-registry/api 默认映射/runtime 推导）、七阶段改造清单（含 `@moryflow/agents-model-registry` 退场）、强制删除清单与 DoD（2026-02-27）。
- `model-bank-rebuild-plan.md`：补充“与 LobeChat 分层实现的取舍”并冻结职责边界：thinking 规则数据全部集中到 `model-bank`；runtime/provider 仅做协议转换；UI 不再维护独立等级枚举（2026-02-27）。
- `model-bank-rebuild-plan.md`：Phase 1~7 全部完成并冻结为 implemented；`model-bank` 成为唯一事实源，`agents-model-registry`/`model-registry-data`/`thinking-defaults` 全量退场，server/runtime/pc/mobile/admin 改造与全仓闸门已完成（2026-02-27）。
- `thinking-opencode-aligned-c-end-rebuild-plan.md`：新增 OpenCode/LobeHub 源码复核结论，确认两者均采用 model-native 参数/等级驱动；同步回写“零过渡态”根本解决方案（淘汰 provider 级等级映射、用户自定义模型无原生定义则 `off-only`、OpenRouter one-of 强约束）（2026-02-27）。
- `thinking-opencode-aligned-c-end-rebuild-plan.md`：根据最新用户复测修正现象描述（设置弹窗与输入框等级已一致），并新增“当前等级映射规则（代码现状）”说明：现行为 provider 级映射（非 model 级），补充各 provider 等级枚举、budget/effort 映射与聊天入口优先级（2026-02-27）。
- `thinking-opencode-aligned-c-end-rebuild-plan.md`：用户自配置回归专项已收口（2026-02-27）：`sdkType` 透传、`thinkingByModel` 覆盖缓存、OpenRouter one-of 三段根因均已修复并完成验收；文档状态已回写为 `implemented`。
- `thinking-opencode-aligned-c-end-rebuild-plan.md`：Phase 5 Code Review 修复完成并回写为 implemented：Moryflow server Provider thinking 生效链路修复（OpenAI/Anthropic/Google）、默认映射收敛 `@moryflow/api` 单一事实源、Moryflow server thinking 专项回归测试补齐（2026-02-27，implemented）。
- `moryflow-anyhunt-model-thinking-level-plan.md`：补充 PR#97 新评论修复闭环（REVIEW-02/FIX-08/FIX-09/TEST-04），修复 `supportsThinking` 不可达回退与 `/v1/models` 重复查询，并完成受影响包回归验证（2026-02-26，implemented）。
- `moryflow-anyhunt-model-thinking-level-plan.md`：补充 PR#97 评论修复闭环（REVIEW-01/FIX-05/FIX-06/FIX-07/TEST-03），完成 SSE 非阻塞、provider patch 优先级修复、Anthropic/Google thinking 注入链路修复与回归验证（2026-02-26，implemented）。
- `moryflow-anyhunt-model-thinking-level-plan.md`：第二轮执行完成（thinking_profile 强制契约、levelPatches 强类型/运行时消费、Anyhunt 默认 off + 客户端单次降级重试、全仓 `lint/typecheck/test:unit` 闸门通过）（2026-02-26，implemented）。
- `auth/auth-and-global-rate-limit-defense-plan.md`：按当前实现对齐技术细节（Better Auth `/**` 路径规则、全局 `forRootAsync` 装配、Redis Lua 原子限流、默认 skip paths、模块级校验命令）（2026-02-25，active）。
- `auth/auth-and-global-rate-limit-defense-plan.md`：Moryflow Server 分层限流方案进入执行状态（Auth `60s/20` + 全局 `60s/300` 已落地，Step 1~5 完成，Step 6 灰度待执行）（2026-02-25，active）。
- `auth/auth-zustand-method-refactor-plan.md`：完成八次评审修订后已执行落地（Step 1~13 全部回写 done），完成客户端/服务端出站 HTTP/WebSocket 统一、旧范式清理与受影响包回归验证（2026-02-24）。
- `auth/unified-token-auth-v2-plan.md`：补充 follow-up 进度（access token 预刷新窗口统一 1h；Anyhunt/Moryflow 线上 `prisma migrate deploy` 已执行且无待迁移；Console/Admin/Moryflow Admin 网络失败回退策略与回归测试已补齐）（2026-02-24）。
- `auth/unified-token-auth-v2-plan.md`：统一 Token-first Auth 改造已完成（跨 Anyhunt + Moryflow，零兼容；登录直接返回 access+refresh，refresh 轮换；Step 1~8 完成并补齐上线/回滚演练记录）（2026-02-24）。
- `anyhunt-request-log-module-plan.md`：升级为统一日志系统方案（用户行为分析 + 错误排查 + IP 监控，单表全量入库 + 30 天清理，明文 IP）（2026-02-24）。
- `anyhunt-request-log-module-plan.md`：实施完成（RequestLog 单表、全局采集、Admin Logs 页面、30 天清理任务）（2026-02-24）。
- `agent-skills.md`：增量方案落地（固定推荐 3 项：Skill Creator / Find Skills / Article Illustrator；首次预安装前两项；`New skill` 复用 `Try Skill Creator`；`Try` 改为立即新建会话并生效），并回写 P0-12~P0-15 完成进度（2026-02-11）。
- `agent-skills.md`：PC 端 P0 落地完成（Sidebar Skills 入口、输入框 `+` 与空输入 `/` 双入口、selected skill chip、`available_skills` 注入与 `skill` tool 按需加载），并回写执行计划进度（2026-02-11）。
- `agent-skills.md`：本期方案 1 落地（发送成功后清空 selected skill；用户消息渲染 skill tag），并在执行计划中新增 P0-11 进度（2026-02-11）。
- `agent-skills.md`：固定兼容目录自动导入（`~/.agents/skills`、`~/.claude/skills`、`~/.codex/skills`、`~/.clawdbot/skills`）并支持 `Refresh` 重扫；`selectedSkill` 不可用改为提示后软降级继续对话；补充“执行计划 + 行为准则 + 强制进度同步”段落（2026-02-11）。
- `agent-skills.md`：兼容扫描改为“按 skill 目录整体自动导入”（保留 scripts/templates/references），非仅导入单文件（2026-02-11）。
- `agent-skills.md`：`skill` 改为白名单直通（不走权限审批/审计链路）（2026-02-11）。
- `agent-skills.md`：去掉过度来源状态（移除 `SkillInstallState.source`）并收敛兼容来源描述（2026-02-11）。
- `agent-skills.md`：兼容扫描改为默认自动导入（不做引导/提醒）（2026-02-11）。
- `agent-skills.md`：补充输入框 tag 能力边界（仅外层 chip）、元信息最小注入（不含路径/状态）与 skill tool 单一数据源返回策略（2026-02-11）。
- `agent-skills.md`：按已确认决策重写（默认全启用/可禁用不删除/`+` 与空输入 `/` 双入口 selectedSkill/OpenCode 注入策略对齐）（2026-02-11）。
- `ui-message-list-turn-anchor-adoption.md`：回归经典 chat（Following 模式）：runStart 一次 `behavior:'smooth'` + `160ms` 入场动效；AI 流式追随使用 `auto`；上滑取消改为纯滚动指标判定；禁用 `overflow-anchor`；移除 `packages/ui/src/ai/assistant-ui` 目录（AutoScroll/Store 内聚到 ConversationViewport）；补齐与 `main` 分支差异与 Code Review 附录（2026-02-08）。
- `anyhunt-api-channel-routing.md`：标记 implemented 并补齐模块进度（2026-02-02）。
- `anyhunt-api-channel-routing.md`：补充 apps/anyhunt 修改清单与执行计划（2026-01-28）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充外部化/Hook 示例（JSONC/Agent/Tool）（2026-01-30）。
- `adr/adr-0002-agent-runtime-control-plane.md`：P2-7/P2-8 外部化与 Hook 落地完成（2026-01-29）。
- `adr/adr-0002-agent-runtime-control-plane.md`：P1-5 模式切换落地完成（PC + Mobile）（2026-01-28）。
- `adr/adr-0002-agent-runtime-control-plane.md`：示例文案统一为“待办”表述（2026-01-27）。
- `adr/adr-0002-agent-runtime-control-plane.md`：P1-4 Doom Loop 落地完成（PC + Mobile）（2026-01-27）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充 compaction 摘要输入裁剪规则（2026-01-27）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充 compaction 上下文窗口来源与发送前预处理（2026-01-27）。
- `adr/adr-0002-agent-runtime-control-plane.md`：P1-3 会话压缩落地完成（PC + Mobile）（2026-01-26）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充 Compaction“裁剪旧工具输出”示例（2026-01-26）。
- `adr/adr-0002-agent-runtime-control-plane.md`：P0-2 权限系统落地完成（审批卡/JSONC/审计）（2026-01-26）。
- `adr/adr-0002-agent-runtime-control-plane.md`：确认 P0-2 权限落地细节（审批卡位置、规则直接写 JSONC、Mobile 审计路径）（2026-01-26）。
- `adr/adr-0002-agent-runtime-control-plane.md`：P0-1 工具输出截断落地进度更新（2026-01-25）。
- `auth/quota-and-api-keys.md` 与 `auth/database.md`：更新 API Key 明文存储与前端脱敏展示约束（2026-01-27）。
- `anyhunt-console-public-api-key-plan.md`：公网 API 化与明文 key 返回（2026-02-01）。
- `agent-tasks-system.md`：落地 TasksStore 单例、只读 IPC、PC/Mobile Tasks UI，并补充子代理同步测试与执行清单完成记录（2026-01-25）。
- `agent-tasks-system.md`：修正 Mobile SQLite 路径约定为 databaseName + directory（2026-01-25）。
- `adr/adr-0002-agent-runtime-control-plane.md`：系统提示词参数改为高级可选覆盖（默认使用模型默认值）（2026-01-26）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充系统提示词/参数自定义（默认/自定义、参数范围、禁用时间占位符）（2026-01-26）。
- `adr/adr-0002-agent-runtime-control-plane.md`：合并 OpenCode 对标与落地清单，删除独立对标文档（2026-01-26）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充范围与实施原则，明确聊天消息内打开文件（2026-01-24）。
- `domains-and-deployment.md`：补充发布站点仅允许 GET/HEAD 与状态页禁缓存约束。
- `domains-and-deployment.md`：补充 `_meta.json` 解析/结构异常按 OFFLINE 处理。
- `domains-and-deployment.md` 补充 `rss.anyhunt.app`（Digest RSS 入口）说明。
- `ui-message-list-unification.md` 已补齐 MessageList 组件并移除 metadata.moryflow 兼容逻辑。
- `auth/unified-auth-rebuild-plan.md`：标记完成并补充业务服务 JWKS 验签落地。
- `auth/unified-auth-rebuild-plan.md`：补充 Auth 环境变量核对结论。
- `auth/unified-auth-rebuild-plan.md`：补充 Anyhunt/Moryflow 数据库重置执行记录。
- `auth/unified-auth-rebuild-plan.md`：补充 JWKS 验签测试落地记录。
- `auth/unified-auth-rebuild-plan.md`：补充 Auth env 域名对齐与无需新增变量结论。
- `auth/unified-auth-rebuild-file-map.md`：新增 Auth 改造文件清单与潜在漏改提示。
- `auth/unified-auth-rebuild-file-map.md`：补充 Review 问题与解决方案清单（不做兼容）。
- `auth/unified-auth-rebuild-file-map.md`：补充调研结论（www access JWT、CLI/JWKS/session 复核）。
- `auth/unified-auth-rebuild-file-map.md`：补充最佳实践决策（www 主战场、删除 CurrentSession、JWKS 接入范围）。
- `auth/unified-auth-rebuild-file-map.md`：标注已落地项（Origin 校验、Expo client、CurrentSession 删除）。
- `auth/unified-auth-rebuild-file-map.md`：补充 Expo 插件类型推断修复记录（显式 Auth 类型）。
- `auth/unified-auth-rebuild-plan.md`：调整 anyhunt.app 为 C 端主战场并完成 www 对齐事项。
- `auth/unified-auth-rebuild-plan.md`：补充执行结果与清理项记录。
- `auth/unified-auth-rebuild-plan.md`：补充 `test:e2e` 与 `pnpm test` 验证记录。
- `adr/adr-0002-agent-runtime-control-plane.md`：新增 Agent Runtime 控制面 ADR（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充 read 域覆盖文件工具 + 完整输出系统打开 + 复用 confirmation 组件（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充 Doom Loop `always` 仅会话内有效（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充截断展示入口要求（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充审计字段与落地位置（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充审计日志格式（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充全权限静默记录（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充 Agent/全权限模式切换与审批最小化（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：配置层与规则持久化简化为用户级（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：修正策略基线文本与 Doom Loop 列表格式（2026-01-24）。
- `adr/adr-0002-agent-runtime-control-plane.md`：补充配置格式、规则匹配与审计落地规范（2026-01-24）。
- `auth/unified-auth-rebuild-file-map.md`：补充 Mobile refresh 网络异常修复与 `X-App-Platform` 传递范围结论。
- `auth/access-token-storage-plan.md`：补充未登录/refresh 失效/过期处理（2026-01-25）。
- `auth/access-token-storage-plan.md`：补充 PC/移动端安全存储与 Device refresh 流程（2026-01-25）。
- `auth/moryflow-pc-mobile-access-token-upgrade.md`：新增 Moryflow PC/Mobile Access Token 持久化升级方案（2026-01-25）。
- `auth/moryflow-pc-mobile-access-token-upgrade.md`：明确三项最佳实践决策（keytar/失败边界/Resume）并细化执行清单（2026-01-25）。
- `api-client-unification.md`：新增 API Client 统一封装方案（2026-01-26）。
- `api-client-unification.md`：补充 React Query Web/PC/移动端用法与复用策略（2026-01-26）。
- `api-client-unification.md`：统一响应为 raw JSON + RFC7807，并新增一次性执行计划（2026-01-26）。
- `api-client-unification.md`：删除 envelope 过渡适配，明确不做历史兼容（2026-01-26）。
- `api-client-unification.md`：修正文档冲突项，删除 envelope 相关内容（2026-01-26）。
- `api-client-unification.md`：补充 requestId 约定与校验错误示例（2026-01-26）。
- `api-client-unification.md`：补充 errors 数组原因与前端展示建议（2026-01-26）。
- `anyhunt-llm-provider-alignment.md`：进度文档更新，补齐 Console Agent Browser 对齐项（2026-01-27）。
- `anyhunt-llm-provider-alignment.md`：完成迁移重置与验证步骤，标记进度完成（2026-01-27）。
