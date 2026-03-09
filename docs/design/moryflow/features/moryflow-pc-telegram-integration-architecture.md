---
title: Moryflow PC Telegram 接入架构
date: 2026-03-08
scope: apps/moryflow/pc, packages/channels-core, packages/channels-telegram
status: completed
---

<!--
[INPUT]: Telegram Bot API 接入需求、PC 主进程渠道装配、共享包抽离与当前运行事实
[OUTPUT]: Telegram 接入当前架构、配置边界、协议不变量与关键代码索引
[POS]: Moryflow PC Telegram 接入单一事实源

[PROTOCOL]: 仅在相关索引、跨文档事实引用或全局协作边界失真时，才同步更新对应文档。
-->

# Moryflow PC Telegram 接入架构

## 1. 目标与边界

1. 当前只支持 **Telegram Bot API**，不引入 MTProto 用户号接入。
2. 架构按“共享协议层 + Telegram 适配层 + PC 装配层”一次性收口，不保留旧语义兼容层。
3. 首版 UI 采用“单账号展示 + 多账号底层模型”策略；未来可扩展，但当前事实源仍以单账号主路径为主。
4. 默认运行模式是 polling；webhook 是显式 opt-in 的高级能力，不是默认链路。
5. 配置、会话、持久化、预览发送、Agent 参数与 UI 都必须围绕单一事实源收口，禁止再回到“Step 日志 + review 账本”模式维护。

## 2. 当前架构

### 2.1 共享包分层

1. `packages/channels-core`
   - 承载跨渠道统一语义：envelope、thread、策略、重试分类、持久化端口与 preview/final 投递协议。
2. `packages/channels-telegram`
   - 承载 Telegram Bot API 适配：runtime、polling/webhook 接入、预览发送、降级策略、命令注册与错误分类。

### 2.2 PC 主进程职责

1. `apps/moryflow/pc/src/main/channels/telegram/*` 只负责装配与本地事实源治理：
   - runtime 生命周期
   - 配置快照与 secret 读写
   - pairing 审批中心
   - 会话绑定与入站编排
   - 与 Chat 面板的正文事件同步
2. PC 主进程不再承担 Telegram 协议细节决策；传输层行为统一由 `channels-telegram` 管理。

## 3. 配置与持久化

### 3.1 配置事实源

1. 账号配置包含以下核心语义：
   - `enabled`
   - `botToken`（secret）
   - `mode`（默认 polling）
   - `proxyEnabled` / `proxyUrl`
   - DM / Group 访问策略
   - webhook / polling / retry / draft streaming 高级参数
2. 默认交互路径只暴露 `Connect / Proxy / Who can message` 三块；工程参数统一收口到 `Developer Settings`。

### 3.2 Secret 与本地存储

1. Bot Token 与 Webhook Secret 只通过 `keytar` 存储，不写入普通配置。
2. SQLite 持久化当前承载以下事实：
   - safe watermark
   - `peerKey/threadKey -> conversationId` 绑定
   - sent messages
   - pairing requests
   - allowlist / access 相关状态
3. 会话创建前必须校验 workspace 为绝对路径且可访问；不满足时直接 fail-fast。

## 4. 会话与路由语义

1. 私聊默认走 pairing 审批；群聊默认 `requireMention=true`。
2. `/start` 用于幂等建连，`/new` 强制创建新会话。
3. C+ 路由已经完成收口：
   - 私聊按 peer 维度路由
   - 群聊/topic 按 `peerKey/threadKey` 分层解析到 `conversationId`
4. Pairing、allowlist、DM/Group policy 都围绕同一套访问控制事实源运行，不再分散到 CLI 或临时命令。

## 5. 出站与流式预览协议

### 5.1 当前协议

1. 出站投递统一区分两类语义：
   - `preview`：`update / commit / clear`
   - `final`
2. private chat 优先使用 `sendMessageDraft`。
3. draft 不可用时，自动回退到 message preview（`sendMessage + editMessageText`），但不会误发额外 final 消息。
4. `preview` 不写 `sentMessages`；只有最终投递成功后才进入 sent message 事实源。
5. `commit` 在可编辑路径优先“就地 finalize”，避免重复消息。

### 5.2 当前实现约束

