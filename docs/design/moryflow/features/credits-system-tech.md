---
title: 积分系统（统一账本）
date: 2026-03-26
scope: moryflow, server, pc, admin
status: active
---

<!--
[INPUT]: 订阅、积分包、AI 结算、用户/后台积分明细
[OUTPUT]: Moryflow 积分账本、投影、查询面与 UI 入口的稳定事实
[POS]: Moryflow 积分系统唯一技术事实源

[PROTOCOL]: 仅在账本模型、投影职责、查询入口或关键结算语义失真时更新。
-->

# 积分系统

Moryflow 积分系统采用**单一统一账本**。

`CreditLedgerEntry` 是所有积分流转的唯一业务真相源。订阅积分、购买积分、兑换码、管理员发放、AI chat、AI image 都通过同一个账本入口写入。旧的余额表保留为 projection/read model，不再允许业务功能直接写入。

## 设计目标

1. 每一条积分变化都可审计、可查询、可追踪到具体业务事件。
2. `creditsDelta = 0` 是合法事实，不再作为异常抛错。
3. AI 结算失败不能打断已经生成的回答。
4. 用户端和 admin 端都读取同一套账本查询结果。

## 核心模型

### Canonical ledger

- `CreditLedgerEntry`
  - 一条业务事件一条账本记录
  - 记录事件类型、方向、状态、异常码、积分变化、token usage、价格快照、错误摘要和 UI summary
- `CreditLedgerAllocation`
  - 记录父账本事件如何影响 bucket
  - bucket 固定为 `DAILY | SUBSCRIPTION | PURCHASED | DEBT`

### Event types

- `AI_CHAT`
- `AI_IMAGE`
- `SUBSCRIPTION_GRANT`
- `PURCHASED_GRANT`
- `REDEMPTION_GRANT`
- `ADMIN_GRANT`

### Status

- `APPLIED`
- `SKIPPED`
- `FAILED`

### Anomaly codes

- `ZERO_USAGE`
- `USAGE_MISSING`
- `ZERO_PRICE_CONFIG`
- `ZERO_CREDITS_WITH_USAGE`
- `SETTLEMENT_FAILED`

## Projection 边界

以下表仍然存在，但只作为 read model：

- `SubscriptionCredits`
- `PurchasedCredits`
- `CreditDebt`
- `CreditUsageDaily`

业务代码禁止直接写这些表。所有写操作必须通过 `CreditLedgerService`。

## 消费优先级

AI debit 的 bucket 顺序固定为：

1. `DAILY`
2. `SUBSCRIPTION`
3. `PURCHASED`
4. `DEBT`

grant 事件在发放前先偿还现有 debt，再把剩余额度写入对应 bucket projection。

## 积分计算

Chat token 计费继续使用：

```ts
credits = ceil(costUsd * CREDITS_PER_DOLLAR * PROFIT_MULTIPLIER);
```

其中：

- `costUsd = input token cost + output token cost`
- 价格快照直接写入 ledger row

Image 计费按模型配置的 `imagePrice` 和 `imageCount` 计算，并写入同一账本体系。

## 0 积分语义

`creditsDelta = 0` 不再抛错，而是正常落账：

- `status=SKIPPED`
- `anomalyCode` 表达原因

典型场景：

- usage 为 0
- usage 存在但价格配置为 0
- usage 存在但换算后积分为 0

admin 可以直接筛出：

- `creditsDelta = 0`
- `status = SKIPPED | FAILED`
- `anomalyCode != null`
- `totalTokens > 0`

## 服务端职责

### Write path

- `apps/moryflow/server/src/credit-ledger/credit-ledger.service.ts`
  - 唯一积分写入口
  - 同时负责更新 projection

### Query path

- `apps/moryflow/server/src/credit-ledger/credit-ledger-query.service.ts`
  - 用户积分历史查询
  - admin 账本与异常筛选

### Read facade

- `apps/moryflow/server/src/credit/credit.service.ts`
  - 只读 projection
  - 用于余额展示和调用前余额预检

## AI 结算语义

Chat 和 image 都遵循同一原则：

1. 先把模型输出交付给用户。
2. usage 可用后再做 ledger settlement。
3. settlement 异常时写 `FAILED` ledger row。
4. 不允许因为积分结算失败而把对话流变成“整轮失败”。

流式对话的 final chunk 和 `[DONE]` 会在结算前发出；结算属于后处理。

## API 查询面

### User

- `GET /api/v1/user/credits/history`

返回当前用户的账本明细，用于桌面端账号页的积分历史面板。

### Admin

- `GET /api/v1/admin/credits/ledger`

支持按以下字段筛选：

- `userId`
- `email`
- `eventType`
- `status`
- `anomalyCode`
- `zeroDelta`
- `hasTokens`
- `startDate`
- `endDate`

## UI 入口

### PC

- 账号页积分卡片下方显示 `Credit History`
- 展示最近账本事件的 detail、date、credit delta，以及 model/token/status/anomaly 摘要

### Admin

- 独立 `Credit Ledger` 页面
- 用户详情页展示最近账本事件，并支持跳转到带 `userId` 过滤的完整账本页

## 非目标

当前实现不包含：

- 单独的 `AiInvocationLedger`
- 独立 balance snapshot 表
- pending / retry worker 结算状态机
- 历史用户逐条账本回填

这些能力不属于当前 Moryflow 积分系统的稳定边界。
