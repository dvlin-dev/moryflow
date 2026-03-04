# channels-telegram

> 注意：本目录（含子目录）职责或契约变更时，必须同步更新本文件

## 定位

`@moryflow/channels-telegram` 是 Telegram Bot API 适配层，负责把 Telegram update/send 行为映射到 channels-core 协议。

## 职责

- 实现 Telegram runtime（polling/webhook）
- 解析 update 并生成标准化 inbound dispatch
- 执行 outbound 发送、草稿更新（preview update/commit/clear）与重试
- 提供 Telegram 配置解析与校验
- 提供 Telegram 命令解析（`/start`、`/new`）

## 约束

- 渠道包只负责协议与 Telegram 适配，不负责创建业务会话
- 渠道运行时不得依赖应用层 chat session 存储
- 命令解析与会话编排分层：命令解析在本包，会话动作由调用方决定

## 近期变更

- 2026-03-04：新增 `parseTelegramCommand`，支持 `/start`、`/new`、`/cmd@bot` 解析，并在 runtime 契约中移除 `ports.sessions` 依赖，彻底与应用层会话绑定解耦。

## 验证

```bash
pnpm --filter @moryflow/channels-telegram test:unit
```
