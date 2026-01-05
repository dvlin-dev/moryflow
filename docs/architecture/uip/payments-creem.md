---
title: UIP - 支付（Creem）与 Webhook
date: 2026-01-05
scope: payments
status: active
---

<!--
[INPUT]: 统一结算 + 品牌化入口；Webhook 需要安全与幂等
[OUTPUT]: Creem checkout/webhook 的固定路由与入账规则
[POS]: UIP 支付层落地规范
-->

# 支付（Creem）与 Webhook

## Checkout（固定）

- `{product}.aiget.dev` 定价页调用：`POST /v1/payments/checkout`
- UIP 创建 Creem checkout，并在 metadata 记录：
  - `userId`
  - `product`
  - `planId`

## Webhook（固定）

- Creem 回调：`POST https://{product}.aiget.dev/v1/webhooks/payments`
- 产品网关转发到 UIP（网关到 UIP 走 Tailscale）

UIP webhook 处理必须：

- 幂等（按 webhook event id / payment id 去重）
- 事务一致性：
  - 更新订阅状态
  - 发放订阅/购买积分
  - 写入钱包账本

