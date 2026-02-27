<!--
[INPUT]: 本目录下的 Markdown 文档与架构说明
[OUTPUT]: 统一的文档组织方式与写作约束（供人类与 AI 协作）
[POS]: docs/ 的写作约束与组织规范（索引入口在 docs/index.md）

[PROTOCOL]: 本文件变更时，需同步更新根 CLAUDE.md 的文档索引（若影响全局）。
-->

# docs/ 目录指南

> 最近更新：2026-02-27（Thinking 统一重构方案 0.3 Root-Cause Follow-up 完成：顶层流单通道、`sdkType` 必填、thinking 映射单源 `model-bank`、移除 run-item reasoning 导出、override 快照只读化）
> 最近更新：2026-02-27（Thinking 统一重构方案补丁治理二次整改完成：按 `2 -> 1 -> 5 -> 3 -> 4 -> 6` 顺序收敛单路径实现，已回写主计划与索引）
> 最近更新：2026-02-27（Thinking 统一重构方案补充 Raw-only 收口：无 reasoning 不注入补文案、thinking 日志全环境常开并在启动时清空）
> 最近更新：2026-02-27（Thinking 统一重构方案 Section 13 已完成并回写：根因治理修复“文本叠词 + Thinking 不渲染”收口，落地 canonical 流协议去重、thinking 语义解耦、渲染状态契约化与验收闸门）
> 最近更新：2026-02-27（Model Bank follow-up 收口：`docs/architecture/model-bank-rebuild-plan.md` Section 12 已 implemented，Settings Dialog thinking 下拉改为模型合同驱动并完成回归测试）
> 最近更新：2026-02-27（Model Bank 方案补充最终收口记录：`@moryflow/model-bank` 导出契约改为 dist 双格式 + wildcard 子路径导出，修复 CJS 运行时导入与 exports 覆盖测试不一致；全仓闸门复跑通过）
> 最近更新：2026-02-27（Model Bank 全量重构方案补齐漏项：新增 `@moryflow/model-registry-data` 与 `prepare:model-registry-data` 退场、`moryflow/admin` + `anyhunt/admin` 模型表单纳入改造、server `PRESET_PROVIDERS/getSdkType` 迁移到 `model-bank`，并新增文档反向修订闸门）
> 最近更新：2026-02-27（`docs/architecture/model-bank-rebuild-plan.md` 升级为全量重构方案：补齐“之前模型设置全部数据”口径清单与七阶段执行清单，明确 `@moryflow/agents-model-registry` 退场、`@moryflow/api` thinking 默认映射删除、`model-bank` 单一事实源）
> 最近更新：2026-02-27（Model Bank 重构方案补充职责边界冻结：thinking 等级/默认值/互斥规则统一收敛 `packages/model-bank`；runtime/provider 仅做协议适配；UI 不再维护独立等级枚举）
> 最近更新：2026-02-27（Model Bank 重构方案执行完成：`docs/architecture/model-bank-rebuild-plan.md` 已冻结为 implemented；Phase 1~7 全部回写完成，旧双轨包与旧映射全面退场）
> 最近更新：2026-02-27（Thinking 统一重构方案补充 OpenCode/LobeHub 源码复核结论：两者均按 model-native 能力驱动；新增“零过渡态”根本解决方案，明确淘汰 provider 级等级映射，用户自定义模型无原生等级时强制 `off-only`）
> 最近更新：2026-02-26（更新 Thinking 统一重构方案（OpenCode 对齐，C 端优先）：`docs/architecture/thinking-opencode-aligned-c-end-rebuild-plan.md`；新增“平台预设强约束保证稳定性 + 云端/本地统一交互”，保留模型原生等级直出，废弃设置页 `enabledLevels/levelPatches`）
> 最近更新：2026-02-26（Thinking 统一重构方案执行完成：文档状态改为 implemented，并回写 Phase 1~4 执行进度与落地结果）
> 最近更新：2026-02-27（Thinking 统一重构方案 Phase 5~6 全部完成：Provider thinking 生效链路、单一事实源收口、用户自配置回归专项均已闭环；文档状态回写为 implemented）
> 最近更新：2026-02-27（Thinking 统一重构方案 Phase 5 修复完成：Moryflow server OpenAI/Anthropic/Google thinking 注入链路修复，默认映射收敛到 `@moryflow/api` 单一事实源，新增 Moryflow server thinking 专项回归测试；文档状态回写为 implemented）
> 最近更新：2026-02-27（Thinking 用户自配置回归专项已完成：`sdkType` 透传缺失、`thinkingByModel` 覆盖缓存、OpenRouter one-of 冲突三段根因已修复并通过回归）
> 最近更新：2026-02-27（Thinking 统一重构方案按最新用户复测修订：弹窗与输入框等级已一致；新增“当前等级映射规则（代码现状）”，明确现行为 provider 级映射（非 model 级）并补充各 provider 等级/参数映射与聊天优先级）
> 最近更新：2026-02-26（新增 Multi-project Zustand/getSnapshot 风险专项审计：`docs/code-review/multi-project-zustand-getsnapshot-audit-2026-02-26.md`；9 项目全量扫描，修复 `moryflow/mobile` `sync-engine` 的 `getSnapshot` 稳定性与 no-op 写入风险，新增回归测试）
> 最近更新：2026-02-26（前端组件优化专项台账补充“对话启动前必读规范入口”：强制先读 `AGENTS.md`/`CLAUDE.md`/组件规范/index/专项台账/console 示例，再开始扫描与修复）
> 最近更新：2026-02-26（新增 Moryflow PC Zustand getSnapshot 风险专项审计文档：`docs/code-review/moryflow-pc-zustand-getsnapshot-audit-2026-02-26.md`，集中列出同类无限重渲染风险点与证据）
> 最近更新：2026-02-26（Anyhunt WWW 组件优化专项完成项目复盘：模块 A/B/C/D 全部闭环，补充 B-6（`CreateSubscriptionDialogForm` 容器化拆分）与 D-7（`public-topics.hooks` 分域拆分）；`typecheck`/`test:unit`/`build` 全通过）
> 最近更新：2026-02-26（Anyhunt WWW 组件优化专项进展：模块 D（stores/hooks/数据映射）分步修复完成（D-1~D-6）：`digest hooks/types` 分域拆分、Inbox mapper 统一、`public-topics` 异步竞态修复、`auth-api` unknown 错误收敛与回归测试补齐；后续已在项目复盘完成 D-7 收口）
> 最近更新：2026-02-26（Anyhunt WWW 组件优化专项进展：模块 C（explore/topic/welcome）完成（TopicPane 条件 Hook 风险修复、Explore 容器/渲染拆分与状态片段化、Welcome 双栏状态收敛与 welcome 路由副作用解耦）；模块 A/B/C 台账已回写，进入模块 D）
> 最近更新：2026-02-26（Anyhunt Console 组件优化专项进展：模块 D D-6 全部完成（D-6a~D-6c：`BrowserSessionPanel` 收敛为容器层 + operation handlers/hooks 分域 + `browser-api` 三域拆分 + Session/Windows 分区二次减责），模块 E 完成（`Scrape/Crawl` 迁移 `PlaygroundPageShell` + shared loading/code-example 组件），`anyhunt/console` 项目复盘完成并闭环）
> 最近更新：2026-02-26（Anyhunt Console 组件优化专项进展：模块 D D-6a 完成（`FlowRunner` 分层拆分 + `BrowserSessionPanel` 表单初始化抽离到 `use-browser-session-forms`），进入一致性复查收口）
> 最近更新：2026-02-26（Anyhunt Console 组件优化专项进展：模块 D D-4e 完成（`browser-session-sections` 第五批分区拆分：OpenUrl/Snapshot/Delta/Action/ActionBatch/Screenshot；主文件 494 行降到 45 行并收敛为导出层））
> 最近更新：2026-02-26（Anyhunt Console 组件优化专项进展：模块 D D-4d 完成（`browser-session-sections` 第四批分区拆分：Session/Tabs/Windows；主文件 1299 行降到 494 行））
> 最近更新：2026-02-26（Anyhunt Console 组件优化专项进展：模块 D D-4c 完成（`browser-session-sections` 第三批分区拆分：Intercept/Headers/NetworkHistory/Diagnostics；主文件 1773 行降到 1299 行，Detection Risk 状态渲染改为方法化））
> 最近更新：2026-02-26（Anyhunt Console 组件优化专项进展：模块 D D-5 完成（API 分域拆分：`browser-api.ts` / `agent-api.ts` + `api.ts` 兼容导出层））
> 最近更新：2026-02-26（Anyhunt Console 组件优化专项进展：模块 D D-4b 完成（`browser-session-sections` 第二批分区拆分：Storage/Profile），D-4 继续推进）
> 最近更新：2026-02-26（Anyhunt Console 组件优化专项进展：模块 D D-4a 完成（`browser-session-sections` 首批分区拆分：Streaming/CDP），D-4 继续推进）
> 最近更新：2026-02-26（Anyhunt Console 组件优化专项进展：模块 D D-3 完成（section 状态容器 + 结果状态 + lifecycle handlers 抽离））
> 最近更新：2026-02-26（Anyhunt Console 组件优化专项进展：模块 D D-3b 完成（结果状态与 session lifecycle handlers 抽离为 hooks），D-3 继续推进）
> 最近更新：2026-02-26（Anyhunt Console 组件优化专项进展：模块 D D-3a 完成（section 配置 + open-state hook 抽离，移除 17 个开关 `useState`），D-3 进行中）
> 最近更新：2026-02-26（Anyhunt Console 组件优化专项进展：模块 D D-2 完成（Session/Window 参数 mapper 抽离 + `BrowserSessionPanel` 去重 + 单测通过），进入 D-3）
> 最近更新：2026-02-26（Anyhunt Console 组件优化专项进展：模块 D D-1 完成（`AgentBrowserLayoutPage` active-key only 收敛 + 回归测试通过），进入 D-2）
> 最近更新：2026-02-26（Anyhunt Console 组件优化专项进展：模块 D（agent-browser-playground）预扫描完成，识别 `S1x3 / S2x3`，进入 D-1 分步修复）
> 最近更新：2026-02-25（Anyhunt Console 组件优化专项进展：模块 C C-2~C-5 完成（统一 API Key 收敛 + Graph 分层重构 + Embed RHF/zod 迁移 + 模块级回归通过））
> 最近更新：2026-02-25（Anyhunt Console 组件优化专项进展：模块 C review follow-up 完成（`Memories` 请求启用边界修复 + API Key 选择复用收敛 + Graph 可视化继续减责拆分））
> 最近更新：2026-02-25（Anyhunt Console 组件优化专项进展：模块 C（memox/embed playground）预扫描完成，产出 `S1x3 / S2x3`）
> 最近更新：2026-02-25（Anyhunt Console 组件优化专项进展：模块 B B-4/B-5/B-6 完成（统一 API Key 选择收敛 + 共享页面壳层 + 模块级回归））
> 最近更新：2026-02-25（Anyhunt Console 组件优化专项进展：模块 B B-3（ExtractPlaygroundPage 拆分）完成并通过模块级校验）
> 最近更新：2026-02-25（Anyhunt Console 组件优化专项进展：模块 B B-2（ScrapeResult 拆分）完成并通过模块级校验）
> 最近更新：2026-02-25（Anyhunt Console 组件优化专项进展：模块 B 修复启动，B-1（ScrapeForm 拆分）完成并通过模块级校验）
> 最近更新：2026-02-25（Anyhunt Console 组件优化专项进展：模块 B（scrape/crawl/search/map/extract）完成预扫描，产出 `S1x3 / S2x2`）
> 最近更新：2026-02-25（前端组件准则补充：新增“状态片段化 + renderContentByState + 禁止链式三元”，并完成 Anyhunt Console 模块 A 变更区补扫修复）
> 最近更新：2026-02-25（Anyhunt Console 组件优化专项进展：模块 A（api-keys/settings/webhooks）完成修复并通过 `typecheck` + `test:unit`，补充回归测试）
> 最近更新：2026-02-25（Anyhunt Console 组件优化专项启动：模块 A（api-keys/settings/webhooks）完成预扫描，产出 `S1x3 / S2x2`）
> 最近更新：2026-02-25（新增前端组件优化专项执行计划：10 个前端项目按项目/模块拆分推进，要求每步回写执行台账）
> 最近更新：2026-02-25（新增前端组件设计质量索引：统一组件拆分/合并判定、Props drilling 限制、复杂度预算与审查分级）
> 最近更新：2026-02-25（新增 Moryflow Server 分层限流方案：Auth `60s/20` + 全局 `60s/300`，Redis 存储，含判定特征、执行步骤、验收与回滚）
> 最近更新：2026-02-25（Moryflow Server 分层限流方案按实现对齐：Better Auth `/**` 路径规则、全局 `forRootAsync` 装配、Redis Lua 原子限流、默认 skip paths、模块级校验命令）
> 最近更新：2026-02-25（Agent Browser Stealth 能力引入与改造方案：基于 agent-browser-stealth 外部项目，输出完整差异分析与 11 步执行计划；废除旧"禁止伪装"约束）
> 最近更新：2026-02-25（Moryflow License 下线文档补充“按步骤执行计划（零影响目标）”：新增 11 步固定执行序列，覆盖改造顺序、质量闸门、冒烟回归与线上 DB 更新验收）
> 最近更新：2026-02-25（Moryflow License 下线文档改为确认执行稿：按“零兼容、零迁移、一次性全删”重写，并补充使用 `/Users/bowling/code/me/moryflow/apps/moryflow/server/.env` 执行线上数据库更新命令）
> 最近更新：2026-02-25（Moryflow License 下线影响评估文档：新增 `docs/moryflow-license-removal-impact.md`，明确业务 License 删除边界、影响面、删除/改造清单与固定执行步骤）
> 最近更新：2026-02-25（Moryflow PC Auth 排障补充：新增 transport `raw/stream` 语义修复、server-http-client fetch 绑定修复、全仓 `lint/typecheck/test:unit` 校验记录）
> 最近更新：2026-02-25（Moryflow PC Auth 排障补充：`/api/v1` 全量统一（Auth + 业务 + webhook）；PC/Mobile 认证接口改为显式 `/api/v1/auth/*`，并完成回归测试）
> 最近更新：2026-02-24（Auth 与全量请求统一改造计划执行完成：Step 1~13 全部完成并回写，覆盖客户端 + 服务端出站 HTTP + WebSocket；旧客户端范式清理完成，受影响包完成回归验证，`moryflow-mobile check:type` 仅保留既有基线问题）
> 最近更新：2026-02-24（统一 Token Auth V2 follow-up：access token 预刷新窗口统一为 1h；Anyhunt/Moryflow 线上 `prisma migrate deploy` 已执行且无待迁移）
> 最近更新：2026-02-24（统一 Token Auth V2 follow-up-2：Console/Admin/Moryflow Admin 补齐 refresh 网络失败回退未过期 access token 策略与 store 回归测试）
> 最近更新：2026-02-24（统一 Token Auth V2 改造执行完成：Step 1~8 全部完成，并补充上线/回滚演练记录）
> 最近更新：2026-02-24（Moryflow PC Auth 排障 Runbook：补充客户端最新进度（OTP 二步修复、Token-first 登录/验证、未登录不走全局 skeleton、Auth 错误解析增强）与新增回归测试结果）
> 最近更新：2026-02-24（新增统一 Token Auth V2 改造方案：跨 Anyhunt + Moryflow 统一 Token-first（登录直接返回 access+refresh，refresh 轮换），并附强制进度回写执行计划）
> 最近更新：2026-02-24（落地：Anyhunt 统一请求日志模块（明文 IP + 30 天保留））
> 最近更新：2026-02-24（OpenAI Agents JS 根因修复补充：Gemini function schema 兼容层（`enum` 缺失 `type` 递归补齐）+ PC ABI 双态修复（pretest Node ABI / posttest Electron ABI）；P0-24 全量 L2 闸门通过）
> 最近更新：2026-02-24（OpenAI Agents JS 升级 lint 兼容修复：`agent.controller` 区分 Express/Web `Response` 类型，清除 `unbound-method` 与剩余 `no-unsafe-*`）
> 最近更新：2026-02-24（OpenAI Agents JS 升级 Runtime 修复：为 `@openai/agents-core run()` 统一绑定默认 `ModelProvider`，修复 PC/Mobile `No default model provider set`）
> 最近更新：2026-02-24（OpenAI Agents JS 升级补充 TS 修复：Console `AgentChatTransport.headers` 固定返回 `Headers`；Mobile `ReadableStream.start` 通过外提 `transportOptions` 消除 `this` 上下文误判）
> 最近更新：2026-02-24（OpenAI Agents JS 升级构建链路兼容修复：`LlmRoutingService` `aisdk` 回退顶层导出 + `agent.controller` 显式 helper 类型，修复 lint `no-unsafe-*`）
> 最近更新：2026-02-24（OpenAI Agents JS 升级环境修复：`pnpm install` 恢复 + review 修复扩展到 P0-12，补齐 Console transport Headers 断言）
> 最近更新：2026-02-24（OpenAI Agents JS 升级 review 修复完成：P0-8~P0-10，覆盖 mock 路径、UIMessage reasoning 字段、MCP 重载失败状态清理）
> 最近更新：2026-02-24（OpenAI Agents JS 升级进入实施：P0-1~P0-6 已落地并同步进度，P0-7 因 node_modules 缺失待补跑）
> 最近更新：2026-02-24（OpenAI Agents JS 升级评估第三次复核：按“官方协议唯一实现 + 无历史兼容”重写，补齐 Anyhunt/PC/Mobile/MCP 的重构边界、必删清单与 DoD）
> 最近更新：2026-02-24（Agent Browser 合规自动化与检测风险治理方案：Step 0~7 已落地）

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
- `docs/code-review/`：全量 Code Review 的模块拆分、进度与结论索引（每个模块单独一份 review 文档）。
- `docs/architecture/`：系统级架构决策与不变量（"最终真相"）；含 `adr/` 决策记录与 `auth/` 拆分文档。
- `docs/guides/`：开发指南（如何做、最佳实践、可复用做法）。
- `docs/runbooks/`：运行手册（部署/排障/操作清单，照做即可）。
- `docs/products/`：产品线内的内部方案（Anyhunt Dev / Moryflow）。
- 归档文档已移除目录（如需归档再新建并补充索引）。
- `docs/skill/`：Codex Skills 相关说明（Prompt/技能元信息），用于本仓库内的协作与对齐。

