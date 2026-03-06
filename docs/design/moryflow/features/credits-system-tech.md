---
title: 积分系统（技术方案）
date: 2026-01-12
scope: moryflow, server, pc, mobile
status: draft
---

<!--
[INPUT]: 订阅/积分包；积分消耗计算；多端展示
[OUTPUT]: 积分体系与实现索引（Monorepo 路径）
[POS]: Moryflow 内部技术文档：积分/订阅

[PROTOCOL]: 本文件变更时同步更新 `docs/design/moryflow/features/index.md`（索引）。
-->

# 积分系统

> 相关代码：
>
> - `apps/moryflow/server/src/payment/` - 支付与积分服务
> - `apps/moryflow/server/src/config/pricing.config.ts` - 价格配置
> - `apps/moryflow/pc/src/renderer/components/SubscriptionDialog/` - 订阅弹窗
> - `apps/moryflow/mobile/components/settings/` - 移动端设置
>
> ⚠️ 上述代码变更时，必须检查并更新此文档

## 概述

Moryflow 积分系统采用简洁的积分定价，用户通过订阅或购买积分包获取积分，用于 AI 模型调用。

## 设计原则

1. **简洁易懂**：用户只需关注积分数量，无需了解内部换算
2. **订阅优先**：订阅用户享受更高性价比和优先服务
3. **灵活控制**：后台可配置利润倍率，控制运营成本

---

## 积分体系

### 积分消费优先级

```
1. 每日免费积分（当日有效，不累积）
2. 订阅积分（当月有效，不累积）
3. 购买积分（按购买时间顺序，先买先用）
```

### 积分消耗计算

```typescript
// 积分消耗 = API 成本 × 1000 × 利润倍率
const creditsUsed = Math.ceil(
  ((inputTokens / 1_000_000) * inputPricePerMillion +
    (outputTokens / 1_000_000) * outputPricePerMillion) *
    CREDITS_PER_DOLLAR *
    PROFIT_MULTIPLIER
);
```

---

## 订阅方案

### 订阅层级

| 套餐    | 月费   | 年费   | 积分/月 |
| ------- | ------ | ------ | ------- |
| Starter | $4.99  | $49.90 | 5,000   |
| Basic   | $9.90  | $99    | 10,000  |
| Pro     | $19.90 | $199   | 20,000  |

> 年付 = 月费 × 10（**少付 2 个月**，约 17% 折扣），积分额度不变

### 订阅权益

| 权益         | Free | Starter | Basic  | Pro    |
| ------------ | ---- | ------- | ------ | ------ |
| 每日免费积分 | 100  | -       | -      | -      |
| 每月订阅积分 | -    | 5,000   | 10,000 | 20,000 |
| 云端数据同步 | ❌   | ✅      | ✅     | ✅     |
| 多端使用     | ❌   | ✅      | ✅     | ✅     |
| 语音转写     | ❌   | ✅      | ✅     | ✅     |
| 知识库功能   | ❌   | ✅      | ✅     | ✅     |

---

## 积分包

| 积分包      | 价格 |
| ----------- | ---- |
| 5,000 积分  | $5   |
| 10,000 积分 | $10  |
| 50,000 积分 | $50  |

- 有效期：365 天
- 购买条件：所有用户均可购买

---

## 技术实现

### 配置常量

```typescript
// config/pricing.config.ts

/** 积分与美元的兑换比例（内部计算用） */
export const CREDITS_PER_DOLLAR = 1000;

/** 利润倍率（影响 AI 调用积分消耗） */
export const PROFIT_MULTIPLIER = 2.0;

/** 每日免费积分（免费用户） */
export const DAILY_FREE_CREDITS = 100;

/** 购买积分有效期（天） */
export const PURCHASED_CREDITS_EXPIRY_DAYS = 365;

/** Tier 顺序 */
export const TIER_ORDER: UserTier[] = ['free', 'starter', 'basic', 'pro', 'license'];

/** Tier 积分配置（按月费向上取整 × 1000） */
export const TIER_CREDITS: Record<string, number> = {
  free: 0,
  starter: 5000, // ceil($4.99) × 1000
  basic: 10000, // ceil($9.90) × 1000
  pro: 20000, // ceil($19.90) × 1000
  license: 0,
};
```

### 数据库 Schema

```prisma
enum UserTier {
  free
  starter
  basic
  pro
  license
}
```

---

## 版本记录

| 版本 | 日期       | 变更内容                                           |
| ---- | ---------- | -------------------------------------------------- |
| v1.0 | 2024-12-21 | 初始方案设计                                       |
| v1.1 | 2024-12-21 | 调整年费为月费×10；积分包改为原价                  |
| v2.0 | 2024-12-24 | 隐藏成本重构：新增利润倍率，订阅积分按月费取整计算 |
