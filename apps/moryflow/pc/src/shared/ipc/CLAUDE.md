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
- `vault.ts` / `chat.ts` / `site-publish.ts` / `tasks.ts` / `sandbox.ts`
  - 各 domain 的 payload、event、实体类型
- `index.ts`
  - 聚合导出（供 main/renderer 侧引用）

## 近期变更

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
