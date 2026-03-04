# Shared IPC Types（Moryflow PC）

> 注意：本目录（含子文件）结构或 IPC 契约变更时，必须同步更新此文档

## 定位

Moryflow PC 主进程（main）与渲染进程（renderer）之间的 **IPC 类型单一事实来源**（SSOT）。

这里仅定义：`DesktopApi` 类型、各 domain 的 payload/event 类型（可序列化数据结构）。

## 职责

- 定义所有 IPC 通道的类型契约（request/response/event）
- 按 domain 拆分类型（vault/chat/workspace/site-publish/tasks/sandbox 等）
- 约束 payload **必须可序列化**（plain JSON），避免把运行时对象带入 IPC

## 约束（强制）

- **只放类型与纯数据结构**：禁止引入 Node/Electron/DOM 运行时代码
- 新增/修改 IPC 必须三处同步（无历史兼容，旧通道直接删除）：
  - Main：`apps/moryflow/pc/src/main/app/ipc-handlers.ts`
  - Preload：`apps/moryflow/pc/src/preload/index.ts`
  - Types：本目录 `desktop-api.ts` + 对应 domain 类型文件
- 通道命名约定：`<domain>:<verb>`，例如 `workspace:getLastSidebarMode`

## 关键文件

- `desktop-api.ts`
  - `DesktopApi` 根类型（preload 暴露给 renderer 的接口面）
  - 近期：`workspace.getLastSidebarMode/setLastSidebarMode` 作为 SidebarMode（home/chat）唯一持久化契约
- `skills.ts`
  - Skills IPC 类型（`SkillSummary` / `SkillDetail` / `RecommendedSkill`）
  - 与 `agent:skills:*` 通道配套，供 Skills 页面与输入框复用
- `search.ts`
  - 全局搜索 IPC 类型（`search:query/rebuild/getStatus`；Files + Threads 结果结构）
- `vault.ts` / `chat.ts` / `site-publish.ts` / `tasks.ts` / `sandbox.ts`
  - 各 domain 的 payload、event、实体类型
- `index.ts`
  - 聚合导出（供 main/renderer 侧引用）

## 近期变更

- 2026-03-04：Telegram IPC 契约扩展 draft streaming 字段：`TelegramAccountSnapshot` 与 `TelegramSettingsUpdateInput` 新增 `enableDraftStreaming`、`draftFlushIntervalMs`，用于主进程编排层开启/配置 `sendMessageDraft` 流式草稿发送策略。
- 2026-03-03：Telegram IPC 二轮收口：`TelegramAccountSnapshot/TelegramSettingsUpdateInput` 新增 `webhookListenHost/webhookListenPort` 字段，用于将公网 webhook URL 与本地 ingress 监听参数解耦；渲染层高级配置可直接透传主进程 runtime 编排层。
- 2026-03-03：新增 Telegram IPC 契约：`telegram.ts`（settings/status/pairing 类型）与 `DesktopApi.telegram`（`isSecureStorageAvailable/getSettings/updateSettings/getStatus/listPairingRequests/approvePairingRequest/denyPairingRequest/onStatusChange`），并由 preload/main 双向对齐实现。
- 2026-03-03：membership IPC 契约新增 `openExternal(url)` 与 `onOAuthCallback(handler)`，用于 Google OAuth 系统浏览器授权与 deep link 回流（`code + nonce`）桥接。
- 2026-03-03：chat IPC `approveTool` 契约改为幂等结构化结果：`ChatApproveToolResult = approved | already_processed(missing/expired/processing)`，替代旧 `{ ok: true }`，用于渲染层稳定收敛授权结果态。
- 2026-03-03：chat IPC 新增 `chat:approvals:consume-upgrade-prompt` 契约（`ChatApprovalPromptConsumeResult`），用于首次升级提示“展示前消费”。
- 2026-03-03：chat IPC 新增 `chat:approvals:get-context` 契约（`ChatApprovalContext`），用于首次权限审批时判定是否展示 Full access 升级提示；`DesktopApi.chat.getApprovalContext` 与 preload bridge 已同步。
- 2026-03-02：MCP stdio IPC 契约切换为受管 npm 包模型：`command/cwd` 删除，新增 `packageName/binName`；`agent:testMcpServer` 的 stdio 输入同步改为 package 维度（name/packageName/binName/args/env）。
- 2026-03-03：MCP stdio IPC 契约补齐固定字段 `autoUpdate: 'startup-latest'`，受管 MCP 一律按“启动时后台更新 latest”策略执行。
- 2026-03-02：`agent-settings` 契约收敛为个性化模型：新增 `personalization.customInstructions`，删除 `systemPrompt` 与 `modelParams` 字段（不做历史兼容）。
- 2026-03-02：权限 IPC 契约重写：`chat` 会话模式改为 `ask | full_access`；`sandbox` 删除 `mode/setMode`，仅保留 `authorizedPaths` 并新增 `addAuthorizedPath`；`agent-settings` 删除 MCP `autoApprove` 字段。
- 2026-02-28：新增 `search.ts` 与 `DesktopApi.search` 契约（`query/rebuild/getStatus`），用于全局文件/线程全文检索。
- 2026-02-28：`chat.ChatSessionSummary` 增加 `vaultPath` 字段，作为线程“当前 active vault 搜索过滤”的事实源。
- 2026-02-28：Workspace IPC 导航语义收敛：删除 `lastAgentSub` 相关旧契约，统一为 `lastSidebarMode`（`workspace:get/setLastSidebarMode`）。
- 2026-02-27：chat/model 相关 IPC 契约对齐 model-bank thinking 合同：等级来源统一为模型 `thinking_profile`，并确保无合同时 `off-only`。
- 新增 Skills IPC 契约：`agent.listSkills/refreshSkills/getSkillDetail/setSkillEnabled/uninstallSkill/installSkill/listRecommendedSkills/openSkillDirectory`
- `chat.AgentChatRequestOptions` 新增 `selectedSkill`（结构化 skill 选择），避免纯文本协议

## 常见修改场景

| 场景                 | 改动点                                                          | 注意事项                                            |
| -------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| 新增 IPC 通道        | `desktop-api.ts` + domain types + main handler + preload bridge | 必须保持 payload 可序列化；旧通道无引用后删除       |
| 修改现有通道 payload | 同上                                                            | 不做兼容层；同步更新相关单测与文档                  |
| 新增事件广播         | domain types + main `webContents.send` + preload 订阅 API       | 事件名建议 `domain:eventName`，payload 仍需可序列化 |