1. preview 与 final 已经在协议语义与实现路径上分离。
2. draft streaming 只对 private chat 启用；群聊/topic 维持更保守的最终投递语义。
3. 流式预览采用节流与单飞策略，避免逐 token 网络反压造成“一个字一个字慢输出”。

## 6. 入站执行与 PC 协同

1. TG 与 PC 已统一会话级 Agent 参数事实源：模型、thinking 与相关配置沿同一语义路径持久化。
2. Telegram 入站执行当前固定使用 `full_access`，避免本地审批中断对话链路。
3. TG -> Chat 面板正文同步已经统一走 `chat:message-event`，当前会话无需切换即可实时看到正文变化。
4. polling / webhook 失败路径统一先推进 safe watermark，再进入退避；不会因为单个坏 update 造成快速重试循环。
5. runtime 启动会 best-effort 注册 `/start` 与 `/new` command menu；注册失败只记录 warning，不阻断主链路。

## 7. UI 与运维侧当前事实

1. `Remote Agents` 页面当前承载 Telegram 远程入口配置，主路径仍按 C 端任务流组织：
   - Connect your bot
   - Network proxy
   - Who can message this bot?
2. `Access Requests` 独立呈现，`Developer Settings` 默认折叠。
3. 代理能力已经收口为：
   - 支持 `http / https / socks5`
   - 支持 `Test Proxy` 连通测试
   - 进入页面后可自动探测代理建议，但不会自动持久化
4. Proxy 建议只会在“无已存代理且表单未脏”时应用，保持自动增强但不越权。
5. webhook 相关能力、retry 参数、draft streaming 等工程选项统一归入高级配置，不再污染首次接入路径。

## 8. 当前已落地能力

1. 共享层稳定为 `channels-core + channels-telegram + PC 装配` 三层结构。
2. 默认 polling 可直接工作，webhook 作为显式高级能力保留。
3. Pairing、allowlist、group mention、workspace 绑定与会话路由都已并入同一控制面。
4. `sendMessageDraft` 流式草稿、message preview fallback、preview/final 分离协议已经落地。
5. TG -> Chat 面板实时正文事件已打通；TG 与 PC 共用同一会话级 Agent 参数语义。
6. C 端配置 UI 已完成收口，代理测试与自动建议能力可直接使用。

## 9. 当前验证基线

1. 共享协议与 Telegram 适配的单元测试由以下包持续覆盖：
   - `@moryflow/channels-core`
   - `@moryflow/channels-telegram`
2. PC 装配、入站编排、配置模型、Chat 面板同步与 Renderer 行为由 `@moryflow/pc` 定向测试覆盖。
3. 后续修改本链路时，至少需要执行受影响包的 `typecheck` 与 `test:unit`；若触及协议边界或跨包合同，按 L2 执行根级校验。
4. 本文只保留当前架构与验证基线；历史 review 轮次、Step 播报与文档同步记录不再作为事实源保留。

## 10. 关键代码索引

### 10.1 Shared

- `packages/channels-core/src/types.ts`
- `packages/channels-core/test/core.test.ts`
- `packages/channels-telegram/src/telegram-runtime.ts`
- `packages/channels-telegram/test/telegram.test.ts`

### 10.2 PC Main

- `apps/moryflow/pc/src/main/channels/telegram/runtime-orchestrator.ts`
- `apps/moryflow/pc/src/main/channels/telegram/inbound-reply-service.ts`
- `apps/moryflow/pc/src/main/channels/telegram/conversation-service.ts`
- `apps/moryflow/pc/src/main/channels/telegram/settings-store.ts`
- `apps/moryflow/pc/src/main/channels/telegram/settings-application-service.ts`
- `apps/moryflow/pc/src/main/channels/telegram/persistence-store.ts`
- `apps/moryflow/pc/src/main/channels/telegram/secret-store.ts`

### 10.3 PC Renderer / IPC

- `apps/moryflow/pc/src/shared/ipc/telegram.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/remote-agents/telegram-section.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/remote-agents/telegram-form-schema.ts`
- `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-stored-messages.ts`

## 11. 非范围

1. MTProto 用户号接入。
2. 独立外置 Telegram 网关进程。
3. 其它第三方渠道的 UI 与运维接入。
4. 再次引入旧 draft/final 二元语义、旧 review 时间线或分散配置事实源。
