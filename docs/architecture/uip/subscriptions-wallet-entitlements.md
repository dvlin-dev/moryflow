---
title: UIP - 订阅 / 钱包 / 权益
date: 2026-01-05
scope: billing
status: active
---

<!--
[INPUT]: 统一订阅等级 + 跨产品共享钱包 + 权益检查
[OUTPUT]: 订阅等级、钱包账本、幂等与权益模型
[POS]: UIP billing 层的核心约束
-->

# 订阅 / 钱包 / 权益

## 订阅等级（固定）

- `FREE`
- `STARTER`
- `PRO`
- `MAX`

不提供企业版真实订阅：如需展示，仅做前端卡片与私聊入口，不落库为订阅类型。

## 钱包（固定：账本模型）

- 余额来源分层：
  - 免费积分
  - 订阅积分
  - 购买积分
- 所有变更必须写入 `wallet_transactions`（可审计）

### 扣减（固定）

- 产品服务在执行计费动作前调用：`POST /api/v1/wallet/deduct`
- 必须携带：
  - `userId`
  - `amount`
  - `idempotencyKey`（强唯一）
  - `referenceId`（业务关联：job/order 等）
  - `product`、`operation`

## 权益（固定）

- 产品服务调用：`POST /api/v1/entitlements/check`
- UIP 返回：是否允许 + 限制参数（并发/容量/速率等）