## 最近更新

- Multi-project Zustand/getSnapshot 风险专项审计（排除 Moryflow PC）：`docs/code-review/multi-project-zustand-getsnapshot-audit-2026-02-26.md`（2026-02-26：completed，9 项全量扫描完成；`moryflow/mobile` 命中项已修复并补齐 3 条回归测试；`test:unit` 通过，`check:type` 保留既有基线失败）
- Moryflow PC Zustand getSnapshot 风险专项审计：`docs/code-review/moryflow-pc-zustand-getsnapshot-audit-2026-02-26.md`（2026-02-26：completed，同类无限重渲染风险点已修复并补齐回归测试）
- 前端组件优化专项范围调整：按用户确认忽略 `apps/anyhunt/docs`，台账新增 Step 12（项目范围调整，done）
- Anyhunt WWW Code Review：`docs/code-review/anyhunt-www.md`（2026-02-26：done，模块 A/B/C/D + 项目复盘全部完成；含 B-6/D-7 收口与模块级 `typecheck`/`test:unit`/`build` 全通过）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-26：done，模块 A/B/C/D/E + 项目复盘全部完成；收口补扫已将 `AgentBrowserLayoutPage` 布局分支改为状态片段渲染）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-26：in_progress，模块 D D-6a 完成：`flow-runner.tsx` 分层到 `flow-runner-form`/`flow-runner-step-list`/`flow-runner-types`/`flow-runner-helpers`，并将 `BrowserSessionPanel` 的 19 组表单初始化抽离到 `use-browser-session-forms`）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-26：in_progress，模块 D D-4e 完成：`browser-session-sections.tsx` 第五批分区拆分，新增 `open-url-section.tsx`、`snapshot-section.tsx`、`delta-snapshot-section.tsx`、`action-section.tsx`、`action-batch-section.tsx`、`screenshot-section.tsx`，主文件降至 45 行）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-26：in_progress，模块 D D-4d 完成：`browser-session-sections.tsx` 第四批分区拆分，新增 `session-section.tsx`、`tabs-section.tsx`、`windows-section.tsx`，主文件降至 494 行）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-26：in_progress，模块 D D-4c 完成：`browser-session-sections.tsx` 第三批分区拆分，新增 `intercept-section.tsx`、`headers-section.tsx`、`network-history-section.tsx`、`diagnostics-section.tsx`，主文件降至 1299 行并收敛 Detection Risk 状态渲染）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-26：in_progress，模块 D D-5 完成：新增 `browser-api.ts`、`agent-api.ts`，`api.ts` 改为兼容导出层并切换主要调用方为分域导入）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-26：in_progress，模块 D D-4b 完成：`browser-session-sections.tsx` 第二批分区拆分，新增 `storage-section.tsx`、`profile-section.tsx`）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-26：in_progress，模块 D D-4a 完成：`browser-session-sections.tsx` 首批分区拆分，新增 `streaming-section.tsx`、`cdp-section.tsx`）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-26：in_progress，模块 D D-3 完成：section 状态容器 + 结果状态 + session lifecycle handlers 抽离）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-26：in_progress，模块 D D-3b 完成：新增 `use-browser-session-panel-results.ts` 与 `use-browser-session-lifecycle-actions.ts`，`BrowserSessionPanel` 进一步收敛为装配层）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-26：in_progress，模块 D D-3a 完成：新增 `browser-session-section-config.ts` 与 `use-browser-session-section-open-state.ts`，`BrowserSessionPanel` 移除 17 个 section 开关 `useState`）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-26：in_progress，模块 D D-2 完成：新增 `browser-context-options.ts` + 单测，`BrowserSessionPanel` 的 Session/Window 参数构建改为共享 mapper）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-26：in_progress，模块 D D-1 完成：`AgentBrowserLayoutPage` 改为 active-key only，新增 `AgentBrowserLayoutPage.test.tsx`，并通过 `typecheck` + `test:unit`）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-26：in_progress，模块 D（agent-browser-playground）预扫描完成，识别 `S1x3 / S2x3`，进入 D-1 修复）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-25：in_progress，模块 C C-2~C-5 完成：统一 API Key 收敛、Graph 分层重构、Embed RHF/zod 迁移、模块 C 回归 15 files / 55 tests 通过）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-25：in_progress，模块 C review follow-up 完成：`Memories` 请求启用边界修复、API Key 选择复用收敛、Graph 可视化继续减责拆分）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-25：in_progress，模块 C C-1 完成：`MemoxPlaygroundPage` 拆分为容器 + request/result 组件，抽离 request mapper 并补齐单测）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-25：in_progress，模块 C（memox/embed playground）预扫描完成，识别 `S1x3 / S2x3`）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-25：in_progress，模块 B 完成（B-1~B-6）：新增共享页面壳层、统一 API Key 收敛、模块级回归通过）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-25：in_progress，模块 B B-2 完成：`ScrapeResult` 拆分为 cards/tabs/view-model，移除默认 Tab 链式三元）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-25：in_progress，模块 B B-1 完成：`ScrapeForm` 拆分为 mapper + sections，校验通过）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-25：in_progress，模块 B（scrape/crawl/search/map/extract）预扫描完成，识别 `S1x3 / S2x2`）
- Anyhunt Console 组件优化专项补扫：按“状态片段化 + `renderContentByState` + 禁止链式三元”修复模块 A 变更区同类问题，并回写执行台账：`docs/code-review/anyhunt-console.md`、`docs/code-review/frontend-component-optimization-rollout.md`（2026-02-25）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-25：in_progress，模块 A 修复完成并通过 `typecheck` + `test:unit`，新增 `webhooks/utils.test.ts` 回归测试）
- Anyhunt Console Code Review：`docs/code-review/anyhunt-console.md`（2026-02-25：in_progress，模块 A 预扫描完成，`S1x3 / S2x2`）
- 前端组件优化专项执行计划（按项目/按模块）：`docs/code-review/frontend-component-optimization-rollout.md`（2026-02-25：active）
- 前端组件设计质量索引（拆分与收敛准则）：`docs/guides/frontend/component-design-quality-index.md`（2026-02-25：active）
- Moryflow Server 分层限流方案（Auth + 全局，Redis 存储，active）：`docs/architecture/auth/auth-and-global-rate-limit-defense-plan.md`（2026-02-25：Auth `60s/20` + 全局 `60s/300` 已落地，Step 1~5 完成，Step 6 灰度待执行）
- Agent Browser Stealth 能力引入与改造方案（proposal）：基于 agent-browser-stealth 外部项目完成差异分析与 11 步执行计划；废除旧"禁止伪装"约束（2026-02-25：proposal）
- Moryflow PC Auth 排障 Runbook：补充 transport `raw/stream` 语义修复、server-http-client fetch 绑定修复与全仓 `lint/typecheck/test:unit` 校验记录：`docs/runbooks/troubleshooting/moryflow-pc-auth-refresh-connection-closed.md`（2026-02-25）
- 全量 Code Review 索引回写：Anyhunt/Moryflow Auth/Webhook 路由口径统一为 `/api/v1/*`，移除 `VERSION_NEUTRAL` 旧描述：`docs/code-review/index.md`（2026-02-25）
- Moryflow PC Auth 路径修复：确认 Moryflow/Anyhunt 均统一到 `/api/v1`（含 auth 与 webhook），并将 PC/Mobile 登录/验证/刷新/登出请求统一改为显式 `/api/v1/auth/*`；相关回归测试通过：`docs/runbooks/troubleshooting/moryflow-pc-auth-refresh-connection-closed.md`（2026-02-25）
- Auth 与全量请求统一改造计划（Zustand + Methods + Functional API Client，completed）：`docs/architecture/auth/auth-zustand-method-refactor-plan.md`（2026-02-24：Step 1~13 全部完成，客户端 + 服务端出站 HTTP + WebSocket 全链路统一，旧客户端范式清理完成，受影响包完成回归验证）
- 统一 Token Auth V2 改造方案（跨 Anyhunt + Moryflow，active）：`docs/architecture/auth/unified-token-auth-v2-plan.md`（2026-02-24：零兼容；登录直接返回 access+refresh；refresh 轮换；按步骤执行 + 强制进度回写）
- Moryflow PC 登录/注册触发 refresh 连接关闭（`ERR_CONNECTION_CLOSED`）排障 Runbook：`docs/runbooks/troubleshooting/moryflow-pc-auth-refresh-connection-closed.md`（2026-02-24：active，含根因、分层修复与验收标准）
- Moryflow PC Auth 排障进度更新：确认“最新包仍复现”，补充客户端修复进度（LoginPanel/OTPForm 移除内层 form、OTP `onSuccess` await、Auth fail-fast、Token-first 登录/验证、未登录不走全局 skeleton、登录仅按钮级 loading、Auth 错误解析增强）并回写 `moryflow-pc`/`packages/api` 目标单测结果：`docs/runbooks/troubleshooting/moryflow-pc-auth-refresh-connection-closed.md`（2026-02-24）
- Anyhunt 统一日志系统方案（用户行为 + 错误排查 + IP 监控，30 天保留）：`docs/architecture/anyhunt-request-log-module-plan.md`（2026-02-24：implemented）
- OpenAI Agents JS 升级评估与重构建议（`0.4.3 -> 0.5.1`）：`docs/research/openai-agents-js-upgrade-impact-2026-02.md`（2026-02-24：实施进度已回写至 P0-24；新增 Gemini function schema 兼容层、PC ABI 双态修复；`pnpm lint && pnpm typecheck && pnpm test:unit` 全通过）
- Agent Browser 合规自动化与检测风险治理方案（implemented；2026-02-25 已修订"禁止伪装"约束）：已完成 Step 0~7（策略匹配、速率/并发预算、动作节奏、导航重试分类、风险遥测、Console Detection Risk 面板）（2026-02-24：implemented）
- Agent Skills（面向 C 端的“技能库”）接入方案：增量方案落地（固定推荐 3 项、预安装 2 项、`New skill` 复用 `Try Skill Creator`、`Try` 立即新建会话并生效），并回写 P0-12~P0-15 执行计划为完成状态（2026-02-11：implemented）
- Agent Skills（面向 C 端的“技能库”）接入方案：本期方案 1 落地（发送成功后清空 selected skill、用户消息渲染 skill tag），并在执行计划新增 P0-11 进度（2026-02-11：implemented）
- Agent Skills（面向 C 端的“技能库”）接入方案：PC 端 P0 落地完成（Sidebar Skills 入口、输入框 `+` 与空输入 `/` 双入口、selected skill chip、`available_skills` + `skill` tool），并在文档内同步执行步骤进度（2026-02-11：implemented）
- Agent Skills（面向 C 端的“技能库”）接入方案：固定兼容目录自动导入（`~/.agents/skills`、`~/.claude/skills`、`~/.codex/skills`、`~/.clawdbot/skills`）并支持 `Refresh` 重扫；`selectedSkill` 不可用改为提示后软降级继续对话；补充“执行计划 + 行为准则 + 强制进度同步”段落（2026-02-11：proposal update）
- Agent Skills（面向 C 端的“技能库”）接入方案：兼容扫描改为“按 skill 目录整体自动导入”（保留 scripts/templates/references），非仅导入单文件（2026-02-11：proposal update）
- Agent Skills（面向 C 端的“技能库”）接入方案：`skill` 改为白名单直通（不走权限审批/审计链路）（2026-02-11：proposal update）
- Agent Skills（面向 C 端的“技能库”）接入方案：去掉过度来源状态（移除 `SkillInstallState.source`）并收敛兼容来源描述（2026-02-11：proposal update）
- Agent Skills（面向 C 端的“技能库”）接入方案：兼容扫描改为默认自动导入（不做引导/提醒）（2026-02-11：proposal update）
- Agent Skills（面向 C 端的“技能库”）接入方案：补充输入框 tag 能力边界（当前仅支持外层 chip）、统一元信息最小注入（不含路径/状态）与 skill tool 单一数据源返回（2026-02-11：proposal update）
- Agent Skills（面向 C 端的“技能库”）接入方案：按已确认决策重写（默认全启用/可禁用不删除/`+` 与空输入 `/` 双入口 selectedSkill/OpenCode 对齐）（2026-02-11：proposal update）
- Moryflow PC 左侧 Sidebar 导航方案（Implicit Agent + Modules）：`docs/products/moryflow/features/app-modes/agent-sites-nav-hierarchy.md`（2026-02-10：implemented）
- Streamdown 使用指南（Markdown 渲染 + 流式 Token 动画）：`docs/guides/frontend/streamdown.md`（2026-02-10：active）
- Moryflow PC 消息列表交互复用改造方案：Following 模式定稿（`docs/architecture/ui-message-list-turn-anchor-adoption.md`，2026-02-08）
- Moryflow PC App Modes 方案（Legacy: Chat / Workspace / Sites；superseded）：`docs/products/moryflow/features/app-modes/chat-and-workspace-modes.md`（2026-02-10：superseded）
- 调研（已废弃方案，不再采用）：Moryflow PC TurnAnchor 滚动问题跟踪与记录（`docs/research/moryflow-pc-turn-anchor-scroll-tracking.md`，最后更新：2026-02-05）
- Anyhunt WWW 移动端底部导航方案（移动端优先 + 3 Tab（Inbox 优先） + 移动端不展示 Welcome + Notion 风格）：`docs/products/anyhunt-dev/anyhunt-www-mobile-bottom-nav.md`（2026-01-28：implemented）
- Anyhunt app/public/apikey 通道路由规范与迁移清单（含模块进度）：`docs/architecture/anyhunt-api-channel-routing.md`（2026-02-02：implemented）
- Moryflow PC 悬浮任务面板改造方案：补充悬停箭头/行态/详情展开示意（`docs/products/moryflow/features/chat-pane/task-hover-panel-redesign.md`，2026-02-02：proposal update）
- Moryflow PC 输入框改造方案（+ 菜单 / @ 引用 / 主按钮统一）：`docs/products/moryflow/features/chat-input/pc-prompt-input-plus-menu.md`（2026-01-28：proposal update，二级面板对齐到对应项）
- 图标库回退方案（Hugeicons → Lucide）：`docs/guides/frontend/icon-library-migration-lucide.md`（2026-01-27：implemented）
- Moryflow PC 输入框重构方案（执行级 + Notion 交互规范）：`docs/products/moryflow/features/chat-input/pc-prompt-input-refactor.md`（2026-01-27：proposal update）
- ADR-0002：补充外部化/Hook 示例（JSONC/Agent/Tool）（2026-01-30）
- ADR-0002：P2-7/P2-8 外部化与 Hook 落地完成（2026-01-29）
- ADR-0002：P1-5 模式切换落地完成（PC + Mobile）（2026-01-28）
- ADR-0002：示例文案统一为“待办”表述（2026-01-27）
- ADR-0002：P1-4 Doom Loop 落地完成（PC + Mobile）（2026-01-27）
- ADR-0002：补充 compaction 摘要输入裁剪规则（2026-01-27）
- ADR-0002：P1-3 会话压缩落地完成（PC + Mobile）（2026-01-26）
- ADR-0002：补充 Compaction“裁剪旧工具输出”示例（2026-01-26）
- ADR-0002：P0-2 权限系统落地完成（审批卡/JSONC/审计）（2026-01-26）
- ADR-0002：确认 P0-2 权限落地细节（审批卡位置、规则直接写 JSONC、Mobile 审计路径）（2026-01-26）
- Auth API Key 文档：更新明文存储与前端脱敏展示约束（2026-01-27）
- Moryflow Agent Tasks 系统方案（IPC + PC/Mobile UI + 执行清单完成 + 单元测试覆盖 + 子代理同步测试）：`docs/architecture/agent-tasks-system.md`（2026-01-25：completed）
- Anyhunt LLM Provider 对齐进度（AI SDK / Anthropic / Google）：`docs/architecture/anyhunt-llm-provider-alignment.md`（2026-01-27：done）
- Anyhunt Console 公共 API 化与 API Key 明文存储方案：改为公网 API + 明文 key 返回，前端脱敏（2026-02-01：active）
- Moryflow Agent Tasks 系统方案：修正 Mobile SQLite 打开方式（2026-01-25）
- API Client 统一封装方案（Anyhunt + Moryflow）：`docs/architecture/api-client-unification.md`（2026-01-26：draft）
- API Client 方案补充 React Query（Web/PC/移动端）与复用策略：`docs/architecture/api-client-unification.md`（2026-01-26）
- API Client 方案统一响应为 raw JSON + RFC7807（含一次性执行计划）：`docs/architecture/api-client-unification.md`（2026-01-26）
- API Client 方案删除 envelope 过渡适配，明确不做历史兼容：`docs/architecture/api-client-unification.md`（2026-01-26）
- API Client 方案清理 envelope 相关内容：`docs/architecture/api-client-unification.md`（2026-01-26）
- API Client 方案补充 requestId 约定与校验错误示例：`docs/architecture/api-client-unification.md`（2026-01-26）
- API Client 方案补充 errors 数组原因与前端展示建议：`docs/architecture/api-client-unification.md`（2026-01-26）
- Moryflow Agent Tasks 系统方案（IPC + PC/Mobile UI + 执行清单完成 + 单元测试覆盖 + 子代理同步测试）：`docs/architecture/agent-tasks-system.md`（2026-01-25：completed）
- Moryflow Agent Tasks 系统方案：修正 Mobile SQLite 打开方式（2026-01-25）
- Auth access token 本地存储方案（Zustand + Persist）：`docs/architecture/auth/access-token-storage-plan.md`（2026-01-25：draft）
- Auth access token 设备端方案补充（PC/移动端安全存储 + Device refresh）：`docs/architecture/auth/access-token-storage-plan.md`（2026-01-25）
- Moryflow PC/Mobile Access Token 持久化升级方案：`docs/architecture/auth/moryflow-pc-mobile-access-token-upgrade.md`（2026-01-25：draft）
- Moryflow PC/Mobile Access Token 升级方案明确决策与执行清单：`docs/architecture/auth/moryflow-pc-mobile-access-token-upgrade.md`（2026-01-25）
- Moryflow Cloud Sync Code Review：`docs/code-review/moryflow-cloud-sync.md`（2026-01-25：review）
- Moryflow 云同步文档收敛为单一方案（统一技术方案/绑定/实施现状）：`docs/products/moryflow/features/cloud-sync/unified-implementation.md`（2026-01-25）
- ADR-0002：P0-1 工具输出截断落地进度更新（2026-01-25）
- ADR-0002：系统提示词参数改为高级可选覆盖（默认使用模型默认值）（2026-01-26）
- ADR-0002：补充系统提示词/参数自定义（默认/自定义、参数范围、禁用时间占位符）（2026-01-26）
- ADR-0002：合并 OpenCode 对标与落地清单，删除独立对标文档（2026-01-26）
- ADR-0002：补充范围与实施原则，明确聊天消息内打开文件（2026-01-24）
- ADR-0002：补充 read 域覆盖文件工具 + 完整输出系统打开 + 复用 confirmation 组件（2026-01-24）
- ADR-0002：补充 Doom Loop `always` 仅会话内有效（2026-01-24）
- Agent Browser 文档收敛（架构 + Agent 交互）：`docs/products/anyhunt-dev/features/agent-browser/architecture.md`（2026-01-25，Agent 交互按最新策略重写）
- PR-60 Agent Browser 改动 Code Review：`docs/code-review/anyhunt-server-agent-browser-pr60.md`（2026-01-25：修复完成）
- Anyhunt Server Agent/LLM/Embedding Code Review：`docs/code-review/anyhunt-server-agent-llm.md`（2026-01-26：修复完成；EmbeddingService 保留确认）
- Anyhunt Server Browser Code Review：`docs/code-review/anyhunt-server-browser.md`（2026-01-26：修复完成）
- Anyhunt Server Prisma/迁移/多数据库边界 Code Review：`docs/code-review/anyhunt-server-prisma.md`（2026-01-26：review 完成）
- Anyhunt Server Scraper/Crawler/Extract/Map Code Review：`docs/code-review/anyhunt-server-fetchx-core.md`（2026-01-26：修复完成）
- Anyhunt Server SSRF & Network Isolation Code Review：`docs/code-review/anyhunt-server-ssrf-sandbox.md`（2026-01-26：修复完成）
- 全量 Code Review 计划：packages/agents\* 范围调整（迁移至 `@openai/agents-core`）`docs/code-review/index.md`（2026-01-25）
- 全量 Code Review 计划：进度同步区记录 packages-types-api-config（2026-01-26）
- packages/types + packages/api + packages/config Code Review：`docs/code-review/packages-types-api-config.md`（2026-01-26：修复完成）
- Moryflow PC Code Review：修复 preload 在 sandbox 下的 ESM 兼容问题（2026-01-26）
- Moryflow PC Code Review：补齐 React 单测稳定性（i18n mock + React 版本对齐）（2026-01-26）
- Moryflow PC Code Review：修复完成（外链/导航安全、sandbox、英文文案、Lucide、hooks 单测、E2E 基线）（2026-01-25）
- ADR：Agent Runtime 控制面（Compaction/Permission/Truncation）：`docs/architecture/adr/adr-0002-agent-runtime-control-plane.md`（2026-01-24）
- ADR-0002：补充截断展示入口要求（2026-01-24）
- ADR-0002：补充 Agent/全权限模式切换与审批最小化（2026-01-24）
- ADR-0002：配置层与规则持久化简化为用户级（2026-01-24）
- ADR-0002：补充全权限静默记录（2026-01-24）
- ADR-0002：补充审计字段与落地位置（2026-01-24）
- ADR-0002：补充审计日志格式（2026-01-24）
- ADR-0002：修正策略基线文本与 Doom Loop 列表格式（2026-01-24）
- ADR-0002：补充配置格式、规则匹配与审计落地规范（2026-01-24）
- Anyhunt Server Memox Core：对标 Mem0 改造计划更新（实施进度同步 + Filters DSL + R2 导出 + Token 认证一致）（2026-01-24）
- Auth 域名与路由：Memox API 路径对齐（2026-01-24）
- Anyhunt Server Memox Core Code Review：`docs/code-review/anyhunt-server-memox-core.md`（2026-01-24：review 完成）
- Anyhunt Server Queue/异步一致性 Code Review：`docs/code-review/anyhunt-server-queue.md`（2026-01-24：修复完成）
- tooling/\* Code Review：`docs/code-review/tooling-config.md`（2026-01-24：修复完成）
- packages/agents\* Code Review：`docs/code-review/packages-agents.md`（2026-01-24：修复完成）
- OpenAI Agents SDK RN 兼容性调研（仅 Core 兼容）：`docs/research/openai-agents-react-native-compatibility.md`（2026-01-24：补充 moryflow/mobile 配置）
- AI SDK 版本统一调研（现状 + 最新版本 + 兼容性）：`docs/research/ai-sdk-version-audit.md`（2026-01-24：draft）
- 全量 Code Review 计划：进度同步区记录 packages-embed-i18n（2026-01-24）
- packages/embed & packages/i18n Code Review：`docs/code-review/packages-embed-i18n.md`（2026-01-24：修复完成）
- packages/ui Code Review：`docs/code-review/packages-ui.md`（2026-01-24：修复完成）
- Moryflow Admin/WWW/Site Template Code Review：`docs/code-review/moryflow-web-surface.md`（2026-01-24：修复完成）
- Moryflow PC Code Review：`docs/code-review/moryflow-pc.md`（2026-01-24：review + 方案）
- Anyhunt Server API Key & Quota：修复完成（有效订阅 tier、扣减边界、退款/购买幂等、DTO 对齐）（2026-01-25）
- Anyhunt Server API Key & Quota Code Review：标记修复完成（2026-01-25）
- Anyhunt Server API Key & Quota Code Review：`docs/code-review/anyhunt-server-api-key-quota.md`（2026-01-25：review）
- Anyhunt Server Billing & Payment Code Review：`docs/code-review/anyhunt-server-billing-payment.md`（2026-01-25：修复完成）
- Auth 统一改造落地状态：`docs/architecture/auth/unified-auth-rebuild-file-map.md`（2026-01-25）
- Auth 统一改造执行记录：`docs/architecture/auth/unified-auth-rebuild-plan.md`（2026-01-25）
- Auth 统一改造文件清单：`docs/architecture/auth/unified-auth-rebuild-file-map.md`（2026-01-25）
- Auth 统一改造文件清单：问题全部修复/确认并标记完成（2026-01-25）
- Auth 统一改造 Review 问题与方案清单：`docs/architecture/auth/unified-auth-rebuild-file-map.md`（2026-01-25）
- Auth 统一改造调研结论：`docs/architecture/auth/unified-auth-rebuild-file-map.md`（2026-01-25）
- Auth 统一改造决策补充：`docs/architecture/auth/unified-auth-rebuild-file-map.md`（2026-01-25）
- Auth 统一改造：补充 Mobile refresh 网络异常修复与 `X-App-Platform` 传递范围结论：`docs/architecture/auth/unified-auth-rebuild-file-map.md`（2026-01-25）
- Auth 统一改造：补充 Expo 插件类型推断修复记录：`docs/architecture/auth/unified-auth-rebuild-file-map.md`（2026-01-25）
- Auth 统一改造：调整 anyhunt.app 为 C 端主战场并完成 www 对齐：`docs/architecture/auth/unified-auth-rebuild-plan.md`（2026-01-25）
- Auth 统一改造：补充 `test:e2e` 与 `pnpm test` 验证记录：`docs/architecture/auth/unified-auth-rebuild-plan.md`（2026-01-25）
- Auth JWKS 测试：`docs/architecture/auth/unified-auth-rebuild-plan.md`（2026-01-25）
- Auth 数据库重置记录：`docs/architecture/auth/unified-auth-rebuild-plan.md`（2026-01-25）
- Auth 环境变量核对：`docs/architecture/auth/unified-auth-rebuild-plan.md`（2026-01-25）
- Auth 环境变量域名对齐结论：`docs/architecture/auth/unified-auth-rebuild-plan.md`（2026-01-25）
- 测试指南：补充 Console E2E 命令（2026-01-25）
- Auth 交互统一与数据库重置改造方案：标记完成并补充 JWKS 验签落地（2026-01-25）
- Anyhunt Server Auth & Session Code Review：`docs/code-review/anyhunt-server-auth.md`（2026-01-25：修复完成）
- Moryflow Publish/AI Proxy 修复完成（欠费门禁/断连取消/Publish 容错/SSE backpressure/参数透传）：`docs/code-review/moryflow-publish-vectorize-ai-proxy.md`（2026-01-23）
- Moryflow 发布站点约定：补充 `_meta.json` 解析/结构异常按 OFFLINE 处理：`docs/architecture/domains-and-deployment.md`（2026-01-23）
- Moryflow Server Auth/Quota/Payment Code Review：`docs/code-review/moryflow-server-auth-quota-payment.md`（2026-01-23：fix）
- Moryflow Vectorize 暂不处理（将由 Anyhunt Memox 替换）：`docs/code-review/index.md`（2026-01-23：status）
- Moryflow：更新 iOS（Expo+EAS）与 macOS（Electron/electron-builder）发布/签名 Runbooks：`docs/products/moryflow/runbooks/release/`（2026-01-22）
- Moryflow PC 自动更新（R2-only）Runbook：`docs/products/moryflow/runbooks/release/electron-auto-update-r2.md`（2026-01-22）
- 工程基线：删除 agents metadata 的无用字段（仅保留 name/version），避免 install 后 git tree 变脏：`docs/code-review/root-tooling.md`（2026-01-22）
- 工程基线 / Root Tooling 修复完成：`docs/code-review/root-tooling.md`（2026-01-23：fix）
- 工程基线 / Root Tooling Code Review：`docs/code-review/root-tooling.md`（2026-01-23：review）
- 清理历史归档文档并移除目录：`docs/index.md`（2026-01-23）
- OpenAI Agents 迁移与 RN shim 方案：`docs/research/openai-agents-react-native-compatibility.md`（2026-01-26）
- AI SDK 版本统一记录：`docs/research/ai-sdk-version-audit.md`（2026-01-26）
- 移除本地 Agents SDK 参考文档，改用官方文档（2026-01-26）
- 修正 Moryflow 同步方案的共享包引用：`docs/products/moryflow/research/sync-refactor-proposal.md`（2026-01-23）
- 清理缺失文档引用（message-list-ui-code-review）：`docs/index.md`（2026-01-22）
- 详细设计/方案文档修复：补齐 frontmatter、清理缺失索引、同步域名规划（2026-01-22）
- 详细设计/方案文档 Code Review：`docs/code-review/design-docs.md`（2026-01-25：review）
- deploy/infra 测试环境修复（healthcheck/健康轮询/容器名冲突）：`docs/code-review/deploy-infra.md`（2026-01-22：done）
- deploy/infra 测试环境 Code Review：`docs/code-review/deploy-infra.md`（2026-01-22：review）
- 清理 auth-client/旧拆包引用：`docs/runbooks/deploy/anyhunt-dokploy.md`、`docs/products/anyhunt-dev/migrations/fetchx-integration.md`（2026-01-23：runbook）
- 清理未使用的认证相关内容（备份哈希：`835853de3e01ba610fdf4d5c39644a4974395cb7`）
- 全量 Code Review 计划：按阶段重排模块清单并纳入详细设计审查：`docs/code-review/index.md`（2026-01-23：active）
- 全量 Code Review 计划：补充阶段顺序与执行步骤：`docs/code-review/index.md`（2026-01-23：active）
- 全量 Code Review 计划：调整执行顺序、补充核心前端清单与进度同步区：`docs/code-review/index.md`（2026-01-23：active）
- 全量 Code Review 计划：补充统一审查标准与前端性能规范：`docs/code-review/index.md`（2026-01-23：active）
- 全量 Code Review（模块拆分 + 优先级 + 进度索引）：`docs/code-review/index.md`（2026-01-21：active）
- 工程基线：同步 `pnpm-lock.yaml` 并验证 `pnpm install --frozen-lockfile`、`pnpm lint`、`pnpm typecheck`、`pnpm test:unit`（2026-01-21：completed）
- 消息列表与输入框 UI 组件抽离方案（Moryflow/Anyhunt 统一）：`docs/architecture/ui-message-list-unification.md`（2026-01-21：completed，MessageList 已补齐）
- Agent Browser 交互规范（Agent Tools + 交互流程）：`docs/products/anyhunt-dev/features/agent-browser/agent-interaction.md`（2026-01-25）
- Anyhunt Server：Admin 动态配置 LLM Providers/Models（参考 Moryflow）：`docs/architecture/admin-llm-provider-config.md`（2026-01-20：draft）
- Anyhunt Server：LLM Admin 配置改造进度（Agent + Extract）：`docs/architecture/llm-admin-provider-rollout.md`（2026-01-20：draft）
- apps/anyhunt：大模型调用逻辑梳理（Agent / LLM / Embedding）：`docs/research/apps-anyhunt-llm-call-map.md`（2026-01-26：draft）
- Reader 顶部导航 + Explore Topics 专用页（已落地）：`docs/products/anyhunt-dev/features/explore-topics-revamp.md`（`/`→`/welcome`；`/explore` 两栏工作台；`/topic/*`、`/inbox/*` 状态驱动 URL；Welcome 支持后台配置）
- Admin：手动充值 Credits（已落地）：`docs/products/anyhunt-dev/features/admin-credits-and-entitlements.md`（可审计的 credits 充值；落 `QuotaTransaction(ADMIN_GRANT)` + `AdminAuditLog`）
- 免费用户每日赠送 100 Credits（方案）：`docs/products/anyhunt-dev/features/daily-free-credits.md`（对齐 Moryflow：daily bucket 用 Redis+TTL，消费优先级 daily→monthly→purchased）
- www Reader/Developer 双模块布局方案：`docs/products/anyhunt-dev/features/www-reader-and-developer-split.md`（Reader 内操作不跳页：登录/设置弹窗；Developer 端保持 Header/Footer）
- www Reader SRP 与 Props 收敛重构计划：`docs/products/anyhunt-dev/features/www-reader-srp-and-props-refactor.md`（分支视图用 ViewModel 收敛 Props，按域拆分 SRP 组件，保持现有懒加载与错误边界策略）
- Aiget → Anyhunt 全量品牌迁移（无历史兼容）：`docs/migrations/aiget-to-anyhunt.md`（域名/包名/环境变量/API Key 前缀/Prisma 迁移重置）
- Anyhunt Dokploy 多项目部署清单：`docs/runbooks/deploy/anyhunt-dokploy.md`（补充 `ADMIN_EMAILS` 管理员白名单与旧路径报错排查）
- Console Agent Browser Playground：统一文档入口（`docs/products/anyhunt-dev/features/agent-browser/`）
- Agent：API Key 级别 LLM 策略 + 输出 Schema 入参收紧方案：`docs/research/agent-llm-policy-and-output-schema.md`（2026-01-20：draft）
- Console Fetchx 路由调整：`docs/products/anyhunt-dev/features/unified-auth-and-digest-architecture.md`（2026-01-20：更新为 `/fetchx/*`）
- Skill：`code-simplifier` 文档中文化：`docs/skill/code-simplifier.md`（2026-01-19）
